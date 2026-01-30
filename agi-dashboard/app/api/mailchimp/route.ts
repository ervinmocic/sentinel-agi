import { NextResponse } from 'next/server';
import { MailchimpClient } from '@/lib/mailchimp';
import { settingsManager } from '@/lib/settings';

export async function POST(req: Request) {
  try {
    const settings = await settingsManager.getSettings();
    const apiKey = settings.mailchimp_api_key;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Mailchimp API Key not configured in Settings' }, { status: 400 });
    }

    const client = new MailchimpClient(apiKey);
    const lists = await client.getLists();

    return NextResponse.json({ lists });
  } catch (error: any) {
    console.error('Mailchimp Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
