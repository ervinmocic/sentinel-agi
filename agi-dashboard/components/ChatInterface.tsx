'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Terminal } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Sentinel AI v5.2 online. How can I assist with your company building today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setCurrentStatus('Initializing agent...');

    // Add placeholder for assistant message
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const apiKey = localStorage.getItem('trello_api_key');
      const apiToken = localStorage.getItem('trello_api_token');
      const openAiKey = localStorage.getItem('openai_api_key');
      const mailchimpKey = localStorage.getItem('mailchimp_api_key');

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.filter(m => m.content), // Don't send empty placeholder
          trello: { key: apiKey, token: apiToken },
          openaiKey: openAiKey,
          mailchimpKey: mailchimpKey
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Process all complete lines
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            
            if (data.type === 'text') {
              setMessages(prev => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                const lastMsg = newMessages[lastIdx];
                
                if (lastMsg.role === 'assistant') {
                  newMessages[lastIdx] = {
                    ...lastMsg,
                    content: lastMsg.content + data.content
                  };
                }
                return newMessages;
              });
            } else if (data.type === 'status') {
              setCurrentStatus(data.content);
            }
          } catch (e) {
            console.error('Error parsing JSON chunk', e);
          }
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.role === 'assistant') {
           lastMsg.content += "\n[Connection Error. Please check your settings.]";
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  };

  return (
    <div className="flex flex-col h-full border border-gray-800 rounded-2xl bg-gray-900/50 overflow-hidden shadow-sm">
      <div className="bg-gray-950 border-b border-gray-800 p-4 flex items-center gap-3">
        <div className="bg-blue-600/20 p-2 rounded-lg text-blue-500 shadow-glow">
          <Bot size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white tracking-wide">SENTINEL v5.2</h3>
          <p className="text-xs text-green-500 flex items-center gap-1 font-mono">
            <span className="block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            ONLINE
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 font-sans">
        {messages.map((msg, idx) => (
          msg.content && (
            <div
              key={idx}
              className={`flex items-start gap-4 ${
                msg.role === 'assistant' ? 'justify-start' : 'justify-end'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 mt-1 flex-shrink-0 border border-blue-500/30">
                  <Bot size={14} />
                </div>
              )}
              <div
                className={`rounded-xl px-5 py-3 max-w-[85%] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-gray-800/80 text-gray-200 border border-gray-700/50 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 mt-1 flex-shrink-0 border border-gray-600">
                  <User size={14} />
                </div>
              )}
            </div>
          )
        ))}
        
        {/* Active Thinking/Status Indicator */}
        {isLoading && (
          <div className="flex items-start gap-4 animate-in fade-in duration-300">
             <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 mt-1 flex-shrink-0 border border-blue-500/30">
                  <Bot size={14} />
             </div>
             <div className="space-y-2">
                {currentStatus && (
                  <div className="flex items-center gap-2 text-xs text-blue-400 font-mono bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-500/20">
                     <Terminal size={12} className="animate-pulse" />
                     {currentStatus}
                  </div>
                )}
                {!messages[messages.length - 1].content && (
                   <div className="bg-gray-800/50 rounded-xl rounded-tl-none px-4 py-3">
                     <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                   </div>
                )}
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 bg-gray-950 border-t border-gray-800">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Command the system... (Shift+Enter for new line)"
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-500 placeholder-gray-600 transition-all shadow-inner resize-none min-h-[56px] max-h-[200px]"
            rows={1}
            style={{ height: 'auto', minHeight: '56px' }} 
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
