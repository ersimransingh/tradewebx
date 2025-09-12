import CryptoJS from 'crypto-js';
import { SECURITY_CONFIG } from './securityConfig';

// Define localStorage keys and their expected types
export const STORAGE_KEYS = {
    // Authentication
    USER_ID: 'userId',
    AUTH_TOKEN: 'auth_token',
    TEMP_TOKEN: 'temp_token',
    REFRESH_TOKEN: 'refreshToken',
    TOKEN_EXPIRE_TIME: 'tokenExpireTime',
    CLIENT_CODE: 'clientCode',
    CLIENT_NAME: 'clientName',
    USER_TYPE: 'userType',
    LOGIN_TYPE: 'loginType',

    // EKYC related
    EKYC_DYNAMIC_DATA: 'ekyc_dynamicData',
    EKYC_ACTIVE_TAB: 'ekyc_activeTab',
    EKYC_REDIRECTED_FIELD: 'redirectedField',
    EKYC_SUBMIT: 'ekyc_submit',
    EKYC_VIEW_MODE: 'ekyc_viewMode',
    EKYC_VIEW_MODE_FOR_CHECKER: 'ekyc_viewMode_for_checker',
    EKYC_CHECKER: 'ekyc_checker',

    // Security
    AUTH_TOKEN_INTEGRITY: 'auth_token_integrity',
    REFRESH_TOKEN_INTEGRITY: 'refreshToken_integrity',
    LOGIN_ATTEMPTS: 'login_attempts',
    LAST_LOGIN_ATTEMPT: 'last_login_attempt',

    // Other
    KRA_REDIRECTED_FIELD: 'KRAredirectedField',
    REKYC_ROW_DATA_VIEW_MODE: 'rekycRowData_viewMode',
} as const;

// Storage version for migration
const STORAGE_VERSION = '1.0.0';
const STORAGE_VERSION_KEY = 'storage_version';

// Sensitive keys that need integrity checks
const SENSITIVE_KEYS = [STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.REFRESH_TOKEN];

export interface StorageItem {
    value: string;
    timestamp: number;
    version: string;
}

export interface StorageValidationResult {
    isValid: boolean;
    error?: string;
    needsCleanup?: boolean;
}

class LocalStorageManager {
    private isClient: boolean;
    private integrityKey: string;

    constructor() {
        this.isClient = typeof window !== 'undefined';
        this.integrityKey = SECURITY_CONFIG.REQUEST_SIGNATURE_KEY;
    }

