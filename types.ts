
import React from 'react';

export enum UserRole {
  Admin = 'Admin',
  Cashier = 'Cashier',
}

// Sync status for local-first architecture
export type SyncStatus = 'pending' | 'synced' | 'error';

export interface BaseEntity {
  updated_at?: string;
  deleted?: boolean;
  sync_status?: SyncStatus;
  workspaceId: string;
}

export interface User extends BaseEntity {
  id: string;
  username: string;
  email?: string; // NEW: Allow login via email
  // Password is NOT stored. Authentication is done via cryptographic challenge (unwrapping keys).
  role: UserRole;
  salt?: string; // Base64 salt for key derivation
  encryptedDEK?: string; // Base64 Encrypted Data Encryption Key
  keyCheckValue?: string; // SHA-256 hash of the raw DEK for validation
  workspaceId: string; // Link to the workspace this user belongs to
}

export interface Workspace {
  id: string;
  name: string;
  alias: string; // Human-readable short code (Store Code)
}

export enum PaymentType {
  Cash = 'Cash',
  Card = 'Card',
  Other = 'Other',
}

export interface PriceHistoryEntry {
  date: string;
  priceType: 'retail' | 'cost';
  oldValue: number;
  newValue: number;
  userId: string;
  userName: string;
}

export interface Category extends BaseEntity {
  id: string;
  name: string;
  parentId?: string | null;
}

export interface ProductVariationOption {
  id: string;
  name: string;
}

export interface ProductVariationType {
  id: string;
  name: string;
  options: ProductVariationOption[];
}

export interface ProductVariant {
  id: string;
  // Mapped by variation type id to option name.
  options: Record<string, string>; 
  skuSuffix: string;
  retailPrice: number;
  costPrice: number;
  stock: number;
  priceHistory: PriceHistoryEntry[];
}


export interface Product extends BaseEntity {
  id: string;
  sku: string;
  name:string;
  retailPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  priceHistory: PriceHistoryEntry[];
  categoryIds: string[];
  variationTypes: ProductVariationType[];
  variants: ProductVariant[];
}

export interface CartItem {
  id: string; // Unique ID for the cart line item
  productId: string; // ID of the base product
  variantId?: string;

  name: string; // Composed name for display
  sku: string; // Composed SKU
  
  retailPrice: number;
  costPrice: number;
  
  stock: number; // Stock of the specific item at the time of adding to cart
  quantity: number; // Can be negative for returns
  returnedQuantity?: number;
  
  originalSaleId?: string; // For return items, links back to the original sale
}


// NEW: For Split Payments
export interface Payment {
  type: PaymentType;
  amount: number;
}

export interface Sale extends BaseEntity {
  id: string;
  publicId?: string; // NanoID for public display (e.g. TRX-A1B2)
  date: string;
  items: CartItem[];
  subtotal: number;
  discount?: number;
  tax: number;
  total: number;
  payments: Payment[]; // Replaces paymentType
  cogs: number;
  profit: number;
  type: 'Sale' | 'Return';
  originalSaleId?: string;
  originalSalePublicId?: string; // For display in returns
  status?: 'Completed' | 'Partially Refunded' | 'Refunded';
  salespersonId: string; // NEW: Salesperson tracking
  salespersonName: string; // NEW: Salesperson tracking
  customerId?: string; // NEW: Customer linkage
  customerName?: string; // NEW: Denormalized customer name
}

export interface HeldOrder extends BaseEntity {
  id: string;
  publicId?: string; // NanoID
  date: string;
  items: CartItem[];
  customer: Customer | null;
  discount: { type: 'percent' | 'fixed', value: number } | null;
  isTaxExempt: boolean; // Legacy support
  customTax?: { type: 'percent' | 'fixed', value: number } | null;
  note: string;
}

// NEW: Customer Interface
export interface Customer extends BaseEntity {
  id: string;
  publicId?: string; // NanoID
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  dateAdded: string;
}

// NEW: For cashier permissions
export interface CashierPermissions {
  canProcessReturns: boolean;
  canViewReports: boolean;
  canViewAnalysis: boolean;
  canEditOwnProfile: boolean;
  canViewDashboard: boolean;
  canViewInventory: boolean;
  canEditBehaviorSettings: boolean;
  canManageCustomers: boolean; // NEW
}

export type View = 'dashboard' | 'pos' | 'inventory' | 'customers' | 'reports' | 'analysis' | 'settings' | 'procurement' | 'users';

export interface InventoryAdjustment extends BaseEntity {
  id: string;
  productId: string;
  variantId?: string;
  date: string;
  quantity: number;
  reason: string;
}

export interface POItem {
  productId: string;
  variantId?: string;
  name: string; // denormalized, composed name
  sku: string; // denormalized, composed sku
  quantityOrdered: number;
  quantityReceived: number;
  costPrice: number; // cost at time of order
}


