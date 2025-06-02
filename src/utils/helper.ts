import { THEME_COLORS_STORAGE_KEY, THEME_STORAGE_KEY } from "@/context/ThemeContext";
import { APP_METADATA_KEY } from "./constants";

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
