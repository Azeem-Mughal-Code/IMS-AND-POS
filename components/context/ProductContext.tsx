import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Product, InventoryAdjustment, PriceHistoryEntry, User, Category, ProductVariant } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from '../../constants';
import { useAuth } from './AuthContext';
// import { useSales } from './SalesContext'; // Dependency for checking sales history

interface ProductContextType {
    products: Product[];
    categories: Category[];
    inventoryAdjustments: InventoryAdjustment[];
    addProduct: (product: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string) => { success: boolean; message?: string };
    addCategory: (categoryData: Omit<Category, 'id'>) => { success: boolean; message?: string };
    updateCategory: (categoryId: string, categoryData: Omit<Category, 'id'>) => { success: boolean; message?: string };
    deleteCategory: (categoryId: string) => { success: boolean; message?: string };
    receiveStock: (productId: string, quantity: number, variantId?: string) => void;
    adjustStock: (productId: string, newStockLevel: number, reason: string, variantId?: string) => void;
    removeStockHistoryByReason: (reasonPrefix: string) => void;
    importProducts: (newProducts: Omit<Product, 'id'>[]) => { success: boolean; message: string };
    factoryReset: (adminUser: User) => void;
}

const ProductContext = createContext<ProductContextType | null>(null);

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) throw new Error('useProducts must be used within a ProductProvider');
    return context;
};

const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_electronics', name: 'Electronics', parentId: null },
    { id: 'cat_computers', name: 'Computers', parentId: 'cat_electronics' },
    { id: 'cat_accessories', name: 'Accessories', parentId: 'cat_electronics' },
    { id: 'cat_apparel', name: 'Apparel', parentId: null },
];

