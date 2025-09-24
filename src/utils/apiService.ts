import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { BASE_PATH_FRONT_END, BASE_URL, ENABLE_FERNET, OTP_VERIFICATION_URL } from './constants';
import { toast } from 'react-toastify';
import CryptoJS from 'crypto-js';
import { SECURITY_CONFIG, isAllowedHttpHost } from './securityConfig';
import { clearAllAuthData } from './auth';
import { decodeFernetToken, getLocalStorage, storeLocalStorage } from './helper';
import { store } from '@/redux/store';

// Router instance for navigation
let routerInstance: any = null;

// Types for API responses
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    signature?: string; // Add signature for response validation
}

// Types for refresh token response
interface RefreshTokenResponse {
    success: boolean;
    data: {
        data?: string;
        rs0: Array<{
            AccessToken: string;
            RefreshToken: string;
        }>;
    };
}

// Types for token validation response


// API Service Class
class ApiService {
    private defaultTimeout: number = SECURITY_CONFIG.REQUEST_TIMEOUT;
    private isRefreshing: boolean = false;
    private isHandlingSessionExpiry: boolean = false;
    private failedQueue: Array<{
        resolve: (value?: any) => void;
        reject: (error?: any) => void;
    }> = [];
    private requestCount: number = 0;


    constructor() {
        this.setupInterceptors();
        this.setupSecurityChecks();
    }

    // Set router instance for navigation
    setRouter(router: any): void {
        routerInstance = router;
    }

    // Setup security checks
    private setupSecurityChecks(): void {
        // HTTPS enforcement removed - HTTP is now allowed for all hosts

        // Prevent localStorage tampering detection
        this.setupLocalStorageProtection();
    }

    // Setup localStorage protection
    private setupLocalStorageProtection(): void {
        if (typeof window === 'undefined') return;

        // Check if development mode is enabled
        const isDevMode = process.env.NEXT_DEVELOPMENT_MODE === 'true';

        // Skip localStorage protection for localhost, development, and when development mode is enabled
        const hostname = window.location.hostname;
        const isDevelopment = isDevMode ||
            process.env.NODE_ENV === 'development' ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0';

        if (isDevelopment) {
            console.log('LocalStorage protection disabled for development environment');
            return;
        }

        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        const originalRemoveItem = localStorage.removeItem;

        // Override setItem to add integrity check
        localStorage.setItem = (key: string, value: string) => {
            if (key === 'auth_token' || key === 'refreshToken') {
                // Add integrity hash to sensitive data
                const integrityHash = CryptoJS.SHA256(value + SECURITY_CONFIG.REQUEST_SIGNATURE_KEY).toString();
                originalSetItem.call(localStorage, key, value);
                originalSetItem.call(localStorage, `${key}_integrity`, integrityHash);
            } else {
                originalSetItem.call(localStorage, key, value);
            }
        };

        // Override getItem to verify integrity
        localStorage.getItem = (key: string) => {
            const value = originalGetItem.call(localStorage, key);
            if (key === 'auth_token' || key === 'refreshToken') {
                const storedIntegrity = originalGetItem.call(localStorage, `${key}_integrity`);
                if (value && storedIntegrity) {
                    const expectedIntegrity = CryptoJS.SHA256(value + SECURITY_CONFIG.REQUEST_SIGNATURE_KEY).toString();
                    if (storedIntegrity !== expectedIntegrity) {
                        console.error('Token integrity check failed - possible tampering detected');
                        this.handleSecurityViolation('Token tampering detected');
                        return null;
                    }
                }
            }
            return value;
        };

        // Override removeItem to clean up integrity hashes
        localStorage.removeItem = (key: string) => {
            originalRemoveItem.call(localStorage, key);
            originalRemoveItem.call(localStorage, `${key}_integrity`);
        };
    }

    // Handle security violations
    private handleSecurityViolation(violation: string): void {
        console.error('Security Violation:', violation);

        // Check if development mode is enabled
        const isDevMode = process.env.NEXT_DEVELOPMENT_MODE === 'true';

        // Skip security violations for localhost, development, and when development mode is enabled
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const isDevelopment = isDevMode ||
            process.env.NODE_ENV === 'development' ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0';

        if (isDevelopment) {
            console.warn('Security violation ignored for development environment:', violation);
            return;
        }

        this.clearAuth();
        toast.error('Security violation detected. Please login again.');

        if (routerInstance) {
            routerInstance.replace('/signin');
        } else if (typeof window !== 'undefined') {
            window.location.href = '/signin';
        }
    }

    // Generate request signature
    private generateRequestSignature(data: any, timestamp: number): string {
        const payload = JSON.stringify(data) + timestamp + SECURITY_CONFIG.REQUEST_SIGNATURE_KEY;
        return CryptoJS.SHA256(payload).toString();
    }

    // Validate response signature
    private validateResponseSignature(response: any, signature: string): boolean {
        if (!signature) return false;
        const expectedSignature = CryptoJS.SHA256(JSON.stringify(response) + SECURITY_CONFIG.REQUEST_SIGNATURE_KEY).toString();
        return signature === expectedSignature;
    }



