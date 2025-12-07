
import Dexie, { Table } from 'dexie';
import { Product, Sale, Customer, PurchaseOrder, Supplier, User, Workspace, Shift, HeldOrder, Category, InventoryAdjustment, Notification } from '../types';
import { encryptData, decryptData } from './crypto';

// Define configuration for encrypted fields
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  products: ['costPrice'],
  sales: ['cogs', 'profit', 'total', 'subtotal', 'tax', 'discount'],
  customers: ['phone', 'email', 'address', 'notes'],
  suppliers: ['contactPerson', 'email', 'phone', 'address'],
  purchaseOrders: ['totalCost'],
  shifts: ['startFloat', 'actualCash', 'difference', 'cashSales', 'cashRefunds'],
  inventoryAdjustments: ['reason'],
};

// Helper to check valid IDB key
function isValidIDBKey(key: any): boolean {
    if (key === undefined || key === null) return false;
    const type = typeof key;
    if (type === 'number') return Number.isFinite(key); // Must be finite number, not NaN or Infinity
    if (type === 'string') return true;
    if (key instanceof Date) return !isNaN(key.getTime());
    if (key instanceof ArrayBuffer) return true;
    if (Array.isArray(key)) return key.every(isValidIDBKey);
    return false;
}

// Define the Dexie Database Class
export class IMSDatabase extends Dexie {
  // Define tables
  products!: Table<Product>;
  sales!: Table<Sale>;
  customers!: Table<Customer>;
  purchaseOrders!: Table<PurchaseOrder>;
  suppliers!: Table<Supplier>;
  users!: Table<User>;
  workspaces!: Table<Workspace>;
  shifts!: Table<Shift>;
  heldOrders!: Table<HeldOrder>;
  categories!: Table<Category>;
  inventoryAdjustments!: Table<InventoryAdjustment>;
  notifications!: Table<Notification>;
  
  // Sync specific tables
  deletedRecords!: Table<{ id: string; table: string; deletedAt: string; sync_status: string }>;
  settings!: Table<{ key: string; value: any; updated_at: string; sync_status: string }>;

  // Legacy Key-Value store for settings/legacy state compatibility
  keyval!: Table<{ key: string; value: any }>;

  // Runtime Encryption Key
  encryptionKey: CryptoKey | null = null;

  constructor() {
    super('IMS_POS_DB');
    
    // Version 7: Add workspaceId to all tables to enforce data isolation
    (this as any).version(7).stores({
      products: '&id, sku, name, *categoryIds, sync_status, updated_at, workspaceId',
      sales: '&id, publicId, date, type, status, customerId, salespersonId, originalSaleId, sync_status, updated_at, workspaceId',
      customers: '&id, publicId, email, phone, name, sync_status, updated_at, workspaceId',
      purchaseOrders: '&id, publicId, supplierId, status, dateCreated, sync_status, updated_at, workspaceId',
      suppliers: '&id, publicId, name, sync_status, updated_at, workspaceId',
      users: '&id, username, email, role, sync_status, updated_at, workspaceId',
      workspaces: '&id, alias',
      shifts: '&id, status, startTime, sync_status, updated_at, workspaceId',
      heldOrders: '&id, publicId, workspaceId',
      categories: '&id, parentId, name, sync_status, updated_at, workspaceId',
      inventoryAdjustments: '&id, productId, variantId, date, sync_status, workspaceId',
      notifications: '&id, isRead, type, timestamp, relatedId, workspaceId',
      deletedRecords: '&id, table, sync_status',
      settings: '&key, sync_status, updated_at',
      keyval: 'key' 
    });

    this.addEncryptionMiddleware();
  }

  setEncryptionKey(key: CryptoKey | null) {
    this.encryptionKey = key;
  }

