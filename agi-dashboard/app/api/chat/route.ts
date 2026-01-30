import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { TrelloClient } from '@/lib/trello';
import { MemoryManager } from '@/lib/memory';
import { MailchimpClient } from '@/lib/mailchimp';
import { settingsManager } from '@/lib/settings';
import { activityLogger } from '@/lib/activity';

function normalizeName(s: string) {
  return (s || '').trim().toLowerCase();
}

function userExplicitlyRequestedMove(userMessage: string) {
  // Heuristic gate: only allow arbitrary list moves when user explicitly says so.
  // Completion should use complete_task/reopen_task instead.
  return /\b(move|moved|moving|transfer|relocate|put it in|put this in|move it to|move to)\b/i.test(
    userMessage || ''
  );
}

// Define tools for OpenAI
const toolsDefinition = [
  {
    type: "function",
    function: {
      name: "get_boards",
      description: "Get a list of all Trello boards associated with the account.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_board",
      description: "Create a new Trello board.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the board to create",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_lists",
      description: "Get all lists on a specific Trello board.",
      parameters: {
        type: "object",
        properties: {
          boardId: {
            type: "string",
            description: "The ID of the board to get lists from",
          },
        },
        required: ["boardId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_list",
      description: "Create a new list on a specific Trello board.",
      parameters: {
        type: "object",
        properties: {
          boardId: {
            type: "string",
            description: "The ID of the board to create the list on",
          },
          name: {
            type: "string",
            description: "The name of the list",
          },
        },
        required: ["boardId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cards",
      description: "Get all cards from a specific list to read existing tasks.",
      parameters: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list to get cards from",
          },
        },
        required: ["listId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_card",
      description: "Create a new card in a specific list.",
      parameters: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list to create the card in",
          },
          name: {
            type: "string",
            description: "The title of the card",
          },
          desc: {
            type: "string",
            description: "The description of the card",
          },
        },
        required: ["listId", "name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_card",
      description: "Move a card to a different list (e.g. to mark it as 'Done').",
      parameters: {
        type: "object",
        properties: {
          cardId: {
            type: "string",
            description: "The ID of the card to move",
          },
          targetListId: {
            type: "string",
            description: "The ID of the destination list (e.g. the 'Done' list)",
          },
        },
        required: ["cardId", "targetListId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_task",
      description:
        "Mark an existing Trello task as completed by adding a green checkmark (setting due date complete). Does NOT move the card unless explicitly requested.",
      parameters: {
        type: "object",
        properties: {
          boardId: {
            type: "string",
            description: "The ID of the board containing the task",
          },
          cardName: {
            type: "string",
            description:
              "The exact (or near-exact) name of the card to complete (e.g. 'Getting People on the Waitlist')",
          },
        },
        required: ["boardId", "cardName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reopen_task",
      description:
        "Mark an existing Trello task as incomplete by removing the green checkmark.",
      parameters: {
        type: "object",
        properties: {
          boardId: {
            type: "string",
            description: "The ID of the board containing the task",
          },
          cardName: {
            type: "string",
            description: "The exact (or near-exact) name of the card to reopen",
          },
        },
        required: ["boardId", "cardName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_memory",
      description: "Save important company information, facts, or goals to long-term memory.",
      parameters: {
        type: "object",
        properties: {
          company_info: {
            type: "string",
            description: "General description or mission statement of the company.",
          },
          fact: {
            type: "string",
            description: "A specific fact or key detail to remember.",
          }
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_mailchimp_lists",
      description: "Get all Mailchimp audience lists and their stats.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

export async function POST(req: Request) {
  const { message, history } = await req.json();

  const settings = await settingsManager.getSettings();

  if (!settings.trello_api_key || !settings.trello_api_token) {
    return new Response(JSON.stringify({ error: "System Alert: Trello credentials missing in server settings." }), { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY || settings.openai_api_key;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "System Alert: AI Neural Link missing in server settings." }), { status: 400 });
  }

  const openai = new OpenAI({ apiKey: apiKey });
  const trelloClient = new TrelloClient(settings.trello_api_key, settings.trello_api_token);
  const memoryManager = new MemoryManager();
  const mailchimpClient = settings.mailchimp_api_key ? new MailchimpClient(settings.mailchimp_api_key) : null;


  // Load existing memory
  const memory = await memoryManager.read();
  
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const messages = [
        {
          role: "system",
          content: `You are Sentinel v5.2, an autonomous AGI company builder.
          
          MEMORY CONTEXT:
          - Company Info: ${memory.company_info || "Not set"}
          - Key Facts: ${memory.key_facts.join("; ") || "None"}
          - Long Term Goals: ${memory.long_term_goals.join("; ") || "None"}
          
          You have direct, real-time control over Trello and Mailchimp.
          
          CORE PROTOCOL:
          1. MEMORY CHECK: If the user provides new core info about the company, save it using 'save_memory'.
          2. EXPLAIN: Before taking any action, output a clear thought explaining what you are about to do.
          3. ACT: Execute the necessary tool.
          4. OBSERVE: Analyze the tool output.
          5. ITERATE: If more steps are needed, repeat the loop.
          
          You can perform multi-step complex tasks.
          To "read existing items", you MUST use 'get_lists' then 'get_cards' for each relevant list.
          
          To "tick off" or "complete" a task:
          - Use 'complete_task' (this adds a green checkmark).
          - Do NOT create a "Done" list or move the card unless the user explicitly asks to "move" it.
          
          To mark a task as incomplete again:
          - Use 'reopen_task' (removes the checkmark).
          
          CRITICAL SAFETY:
          - Only use 'move_card' when the user explicitly asks to move something to a specific list.
          
          Be concise but transparent in your thinking.`
        },
        ...history.map((h: any) => ({ role: h.role, content: h.content })),
        { role: "user", content: message }
      ];

      const sendChunk = (type: string, content: string) => {
        controller.enqueue(encoder.encode(JSON.stringify({ type, content }) + "\n"));
      };

      try {
        let turns = 0;
        const MAX_TURNS = 12;

        while (turns < MAX_TURNS) {
          turns++;
          
          const completionStream = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: messages as any,
            tools: toolsDefinition as any,
            tool_choice: "auto",
            stream: true,
          });

          let currentContent = "";
          let toolCalls: any[] = [];
          
          for await (const chunk of completionStream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              currentContent += delta.content;
              sendChunk("text", delta.content);
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!toolCalls[tc.index]) {
                   toolCalls[tc.index] = { id: tc.id, function: { name: "", arguments: "" }, type: "function" };
                }
                if (tc.id) toolCalls[tc.index].id = tc.id;
                if (tc.function?.name) toolCalls[tc.index].function.name += tc.function.name;
                if (tc.function?.arguments) toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
            }
          }

          if (currentContent) {
            messages.push({ role: "assistant", content: currentContent });
          }

          if (toolCalls.length === 0) {
            break;
          }

          messages.push({ role: "assistant", tool_calls: toolCalls, content: null });

          for (const toolCall of toolCalls) {
             const functionName = toolCall.function.name;
             const functionArgs = JSON.parse(toolCall.function.arguments);
             
             sendChunk("status", `Executing ${functionName}...`);
             
             let toolResult = "";
             try {
                if (functionName === "get_boards") {
                    const boards = await trelloClient.getBoards();
                    toolResult = JSON.stringify(boards.map(b => ({ id: b.id, name: b.name })));
                    await activityLogger.log('trello', 'Fetched Boards', `Retrieved ${boards.length} boards`);
                } else if (functionName === "create_board") {
                    const board = await trelloClient.createBoard(functionArgs.name);
                    toolResult = JSON.stringify({ id: board.id, name: board.name, url: board.url });
                    sendChunk("status", `Created board: ${board.name}`);
                    await activityLogger.log('trello', 'Created Board', `Created board "${board.name}"`);
                } else if (functionName === "get_lists") {
                    const lists = await trelloClient.getLists(functionArgs.boardId);
                    toolResult = JSON.stringify(lists.map(l => ({ id: l.id, name: l.name })));
                    await activityLogger.log('trello', 'Fetched Lists', `Retrieved ${lists.length} lists`);
                } else if (functionName === "get_cards") {
                    const cards = await trelloClient.getCards(functionArgs.listId);
                    toolResult = JSON.stringify(cards.map(c => ({ id: c.id, name: c.name, desc: c.desc })));
                    await activityLogger.log('trello', 'Fetched Cards', `Retrieved ${cards.length} cards`);
                } else if (functionName === "create_list") {
                    const list = await trelloClient.createList(functionArgs.boardId, functionArgs.name);
                    toolResult = JSON.stringify({ id: list.id, name: list.name });
                    sendChunk("status", `Created list: ${list.name}`);
                    await activityLogger.log('trello', 'Created List', `Created list "${list.name}"`);
                } else if (functionName === "create_card") {
                    const card = await trelloClient.createCard(functionArgs.listId, functionArgs.name, functionArgs.desc);
                    toolResult = JSON.stringify({ id: card.id, name: card.name, url: card.url });
                    sendChunk("status", `Created card: ${card.name}`);
                    await activityLogger.log('trello', 'Created Card', `Created card "${card.name}"`);
                } else if (functionName === "move_card") {
                    if (!userExplicitlyRequestedMove(message)) {
                      toolResult = JSON.stringify({
                        error:
                          "Blocked: 'move_card' can only be used when the user explicitly asks to move a card to a specific list. Use 'complete_task' or 'reopen_task' to change completion state.",
                      });
                      sendChunk("status", "Blocked unsafe move_card request");
                      await activityLogger.log(
                        'security',
                        'Blocked Move',
                        "Blocked move_card because user didn't explicitly request a move"
                      );
                    } else {
                    const card = await trelloClient.moveCard(functionArgs.cardId, functionArgs.targetListId);
                    toolResult = JSON.stringify({ id: card.id, name: card.name });
                    sendChunk("status", `Moved card: ${card.name}`);
                    await activityLogger.log('trello', 'Moved Card', `Moved card "${card.name}" to new list`);
                    }
                } else if (functionName === "complete_task") {
                    const boardId: string = functionArgs.boardId;
                    const cardName: string = functionArgs.cardName;

                    const lists = await trelloClient.getLists(boardId);
                    const matches: Array<{ cardId: string; name: string; due: string | null }> = [];
                    
                    for (const list of lists) {
                      const cards = await trelloClient.getCards(list.id);
                      for (const c of cards) {
                        if (normalizeName(c.name) === normalizeName(cardName)) {
                          matches.push({ cardId: c.id, name: c.name, due: c.due });
                        }
                      }
                    }

                    if (matches.length === 0) {
                      toolResult = JSON.stringify({ error: `Card not found: "${cardName}"` });
                    } else if (matches.length > 1) {
                      toolResult = JSON.stringify({
                        error: `Multiple cards matched "${cardName}". Please specify which one.`,
                        matches,
                      });
                    } else {
                      const match = matches[0];
                      // To ensure the green checkmark appears, we need dueComplete=true AND a valid due date.
                      // If no due date exists, we set it to today.
                      const updates: any = { dueComplete: true };
                      if (!match.due) {
                        updates.due = new Date().toISOString();
                      }
                      
                      const updated = await trelloClient.updateCard(match.cardId, updates);
                      toolResult = JSON.stringify({
                        id: updated.id,
                        name: updated.name,
                        dueComplete: updated.dueComplete,
                        status: "Marked as complete (green checkmark)"
                      });
                      
                      sendChunk("status", `Completed task: ${updated.name}`);
                      await activityLogger.log('trello', 'Completed Task', `Marked "${updated.name}" as done`);
                    }
                } else if (functionName === "reopen_task") {
                    const boardId: string = functionArgs.boardId;
                    const cardName: string = functionArgs.cardName;

                    const lists = await trelloClient.getLists(boardId);
                    const matches: Array<{ cardId: string; name: string }> = [];
                    
                    for (const list of lists) {
                      const cards = await trelloClient.getCards(list.id);
                      for (const c of cards) {
                        if (normalizeName(c.name) === normalizeName(cardName)) {
                          matches.push({ cardId: c.id, name: c.name });
                        }
                      }
                    }

                    if (matches.length === 0) {
                      toolResult = JSON.stringify({ error: `Card not found: "${cardName}"` });
                    } else if (matches.length > 1) {
                      toolResult = JSON.stringify({
                        error: `Multiple cards matched "${cardName}". Please specify which one.`,
                        matches,
                      });
                    } else {
                      const match = matches[0];
                      const updated = await trelloClient.updateCard(match.cardId, { dueComplete: false });
                      toolResult = JSON.stringify({
                        id: updated.id,
                        name: updated.name,
                        dueComplete: updated.dueComplete,
                        status: "Marked as incomplete"
                      });
                      
                      sendChunk("status", `Reopened task: ${updated.name}`);
                      await activityLogger.log('trello', 'Reopened Task', `Unchecked "${updated.name}"`);
                    }
                } else if (functionName === "save_memory") {
                    if (functionArgs.company_info) {
                        await memoryManager.update({ company_info: functionArgs.company_info });
                        toolResult = "Company info updated.";
                        await activityLogger.log('memory', 'Memory Updated', 'Updated company info');
                    }
                    if (functionArgs.fact) {
                        await memoryManager.appendFact(functionArgs.fact);
                        toolResult += " Fact saved.";
                        await activityLogger.log('memory', 'Fact Saved', 'Saved new key fact');
                    }
                    sendChunk("status", `Memory Updated`);
                } else if (functionName === "get_mailchimp_lists") {
                    if (!mailchimpClient) {
                        toolResult = "Error: Mailchimp API Key not configured in Settings.";
                    } else {
                        const lists = await mailchimpClient.getLists();
                        toolResult = JSON.stringify(lists);
                        await activityLogger.log('mailchimp', 'Fetched Audiences', `Retrieved ${lists.length} lists`);
                    }
                } else {
                    toolResult = "Error: Unknown function";
                }
             } catch (e: any) {
                 console.error("Tool execution error", e);
                 toolResult = JSON.stringify({ error: e.message });
                 sendChunk("status", `Error: ${e.message}`);
             }

             messages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: functionName,
                content: toolResult
             });
          }
        }
        
        controller.close();
      } catch (error: any) {
        console.error("Stream Loop Error:", error);
        sendChunk("text", `\n[System Error: ${error.message}]`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
