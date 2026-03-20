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
  let targetFontName = fontName || process.env.NEXT_PUBLIC_FONT_NAME;
  const defaultFont: FontConfig = { name: 'Outfit', url: '', found: false };
  
  if (!targetFontName) {
    return defaultFont;
  }

  // Sanitize: remove quotes and whitespace that might come from .env
  targetFontName = targetFontName.replace(/['"]+/g, '').trim();

  // Remove common font extensions if they were accidentally included
  targetFontName = targetFontName.replace(/\.(woff2|woff|ttf|otf)$/i, '');

  if (!targetFontName || targetFontName === 'Arial') {
    return defaultFont;
  }

  // Use process.cwd() to get the project root directory
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, 'public', 'fonts'),
    path.join(cwd, '..', 'public', 'fonts'), // For monorepos or deep execution
    path.join(cwd, '.next', 'server', 'public', 'fonts'), // For some production builds
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

    const extensions = ['.woff2', '.woff', '.ttf', '.otf'];
    
    // Get all files in the fonts directory for case-insensitive matching
    const actualFiles = fs.readdirSync(fontsDir);
    
    for (const ext of extensions) {
      const fileName = `${targetFontName}${ext}`;
      const filePath = path.join(fontsDir, fileName);
      
      // Case-insensitive/Resilient check
      const matchedFile = actualFiles.find(f => f.toLowerCase() === fileName.toLowerCase());
      
      if (matchedFile) {
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
