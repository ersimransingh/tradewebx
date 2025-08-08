import { APP_METADATA_KEY } from '@/utils/constants';
import { clearIndexedDB, clearLocalStorage } from '@/utils/helper';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    isAuthenticated: boolean;
    userId: string | null;
    tempToken: string | null;  // Used during OTP verification
    authToken: string | null;  // Final token after OTP verification
    refreshToken: string | null;
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
    refreshToken: null,
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

    const authToken = localStorage.getItem('auth_token');

    return {
        isAuthenticated: !!authToken,
        userId: localStorage.getItem('userId'),
        tempToken: localStorage.getItem('temp_token'),
        authToken: authToken,
        refreshToken: localStorage.getItem('refreshToken'),
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
            refreshToken: string;
            tokenExpireTime: string;
            clientCode: string;
            clientName: string;
            userType: string;
            loginType: string;
        }>) => {
            state.userId = action.payload.userId;
            state.tempToken = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
            state.tokenExpireTime = action.payload.tokenExpireTime;
            state.clientCode = action.payload.clientCode;
            state.clientName = action.payload.clientName;
            state.userType = action.payload.userType;
            state.loginType = action.payload.loginType;
        },
        setFinalAuthData: (state, action: PayloadAction<{
            token: string;
            refreshToken?: string;
            tokenExpireTime: string;
            clientCode: string;
            clientName: string;
            userType: string;
        }>) => {
            state.isAuthenticated = true;
            state.authToken = action.payload.token;
            state.tempToken = null; // Clear temp token
            if (action.payload.refreshToken) {
                state.refreshToken = action.payload.refreshToken;
            }
            state.tokenExpireTime = action.payload.tokenExpireTime;
            state.clientCode = action.payload.clientCode;
            state.clientName = action.payload.clientName;
            state.userType = action.payload.userType;
        },
        logout: (state) => {
            // Clear localStorage only
            clearLocalStorage();
            clearIndexedDB();
            return defaultInitialState;
        },
    },
});

export const { setLoading, setError, setAuthData, setFinalAuthData, logout } = authSlice.actions;
export default authSlice.reducer; 