import { Product } from './types';

export const TAX_RATE = 0.08; // 8% sales tax

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    sku: 'HW-LAP-001',
    name: 'ProBook Laptop 15"',
    retailPrice: 1299.99,
    costPrice: 850.00,
    stock: 25,
    lowStockThreshold: 10,
  },
  {
    id: 'prod_2',
    sku: 'HW-MON-002',
    name: 'UltraWide Monitor 29"',
    retailPrice: 499.99,
    costPrice: 320.50,
    stock: 40,
    lowStockThreshold: 15,
  },
  {
    id: 'prod_3',
    sku: 'AC-KBD-003',
    name: 'Mechanical Keyboard',
    retailPrice: 149.99,
    costPrice: 95.00,
    stock: 75,
    lowStockThreshold: 20,
  },
  {
    id: 'prod_4',
    sku: 'AC-MSE-004',
    name: 'Wireless Ergonomic Mouse',
    retailPrice: 79.99,
    costPrice: 45.00,
    stock: 120,
    lowStockThreshold: 30,
  },
  {
    id: 'prod_5',
    sku: 'HW-CAM-005',
    name: '4K Webcam Pro',
    retailPrice: 199.99,
    costPrice: 130.00,
    stock: 8,
    lowStockThreshold: 10,
  },
  {
    id: 'prod_6',
    sku: 'AC-HDP-006',
    name: 'Noise-Cancelling Headphones',
    retailPrice: 249.99,
    costPrice: 180.00,
    stock: 50,
    lowStockThreshold: 15,
  },
];