    // Setup axios interceptors for automatic token refresh and security
    private setupInterceptors(): void {
        // Request interceptor for security and token injection
        axios.interceptors.request.use(
            async (config) => {
                // Add request ID for tracking
                config.headers['X-Request-ID'] = `req_${Date.now()}_${++this.requestCount}`;

                // Add timestamp for replay attack prevention
                config.headers['X-Timestamp'] = Date.now().toString();

                // Add request signature
                if (config.data) {
                    const signature = this.generateRequestSignature(config.data, Date.now());
                    config.headers['X-Request-Signature'] = signature;
                }

                // Inject fresh token for every request (except for refresh token requests)
                const isRefreshTokenRequest = config.url?.includes(OTP_VERIFICATION_URL) &&
                    config.data?.toString().includes('Option":"Refresh');

                if (!isRefreshTokenRequest) {
                    const token = this.getAuthToken();
                    if (token) {
                        config.headers['Authorization'] = `Bearer ${token}`;
                        console.log('🔑 Token injected in request interceptor:', token.substring(0, 20) + '...');
                    } else {
                        console.warn('⚠️ No token available for request to:', config.url);
                    }
                } else {
                    console.log('🔄 Refresh token request detected, skipping token injection');
                }

                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor to handle 401 errors and security
        axios.interceptors.response.use(
            (response: AxiosResponse) => {
                // Check if development mode is enabled
                const isDevMode = process.env.NEXT_DEVELOPMENT_MODE === 'true';

                // Validate response signature if present (skip for localhost/development)
                const responseSignature = response.headers['x-response-signature'];
                if (responseSignature) {
                    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
                    const isDevelopment = isDevMode ||
                        process.env.NODE_ENV === 'development' ||
                        hostname === 'localhost' ||
                        hostname === '127.0.0.1' ||
                        hostname === '0.0.0.0';

                    if (!isDevelopment && !this.validateResponseSignature(response.data, responseSignature)) {
                        this.handleSecurityViolation('Response signature validation failed');
                        return Promise.reject(new Error('Response validation failed'));
                    }
                }

                return response;
            },
            async (error: AxiosError) => {
                const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

                if (error.response?.status === 401 && !originalRequest._retry) {
                    if (this.isRefreshing) {
                        // If already refreshing, queue the request
                        return new Promise((resolve, reject) => {
                            this.failedQueue.push({ resolve, reject });
                        }).then(() => {
                            return axios(originalRequest);
                        }).catch(err => {
                            return Promise.reject(err);
                        });
                    }

                    originalRequest._retry = true;
                    this.isRefreshing = true;

                    try {
                        await this.refreshAuthToken();
                        this.processQueue(null);

                        // The request interceptor will automatically inject the fresh token
                        // No need to manually update headers here
                        return axios(originalRequest);
                    } catch (refreshError) {
                        this.processQueue(refreshError);
                        this.handleRefreshFailure();
                        return Promise.reject(refreshError);
                    } finally {
                        this.isRefreshing = false;
                    }
                }

                // Handle other security-related errors
                if (error.response?.status === 403) {
                    this.handleSecurityViolation('Access denied - insufficient permissions');
                }

                return Promise.reject(error);
            }
        );
    }

    // Process queued requests after token refresh
    private processQueue(error: any): void {
        this.failedQueue.forEach(({ resolve, reject }) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });

        this.failedQueue = [];
    }

    // Handle refresh token failure
    private handleRefreshFailure(): void {
        // Prevent multiple session expiry handlers from running simultaneously
        if (this.isHandlingSessionExpiry) {
            return;
        }

        this.isHandlingSessionExpiry = true;
        console.log('handleRefreshFailure - Clearing all authentication data');

        // Clear all authentication data first
        this.clearAuth();

        // Skip session expiry handling for localhost and development
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const isDevelopment = process.env.NODE_ENV === 'development' ||
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0';

        if (isDevelopment) {
            console.warn('Session expiry handling disabled for development environment');
            this.isHandlingSessionExpiry = false;
            return;
        }

        // Only show toast if we're not already on the signin page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
            toast.error("Session expired. Please login again.");
        }

        // Use Next.js router for client-side navigation if available
        if (routerInstance) {
            routerInstance.replace('/signin');
        } else if (typeof window !== 'undefined') {
            // Fallback to window.location.href if router is not set
            window.location.href = '/signin';
        }

        // Reset the flag after a delay to allow for navigation
        setTimeout(() => {
            this.isHandlingSessionExpiry = false;
        }, 1000);
    }

    // Get authorization token from localStorage
    private getAuthToken(): string | null {
        const authToken = getLocalStorage('auth_token');
        return authToken;
    }

    // Get refresh token from localStorage
    private getRefreshToken(): string | null {
        const refreshToken = getLocalStorage('refreshToken');
        return refreshToken;
    }

    // Refresh authentication token
    private async refreshAuthToken(): Promise<void> {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            console.log('No refresh token available');
            throw new Error('No refresh token available');
        }