export interface PurchaseOrder extends BaseEntity {
  id: string;
  publicId?: string; // NanoID
  supplierId: string;
  supplierName: string;
  dateCreated: string;
  dateExpected: string;
  status: 'Pending' | 'Partial' | 'Received';
  items: POItem[];
  notes?: string;
  totalCost: number;
}

// FIX: Added missing Supplier interface for procurement feature.
export interface Supplier extends BaseEntity {
  id: string;
  publicId?: string; // NanoID
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Shift extends BaseEntity {
  id: string;
  publicId?: string; // NanoID
  openedByUserId: string;
  openedByUserName: string;
  closedByUserId?: string;
  closedByUserName?: string;
  startTime: string;
  endTime?: string;
  startFloat: number;
  endFloat?: number; // The calculated expected cash
  actualCash?: number; // The counted cash
  difference?: number; // actual - expected
  notes?: string;
  status: 'Open' | 'Closed';
  cashSales: number; // Total cash sales during shift
  cashRefunds: number; // Total cash refunds during shift
}

export type PaginationTarget = 'inventory' | 'inventoryCategories' | 'posCatalog' | 'posSales' | 'salesReports' | 'productReports' | 'inventoryValuation' | 'users' | 'analysis' | 'purchaseOrders' | 'suppliers' | 'customers' | 'inventoryStockHistory' | 'inventoryPriceHistory' | 'shifts';
export type PaginationConfig = Record<PaginationTarget, number>;

// Generic type for sort configuration
export type SortConfig<T extends string> = { key: T; direction: 'ascending' | 'descending' };

// View state types for different components
type InventorySortKeys = keyof Product;
export interface InventoryViewState {
    searchTerm: string;
    stockFilter: string;
    categoryFilter: string;
    sortConfig: SortConfig<InventorySortKeys>;
    currentPage: number;
}

type SaleSortKeys = 'id' | 'publicId' | 'date' | 'type' | 'salespersonName' | 'total' | 'profit';
// FIX: Added 'lowStockThreshold' to allow sorting by it in reports.
type ProductReportSortKeys = 'sku' | 'name' | 'stock' | 'lowStockThreshold';
type InventoryValuationSortKeys = 'sku' | 'name' | 'stock' | 'totalCostValue' | 'totalRetailValue' | 'potentialProfit';

export interface ReportsViewState {
    sales: {
        searchTerm: string;
        typeFilter: string;
        statusFilter: string;
        salespersonFilter: string;
        timeRange: 'today' | 'weekly' | 'monthly' | 'yearly' | 'all';
        sortConfig: SortConfig<SaleSortKeys>;
        currentPage: number;
    };
    products: {
        searchTerm: string;
        stockFilter: string;
        sortConfig: SortConfig<ProductReportSortKeys>;
        currentPage: number;
    };
    inventoryValuation: {
        searchTerm: string;
        sortConfig: SortConfig<InventoryValuationSortKeys>;
        currentPage: number;
    };
}

type UserSortKeys = 'username' | 'role';
export interface UsersViewState {
    searchTerm: string;
    sortConfig: SortConfig<UserSortKeys>;
    currentPage: number;
}

type CustomerSortKeys = 'id' | 'publicId' | 'name' | 'email' | 'phone' | 'dateAdded';
export interface CustomerViewState {
    searchTerm: string;
    sortConfig: SortConfig<CustomerSortKeys>;
    currentPage: number;
}

type AnalysisSortKeys = 'product' | 'unitsSold' | 'revenue' | 'profit' | 'profitMargin' | 'sellThrough';
export interface AnalysisViewState {
    timeRange: 'today' | 'weekly' | 'monthly' | 'yearly' | 'all';
    searchTerm: string;
    sortConfig: SortConfig<AnalysisSortKeys>;
    currentPage: number;
}

type POSortKeys = 'id' | 'publicId' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
export interface POViewState {
    searchTerm: string;
    statusFilter: string;
    supplierFilter: string;
    sortConfig: SortConfig<POSortKeys>;
    currentPage: number;
}

export type SupplierSortKeys = keyof Omit<Supplier, 'id' | 'address'>;
export interface SuppliersViewState {
    searchTerm: string;
    sortConfig: SortConfig<SupplierSortKeys>;
    currentPage: number;
}

export type CategorySortKeys = 'name';
export interface CategoriesViewState {
    searchTerm: string;
    sortConfig: SortConfig<CategorySortKeys>;
    currentPage: number;
}

export type PruneTarget = 'sales' | 'purchaseOrders' | 'stockHistory' | 'notifications';

export enum NotificationType {
    STOCK = 'STOCK',
    USER = 'USER',
    PO = 'PO',
}

export interface Notification extends BaseEntity {
  id: string;
  timestamp: string;
  type: NotificationType;
  message: string;
  isRead: boolean;
  relatedId?: string;
}

export interface Currency {
    code: string;
    name: string;
    symbol: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}