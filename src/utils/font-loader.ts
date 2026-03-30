import fs from 'fs';
import path from 'path';
// @ts-ignore - wawoff2 might not have type definitions
import * as wawoff2 from 'wawoff2';
import * as opentype from 'opentype.js';

export interface FontConfig {
  name: string;
  url: string;
  found: boolean;
  base64?: string; // For direct embedding or conversion results
  mimeType?: string;
}

/**
 * Checks for the existence of a font file and optionally converts it to TTF for PDF compat.
 */
export async function getDynamicFont(fontName?: string, format?: 'web' | 'pdf'): Promise<FontConfig> {
  let targetFontName = fontName || process.env.NEXT_PUBLIC_FONT_NAME;
  const defaultFont: FontConfig = { name: 'Outfit', url: '', found: false };
  
  if (!targetFontName) {
    return defaultFont;
  }

  targetFontName = targetFontName.replace(/['"]+/g, '').trim();
  targetFontName = targetFontName.replace(/\.(woff2|woff|ttf|otf)$/i, '');

  if (!targetFontName || targetFontName === 'Arial') {
    return defaultFont;
  }

  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, 'public', 'fonts'),
    path.join(cwd, '..', 'public', 'fonts'),
    path.join(cwd, '.next', 'server', 'public', 'fonts'),
  ];
  
  let fontsDir = possiblePaths[0];
  
  try {
    const foundPath = possiblePaths.find(p => fs.existsSync(p));
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
    
    if (foundPath) {
      fontsDir = foundPath;
    } else {
      return defaultFont;
    }

    // PDF requires TTF/OTF. If not found, we will try to convert WOFF/WOFF2 later.
    const extensions = format === 'pdf' ? ['.ttf', '.otf', '.woff2', '.woff'] : ['.woff2', '.woff', '.ttf', '.otf'];
    const actualFiles = fs.readdirSync(fontsDir);
    
    for (const ext of extensions) {
      const fileName = `${targetFontName}${ext}`;
      const matchedFile = actualFiles.find(f => f.toLowerCase() === fileName.toLowerCase());
      
      if (matchedFile) {
        // If it's a PDF request and we found a WOFF/WOFF2, we need to convert or return special URL
        if (format === 'pdf' && (matchedFile.endsWith('.woff2') || matchedFile.endsWith('.woff'))) {
            return {
              name: targetFontName,
              url: `${cleanBasePath}/api/font-check?name=${encodeURIComponent(targetFontName)}&format=pdf&convert=true`,
              found: true
            };
        }

        return {
          name: targetFontName,
          url: `${cleanBasePath}/fonts/${matchedFile}`,
          found: true
        };
      }
    }
  } catch (error) {
    console.error('Error checking for dynamic font:', error);
  }

  return defaultFont;
}

/**
 * Specifically handles font conversion to TTF using opentype.js and wawoff2
 */
export async function convertFontToTtf(fontPath: string): Promise<Buffer | null> {
    try {
        const extension = path.extname(fontPath).toLowerCase();
        const buffer = fs.readFileSync(fontPath);

        if (extension === '.ttf' || extension === '.otf') {
            return buffer;
        }

        if (extension === '.woff2') {
            const decompressed = await wawoff2.decompress(buffer);
            return Buffer.from(decompressed);
        }

        if (extension === '.woff') {
            try {
                // opentype.js handles WOFF1 parsing and TTF output
                const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
                const ttfArrayBuffer = font.toArrayBuffer();
                return Buffer.from(ttfArrayBuffer);
            } catch (e) {
                console.warn('WOFF1 conversion failed via opentype.js:', e);
                return null;
            }
        }

        return null;
    } catch (err) {
        console.error('Font conversion error:', err);
        return null;
    }
}
