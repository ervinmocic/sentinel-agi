import { NextResponse } from 'next/server';
import { MemoryManager } from '@/lib/memory';
import { activityLogger } from '@/lib/activity';

export async function POST(req: Request) {
  try {
    const secretKey = req.headers.get('ROfdM12MidA.');
    // In a real app, verify this key against a secure env variable
    // if (secretKey !== process.env.SENTINEL_WEBHOOK_SECRET) ...

    const data = await req.json();
    const { event, source, payload, timestamp } = data;
    const memoryManager = new MemoryManager();

    console.log(`[Webhook] Received ${event} from ${source}`);

    if (event === 'new_order') {
      // Log sale to memory/history
      const fact = `New Sale on ${source}: Order #${payload.id} for ${payload.currency} ${payload.total} by ${payload.customer.email}`;
      await memoryManager.appendFact(fact);
      await activityLogger.log('wordpress', 'New Order', `Order #${payload.id} - ${payload.currency} ${payload.total}`);
      
      // Here you could also trigger an AI analysis or update the dashboard metrics directly
      // For now, saving to memory allows the AI agent to "know" about recent sales when you ask it.
    }

    if (event === 'new_user') {
      const fact = `New User Registered on ${source}: ${payload.username} (${payload.email})`;
      await memoryManager.appendFact(fact);
      await activityLogger.log('wordpress', 'New User', `User: ${payload.username}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
