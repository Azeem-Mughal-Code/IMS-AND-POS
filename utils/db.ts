
import Dexie, { Table } from 'dexie';
import { Product, Sale, Customer, PurchaseOrder, Supplier, User, Workspace, Shift, HeldOrder, Category, InventoryAdjustment, Notification } from '../types';
import { encryptData, decryptData } from './crypto';

// Define configuration for encrypted fields
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  products: ['costPrice'],
  sales: ['cogs', 'profit'],
  customers: ['phone', 'email', 'address', 'notes'],
  // purchaseOrders items contains costPrice, and totalCost might be sensitive. 
  // Simplifying by encrypting entire 'items' array if possible, but field level is cleaner for structure.
  purchaseOrders: ['totalCost'], 
};

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
    
    // Version 4: Add deleted_records, settings, and improve indexes
    (this as any).version(4).stores({
      products: '&id, sku, name, *categoryIds, sync_status, updated_at',
      sales: '&id, publicId, date, type, status, customerId, salespersonId, sync_status, updated_at',
      customers: '&id, publicId, email, phone, name, sync_status, updated_at',
      purchaseOrders: '&id, publicId, supplierId, status, dateCreated, sync_status, updated_at',
      suppliers: '&id, publicId, name, sync_status, updated_at',
      users: '&id, username, role, sync_status, updated_at',
      workspaces: '&id, alias',
      shifts: '&id, status, startTime, sync_status, updated_at',
      heldOrders: '&id, publicId',
      categories: '&id, parentId, name, sync_status, updated_at',
      inventoryAdjustments: '&id, productId, variantId, date, sync_status',
      notifications: '&id, isRead, type, timestamp',
      deletedRecords: '&id, table, sync_status',
      settings: '&key, sync_status, updated_at',
      keyval: 'key' 
    });

    // Version 5: Add missing indexes for cascading deletes and lookups
    (this as any).version(5).stores({
      sales: '&id, publicId, date, type, status, customerId, salespersonId, originalSaleId, sync_status, updated_at',
      notifications: '&id, isRead, type, timestamp, relatedId'
    });

    // Version 6: Add email index to users
    (this as any).version(6).stores({
      users: '&id, username, email, role, sync_status, updated_at',
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

                    if (!fieldsToEncrypt) return downlevelTable;

                    return {
                        ...downlevelTable,
                        mutate: async (req: any) => {
                            if (!this.encryptionKey || (req.type !== 'add' && req.type !== 'put')) {
                                return downlevelTable.mutate(req);
                            }

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
                            // DBCore get request has a 'key' property.
                            // If the key is missing or invalid, return undefined immediately to prevent IDB error.
                            if (req.key === undefined || req.key === null) return undefined;

                            try {
                                const res = await downlevelTable.get(req);
                                if (!this.encryptionKey || !res) return res;
                                return this.decryptItem(tableName, res);
                            } catch (error) {
                                // Catch "DataError: Failed to execute 'get' on 'IDBObjectStore': The parameter is not a valid key."
                                console.warn(`DB Middleware: Failed to get key for table ${tableName}`, error);
                                return undefined;
                            }
                        },
                        query: async (req: any) => {
                            const res = await downlevelTable.query(req);
                            const result = await res.result;
                            if (!this.encryptionKey || !Array.isArray(result)) return res;
                            
                            const decryptedResult = await Promise.all(result.map(item => this.decryptItem(tableName, item)));
                            
                            return {
                                ...res,
                                result: decryptedResult
                            };
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
      const result = await db.keyval.get(key);
      resolve(result?.value);
    } catch (error) {
      console.error(`Dexie get error for key ${key}:`, error);
      reject(error);
    }
  });
}

export function setInDB<T>(key: string, value: T): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
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
