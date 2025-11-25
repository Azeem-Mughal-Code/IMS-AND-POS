
import Dexie, { Table } from 'dexie';
import { Product, Sale, Customer, PurchaseOrder, Supplier, User, Workspace, Shift, HeldOrder, Category, InventoryAdjustment, Notification } from '../types';

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

  constructor() {
    super('IMS_POS_DB');
    
    // Version 4: Add deleted_records, settings, and improve indexes
    (this as any).version(4).stores({
      // Primary tables for structured data (Sync-ready)
      // ++id = auto-incrementing primary key (we often provide our own string UUIDs, so maybe just 'id')
      // &id = unique primary key
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

      // Sync & Meta tables
      deletedRecords: '&id, table, sync_status',
      settings: '&key, sync_status, updated_at',

      // Legacy Key-Value store for `usePersistedState` compatibility
      keyval: 'key' 
    });

    // Version 5: Add missing indexes for cascading deletes and lookups
    (this as any).version(5).stores({
      sales: '&id, publicId, date, type, status, customerId, salespersonId, originalSaleId, sync_status, updated_at',
      notifications: '&id, isRead, type, timestamp, relatedId'
    });
  }
}

export const db = new IMSDatabase();

/**
 * Compatibility Wrapper for `usePersistedState` hook.
 * This allows the existing application state logic to function seamlessly
 * while running on top of the robust Dexie database engine.
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

// Helper to clear the legacy store if needed (e.g. factory reset)
export async function clearKeyValStore() {
    await db.keyval.clear();
}