  addEncryptionMiddleware() {
    // Hook into creating/updating to Encrypt
    (this as any).use({
        stack: "dbcore",
        name: "encryption",
        create: (downlevelDatabase: any) => {
            return {
                ...downlevelDatabase,
                table: (tableName: string) => {
                    const downlevelTable = downlevelDatabase.table(tableName);
                    const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];

                    return {
                        ...downlevelTable,
                        mutate: async (req: any) => {
                            // Guard: Filter invalid keys from delete operations to prevent DataErrors
                            if (req.type === 'delete' && Array.isArray(req.keys)) {
                                const validKeys = req.keys.filter((k: any) => isValidIDBKey(k));
                                if (validKeys.length !== req.keys.length) {
                                    if (validKeys.length === 0) return { failures: [], lastResult: undefined, results: [] };
                                    return downlevelTable.mutate({ ...req, keys: validKeys });
                                }
                            }

                            if (!fieldsToEncrypt || !this.encryptionKey || (req.type !== 'add' && req.type !== 'put')) {
                                return downlevelTable.mutate(req);
                            }
                            
                            // Check if values exist to prevent errors on delete operations that might slip through
                            if (!req.values) return downlevelTable.mutate(req);

                            const encryptItem = async (item: any) => {
                                const cloned = { ...item };
                                for (const field of fieldsToEncrypt) {
                                    if (cloned[field] !== undefined) {
                                        cloned[field] = await encryptData(cloned[field], this.encryptionKey!);
                                    }
                                }
                                // Special handling for deep objects like PurchaseOrder items or Product Variants
                                if (tableName === 'products' && cloned.variants) {
                                    // Encrypt variant cost prices
                                    const newVariants = await Promise.all(cloned.variants.map(async (v: any) => ({
                                        ...v,
                                        costPrice: await encryptData(v.costPrice, this.encryptionKey!)
                                    })));
                                    cloned.variants = newVariants;
                                }
                                if (tableName === 'purchaseOrders' && cloned.items) {
                                    const newItems = await Promise.all(cloned.items.map(async (i: any) => ({
                                        ...i,
                                        costPrice: await encryptData(i.costPrice, this.encryptionKey!)
                                    })));
                                    cloned.items = newItems;
                                }
                                return cloned;
                            };

                            const values = await Promise.all(req.values.map(encryptItem));
                            return downlevelTable.mutate({ ...req, values });
                        },
                        get: async (req: any) => {
                            const key = req.key;
                            if (!isValidIDBKey(key)) {
                                return undefined;
                            }

                            try {
                                const res = await downlevelTable.get(req);
                                if (!fieldsToEncrypt || !this.encryptionKey || !res) return res;
                                return this.decryptItem(tableName, res);
                            } catch (error) {
                                // Swallow invalid key errors that might slip through or other IDB read errors
                                console.warn(`DB Middleware: Failed to get key for table ${tableName}`, error);
                                return undefined;
                            }
                        },
                        query: async (req: any) => {
                            try {
                                const res = await downlevelTable.query(req);
                                const result = await res.result;
                                if (!fieldsToEncrypt || !this.encryptionKey || !Array.isArray(result)) return res;
                                
                                const decryptedResult = await Promise.all(result.map(item => this.decryptItem(tableName, item)));
                                
                                return {
                                    ...res,
                                    result: decryptedResult
                                };
                            } catch (error) {
                                console.error(`DB Middleware: Query failed for table ${tableName}`, error);
                                throw error;
                            }
                        }
                    };
                }
            };
        }
    });
  }

  async decryptItem(tableName: string, item: any) {
      const fieldsToEncrypt = ENCRYPTED_FIELDS[tableName];
      if (!fieldsToEncrypt || !this.encryptionKey) return item;

      const cloned = { ...item };
      try {
          for (const field of fieldsToEncrypt) {
              if (cloned[field] !== undefined) {
                  cloned[field] = await decryptData(cloned[field], this.encryptionKey);
              }
          }
          
          // Decrypt deep objects
          if (tableName === 'products' && cloned.variants) {
              const newVariants = await Promise.all(cloned.variants.map(async (v: any) => ({
                  ...v,
                  costPrice: await decryptData(v.costPrice, this.encryptionKey!)
              })));
              cloned.variants = newVariants;
          }
          if (tableName === 'purchaseOrders' && cloned.items) {
              const newItems = await Promise.all(cloned.items.map(async (i: any) => ({
                  ...i,
                  costPrice: await decryptData(i.costPrice, this.encryptionKey!)
              })));
              cloned.items = newItems;
          }
      } catch (e) {
          console.warn("Failed to decrypt item", e);
          return item; // Fallback to original if decryption fails
      }

      return cloned;
  }
}

export const db = new IMSDatabase();

/**
 * Compatibility Wrapper for `usePersistedState` hook.
 */
export function getFromDB<T>(key: string): Promise<T | undefined> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isValidIDBKey(key)) {
          resolve(undefined);
          return;
      }
      const result = await db.keyval.get(key);
      resolve(result?.value);
    } catch (error) {
      console.error(`Dexie get error for key ${key}:`, error);
      // Resolve undefined instead of reject to prevent app crashes on legacy data issues
      resolve(undefined); 
    }
  });
}

export function setInDB<T>(key: string, value: T): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!isValidIDBKey(key)) {
          reject(new Error("Invalid Key"));
          return;
      }
      await db.keyval.put({ key, value });
      resolve();
    } catch (error) {
      console.error(`Dexie put error for key ${key}:`, error);
      reject(error);
    }
  });
}

export async function clearKeyValStore() {
    await db.keyval.clear();
}
