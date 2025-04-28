import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { APP_METADATA_KEY, ACTION_NAME, BASE_URL, OTP_VERIFICATION_URL, PATH_URL } from '@/utils/constants';

interface CommonState {
    tableStyle: 'small' | 'medium' | 'large';
    lastTradingDate: string | null;
    companyLogo: string;
    companyName: string;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    companyInfo: {
        CompanyCode?: string;
        CompanyName?: string;
        PasswordMaxLength?: number;
        CompanyLogo?: string;
        DPID?: string;
    } | null;
}

const initialState: CommonState = {
    tableStyle: 'small',
    lastTradingDate: null,
    companyLogo: '',
    companyName: '',
    status: 'idle',
    error: null,
    companyInfo: null,
};

// Async thunk for fetching last trading date
export const fetchLastTradingDate = createAsyncThunk(
    'common/fetchLastTradingDate',
    async () => {
        const userId = localStorage.getItem('userId') || '';
        const userType = localStorage.getItem('userType') || '';
        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"LastTradingDate","Level":1, "RequestFrom":"W"</J_Ui>
            <Sql></Sql>
            <X_Filter></X_Filter>
            <X_GFilter></X_GFilter>
            <J_Api>"UserId":"${userId}", "UserType":"${userType}"</J_Api>
        </dsXml>`;

        const response = await axios.post(BASE_URL + PATH_URL, xmlData, {
            headers: {
                'Content-Type': 'application/xml',
                'Authorization': `Bearer ${document.cookie.split('auth_token=')[1]}`
            }
        });

        return response.data.data.rs0[0].LastTradeDate || '';
    }
);

// Async thunk for initializing login API
export const fetchInitializeLogin = createAsyncThunk(
    'common/fetchInitializeLogin',
    async () => {
        const xmlData = `<dsXml>
            <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"InitializeLogin", "Level":1, "RequestFrom":"w"</J_Ui>
            <Sql></Sql>
            <X_Filter> </X_Filter>
            <X_Data></X_Data>
            <X_GFilter />
            <J_Api></J_Api>
        </dsXml>`;

        const response = await axios.post(BASE_URL + OTP_VERIFICATION_URL, xmlData, {
            headers: {
                'Content-Type': 'application/xml',
            }
        });

        if (response.data.success && response.data.data && response.data.data.rs0 && response.data.data.rs0.length > 0) {
            return response.data.data.rs0[0];
        }

        throw new Error('Invalid response format');
    }
);

export const commonSlice = createSlice({
    name: 'common',
    initialState,
    reducers: {
        setTableStyle: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
            state.tableStyle = action.payload;
        },
        setLastTradingDate: (state, action: PayloadAction<string>) => {
            state.lastTradingDate = action.payload;
        },
        setCompanyDetails: (state, action: PayloadAction<{ logo: string; name: string }>) => {
            state.companyLogo = action.payload.logo;
            state.companyName = action.payload.name;
        },
    },
    extraReducers: (builder) => {
        builder
            // Handle fetchLastTradingDate
            .addCase(fetchLastTradingDate.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchLastTradingDate.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.lastTradingDate = action.payload;
            })
            .addCase(fetchLastTradingDate.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to fetch last trading date';
            })

            // Handle fetchInitializeLogin
            .addCase(fetchInitializeLogin.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchInitializeLogin.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.companyInfo = action.payload;

                // Also update the companyLogo and companyName for backward compatibility
                state.companyLogo = action.payload.CompanyLogo || '';
                state.companyName = action.payload.CompanyName ? action.payload.CompanyName.trim() : '';

                // Save to localStorage for persistence
                const appMetadata = {
                    companyLogo: state.companyLogo,
                    companyName: state.companyName
                };
                localStorage.setItem(APP_METADATA_KEY, JSON.stringify(appMetadata));
            })
            .addCase(fetchInitializeLogin.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message || 'Failed to initialize login';
            });
    },
});

export const { setTableStyle, setLastTradingDate, setCompanyDetails } = commonSlice.actions;
export default commonSlice.reducer; 