
import React, { useState, useEffect, useCallback } from 'react';
import { getFromDB, setInDB } from '../utils/db';

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Effect to load value from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    getFromDB<T>(key).then(value => {
      if (!isMounted) return;
      if (value !== undefined && value !== null) { // Handle case where stored value is explicitly null
        setStoredValue(value);
      } else {
        // Use initialValue if nothing is in DB
        setStoredValue(initialValue);
        // And persist initialValue for next time
        setInDB(key, initialValue).catch(error => console.error(`Failed to set initial value in IndexedDB for key "${key}"`, error));
      }
    }).catch(error => {
      console.error(`Failed to get value from IndexedDB for key "${key}"`, error);
      if (isMounted) {
        setStoredValue(initialValue); // Fallback on error
      }
    });
    
    return () => { isMounted = false; };
  }, [key]); // Re-run if key changes

  const setValue = useCallback((valueOrFn: React.SetStateAction<T>) => {
    setStoredValue(currentValue => {
        const newValue = valueOrFn instanceof Function ? valueOrFn(currentValue) : valueOrFn;
        setInDB(key, newValue).catch(error => {
            console.error(`Failed to set value in IndexedDB for key "${key}"`, error);
        });
        return newValue;
    });
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
