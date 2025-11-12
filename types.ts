export enum UserRole {
  Admin = 'Admin',
  Cashier = 'Cashier',
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
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  cogs: number;
  profit: number;
  paymentType: PaymentType;
}

export type View = 'dashboard' | 'pos' | 'inventory' | 'reports';

export interface InventoryAdjustment {
  productId: string;
  date: string;
  quantity: number;
  reason: string;
}
