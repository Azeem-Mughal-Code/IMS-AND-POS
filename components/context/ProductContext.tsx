
import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Product, InventoryAdjustment, PriceHistoryEntry, User, Category, ProductVariant, NotificationType } from '../../types';
import { INITIAL_PRODUCTS } from '../../constants';
import { useAuth } from './AuthContext';
import { useUIState } from './UIStateContext';
import { db } from '../../utils/db';

interface ProductContextType {
    products: Product[];
    categories: Category[];
    inventoryAdjustments: InventoryAdjustment[];
    addProduct: (product: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string, force?: boolean) => Promise<{ success: boolean; message?: string }>;
    addCategory: (categoryData: Omit<Category, 'id'>) => { success: boolean; message?: string };
    updateCategory: (categoryId: string, categoryData: Omit<Category, 'id'>) => { success: boolean; message?: string };
    deleteCategory: (categoryId: string) => { success: boolean; message?: string };
    deleteVariant: (productId: string, variantId: string, force?: boolean) => Promise<{ success: boolean; message: string }>;
    receiveStock: (productId: string, quantity: number, variantId?: string) => void;
    adjustStock: (productId: string, newStockLevel: number, reason: string, variantId?: string) => void;
    removeStockHistoryByReason: (reasonPrefix: string) => void;
    importProducts: (newProducts: Omit<Product, 'id'>[]) => Promise<{ success: boolean; message: string }>;
    factoryReset: (adminUser: User) => void;
    bulkDeleteProducts: (productIds: string[]) => { success: boolean; message: string };
    bulkUpdateProductCategories: (productIds: string[], categoryIds: string[], action: 'add' | 'replace' | 'remove') => { success: boolean; message: string };
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

export const ProductProvider: React.FC<{ children: ReactNode; workspaceId: string }> = ({ children, workspaceId }) => {
    const { currentUser } = useAuth();
    const { addNotification } = useUIState();
    
    // Reactive Data from Dexie
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const categories = useLiveQuery(() => db.categories.toArray()) || [];
    const inventoryAdjustments = useLiveQuery(() => db.inventoryAdjustments.toArray()) || [];

    // Seeding logic
    useEffect(() => {
        const seedData = async () => {
            const count = await db.products.count();
            if (count === 0) {
                // Check if we have legacy data in keyval to migrate?
                // For now, we stick to seeding defaults if empty
                await db.products.bulkAdd(INITIAL_PRODUCTS.map(p => ({...p, sync_status: 'pending'})));
                await db.categories.bulkAdd(DEFAULT_CATEGORIES.map(c => ({...c, sync_status: 'pending'})));
            }
        };
        seedData();
    }, []);
    
    const addStockHistory = useCallback(async (productId: string, quantity: number, reason: string, variantId?: string) => {
        const newAdjustment: InventoryAdjustment = {
            id: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            productId,
            variantId,
            quantity,
            reason,
            date: new Date().toISOString(),
            sync_status: 'pending'
        };
        await db.inventoryAdjustments.add(newAdjustment);
    }, []);

    const calculateTotalStock = (product: Product): number => {
        if (product.variants && product.variants.length > 0) {
            return product.variants.reduce((sum, v) => sum + v.stock, 0);
        }
        return product.stock;
    };
    
    const addProduct = async (productData: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => {
        const newProduct: Product = {
            ...productData,
            id: `prod_${Date.now()}`,
            stock: productData.variants.length > 0 ? productData.variants.reduce((sum, v) => sum + v.stock, 0) : 0,
            priceHistory: [],
            sync_status: 'pending'
        };
        // Ensure variants have priceHistory initialized
        if (newProduct.variants) {
             newProduct.variants = newProduct.variants.map(v => ({...v, priceHistory: v.priceHistory || []}));
        }
        await db.products.add(newProduct);
    };

    const updateProduct = async (updatedProductData: Product) => {
        const oldProduct = await db.products.get(updatedProductData.id);
        if (!oldProduct || !currentUser) return;
        
        const updatedProduct = { ...updatedProductData, sync_status: 'pending' as const, updated_at: new Date().toISOString() };
        updatedProduct.stock = calculateTotalStock(updatedProduct);

        // Handle Base Product Price History
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
        updatedProduct.priceHistory = priceHistory;

        // Handle Variant Price History
        if (updatedProduct.variants && updatedProduct.variants.length > 0) {
            updatedProduct.variants = updatedProduct.variants.map(newVariant => {
                const oldVariant = oldProduct.variants.find(v => v.id === newVariant.id);
                
                let variantHistory: PriceHistoryEntry[] = [...(newVariant.priceHistory || [])];
                
                if (oldVariant) {
                    if (oldVariant.retailPrice !== newVariant.retailPrice) {
                        variantHistory.push({
                            date: new Date().toISOString(),
                            priceType: 'retail',
                            oldValue: oldVariant.retailPrice,
                            newValue: newVariant.retailPrice,
                            userId: currentUser.id,
                            userName: currentUser.username,
                        });
                    }
                    if (oldVariant.costPrice !== newVariant.costPrice) {
                        variantHistory.push({
                            date: new Date().toISOString(),
                            priceType: 'cost',
                            oldValue: oldVariant.costPrice,
                            newValue: newVariant.costPrice,
                            userId: currentUser.id,
                            userName: currentUser.username,
                        });
                    }
                }
                
                return { ...newVariant, priceHistory: variantHistory };
            });
        }

        await db.products.put(updatedProduct);
    };

    const deleteProduct = async (productId: string, force: boolean = false): Promise<{ success: boolean; message?: string }> => {
        const product = await db.products.get(productId);
        if (!product) return { success: false, message: 'Product not found.' };
        
        if (!force) {
            // Rule: Cannot delete if variants exist
            if (product.variants && product.variants.length > 0) {
                return { success: false, message: 'Cannot delete product because it has variants. Delete variants first or use Force Delete.' };
            }

            // Rule: Prevent deletion if product has stock
            // Note: If it has variants, we already returned above. If not, we check base stock.
            const totalStock = calculateTotalStock(product);
            if (totalStock > 0) {
                return { success: false, message: 'Cannot delete product with active stock.' };
            }
        }
        
        try {
            // Use transaction to ensure atomic deletion (notifications, adjustments, and product)
            await (db as any).transaction('rw', db.products, db.inventoryAdjustments, db.notifications, async () => {
                // 1. Delete Stock History (Adjustments table has productId for both base items and variants)
                await db.inventoryAdjustments.where('productId').equals(productId).delete();
                
                // 2. Delete Notifications
                // Gather all related IDs (Product ID + all Variant IDs)
                const relatedIds = [productId];
                if (product.variants && product.variants.length > 0) {
                    relatedIds.push(...product.variants.map(v => v.id));
                }
                await db.notifications.where('relatedId').anyOf(relatedIds).delete();
                
                // 3. Delete Product
                await db.products.delete(productId);
            });
            
            return { success: true, message: 'Product and related records deleted successfully.' };
        } catch (error) {
            console.error("Failed to delete product:", error);
            return { success: false, message: 'An error occurred while deleting the product.' };
        }
    };

    const deleteVariant = async (productId: string, variantId: string, force: boolean = false): Promise<{ success: boolean; message: string }> => {
        const product = await db.products.get(productId);
        if (!product) return { success: false, message: 'Product not found.' };
        
        const variant = product.variants.find(v => v.id === variantId);
        if (!variant) return { success: false, message: 'Variant not found.' };
        
        if (!force) {
            // Prevent deletion if variant has stock
            if (variant.stock > 0) {
                return { success: false, message: 'Cannot delete variant with active stock.' };
            }
        }
        
        try {
            await (db as any).transaction('rw', db.products, db.inventoryAdjustments, db.notifications, async () => {
                // 1. Delete Stock History for this variant
                await db.inventoryAdjustments.where('variantId').equals(variantId).delete();

                // 2. Delete Notifications for this variant
                await db.notifications.where('relatedId').equals(variantId).delete();

                // 3. Remove variant from product
                const newVariants = product.variants.filter(v => v.id !== variantId);
                
                // We call update inside the transaction manually instead of using updateProduct to stay in transaction scope if possible,
                // but updateProduct logic is complex (history), so we should rely on db.products.put here directly for simplicity in transaction
                // However, we need to make sure total stock is updated.
                const updatedProduct = { 
                    ...product, 
                    variants: newVariants, 
                    sync_status: 'pending' as const, 
                    updated_at: new Date().toISOString() 
                };
                updatedProduct.stock = updatedProduct.variants.reduce((sum, v) => sum + v.stock, 0);
                
                await db.products.put(updatedProduct);
            });

            return { success: true, message: 'Variant and related records deleted successfully.' };
        } catch (error) {
            console.error("Failed to delete variant:", error);
            return { success: false, message: 'An error occurred while deleting the variant.' };
        }
    };

    const bulkDeleteProducts = (productIds: string[]) => {
        const productsToDelete = products.filter(p => productIds.includes(p.id));
        const deletable = productsToDelete.filter(p => p.stock <= 0);
        const failedCount = productsToDelete.length - deletable.length;
        
        if (deletable.length > 0) {
            const ids = deletable.map(p => p.id);
            const allRelatedIds = [...ids];
            deletable.forEach(p => {
                if (p.variants) {
                    allRelatedIds.push(...p.variants.map(v => v.id));
                }
            });

            (db as any).transaction('rw', db.products, db.inventoryAdjustments, db.notifications, async () => {
                await db.inventoryAdjustments.where('productId').anyOf(ids).delete();
                await db.notifications.where('relatedId').anyOf(allRelatedIds).delete();
                await db.products.bulkDelete(ids);
            });
        }
        
        return { 
            success: true, 
            message: `Deleted ${deletable.length} products.${failedCount > 0 ? ` ${failedCount} skipped (active stock).` : ''}` 
        };
    };

    const bulkUpdateProductCategories = (productIds: string[], categoryIds: string[], action: 'add' | 'replace' | 'remove') => {
        const productsToUpdate = products.filter(p => productIds.includes(p.id));
        
        const updatedProducts = productsToUpdate.map(p => {
            let newCategoryIds = [...p.categoryIds];
            const targetIds = new Set(categoryIds);
            
            if (action === 'replace') {
                newCategoryIds = categoryIds;
            } else if (action === 'add') {
                categoryIds.forEach(id => {
                    if(!newCategoryIds.includes(id)) newCategoryIds.push(id);
                });
            } else if (action === 'remove') {
                newCategoryIds = newCategoryIds.filter(id => !targetIds.has(id));
            }
            return { ...p, categoryIds: newCategoryIds, sync_status: 'pending' as const, updated_at: new Date().toISOString() };
        });

        db.products.bulkPut(updatedProducts);
        return { success: true, message: 'Categories updated.' };
    };

    const addCategory = (categoryData: Omit<Category, 'id'>): { success: boolean, message?: string } => {
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.parentId === categoryData.parentId)) {
            return { success: false, message: 'A category with this name already exists at this level.' };
        }
        const newCategory: Category = { ...categoryData, id: `cat_${Date.now()}`, sync_status: 'pending' };
        db.categories.add(newCategory);
        return { success: true };
    };

