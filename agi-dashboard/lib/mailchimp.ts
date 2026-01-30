
const BASE_URL = 'https://<dc>.api.mailchimp.com/3.0';

export interface MailchimpList {
  id: string;
  name: string;
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
    open_rate: number;
    click_rate: number;
  };
}

export class MailchimpClient {
  private apiKey: string;
  private serverPrefix: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Extract server prefix from API key (e.g., "key-us14" -> "us14")
    this.serverPrefix = apiKey.split('-')[1];
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.serverPrefix) {
      throw new Error("Invalid API Key: Missing server prefix (e.g., -us1)");
    }
    
    const url = `${BASE_URL.replace('<dc>', this.serverPrefix)}${path}`;
    const auth = Buffer.from(`anystring:${this.apiKey}`).toString('base64');

    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Mailchimp API error: ${res.statusText} - ${errorText}`);
    }
    return res.json();
  }

  async getLists(): Promise<MailchimpList[]> {
    const data = await this.fetch<{ lists: MailchimpList[] }>('/lists');
    return data.lists;
  }
}
