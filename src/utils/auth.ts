import axios from 'axios';
import { BASE_PATH_FRONT_END, BASE_URL, OTP_VERIFICATION_URL, ENABLE_FERNET, ACTION_NAME } from './constants';
import { clearIndexedDB, getLocalStorage, removeLocalStorage, storeLocalStorage, decodeFernetToken } from './helper';
import { store } from '@/redux/store';


// OTP Axios Instance (NO INTERCEPTORS)
const TEMP_OTP_TOKEN_KEY = 'temp_otp_token';
export const otpApi = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/xml',
  },
});

otpApi.interceptors.request.use(
  (config) => {
    const tempToken = getLocalStorage(TEMP_OTP_TOKEN_KEY);

   if (tempToken) {
      // Attach as Bearer token
      config.headers.Authorization = `Bearer ${tempToken}`;

    } else {
      console.warn('Temp OTP token missing');
    }

    return config;
  },
  (error) => Promise.reject(error)
);



// Create axios instance with default config
export const api = axios.create({
  baseURL: BASE_URL + '/TradeWebAPI/api',
});

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;

    } else {
      console.warn('⚠️ [auth.ts] No token available for request to:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration and refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  failedQueue = [];
};

const refreshAuthToken = async (): Promise<string> => {
  const refreshToken = getLocalStorage('refreshToken');
  const userId = getLocalStorage('userId');
  const userType = getLocalStorage('userType');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const refreshData = `<dsXml>
    <J_Ui>"ActionName":"${ACTION_NAME}","Option":"Refresh"</J_Ui>
    <Sql/>
    <X_Filter></X_Filter>
    <X_Data>
        <RefreshToken>${refreshToken}</RefreshToken>
    </X_Data>
    <J_Api>"UserId":"${userId}", "UserType":"${userType}"</J_Api>
</dsXml>`;


  try {
    // Create a new axios instance to bypass interceptors for refresh token requests
    const refreshAxios = axios.create();

    const response = await refreshAxios.post(
      BASE_URL + OTP_VERIFICATION_URL,
      refreshData,
      {
        headers: {
          'Content-Type': 'application/xml'
        },
        timeout: 30000
      }
    );



    // Check both ENABLE_FERNET constant and encPayload from Redux state
    const shouldDecode = ENABLE_FERNET && store.getState().common.encPayload;
    const data = shouldDecode ? decodeFernetToken(response.data.data) : response.data;



    if (data.success && data.data.rs0.length > 0) {
      const tokenData = data.data.rs0[0];

     
      storeLocalStorage('auth_token', tokenData.AccessToken);
      storeLocalStorage('refreshToken', tokenData.RefreshToken);

      // Verify tokens were stored correctly
      // const storedAccessToken = getLocalStorage('auth_token');
      // const storedRefreshToken = getLocalStorage('refreshToken');

      return tokenData.AccessToken;
    } else {
      console.error('Refresh token API returned unsuccessful response:', data);
      throw new Error('Failed to refresh token');
    }
  } catch (error: any) {
    console.error('🚨 [auth.ts] Token refresh failed:', error);


    // Handle different types of refresh token errors
    const errorStatus = error.response?.status;
    const errorMessage = error.response?.data?.message || error.message;

    if (errorStatus === 401) {
      console.warn('🚨 [auth.ts] Refresh token is invalid or expired (401). Showing session expired popup.');
    } else if (errorStatus === 403) {
      console.warn('🚨 [auth.ts] Refresh token access forbidden (403). Showing session expired popup.');
    } else if (errorStatus >= 500) {
      console.error('🚨 [auth.ts] Server error during token refresh (5xx). Showing session expired popup.');
    } else if (errorMessage && errorMessage.toLowerCase().includes('token')) {
      console.warn('🚨 [auth.ts] Token-related error during refresh. Showing session expired popup.');
    } else {
      console.warn('🚨 [auth.ts] Unknown error during token refresh. Showing session expired popup.');
    }

    // All refresh token errors should show session expired popup
    showSessionExpiredPopup();
    throw error;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          // Log token before retrying queued request
          // const queuedToken = getAuthToken();
         
          // The request interceptor will automatically inject the fresh token
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // const newToken = await refreshAuthToken();

        // Wait a moment to ensure token is fully stored in encrypted localStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify the new token is available and retry until we get the new token
        let retryCount = 0;
        let verifyToken = getAuthToken();

        // If we still have the old token, wait a bit more (up to 500ms total)
        while (retryCount < 4 && (!verifyToken || verifyToken === originalRequest.headers?.['Authorization']?.replace('Bearer ', ''))) {
        
          await new Promise(resolve => setTimeout(resolve, 100));
          verifyToken = getAuthToken();
          retryCount++;
        }

      

        processQueue(null);

        // The request interceptor will automatically inject the fresh token
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Show session expired popup and logout if refresh fails
       
        showSessionExpiredPopup();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Show session expired popup with auto redirect
const showSessionExpiredPopup = (): void => {
  if (typeof window === 'undefined') return;

  // Don't show popup if already on signin page
  if (window.location.pathname.includes('/signin')) {
    logout();
    return;
  }

  // Prevent multiple popups
  if (document.getElementById('session-expired-modal')) {
    return;
  }

  // Create and show session expired modal
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'session-expired-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 400px;
    width: 90%;
    text-align: center;
    animation: modalSlideIn 0.3s ease-out;
  `;

  modalContent.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <div style="
        width: 64px;
        height: 64px;
        background-color: #FEF2F2;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1rem;
      ">
        <svg width="32" height="32" fill="#EF4444" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
      </div>
      <h3 style="
        font-size: 1.25rem;
        font-weight: 600;
        color: #1F2937;
        margin: 0 0 0.5rem;
      ">Session Expired</h3>
      <p style="
        color: #6B7280;
        margin: 0 0 1.5rem;
        line-height: 1.5;
      ">Your session has expired due to inactivity. Please log in again to continue.</p>
    </div>
    <button id="session-expired-ok-btn-auth" style="
      background-color: #3B82F6;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.2s;
      width: 100%;
    ">Go to Login</button>
  `;

  // Add CSS animation if not already added
  if (!document.getElementById('session-expired-styles')) {
    const style = document.createElement('style');
    style.id = 'session-expired-styles';
    style.textContent = `
      @keyframes modalSlideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Handle button click
  const okButton = document.getElementById('session-expired-ok-btn-auth');
  if (okButton) {
    okButton.addEventListener('click', () => {
      logout();
    });
  }

  // Auto redirect after 10 seconds
  setTimeout(() => {
    if (document.getElementById('session-expired-modal')) {
      logout();
    }
  }, 10000);
};

export const logout = () => {
  // Remove modal if it exists
  const modal = document.getElementById('session-expired-modal');
  if (modal) {
    modal.remove();
  }

  // Clear all authentication data
  clearAllAuthData();
  sessionStorage.clear();
  // Redirect to login page - Next.js basePath config handles the base path automatically
  window.location.href = `${BASE_PATH_FRONT_END}/signin`;
};

export const isAuthenticated = () => {
  const token = getAuthToken();
  if (!token) return false;

  // Check if token is expired
  // const expireTime = localStorage.getItem('tokenExpireTime');
  // if (expireTime && new Date(expireTime) < new Date()) {
  //   logout();
  //   clearIndexedDB();
  //   return false;
  // }

  return true;
};

export const getAuthToken = () => {
  const token = getLocalStorage('auth_token');
 
  return token;
};

export const getUserData = () => {
  return {
    clientCode: getLocalStorage('clientCode'),
    clientName: getLocalStorage('clientName'),
    userType: getLocalStorage('userType'),
  };
};


// OTP Token Helpers
export const storeTempOtpToken = (token: string) => {
  storeLocalStorage(TEMP_OTP_TOKEN_KEY, token);
};

export const clearTempOtpToken = () => {
  removeLocalStorage(TEMP_OTP_TOKEN_KEY);
};


export const clearAuthStorage = () => {
  removeLocalStorage('userId');
  removeLocalStorage('temp_token');
  removeLocalStorage('tokenExpireTime');
  removeLocalStorage('clientCode');
  removeLocalStorage('clientName');
  removeLocalStorage('userType');
  removeLocalStorage('loginType');

  // ekyc related states 
  removeLocalStorage('ekyc_dynamicData');
  removeLocalStorage('ekyc_activeTab');
  removeLocalStorage('redirectedField');
  removeLocalStorage('ekyc_submit');
  removeLocalStorage('ekyc_viewMode');
  removeLocalStorage("ekyc_viewMode_for_checker");
  removeLocalStorage('ekyc_checker');
  removeLocalStorage('ekyc_submit');
  removeLocalStorage('ekyc_viewMode');
  removeLocalStorage("ekyc_viewMode_for_checker");
  removeLocalStorage('ekyc_checker');
  removeLocalStorage("queryFormAuth");
  clearIndexedDB();
};

// Comprehensive function to clear all authentication data
export const clearAllAuthData = () => {
  if (typeof window !== 'undefined') {
    // Clear all authentication-related localStorage items
    removeLocalStorage('userId');
    removeLocalStorage('auth_token');
    removeLocalStorage('refreshToken');
    removeLocalStorage('tokenExpireTime');
    removeLocalStorage('clientCode');
    removeLocalStorage('clientName');
    removeLocalStorage('userType');
    removeLocalStorage('loginType');
    removeLocalStorage('temp_token');

    // Clear ekyc related states
    removeLocalStorage('ekyc_dynamicData');
    removeLocalStorage('ekyc_activeTab');
    removeLocalStorage('redirectedField');
    removeLocalStorage('ekyc_submit');
    removeLocalStorage('ekyc_viewMode');
    removeLocalStorage('ekyc_viewMode_for_checker');
    removeLocalStorage('ekyc_checker');

    // Clear any other auth-related items
    removeLocalStorage('auth_token_integrity');
    removeLocalStorage('login_attempts');
    removeLocalStorage('KRAredirectedField');
    removeLocalStorage("queryFormAuth");

    // Clear IndexedDB
    clearIndexedDB();
    //Removed TempOTP
    removeLocalStorage('temp_otp_token');
    

  }
};