    const updateCategory = (categoryId: string, categoryData: Omit<Category, 'id'>): { success: boolean, message?: string } => {
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.parentId === categoryData.parentId && c.id !== categoryId)) {
            return { success: false, message: 'A category with this name already exists at this level.' };
        }
        if (categoryId === categoryData.parentId) {
            return { success: false, message: 'A category cannot be its own parent.' };
        }
        db.categories.update(categoryId, { ...categoryData, sync_status: 'pending', updated_at: new Date().toISOString() });
        return { success: true };
    };

    const deleteCategory = (categoryId: string): { success: boolean, message?: string } => {
        // Update children
        const childrenToReparent = categories.filter(c => c.parentId === categoryId);
        childrenToReparent.forEach(c => {
            db.categories.update(c.id, { parentId: null, sync_status: 'pending', updated_at: new Date().toISOString() });
        });
        
        // Update products
        const productsToUpdate = products.filter(p => p.categoryIds.includes(categoryId));
        productsToUpdate.forEach(p => {
            db.products.update(p.id, { categoryIds: p.categoryIds.filter(id => id !== categoryId), sync_status: 'pending', updated_at: new Date().toISOString() });
        });

        db.categories.delete(categoryId);
        return { success: true };
    };
    
    const receiveStock = async (productId: string, quantity: number, variantId?: string) => {
        const product = await db.products.get(productId);
        if (!product) return;
        const newStockLevel = (variantId ? product.variants.find(v => v.id === variantId)?.stock : product.stock) || 0;
        adjustStock(productId, newStockLevel + quantity, 'Stock Received', variantId);
    };

    const adjustStock = async (productId: string, newStockLevel: number, reason: string, variantId?: string) => {
        const product = await db.products.get(productId);
        if (!product) return;

        let change = 0;
        let updatedProduct = { ...product, sync_status: 'pending' as const, updated_at: new Date().toISOString() };
        let productNameForNotify = product.name;
        let oldStock = 0;

        if (variantId) {
            const variant = updatedProduct.variants.find(v => v.id === variantId);
            if (variant) {
                oldStock = variant.stock;
                change = newStockLevel - variant.stock;
                updatedProduct.variants = updatedProduct.variants.map(v => 
                    v.id === variantId ? { ...v, stock: newStockLevel } : v
                );
                productNameForNotify = `${product.name} (${Object.values(variant.options).join(' / ')})`;
            }
        } else {
            oldStock = updatedProduct.stock;
            change = newStockLevel - updatedProduct.stock;
            updatedProduct.stock = newStockLevel;
        }
        
        updatedProduct.stock = calculateTotalStock(updatedProduct);
        
        if (change !== 0) {
                await addStockHistory(productId, change, reason, variantId);
                await db.products.put(updatedProduct);
                
                // Notifications
                if (oldStock > 0 && newStockLevel <= 0) {
                    addNotification(`Out of Stock: ${productNameForNotify}`, NotificationType.STOCK, variantId || productId);
                } else if (oldStock > product.lowStockThreshold && newStockLevel <= product.lowStockThreshold) {
                    addNotification(`Low Stock Warning: ${productNameForNotify} (${newStockLevel} left)`, NotificationType.STOCK, variantId || productId);
                }
        }
    };

    const removeStockHistoryByReason = useCallback(async (reasonPrefix: string) => {
        // Dexie doesn't support 'startsWith' easily in where clause without a plugin or full scan for string, but we can filter collection
        // Since reason isn't indexed, we use filter
        db.inventoryAdjustments
            .filter(adj => adj.reason.startsWith(reasonPrefix))
            .delete();
    }, []);

    const importProducts = async (newProducts: Omit<Product, 'id'>[]): Promise<{ success: boolean; message: string }> => {
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
                    sync_status: 'pending'
                });
                existingSkus.add(p.sku);
            } else {
                skippedCount++;
            }
        });

        if (productsToAdd.length > 0) {
            await db.products.bulkAdd(productsToAdd);
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

    const factoryReset = async (adminUser: User) => {
        // Clear all tables
        await (db as any).transaction('rw', db.products, db.categories, db.inventoryAdjustments, db.notifications, async () => {
            await db.products.clear();
            await db.categories.clear();
            await db.inventoryAdjustments.clear();
            await db.notifications.clear();
            
            // Reseed
            await db.products.bulkAdd(INITIAL_PRODUCTS.map(p => ({...p, sync_status: 'pending'})));
            await db.categories.bulkAdd(DEFAULT_CATEGORIES.map(c => ({...c, sync_status: 'pending'})));
        });
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
        deleteVariant,
        receiveStock,
        adjustStock,
        removeStockHistoryByReason,
        importProducts,
        factoryReset,
        bulkDeleteProducts,
        bulkUpdateProductCategories
    };

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    );
};
