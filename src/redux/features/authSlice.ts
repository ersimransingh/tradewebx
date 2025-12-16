import { clearIndexedDB, clearLocalStorage, getLocalStorage, removeLocalStorage } from '@/utils/helper';
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
    firstLogin:string | null;
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
    firstLogin:null,
};

const loadInitialState = (): AuthState => {
    if (typeof window === 'undefined') return defaultInitialState;

    const authToken = getLocalStorage('auth_token');
    const tokenExpireTime = getLocalStorage('tokenExpireTime');
    const isExpired = tokenExpireTime ? new Date(tokenExpireTime) < new Date() : false;

    // If token is missing or expired, start clean to avoid kicking off protected calls with stale data
    if (!authToken || isExpired) {
        removeLocalStorage('auth_token');
        removeLocalStorage('refreshToken');
        removeLocalStorage('tokenExpireTime');

        return {
            ...defaultInitialState,
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
            firstLogin:null
        };
    }

    return {
        isAuthenticated: !!authToken && !isExpired,
        userId: getLocalStorage('userId'),
        tempToken: getLocalStorage('temp_token'),
        authToken: authToken,
        refreshToken: getLocalStorage('refreshToken'),
        tokenExpireTime: tokenExpireTime,
        clientCode: getLocalStorage('clientCode'),
        clientName: getLocalStorage('clientName'),
        userType: getLocalStorage('userType'),
        loginType: getLocalStorage('loginType'),
        error: null,
        loading: false,
        firstLogin:getLocalStorage('firstLogin'),
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
            firstLogin?:string;
        }>) => {
            state.userId = action.payload.userId;
            state.tempToken = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
            state.tokenExpireTime = action.payload.tokenExpireTime;
            state.clientCode = action.payload.clientCode;
            state.clientName = action.payload.clientName;
            state.userType = action.payload.userType;
            state.loginType = action.payload.loginType;
            state.firstLogin = action.payload.firstLogin;
        },
        setFinalAuthData: (state, action: PayloadAction<{
            token: string;
            refreshToken?: string;
            tokenExpireTime: string;
            clientCode: string;
            clientName: string;
            userType: string;
            firstLogin?:string;
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
            state.firstLogin = action.payload.firstLogin;
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
