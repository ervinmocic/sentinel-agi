import { NextResponse } from 'next/server';
import { activityLogger } from '@/lib/activity';

export async function GET() {
  try {
    const logs = await activityLogger.getLogs(20);
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
