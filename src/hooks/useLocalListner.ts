import { useState, useEffect } from 'react';
import { getLocalStorage } from '@/utils/helper';

export const useLocalStorage = (key: string, initialValue: any) => {
  const [value, setValue] = useState(initialValue);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const item = getLocalStorage(key)
      setValue(item ? item : initialValue);
    }
  }, [key, initialValue]);
  
  return [value, setValue];
};