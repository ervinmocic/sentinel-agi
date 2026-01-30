import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const { dir } = await req.json();
  
  const rootDir = process.cwd();
  const targetPath = path.resolve(rootDir, dir);
  
  if (!targetPath.startsWith(rootDir)) {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    await fs.promises.mkdir(targetPath, { recursive: true });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create directory' }, { status: 500 });
  }
}
