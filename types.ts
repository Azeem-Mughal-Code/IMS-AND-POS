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
  name:string;
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

// NEW: For cashier permissions
export interface CashierPermissions {
  canProcessReturns: boolean;
  canViewReports: boolean;
  canViewAnalysis: boolean;
  canEditOwnProfile: boolean;
  canViewDashboard: boolean;
  canViewInventory: boolean;
  canEditBehaviorSettings: boolean;
}

export type View = 'dashboard' | 'pos' | 'inventory' | 'reports' | 'analysis' | 'settings';

export interface InventoryAdjustment {
  productId: string;
  date: string;
  quantity: number;
  reason: string;
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
    timeRange: 'today' | 'weekly' | 'monthly' | 'yearly' | 'all';
    searchTerm: string;
    sortConfig: SortConfig<AnalysisSortKeys>;
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

// FIX: Added missing ProcurementViewState for procurement feature.
type SupplierSortKeys = keyof Omit<Supplier, 'id' | 'address'>;
export interface ProcurementViewState {
    suppliers: {
        searchTerm: string;
        sortConfig: SortConfig<SupplierSortKeys>;
        currentPage: number;
        itemsPerPage: number;
    };
    purchaseOrders: POViewState;
}

// FIX: Added missing PaddingLevel type for the unused PaddingSelector component.
export type PaddingLevel = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

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