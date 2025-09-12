import { useState, useEffect, useCallback } from 'react';
import { localStorageManager, STORAGE_KEYS } from '../utils/localStorageManager';
import { storageRecovery } from '../utils/storageRecovery';

export interface UseSafeLocalStorageOptions {
    key: string;
    defaultValue?: string | null;
    validate?: (value: string) => boolean;
    onError?: (error: string) => void;
    autoRecover?: boolean;
}

export function useSafeLocalStorage({
    key,
    defaultValue = null,
    validate,
    onError,
    autoRecover = true,
}: UseSafeLocalStorageOptions) {
    const [value, setValue] = useState<string | null>(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load value from localStorage
    const loadValue = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const storedValue = localStorageManager.getItem(key);

            if (storedValue === null) {
                setValue(defaultValue);
                return;
            }

            // Validate value if validator provided
            if (validate && !validate(storedValue)) {
                throw new Error(`Invalid value for key ${key}`);
            }

            setValue(storedValue);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);

            if (onError) {
                onError(errorMessage);
            }

            // Auto-recover if enabled
            if (autoRecover) {
                console.warn(`Auto-recovering from localStorage error for key ${key}:`, errorMessage);
                try {
                    await storageRecovery.checkAndRecover();
                    // Try to load again after recovery
                    const recoveredValue = localStorageManager.getItem(key);
                    setValue(recoveredValue || defaultValue);
                } catch (recoveryError) {
                    console.error('Recovery failed:', recoveryError);
                    setValue(defaultValue);
                }
            } else {
                setValue(defaultValue);
            }
        } finally {
            setIsLoading(false);
        }
    }, [key, defaultValue, validate, onError, autoRecover]);

    // Save value to localStorage
    const setStoredValue = useCallback((newValue: string | null) => {
        try {
            setError(null);

            if (newValue === null) {
                localStorageManager.removeItem(key);
                setValue(null);
                return;
            }

            // Validate value if validator provided
            if (validate && !validate(newValue)) {
                throw new Error(`Invalid value for key ${key}`);
            }

            const success = localStorageManager.setItem(key, newValue);
            if (success) {
                setValue(newValue);
            } else {
                throw new Error(`Failed to store value for key ${key}`);
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);

            if (onError) {
                onError(errorMessage);
            }
        }
    }, [key, validate, onError]);

    // Clear value
    const clearValue = useCallback(() => {
        try {
            setError(null);
            localStorageManager.removeItem(key);
            setValue(defaultValue);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);

            if (onError) {
                onError(errorMessage);
            }
        }
    }, [key, defaultValue, onError]);

    // Load value on mount
    useEffect(() => {
        loadValue();
    }, [loadValue]);

    return {
        value,
        setValue: setStoredValue,
        clearValue,
        isLoading,
        error,
        reload: loadValue,
    };
}

// Convenience hooks for common use cases
export function useAuthToken() {
    return useSafeLocalStorage({
        key: STORAGE_KEYS.AUTH_TOKEN,
        defaultValue: null,
        validate: (value) => value.length > 0,
        autoRecover: true,
    });
}

export function useUserId() {
    return useSafeLocalStorage({
        key: STORAGE_KEYS.USER_ID,
        defaultValue: null,
        validate: (value) => value.length > 0,
        autoRecover: true,
    });
}

export function useClientCode() {
    return useSafeLocalStorage({
        key: STORAGE_KEYS.CLIENT_CODE,
        defaultValue: null,
        validate: (value) => value.length > 0,
        autoRecover: true,
    });
}

export function useUserType() {
    return useSafeLocalStorage({
        key: STORAGE_KEYS.USER_TYPE,
        defaultValue: null,
        validate: (value) => ['Admin', 'Branch', 'User'].includes(value),
        autoRecover: true,
    });
}

export function useLoginType() {
    return useSafeLocalStorage({
        key: STORAGE_KEYS.LOGIN_TYPE,
        defaultValue: null,
        validate: (value) => value.length > 0,
        autoRecover: true,
    });
}
