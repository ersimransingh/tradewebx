import fs from 'fs';
import path from 'path';

export interface FontConfig {
  name: string;
  url: string;
  found: boolean;
}

/**
 * Checks for the existence of a font file in the public/fonts directory
 * based on the NEXT_PUBLIC_FONT_NAME environment variable.
 */
export function getDynamicFont(): FontConfig {
  const fontName = process.env.NEXT_PUBLIC_FONT_NAME;
  const defaultFont: FontConfig = { name: 'Outfit', url: '', found: false };
  
  const logPath = path.join(process.cwd(), 'font-debug.log');
  fs.appendFileSync(logPath, `Checking font: ${fontName}\n`);

  if (!fontName) {
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
      const fileName = `${fontName}${ext}`;
      const filePath = path.join(fontsDir, fileName);
      
      if (fs.existsSync(filePath)) {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
        const result = {
          name: fontName,
          url: `${cleanBasePath}/fonts/${fileName}`,
          found: true
        };
        fs.appendFileSync(logPath, `Found font: ${JSON.stringify(result)}\n`);
        return result;
      }
    }
  } catch (error) {
    fs.appendFileSync(path.join(process.cwd(), 'font-debug.log'), `Error: ${error.message}\n`);
    console.error('Error checking for dynamic font:', error);
  }

  return defaultFont;
}
