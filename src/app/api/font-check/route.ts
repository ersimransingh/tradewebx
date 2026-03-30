import { NextRequest, NextResponse } from 'next/server';
import { getDynamicFont, convertFontToTtf } from '@/utils/font-loader';
import path from 'path';
import fs from 'fs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');
  const format = searchParams.get('format') as 'web' | 'pdf' | null;
  const convert = searchParams.get('convert') === 'true';

  if (!name) {
    return NextResponse.json({ error: 'Missing font name' }, { status: 400 });
  }

  // If convert is true, we want to return the raw TTF binary
  if (convert && format === 'pdf') {
     const cwd = process.cwd();
     const possiblePaths = [
       path.join(cwd, 'public', 'fonts'),
       path.join(cwd, '..', 'public', 'fonts'),
       path.join(cwd, '.next', 'server', 'public', 'fonts'),
     ];
     const foundPath = possiblePaths.find(p => fs.existsSync(p));
     if (!foundPath) return NextResponse.json({ error: 'Fonts directory not found' }, { status: 500 });
     
     const extensions = ['.ttf', '.otf', '.woff2', '.woff'];
     let matchedFilePath = '';
     for (const ext of extensions) {
        const fullPath = path.join(foundPath, `${name}${ext}`);
        if (fs.existsSync(fullPath)) {
            matchedFilePath = fullPath;
            break;
        }
     }

     if (matchedFilePath) {
        const ttfBuffer = await convertFontToTtf(matchedFilePath);
        if (ttfBuffer) {
            return new NextResponse(new Uint8Array(ttfBuffer), {
                headers: {
                    'Content-Type': 'font/ttf',
                    'Content-Disposition': `attachment; filename="${name}.ttf"`,
                    'Cache-Control': 'public, max-age=31536000, immutable'
                }
            });
        }
     }
     return NextResponse.json({ error: 'Font conversion failed' }, { status: 500 });
  }

  const fontConfig = await getDynamicFont(name, format || 'web');

  return NextResponse.json(fontConfig);
}
