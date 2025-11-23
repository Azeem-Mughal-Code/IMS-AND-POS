
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getFromDB, setInDB } from '../utils/db';

function usePersistedState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, (value: T) => Promise<void>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const hasSetState = useRef(false);

  // Effect to load value from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    getFromDB<T>(key).then(value => {
      if (!isMounted) return;
      // Only update from DB if state hasn't been touched by the app yet
      if (!hasSetState.current) {
          if (value !== undefined && value !== null) {
            setStoredValue(value);
          } else {
            // Use initialValue if nothing is in DB
            setStoredValue(initialValue);
            // And persist initialValue for next time
            setInDB(key, initialValue).catch(error => console.error(`Failed to set initial value in IndexedDB for key "${key}"`, error));
          }
      }
    }).catch(error => {
      console.error(`Failed to get value from IndexedDB for key "${key}"`, error);
      if (isMounted && !hasSetState.current) {
        setStoredValue(initialValue); // Fallback on error
      }
    });
    
    return () => { isMounted = false; };
  }, [key]); // Re-run if key changes

  const setValue = useCallback((valueOrFn: React.SetStateAction<T>) => {
    hasSetState.current = true;
    setStoredValue(currentValue => {
        const newValue = valueOrFn instanceof Function ? valueOrFn(currentValue) : valueOrFn;
        setInDB(key, newValue).catch(error => {
            console.error(`Failed to set value in IndexedDB for key "${key}"`, error);
        });
        return newValue;
    });
  }, [key]);

  const setValueAsync = useCallback(async (value: T) => {
      hasSetState.current = true;
      setStoredValue(value);
      try {
          await setInDB(key, value);
      } catch (error) {
          console.error(`Failed to set value in IndexedDB for key "${key}"`, error);
      }
  }, [key]);

  return [storedValue, setValue, setValueAsync];
}

export default usePersistedState;