export const ProductProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const ls_prefix = `ims-${businessName}`;
    const { currentUser } = useAuth();
    const [products, setProducts] = useLocalStorage<Product[]>(`${ls_prefix}-products`, INITIAL_PRODUCTS);
    const [categories, setCategories] = useLocalStorage<Category[]>(`${ls_prefix}-categories`, DEFAULT_CATEGORIES);
    const [inventoryAdjustments, setInventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>(`${ls_prefix}-inventoryAdjustments`, []);
    
    const addStockHistory = useCallback((productId: string, quantity: number, reason: string, variantId?: string) => {
        const newAdjustment: InventoryAdjustment = {
            productId,
            variantId,
            quantity,
            reason,
            date: new Date().toISOString(),
        };
        setInventoryAdjustments(prev => [...prev, newAdjustment]);
    }, [setInventoryAdjustments]);

    const calculateTotalStock = (product: Product): number => {
        if (product.variants && product.variants.length > 0) {
            return product.variants.reduce((sum, v) => sum + v.stock, 0);
        }
        return product.stock;
    };
    
    const addProduct = (productData: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => {
        const newProduct: Product = {
            ...productData,
            id: `prod_${Date.now()}`,
            stock: productData.variants.length > 0 ? productData.variants.reduce((sum, v) => sum + v.stock, 0) : 0,
            priceHistory: [],
        };
        setProducts(prev => [...prev, newProduct]);
    };

    const updateProduct = (updatedProductData: Product) => {
        setProducts(prevProducts => {
            const oldProduct = prevProducts.find(p => p.id === updatedProductData.id);
            if (!oldProduct || !currentUser) return prevProducts;
            
            const updatedProduct = { ...updatedProductData };
            updatedProduct.stock = calculateTotalStock(updatedProduct);

            const priceHistory: PriceHistoryEntry[] = [...(updatedProduct.priceHistory || [])];
            
            if (oldProduct.retailPrice !== updatedProduct.retailPrice) {
                priceHistory.push({
                    date: new Date().toISOString(),
                    priceType: 'retail',
                    oldValue: oldProduct.retailPrice,
                    newValue: updatedProduct.retailPrice,
                    userId: currentUser.id,
                    userName: currentUser.username,
                });
            }
            if (oldProduct.costPrice !== updatedProduct.costPrice) {
                 priceHistory.push({
                    date: new Date().toISOString(),
                    priceType: 'cost',
                    oldValue: oldProduct.costPrice,
                    newValue: updatedProduct.costPrice,
                    userId: currentUser.id,
                    userName: currentUser.username,
                });
            }

            return prevProducts.map(p => p.id === updatedProduct.id ? {...updatedProduct, priceHistory} : p);
        });
    };

    const deleteProduct = (productId: string): { success: boolean; message?: string } => {
        const product = products.find(p => p.id === productId);
        if (!product) return { success: false, message: 'Product not found.' };
        if (product.stock > 0) return { success: false, message: 'Cannot delete a product that is in stock.'};
        setProducts(prev => prev.filter(p => p.id !== productId));
        return { success: true, message: 'Product deleted successfully.' };
    };

    const addCategory = (categoryData: Omit<Category, 'id'>): { success: boolean, message?: string } => {
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.parentId === categoryData.parentId)) {
            return { success: false, message: 'A category with this name already exists at this level.' };
        }
        const newCategory: Category = { ...categoryData, id: `cat_${Date.now()}` };
        setCategories(prev => [...prev, newCategory]);
        return { success: true };
    };

    const updateCategory = (categoryId: string, categoryData: Omit<Category, 'id'>): { success: boolean, message?: string } => {
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.parentId === categoryData.parentId && c.id !== categoryId)) {
            return { success: false, message: 'A category with this name already exists at this level.' };
        }
        if (categoryId === categoryData.parentId) {
            return { success: false, message: 'A category cannot be its own parent.' };
        }
        setCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, ...categoryData } : c)));
        return { success: true };
    };

    const deleteCategory = (categoryId: string): { success: boolean, message?: string } => {
        setCategories(prev => {
            const childrenToReparent = prev.filter(c => c.parentId === categoryId);
            return prev
                .filter(c => c.id !== categoryId)
                .map(c => (childrenToReparent.some(child => child.id === c.id) ? { ...c, parentId: null } : c));
        });
        setProducts(prev => prev.map(p => ({ ...p, categoryIds: p.categoryIds.filter(id => id !== categoryId) })));
        return { success: true };
    };
    
    const receiveStock = (productId: string, quantity: number, variantId?: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const newStockLevel = (variantId ? product.variants.find(v => v.id === variantId)?.stock : product.stock) || 0;
        adjustStock(productId, newStockLevel + quantity, 'Stock Received', variantId);
    };

    const adjustStock = (productId: string, newStockLevel: number, reason: string, variantId?: string) => {
        setProducts(prev => prev.map(p => {
            if (p.id === productId) {
                let change = 0;
                let updatedProduct = { ...p };

                if (variantId) {
                    const variant = updatedProduct.variants.find(v => v.id === variantId);
                    if (variant) {
                        change = newStockLevel - variant.stock;
                        updatedProduct.variants = updatedProduct.variants.map(v => 
                            v.id === variantId ? { ...v, stock: newStockLevel } : v
                        );
                    }
                } else {
                    change = newStockLevel - updatedProduct.stock;
                    updatedProduct.stock = newStockLevel;
                }
                
                updatedProduct.stock = calculateTotalStock(updatedProduct);
                
                if (change !== 0) {
                     addStockHistory(productId, change, reason, variantId);
                }
                return updatedProduct;
            }
            return p;
        }));
    };

    const removeStockHistoryByReason = useCallback((reasonPrefix: string) => {
        setInventoryAdjustments(prev => prev.filter(adj => !adj.reason.startsWith(reasonPrefix)));
    }, [setInventoryAdjustments]);

    const importProducts = (newProducts: Omit<Product, 'id'>[]): { success: boolean; message: string } => {
        const existingSkus = new Set(products.map(p => p.sku));
        const productsToAdd: Product[] = [];
        let skippedCount = 0;

        newProducts.forEach((p, i) => {
            if (!existingSkus.has(p.sku)) {
                 productsToAdd.push({
                    ...p,
                    id: `prod_${Date.now()}_${i}`,
                    stock: p.stock || 0,
                    priceHistory: [],
                    categoryIds: [],
                    variationTypes: [],
                    variants: [],
                });
                existingSkus.add(p.sku);
            } else {
                skippedCount++;
            }
        });

        if (productsToAdd.length > 0) {
            setProducts(prev => [...prev, ...productsToAdd]);
        }
        
        let message = '';
        if (productsToAdd.length > 0) {
            message += `${productsToAdd.length} new products imported successfully. `;
        }
        if (skippedCount > 0) {
            message += `${skippedCount} products were skipped because their SKUs already exist.`;
        }
        if (productsToAdd.length === 0 && skippedCount > 0) {
            return { success: false, message: 'No new products imported. All SKUs in file already exist.' };
        }
        
        return { success: true, message: message.trim() };
    };

    const factoryReset = () => {
        setProducts(INITIAL_PRODUCTS);
        setInventoryAdjustments([]);
        setCategories(DEFAULT_CATEGORIES);
    };
    
    const value = {
        products,
        categories,
        inventoryAdjustments,
        addProduct,
        updateProduct,
        deleteProduct,
        addCategory,
        updateCategory,
        deleteCategory,
        receiveStock,
        adjustStock,
        removeStockHistoryByReason,
        importProducts,
        factoryReset
    };

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    );
};