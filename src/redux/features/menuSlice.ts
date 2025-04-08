import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import type { RootState } from '../store';
import { ACTION_NAME, BASE_URL, PATH_URL } from '@/utils/constants';

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
    path: string;
    pro?: boolean;
    new?: boolean;
    componentName: string;
    componentType?: string;
    pageData?: PageData[];
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

        const basePath = `/${routeMapping[item.componentName] || item.componentName.toLowerCase().replace(/\s+/g, '-')}`;

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
            navItem.subItems = item.submenu.map((subItem: any) => ({
                name: subItem.title,
                path: `${basePath}/${subItem.componentName.toLowerCase().replace(/\s+/g, '-')}`,
                componentName: subItem.componentName,
                componentType: subItem.componentType || null,
                pageData: subItem.pageData,
                pro: false,
                new: false
            }));
            // Remove path from parent if it has subItems
            delete navItem.path;
        }

        return navItem;
    });
};

// Create async thunk for fetching menu
export const fetchMenuItems = createAsyncThunk(
    'menu/fetchMenuItems',
    async () => {
        const userData = {
            UserId: localStorage.getItem('userId') || '',
            UserType: localStorage.getItem('userType') || ''
        };

        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"MOBILEMENU","RequestFrom" :"W"</J_Ui>
            <Sql></Sql>
            <X_Filter>
                <UserId>${userData.UserId}</UserId>
            </X_Filter>
            <J_Api>"UserId":"${userData.UserId}","UserType":"${userData.UserType}","AccYear":24,"MyDbPrefix":"SVVS","MemberCode":"undefined","SecretKey":"undefined"</J_Api>
        </dsXml>`;

        const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
            headers: {
                'Content-Type': 'application/xml',
                'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
            }
        });

        return convertToNavItems(response.data.data.rs0);
    }
);

// Create slice
const menuSlice = createSlice({
    name: 'menu',
    initialState,
    reducers: {
        // Add any additional reducers if needed
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMenuItems.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchMenuItems.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchMenuItems.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch menu items';
            });
    },
});

// Export selectors
export const selectAllMenuItems = (state: RootState) => state.menu.items;
export const selectMenuStatus = (state: RootState) => state.menu.status;
export const selectMenuError = (state: RootState) => state.menu.error;

export default menuSlice.reducer; 