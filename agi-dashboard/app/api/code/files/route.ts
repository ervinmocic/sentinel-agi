import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dir = searchParams.get('dir') || '.';
  
  // Security: Prevent breaking out of root
  const rootDir = process.cwd();
  const targetPath = path.resolve(rootDir, dir);
  
  if (!targetPath.startsWith(rootDir)) {
    return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
  }

  try {
    const entries = await fs.promises.readdir(targetPath, { withFileTypes: true });
    
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      path: path.relative(rootDir, path.join(targetPath, entry.name))
    })).sort((a, b) => {
      // Folders first
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });

    return NextResponse.json({ files, currentPath: path.relative(rootDir, targetPath) || '.' });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to list directory' }, { status: 500 });
  }
}
