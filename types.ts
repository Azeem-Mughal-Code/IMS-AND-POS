
import React from 'react';

export enum UserRole {
  Admin = 'Admin',
  Cashier = 'Cashier',
}

export interface User {
  id: string;
  username: string;
  password: string; // NOTE: In a real app, this should be hashed.
  role: UserRole;
}

// NEW: For Global Authentication
export interface GlobalUser {
  id: string;
  email: string;
  username: string;
  passwordHash: string; // In a real app, never store plain text passwords
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string; // The GlobalUser ID of the creator
  memberIds: string[]; // IDs of GlobalUsers who are members
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

export interface Category {
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
}


export interface Product {
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

export interface Sale {
  id:string;
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
  status?: 'Completed' | 'Partially Refunded' | 'Refunded';
  salespersonId: string; // NEW: Salesperson tracking
  salespersonName: string; // NEW: Salesperson tracking
  customerId?: string; // NEW: Customer linkage
  customerName?: string; // NEW: Denormalized customer name
}

export interface HeldOrder {
  id: string;
  date: string;
  items: CartItem[];
  customer: Customer | null;
  discount: { type: 'percent' | 'fixed', value: number } | null;
  isTaxExempt: boolean;
  note: string;
}

// NEW: Customer Interface
export interface Customer {
  id: string;
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

export type View = 'dashboard' | 'pos' | 'inventory' | 'customers' | 'reports' | 'analysis' | 'settings' | 'procurement';

export interface InventoryAdjustment {
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


export interface PurchaseOrder {
  id: string;
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
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface Shift {
  id: string;
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

export type PaginationTarget = 'inventory' | 'inventoryCategories' | 'posCatalog' | 'posSales' | 'salesReports' | 'productReports' | 'inventoryValuation' | 'users' | 'analysis' | 'purchaseOrders' | 'suppliers' | 'customers';
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

type SaleSortKeys = 'id' | 'date' | 'type' | 'salespersonName' | 'total' | 'profit';
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

type CustomerSortKeys = 'name' | 'email' | 'phone' | 'dateAdded';
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

type POSortKeys = 'id' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
export interface POViewState {
    searchTerm: string;
    statusFilter: string;
    supplierFilter: string;
    sortConfig: SortConfig<POSortKeys>;
    currentPage: number;
}

export type SupplierSortKeys = keyof Omit<Supplier, 'id' | 'address'>;

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

export interface Notification {
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
