import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const { filepath, content } = await req.json();
  
  const rootDir = process.cwd();
  const targetPath = path.resolve(rootDir, filepath);
  
  if (!targetPath.startsWith(rootDir)) {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    await fs.promises.writeFile(targetPath, content, 'utf-8');
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to write file' }, { status: 500 });
  }
}
