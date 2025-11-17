
const DB_NAME = 'IMS_POS_DB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      return resolve(dbInstance);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as any).errorCode);
        reject("Error opening DB");
    };
    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export function getFromDB<T>(key: string): Promise<T | undefined> {
  return new Promise(async (resolve, reject) => {
    try {
        const db = await getDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = (event) => {
            console.error("IndexedDB get error:", (event.target as any).errorCode);
            reject("Error getting data from DB");
        };
    } catch (error) {
        reject(error);
    }
  });
}

export function setInDB<T>(key: string, value: T): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
        const db = await getDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error("IndexedDB set error:", (event.target as any).errorCode);
            reject("Error setting data in DB");
        };
    } catch (error) {
        reject(error);
    }
  });
}