        const refreshData = `<dsXml>
    <J_Ui>"ActionName":"TradeWeb","Option":"Refresh"</J_Ui>
    <Sql/>
    <X_Filter></X_Filter>
    <X_Data>
        <RefreshToken>${refreshToken}</RefreshToken>
    </X_Data>
    <J_Api>"UserId":"${getLocalStorage('userId')}", "UserType":"${getLocalStorage('userType')}"</J_Api>
</dsXml>`;

        console.log('Attempting to refresh token...');

        try {
            // Create a new axios instance to bypass interceptors for refresh token requests
            const refreshAxios = axios.create();

            const response = await refreshAxios.post<RefreshTokenResponse>(
                BASE_URL + OTP_VERIFICATION_URL,
                refreshData,
                {
                    headers: {
                        'Content-Type': 'application/xml'
                    },
                    timeout: this.defaultTimeout
                }
            );

            console.log('Refresh token API response:', response.status, response.data);
            const shouldDecode = ENABLE_FERNET && store.getState().common.encPayload;
            const data = shouldDecode && typeof response.data.data === 'string' ? decodeFernetToken(response.data.data) : response.data;
            if (data.success && data.data.rs0.length > 0) {
                const tokenData = data.data.rs0[0];

                // Update tokens in localStorage
                storeLocalStorage('auth_token', tokenData.AccessToken);
                storeLocalStorage('refreshToken', tokenData.RefreshToken);
                console.log('✅ Tokens refreshed successfully');
                console.log('🔑 New access token:', tokenData.AccessToken.substring(0, 20) + '...');
                console.log('🔄 New refresh token:', tokenData.RefreshToken.substring(0, 20) + '...');
            } else {
                console.error('Refresh token API returned unsuccessful response:', data);
                throw new Error('Failed to refresh token');
            }
        } catch (error: any) {
            console.error('Token refresh failed:', error);
            console.log('Error status:', error.response?.status);
            console.log('Error data:', error.response?.data);

            // If refresh token API itself returns 401, immediately logout the user
            if (error.response?.status === 401) {
                console.warn('Refresh token is invalid or expired (401). Logging out user.');
                this.handleRefreshFailure();
                throw new Error('Refresh token expired - user logged out');
            }

            throw error;
        }
    }

    // Create default headers with authorization
    private getDefaultHeaders(contentType: string = 'application/xml'): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': contentType
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Generic API call method
    async makeRequest<T>(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        url: string,
        data?: any,
        config?: AxiosRequestConfig,

    ): Promise<ApiResponse<T>> {
        try {
            const requestConfig: AxiosRequestConfig = {
                method,
                url,
                timeout: this.defaultTimeout,
                headers: {
                    'Content-Type': config?.headers?.['Content-Type'] || 'application/xml',
                    ...config?.headers
                },
                ...config
            };

            // Don't set Authorization header here - let the interceptor handle it
            // This ensures fresh tokens are always used

            if (data) {
                requestConfig.data = data;
            }

            const response: AxiosResponse<T> = await axios(requestConfig);

            // Check both ENABLE_FERNET constant and encPayload from Redux state
            const shouldDecode = ENABLE_FERNET && store.getState().common.encPayload;

            return {
                success: true,
                data: shouldDecode ? decodeFernetToken((response.data as any).data) : response.data,
                message: 'Request successful'
            };
        } catch (error: any) {
            console.error('API Error:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'An error occurred',
                message: 'Request failed'
            };
        }
    }

    // POST request with custom URL
    async postWithAuth(url: string, data: any, config?: AxiosRequestConfig): Promise<ApiResponse> {
        return this.makeRequest('POST', url, data, config);
    }

    // Generic GET request
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeRequest('GET', url, undefined, config);
    }

    // Generic POST request
    async post<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeRequest('POST', url, data, config);
    }

    // Generic PUT request
    async put<T>(url: string, data: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeRequest('PUT', url, data, config);
    }

    // Generic DELETE request
    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        return this.makeRequest('DELETE', url, undefined, config);
    }

    // Upload file
    async uploadFile(url: string, file: File, additionalData?: Record<string, any>): Promise<ApiResponse> {
        const formData = new FormData();
        formData.append('file', file);

        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, String(value));
            });
        }

        return this.makeRequest('POST', url, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }

    // Check token validity
    isTokenValid(): boolean {
        const token = this.getAuthToken();
        return !!token;
    }

    // Clear authentication
    clearAuth(): void {
        clearAllAuthData();
    }

    // Clear IndexedDB
    private clearIndexedDB(): void {
        if (typeof window !== 'undefined' && 'indexedDB' in window) {
            const request = indexedDB.deleteDatabase("ekycDB");

            request.onsuccess = () => {
                console.log("IndexedDB deleted successfully");
            };

            request.onerror = (event) => {
                console.error("Error deleting IndexedDB:", request.error);
            };

            request.onblocked = () => {
                console.warn("Database deletion blocked (probably open in another tab)");
            };
        }
    }
}

// Create and export singleton instance
const apiService = new ApiService();

// Helper function to set up router for the API service
// Usage: import { useRouter } from 'next/navigation'; setupApiRouter(useRouter());
export const setupApiRouter = (router: any): void => {
    apiService.setRouter(router);
};

export default apiService; 