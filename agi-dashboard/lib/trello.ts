
export interface TrelloBoard {
  id: string;
  name: string;
  url: string;
}

export interface TrelloList {
  id: string;
  name: string;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  url: string;
  due: string | null;
  dueComplete: boolean;
}

const BASE_URL = 'https://api.trello.com/1';

export class TrelloClient {
  private key: string;
  private token: string;

  constructor(key: string, token: string) {
    this.key = key;
    this.token = token;
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.append('key', this.key);
    url.searchParams.append('token', this.token);

    const res = await fetch(url.toString(), options);
    if (!res.ok) {
      throw new Error(`Trello API error: ${res.statusText}`);
    }
    return res.json();
  }

  async getBoards(): Promise<TrelloBoard[]> {
    return this.fetch<TrelloBoard[]>('/members/me/boards');
  }

  async createBoard(name: string): Promise<TrelloBoard> {
    return this.fetch<TrelloBoard>(`/boards/?name=${encodeURIComponent(name)}`, {
      method: 'POST',
    });
  }

  async getLists(boardId: string): Promise<TrelloList[]> {
    return this.fetch<TrelloList[]>(`/boards/${boardId}/lists`);
  }

  async createList(boardId: string, name: string): Promise<TrelloList> {
    return this.fetch<TrelloList>(`/lists?name=${encodeURIComponent(name)}&idBoard=${boardId}`, {
      method: 'POST',
    });
  }

  async createCard(listId: string, name: string, desc: string = ''): Promise<TrelloCard> {
    const url = `/cards?idList=${listId}&name=${encodeURIComponent(name)}&desc=${encodeURIComponent(desc)}`;
    return this.fetch<TrelloCard>(url, {
      method: 'POST',
    });
  }

  async getCards(listId: string): Promise<TrelloCard[]> {
    return this.fetch<TrelloCard[]>(`/lists/${listId}/cards`);
  }

  async moveCard(cardId: string, targetListId: string): Promise<TrelloCard> {
    return this.fetch<TrelloCard>(`/cards/${cardId}?idList=${targetListId}`, {
      method: 'PUT',
    });
  }

  async updateCard(cardId: string, updates: Record<string, any>): Promise<TrelloCard> {
    // Construct query parameters for the updates
    const queryParams = new URLSearchParams();
    Object.keys(updates).forEach(key => {
      queryParams.append(key, String(updates[key]));
    });

    return this.fetch<TrelloCard>(`/cards/${cardId}?${queryParams.toString()}`, {
      method: 'PUT',
    });
  }
}