    // Initialize storage with version check
    initialize(): void {
        if (!this.isClient) return;

        try {
            const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY);

            if (!currentVersion || currentVersion !== STORAGE_VERSION) {
                console.log('Storage version mismatch, performing cleanup...');
                this.performCleanup();
                localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
            }
        } catch (error) {
            console.error('Failed to initialize localStorage:', error);
            this.performCleanup();
        }
    }

    // Safe setItem with integrity checks
    setItem(key: string, value: string): boolean {
        if (!this.isClient) return false;

        try {
            // Validate value before storing
            if (!this.validateValue(value)) {
                console.warn(`Invalid value for key ${key}:`, value);
                return false;
            }

            // Store the value
            localStorage.setItem(key, value);

            // Add integrity check for sensitive keys
            if (SENSITIVE_KEYS.includes(key as any)) {
                const integrityHash = this.generateIntegrityHash(value);
                localStorage.setItem(`${key}_integrity`, integrityHash);
            }

            return true;
        } catch (error) {
            console.error(`Failed to set localStorage item ${key}:`, error);
            return false;
        }
    }

    // Safe getItem with integrity validation
    getItem(key: string): string | null {
        if (!this.isClient) return null;

        try {
            const value = localStorage.getItem(key);

            if (!value) return null;

            // Validate integrity for sensitive keys
            if (SENSITIVE_KEYS.includes(key as any)) {
                const validation = this.validateIntegrity(key, value);
                if (!validation.isValid) {
                    console.warn(`Integrity check failed for ${key}:`, validation.error);
                    this.removeItem(key);
                    return null;
                }
            }

            return value;
        } catch (error) {
            console.error(`Failed to get localStorage item ${key}:`, error);
            return null;
        }
    }

    // Safe removeItem
    removeItem(key: string): boolean {
        if (!this.isClient) return false;

        try {
            localStorage.removeItem(key);
            // Also remove integrity hash if it exists
            localStorage.removeItem(`${key}_integrity`);
            return true;
        } catch (error) {
            console.error(`Failed to remove localStorage item ${key}:`, error);
            return false;
        }
    }

    // Clear all application data
    clearAll(): void {
        if (!this.isClient) return;

        try {
            // Get theme data to preserve
            const themeData = {
                appMetadata: localStorage.getItem('APP_METADATA_KEY'),
                themeColors: localStorage.getItem('THEME_COLORS_STORAGE_KEY'),
                theme: localStorage.getItem('THEME_STORAGE_KEY'),
            };

            // Clear all localStorage
            localStorage.clear();

            // Restore theme data
            if (themeData.appMetadata) {
                localStorage.setItem('APP_METADATA_KEY', themeData.appMetadata);
            }
            if (themeData.themeColors) {
                localStorage.setItem('THEME_COLORS_STORAGE_KEY', themeData.themeColors);
            }
            if (themeData.theme) {
                localStorage.setItem('THEME_STORAGE_KEY', themeData.theme);
            }

            // Set version
            localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }

    // Clear only authentication data
    clearAuthData(): void {
        if (!this.isClient) return;

        const authKeys = [
            STORAGE_KEYS.USER_ID,
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.TEMP_TOKEN,
            STORAGE_KEYS.REFRESH_TOKEN,
            STORAGE_KEYS.TOKEN_EXPIRE_TIME,
            STORAGE_KEYS.CLIENT_CODE,
            STORAGE_KEYS.CLIENT_NAME,
            STORAGE_KEYS.USER_TYPE,
            STORAGE_KEYS.LOGIN_TYPE,
            STORAGE_KEYS.AUTH_TOKEN_INTEGRITY,
            STORAGE_KEYS.REFRESH_TOKEN_INTEGRITY,
            STORAGE_KEYS.LOGIN_ATTEMPTS,
            STORAGE_KEYS.LAST_LOGIN_ATTEMPT,
        ];

        authKeys.forEach(key => this.removeItem(key));
    }

    // Clear EKYC data
    clearEkycData(): void {
        if (!this.isClient) return;

        const ekycKeys = [
            STORAGE_KEYS.EKYC_DYNAMIC_DATA,
            STORAGE_KEYS.EKYC_ACTIVE_TAB,
            STORAGE_KEYS.EKYC_REDIRECTED_FIELD,
            STORAGE_KEYS.EKYC_SUBMIT,
            STORAGE_KEYS.EKYC_VIEW_MODE,
            STORAGE_KEYS.EKYC_VIEW_MODE_FOR_CHECKER,
            STORAGE_KEYS.EKYC_CHECKER,
            STORAGE_KEYS.REKYC_ROW_DATA_VIEW_MODE,
        ];

        ekycKeys.forEach(key => this.removeItem(key));
    }

    // Validate localStorage health
    validateStorage(): StorageValidationResult {
        if (!this.isClient) {
            return { isValid: true };
        }

        try {
            const issues: string[] = [];

            // Check for corrupted sensitive data
            for (const key of SENSITIVE_KEYS) {
                const value = localStorage.getItem(key);
                if (value) {
                    const validation = this.validateIntegrity(key, value);
                    if (!validation.isValid) {
                        issues.push(`Corrupted ${key}: ${validation.error}`);
                    }
                }
            }

            // Check for expired tokens
            const tokenExpireTime = localStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRE_TIME);
            if (tokenExpireTime) {
                const expireTime = parseInt(tokenExpireTime);
                if (!isNaN(expireTime) && Date.now() > expireTime) {
                    issues.push('Token has expired');
                }
            }

            // Check for inconsistent auth state
            const hasAuthToken = !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            const hasUserId = !!localStorage.getItem(STORAGE_KEYS.USER_ID);
            const hasClientCode = !!localStorage.getItem(STORAGE_KEYS.CLIENT_CODE);

            if (hasAuthToken && (!hasUserId || !hasClientCode)) {
                issues.push('Inconsistent authentication state');
            }

            return {
                isValid: issues.length === 0,
                error: issues.join('; '),
                needsCleanup: issues.length > 0,
            };
        } catch (error) {
            return {
                isValid: false,
                error: `Storage validation failed: ${error}`,
                needsCleanup: true,
            };
        }
    }

    // Perform cleanup of corrupted data
    performCleanup(): void {
        if (!this.isClient) return;

        console.log('Performing localStorage cleanup...');

        try {
            // Clear all data
            this.clearAll();

            // Clear any remaining corrupted items
            const keysToCheck = Object.values(STORAGE_KEYS);
            keysToCheck.forEach(key => {
                try {
                    localStorage.getItem(key);
                } catch (error) {
                    console.warn(`Removing corrupted key ${key}:`, error);
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Cleanup failed:', error);
            // Last resort: clear everything
            try {
                localStorage.clear();
            } catch (clearError) {
                console.error('Failed to clear localStorage completely:', clearError);
            }
        }
    }

    // Private helper methods
    private validateValue(value: string): boolean {
        if (typeof value !== 'string') return false;
        if (value.length > 10000) return false; // Reasonable limit
        return true;
    }

    private generateIntegrityHash(value: string): string {
        return CryptoJS.SHA256(value + this.integrityKey).toString();
    }

    private validateIntegrity(key: string, value: string): StorageValidationResult {
        try {
            const storedHash = localStorage.getItem(`${key}_integrity`);
            if (!storedHash) {
                return { isValid: false, error: 'Missing integrity hash' };
            }

            const expectedHash = this.generateIntegrityHash(value);
            if (storedHash !== expectedHash) {
                return { isValid: false, error: 'Integrity hash mismatch' };
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: `Integrity validation failed: ${error}` };
        }
    }
}

// Export singleton instance
export const localStorageManager = new LocalStorageManager();

// Initialize on import
if (typeof window !== 'undefined') {
    localStorageManager.initialize();
}
