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

export interface Sale {
  id:string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  cogs: number;
  profit: number;
  paymentType: PaymentType;
  type: 'Sale' | 'Return';
  originalSaleId?: string;
  status?: 'Completed' | 'Partially Refunded' | 'Refunded';
}

export type View = 'dashboard' | 'pos' | 'inventory' | 'reports' | 'analysis' | 'settings';

export interface InventoryAdjustment {
  productId: string;
  date: string;
  quantity: number;
  reason: string;
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

type SaleSortKeys = 'id' | 'date' | 'type' | 'total' | 'profit';
type ProductReportSortKeys = 'sku' | 'name' | 'stock';
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
