import { THEME_COLORS_STORAGE_KEY, THEME_STORAGE_KEY } from "@/context/ThemeContext";
import { APP_METADATA_KEY } from "./constants";
import { toast } from "react-toastify";

export const clearLocalStorage = () => {
    const appMetadata = localStorage.getItem(APP_METADATA_KEY);
    const appThemeColors = localStorage.getItem(THEME_COLORS_STORAGE_KEY);
    const appTheme = localStorage.getItem(THEME_STORAGE_KEY);
    localStorage.clear();
    localStorage.setItem(APP_METADATA_KEY, appMetadata);
    if (appThemeColors) localStorage.setItem(THEME_COLORS_STORAGE_KEY, appThemeColors);
    if (appTheme) localStorage.setItem(THEME_STORAGE_KEY, appTheme);
}

// Utility to find page data by component name in menuItems
export function findPageData(menuItems: any[], componentName: string): any {
    const searchInItems = (items: any[]): any => {
        for (const item of items) {
            if (item.componentName?.toLowerCase() === componentName.toLowerCase() && item.pageData) {
                return item.pageData;
            }
            if (item.subItems && item.subItems.length > 0) {
                const foundInSubItems = searchInItems(item.subItems);
                if (foundInSubItems) {
                    return foundInSubItems;
                }
            }
        }
        return null;
    };
    return searchInItems(menuItems);
}
export function handleViewFile(base64Data: string, fieldType: string = 'file') {
    if (!base64Data?.startsWith('data:')) {
        alert("Invalid file data");
        return;
    }

    const match = base64Data.match(/^data:(.*);base64,(.*)$/);
    if (!match) {
        alert("Invalid base64 structure");
        return;
    }

    const mimeType = match[1];
    const base64 = match[2];

    try {
        const byteCharacters = atob(base64);
        const byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
        const byteArray = new Uint8Array(byteNumbers);

        const blob = new Blob([byteArray], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        const newTab = window.open(blobUrl, '_blank');

        if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `uploaded-file.${fieldType || 'file'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        alert("Unable to preview file.");
    }
}

//Dynamic XML Payload
export const buildFilterXml = (filters: Record<string, any>, userId: string): string => {
    if (filters && Object.keys(filters).length > 0) {
        return Object.entries(filters).map(([key, value]) => {
            if ((key === 'FromDate' || key === 'ToDate') && value) {
                const date = new Date(String(value));
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `<${key}>${year}${month}${day}</${key}>`;
                }
            }
            return `<${key}>${value}</${key}>`;
        }).join('\n');
    } else {
        return `<ClientCode>${userId}</ClientCode>`;
    }
};



export function getFileTypeFromBase64(base64: string): string {
    const header = base64.slice(0, 30);
  
    if (header.startsWith('JVBERi0')) return 'pdf'; // PDF
    if (header.startsWith('/9j/')) return 'jpeg';    // JPEG
    if (header.startsWith('iVBORw0KGgo')) return 'png'; // PNG
    if (header.startsWith('UEsDB')) return 'zip';    // ZIP
    if (header.includes('<?xml') || header.includes('PD94bWwg')) return 'xml'; // XML
    if (header.includes('R0lGOD')) return 'gif';     // GIF
    if (header.includes('AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAAAAAAAAAAAAAAA')) return 'ico'; // ICO
    if (/^[A-Za-z0-9+\/=]+\s*$/.test(base64)) return 'text'; // generic fallback for plain text
  
    return 'unknown';
  }
  
