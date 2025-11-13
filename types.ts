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

export enum PaymentType {
  Cash = 'Cash',
  Card = 'Card',
  Other = 'Other',
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  retailPrice: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
}

export interface CartItem extends Product {
  quantity: number;
  returnedQuantity?: number;
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
}

export type View = 'dashboard' | 'pos' | 'inventory' | 'reports' | 'analysis' | 'settings' | 'procurement';

export interface InventoryAdjustment {
  productId: string;
  date: string;
  quantity: number;
  reason: string;
}

// NEW: For Procurement
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface POItem {
  productId: string;
  name: string; // denormalized for easier display
  sku: string; // denormalized
  quantityOrdered: number;
  quantityReceived: number;
  costPrice: number; // cost at time of order
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string; // denormalized
  dateCreated: string;
  dateExpected: string;
  status: 'Pending' | 'Partial' | 'Received';
  items: POItem[];
  notes?: string;
  totalCost: number;
}


// Generic type for sort configuration
export type SortConfig<T extends string> = { key: T; direction: 'ascending' | 'descending' };

// View state types for different components
type InventorySortKeys = keyof Product;
export interface InventoryViewState {
    searchTerm: string;
    stockFilter: string;
    sortConfig: SortConfig<InventorySortKeys>;
    currentPage: number;
    itemsPerPage: number;
}

type SaleSortKeys = 'id' | 'date' | 'type' | 'salespersonName' | 'total' | 'profit';
type ProductReportSortKeys = 'sku' | 'name' | 'stock';
type InventoryValuationSortKeys = 'sku' | 'name' | 'stock' | 'totalCostValue' | 'totalRetailValue' | 'potentialProfit';

export interface ReportsViewState {
    sales: {
        searchTerm: string;
        typeFilter: string;
        statusFilter: string;
        sortConfig: SortConfig<SaleSortKeys>;
        currentPage: number;
        itemsPerPage: number;
    };
    products: {
        searchTerm: string;
        stockFilter: string;
        sortConfig: SortConfig<ProductReportSortKeys>;
        currentPage: number;
        itemsPerPage: number;
    };
    inventoryValuation: {
        searchTerm: string;
        sortConfig: SortConfig<InventoryValuationSortKeys>;
        currentPage: number;
        itemsPerPage: number;
    };
}

type UserSortKeys = 'username' | 'role';
export interface UsersViewState {
    searchTerm: string;
    sortConfig: SortConfig<UserSortKeys>;
    currentPage: number;
    itemsPerPage: number;
}

type AnalysisSortKeys = 'product' | 'unitsSold' | 'revenue' | 'profit' | 'profitMargin' | 'sellThrough';
export interface AnalysisViewState {
    searchTerm: string;
    sortConfig: SortConfig<AnalysisSortKeys>;
    currentPage: number;
    itemsPerPage: number;
}

type SupplierSortKeys = 'name' | 'contactPerson' | 'email';
export interface SuppliersViewState {
    searchTerm: string;
    sortConfig: SortConfig<SupplierSortKeys>;
    currentPage: number;
    itemsPerPage: number;
}
type POSortKeys = 'id' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
export interface POViewState {
    searchTerm: string;
    statusFilter: string;
    sortConfig: SortConfig<POSortKeys>;
    currentPage: number;
    itemsPerPage: number;
}
export interface ProcurementViewState {
    suppliers: SuppliersViewState;
    purchaseOrders: POViewState;
}