import { APP_METADATA_KEY } from '@/utils/constants';
import { clearLocalStorage } from '@/utils/helper';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    isAuthenticated: boolean;
    userId: string | null;
    tempToken: string | null;  // Used during OTP verification
    authToken: string | null;  // Final token after OTP verification
    tokenExpireTime: string | null;
    clientCode: string | null;
    clientName: string | null;
    userType: string | null;
    loginType: string | null;
    error: string | null;
    loading: boolean;
}

// Define a default initial state first to avoid circular reference
const defaultInitialState: AuthState = {
    isAuthenticated: false,
    userId: null,
    tempToken: null,
    authToken: null,
    tokenExpireTime: null,
    clientCode: null,
    clientName: null,
    userType: null,
    loginType: null,
    error: null,
    loading: false,
};

const loadInitialState = (): AuthState => {
    if (typeof window === 'undefined') return defaultInitialState;

    return {
        isAuthenticated: !!document.cookie.includes('auth_token='),
        userId: localStorage.getItem('userId'),
        tempToken: localStorage.getItem('temp_token'),
        authToken: document.cookie.match(/auth_token=([^;]+)/)?.[1] || null,
        tokenExpireTime: localStorage.getItem('tokenExpireTime'),
        clientCode: localStorage.getItem('clientCode'),
        clientName: localStorage.getItem('clientName'),
        userType: localStorage.getItem('userType'),
        loginType: localStorage.getItem('loginType'),
        error: null,
        loading: false,
    };
};

const initialState: AuthState = loadInitialState();

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        setAuthData: (state, action: PayloadAction<{
            userId: string;
            token: string;
            tokenExpireTime: string;
            clientCode: string;
            clientName: string;
            userType: string;
            loginType: string;
        }>) => {
            state.userId = action.payload.userId;
            state.tempToken = action.payload.token;
            state.tokenExpireTime = action.payload.tokenExpireTime;
            state.clientCode = action.payload.clientCode;
            state.clientName = action.payload.clientName;
            state.userType = action.payload.userType;
            state.loginType = action.payload.loginType;
        },
        setFinalAuthData: (state, action: PayloadAction<{
            token: string;
            tokenExpireTime: string;
            clientCode: string;
            clientName: string;
            userType: string;
        }>) => {
            state.isAuthenticated = true;
            state.authToken = action.payload.token;
            state.tempToken = null; // Clear temp token
            state.tokenExpireTime = action.payload.tokenExpireTime;
            state.clientCode = action.payload.clientCode;
            state.clientName = action.payload.clientName;
            state.userType = action.payload.userType;
        },
        logout: (state) => {
            // Clear cookies
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            clearLocalStorage();
            return defaultInitialState;
        },
    },
});

export const { setLoading, setError, setAuthData, setFinalAuthData, logout } = authSlice.actions;
export default authSlice.reducer; 