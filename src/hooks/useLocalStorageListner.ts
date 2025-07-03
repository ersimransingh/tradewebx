// Create a new file hooks/useLocalStorage.ts
import { useState, useEffect } from 'react';

export function useLocalStorageListener(key: string, initialValue: any) {
    const [value, setValue] = useState(() => {
        if (typeof window !== 'undefined') {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : initialValue;
        }
        return initialValue;
    });

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key) {
                setValue(e.newValue ? JSON.parse(e.newValue) : initialValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key, initialValue]);

    return value;
}