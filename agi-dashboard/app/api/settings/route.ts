import { NextResponse } from 'next/server';
import { settingsManager } from '@/lib/settings';

export async function GET() {
  try {
    const settings = await settingsManager.getSettings();
    // Return masked settings for security if needed, but for now returning full for editing
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const updated = await settingsManager.updateSettings(body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
