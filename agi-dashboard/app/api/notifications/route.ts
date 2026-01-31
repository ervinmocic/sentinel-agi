import { NextResponse } from 'next/server';
import { notificationManager } from '@/lib/notifications';

export async function GET() {
  try {
    const notifications = await notificationManager.getNotifications();
    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === 'mark_read') {
      await notificationManager.markAsRead(body.id);
      return NextResponse.json({ success: true });
    }
    if (body.action === 'mark_all_read') {
      await notificationManager.markAllAsRead();
      return NextResponse.json({ success: true });
    }
    // Creation usually internal, but supporting API creation for testing/expansion
    if (body.title) {
        const note = await notificationManager.create(body.title, body.message, body.type, body.actionPayload);
        return NextResponse.json(note);
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
