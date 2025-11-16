import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Product, InventoryAdjustment, PriceHistoryEntry, User } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from '../../constants';
import { useAuth } from './AuthContext';
// import { useSales } from './SalesContext'; // Dependency for checking sales history

interface ProductContextType {
    products: Product[];
    inventoryAdjustments: InventoryAdjustment[];
    addProduct: (product: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string) => { success: boolean; message?: string };
    receiveStock: (productId: string, quantity: number) => void;
    adjustStock: (productId: string, newStockLevel: number, reason: string) => void;
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

export const ProductProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const ls_prefix = `ims-${businessName}`;
    const { currentUser } = useAuth();
    const [products, setProducts] = useLocalStorage<Product[]>(`${ls_prefix}-products`, INITIAL_PRODUCTS);
    const [inventoryAdjustments, setInventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>(`${ls_prefix}-inventoryAdjustments`, []);
    // This creates a dependency cycle if SalesContext also depends on ProductContext.
    // To solve this, we will access sales via a function prop or by re-thinking the dependency.

    const addStockHistory = useCallback((productId: string, quantity: number, reason: string) => {
        const newAdjustment: InventoryAdjustment = {
            productId,
            quantity,
            reason,
            date: new Date().toISOString(),
        };
        setInventoryAdjustments(prev => [...prev, newAdjustment]);
    }, [setInventoryAdjustments]);
    
    const addProduct = (productData: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => {
        const newProduct: Product = {
            ...productData,
            id: `prod_${Date.now()}`,
            stock: 0,
            priceHistory: [],
        };
        setProducts(prev => [...prev, newProduct]);
    };

    const updateProduct = (updatedProduct: Product) => {
        setProducts(prevProducts => {
            const oldProduct = prevProducts.find(p => p.id === updatedProduct.id);
            if (!oldProduct || !currentUser) return prevProducts;

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
        // Note: In a real app, we should check if the product is part of any sales record.
        // This is omitted here to avoid context dependency cycles.
        setProducts(prev => prev.filter(p => p.id !== productId));
        return { success: true, message: 'Product deleted successfully.' };
    };
    
    const receiveStock = (productId: string, quantity: number) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + quantity } : p));
        addStockHistory(productId, quantity, 'Stock Received');
    };

    const adjustStock = (productId: string, newStockLevel: number, reason: string) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const change = newStockLevel - product.stock;
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStockLevel } : p));
        addStockHistory(productId, change, reason);
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
    };
    
    const value = {
        products,
        inventoryAdjustments,
        addProduct,
        updateProduct,
        deleteProduct,
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