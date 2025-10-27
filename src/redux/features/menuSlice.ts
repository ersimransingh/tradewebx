import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { RootState } from '../store';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';
import apiService from '@/utils/apiService';
import { getLocalStorage } from '@/utils/helper';

// Enhanced types to include pageData
type PageSettings = {
    gridType: string;
    gridDirection: string;
    borderStyle: string;
    borderColor: string;
    fontSize?: number;
    // ... other settings
};

type PageLevel = {
    name: string;
    primaryHeaderKey: string;
    primaryKey: string;
    level: number;
    J_Ui: {
        ActionName: string;
        Option: string;
        Level: number;
        RequestFrom: string;
    };
    settings: PageSettings;
    summary?: any;
};

type PageData = {
    wPage: string;
    level: string;
    isShortAble: string;
    gridType: string;
    horizontalScroll: number;
    filters: any[];
    levels: PageLevel[];
};

type SubMenuItem = {
    name: string;
    path?: string;
    pro?: boolean;
    new?: boolean;
    componentName: string;
    componentType?: string;
    pageData?: PageData[];
    subItems?: SubMenuItem[];
};

type NavItem = {
    id: number;
    name: string;
    icon: string;
    componentName: string;
    componentType?: string;
    path?: string;
    subItems?: SubMenuItem[];
    pageData?: PageData[];
};

interface MenuState {
    items: NavItem[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: MenuState = {
    items: [],
    status: 'idle',
    error: null
};

// Update the convertToNavItems function
const convertToNavItems = (data: any): NavItem[] => {
    return data.map((item: any) => {
        const routeMapping: Record<string, string> = {
            'Dashboard': 'dashboard',
            'Reports': 'reports',
            'Logout': 'logout',
            // Add other mappings as needed
        };

        // Use url field if componentType is URL, otherwise generate path
        const basePath = item.componentType === 'URL'
            ? item.url
            : `/${routeMapping[item.componentName] || item.componentName.toLowerCase().replace(/\s+/g, '-')}`;

        const navItem: NavItem = {
            id: item.id,
            icon: item.icon || 'default-icon',
            name: item.title,
            componentName: item.componentName,
            componentType: item.componentType || null,
            path: basePath,
            pageData: item.pageData
        };

        if (item.submenu && item.submenu.length > 0) {
            navItem.subItems = item.submenu.map((subItem: any) => {
                // Use url field if componentType is URL, otherwise generate path
                const subItemPath = subItem.componentType === 'URL'
                    ? subItem.url
                    : `${basePath}/${subItem.componentName.toLowerCase().replace(/\s+/g, '-')}`;

                const subNavItem: SubMenuItem = {
                    name: subItem.title,
                    path: subItemPath,
                    componentName: subItem.componentName,
                    componentType: subItem.componentType || null,
                    pageData: subItem.pageData,
                    pro: false,
                    new: false
                };

                // Handle third level submenu
                if (subItem.submenu && subItem.submenu.length > 0) {
                    subNavItem.subItems = subItem.submenu.map((thirdItem: any) => {
                        // Use url field if componentType is URL, otherwise generate path
                        const thirdItemPath = thirdItem.componentType === 'URL'
                            ? thirdItem.url
                            : `${subItemPath}/${thirdItem.componentName.toLowerCase().replace(/\s+/g, '-')}`;

                        return {
                            name: thirdItem.title,
                            path: thirdItemPath,
                            componentName: thirdItem.componentName,
                            componentType: thirdItem.componentType || null,
                            pageData: thirdItem.pageData,
                            pro: false,
                            new: false
                        };
                    });
                    // Remove path from parent if it has subItems
                    delete subNavItem.path;
                }

                return subNavItem;
            });
            // Remove path from parent if it has subItems
            delete navItem.path;
        }

        return navItem;
    });
};

// SessionStorage key for menu items
const MENU_STORAGE_KEY = 'tradewebx_menu_items';

// Helper function to save menu to sessionStorage
const saveMenuToSessionStorage = (menuItems: NavItem[]) => {
    try {
        sessionStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(menuItems));
    } catch (error) {
        console.error('Failed to save menu to sessionStorage:', error);
    }
};

// Helper function to load menu from sessionStorage
const loadMenuFromSessionStorage = (): NavItem[] | null => {
    try {
        const storedMenu = sessionStorage.getItem(MENU_STORAGE_KEY);
        return storedMenu ? JSON.parse(storedMenu) : null;
    } catch (error) {
        console.error('Failed to load menu from sessionStorage:', error);
        return null;
    }
};

// Create async thunk for fetching menu
export const fetchMenuItems = createAsyncThunk(
    'menu/fetchMenuItems',
    async (_, { rejectWithValue }) => {
        try {
            const userData = {
                UserId: getLocalStorage('userId') || '',
                UserType: getLocalStorage('userType') || ''
            };

            const xmlData = `<dsXml>
                <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"MOBILEMENU","RequestFrom" :"W"</J_Ui>
                <Sql></Sql>
                <X_Filter>
                    <UserId>${userData.UserId}</UserId>
                </X_Filter>
                <J_Api>"UserId":"${userData.UserId}","UserType":"${userData.UserType}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
            </dsXml>`;

            const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
            const menuItems = convertToNavItems(response.data.data.rs0);

            // Save menu to sessionStorage on successful fetch
            saveMenuToSessionStorage(menuItems);

            return menuItems;
        } catch (error: any) {
            // Try to load menu from sessionStorage as fallback
            const cachedMenu = loadMenuFromSessionStorage();

            if (cachedMenu && cachedMenu.length > 0) {
                console.warn('Menu API failed, using cached menu from sessionStorage');
                return cachedMenu;
            }

            // If no cached menu exists, reject with error
            return rejectWithValue(error?.message || 'Failed to fetch menu items');
        }
    }
);

// Create slice
const menuSlice = createSlice({
    name: 'menu',
    initialState,
    reducers: {
        clearMenuCache: (state) => {
            // Clear sessionStorage and reset state
            try {
                sessionStorage.removeItem(MENU_STORAGE_KEY);
            } catch (error) {
                console.error('Failed to clear menu cache:', error);
            }
            state.items = [];
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMenuItems.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchMenuItems.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
                state.error = null;
            })
            .addCase(fetchMenuItems.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string || 'Failed to fetch menu items';
            });
    },
});

// Export actions
export const { clearMenuCache } = menuSlice.actions;

// Export selectors
export const selectAllMenuItems = (state: RootState) => state.menu.items;
export const selectMenuStatus = (state: RootState) => state.menu.status;
export const selectMenuError = (state: RootState) => state.menu.error;

export default menuSlice.reducer; 