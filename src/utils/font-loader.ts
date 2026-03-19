import fs from 'fs';
import path from 'path';

export interface FontConfig {
  name: string;
  url: string;
  found: boolean;
}

/**
 * Checks for the existence of a font file in the public/fonts directory
 * @param fontName Optional font name to check. If not provided, uses NEXT_PUBLIC_FONT_NAME.
 */
export function getDynamicFont(fontName?: string): FontConfig {
  const targetFontName = fontName || process.env.NEXT_PUBLIC_FONT_NAME;
  const defaultFont: FontConfig = { name: 'Outfit', url: '', found: false };
  
  if (!targetFontName) {
    return defaultFont;
  }

  // Use process.cwd() to get the project root directory
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  
  // Supported font extensions to check
  const extensions = ['.woff2', '.woff', '.ttf', '.otf'];
  
  try {
    if (!fs.existsSync(fontsDir)) {
      return defaultFont;
    }

    for (const ext of extensions) {
      const fileName = `${targetFontName}${ext}`;
      const filePath = path.join(fontsDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        return {
          name: targetFontName,
          url: `${cleanBasePath}/fonts/${fileName}`,
          found: true
        };
      }
    }
  } catch (error) {
    console.error('Error checking for dynamic font:', error);
  }

  return defaultFont;
}
