import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const { filepath } = await req.json();
  
  const rootDir = process.cwd();
  const targetPath = path.resolve(rootDir, filepath);
  
  if (!targetPath.startsWith(rootDir)) {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    const content = await fs.promises.readFile(targetPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}
