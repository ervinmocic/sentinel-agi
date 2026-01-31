import { NextResponse } from 'next/server';
import { operationsManager } from '@/lib/operations';

export async function GET() {
  try {
    const operations = await operationsManager.getOperations();
    return NextResponse.json(operations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch operations' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { title, description, type } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    const operation = await operationsManager.createOperation(title, description || '', type || 'general');
    return NextResponse.json(operation);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create operation' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) {
        return NextResponse.json({ error: 'ID and status required' }, { status: 400 });
    }
    const op = await operationsManager.updateOperation(id, { status });
    return NextResponse.json(op);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update operation' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    await operationsManager.deleteOperation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete operation' }, { status: 500 });
  }
}