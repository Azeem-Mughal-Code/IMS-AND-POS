import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Product, InventoryAdjustment, PriceHistoryEntry, User, Category, ProductVariant, NotificationType, CartItem } from '../../types';
import { INITIAL_PRODUCTS, DEFAULT_CATEGORIES, INITIAL_SUPPLIERS } from '../../constants';
import { useAuth } from './AuthContext';
import { useUIState } from './UIStateContext';
import { db } from '../../utils/db';
import { generateUUIDv7 } from '../../utils/idGenerator';

interface ProductContextType {
    products: Product[];
    categories: Category[];
    inventoryAdjustments: InventoryAdjustment[];
    addProduct: (product: Omit<Product, 'id' | 'stock' | 'priceHistory' | 'workspaceId'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string, force?: boolean) => Promise<{ success: boolean; message?: string }>;
    addCategory: (categoryData: Omit<Category, 'id' | 'workspaceId'>) => { success: boolean; message?: string };
    updateCategory: (categoryId: string, categoryData: Omit<Category, 'id' | 'workspaceId'>) => { success: boolean; message?: string };
    deleteCategory: (categoryId: string) => { success: boolean; message?: string };
    deleteVariant: (productId: string, variantId: string, force?: boolean) => Promise<{ success: boolean; message: string }>;
    receiveStock: (productId: string, quantity: number, variantId?: string) => void;
    adjustStock: (productId: string, newStockLevel: number, reason: string, variantId?: string) => void;
    removeStockHistoryByReason: (reasonPrefix: string) => void;
    importProducts: (newProducts: Omit<Product, 'id' | 'workspaceId'>[]) => Promise<{ success: boolean; message: string }>;
    factoryReset: (adminUser: User) => void;
    bulkDeleteProducts: (productIds: string[]) => Promise<{ success: boolean; message: string }>;
    bulkUpdateProductCategories: (productIds: string[], categoryIds: string[], action: 'add' | 'replace' | 'remove') => { success: boolean; message: string };
    restoreDeletedProducts: (items: CartItem[]) => Promise<{ success: boolean; count: number }>;
}

const ProductContext = createContext<ProductContextType | null>(null);

export const useProducts = () => {
    const context = useContext(ProductContext);
    if (!context) throw new Error('useProducts must be used within a ProductProvider');
    return context;
};

export const ProductProvider: React.FC<{ children: ReactNode; workspaceId: string }> = ({ children, workspaceId }) => {
    const { currentUser } = useAuth();
    const { addNotification } = useUIState();
    
    // Reactive Data from Dexie, filtered by workspaceId
    const products = useLiveQuery(() => db.products.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]) || [];
    const categories = useLiveQuery(() => db.categories.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]) || [];
    const inventoryAdjustments = useLiveQuery(() => db.inventoryAdjustments.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]) || [];

    // Seeding logic
    useEffect(() => {
        const seedData = async () => {
            if (!workspaceId) return;
            const count = await db.products.where('workspaceId').equals(workspaceId).count();
            if (count === 0 && workspaceId === 'guest_workspace') { // Only seed for guest mode automatically
                
                // Map Categories to new IDs
                const categoryMap = new Map<string, string>();
                const newCategories = DEFAULT_CATEGORIES.map(c => {
                    const newId = `cat_${generateUUIDv7()}`;
                    categoryMap.set(c.id, newId);
                    return { ...c, id: newId, workspaceId, sync_status: 'pending' as const };
                });
                
                // Fix parentIds
                newCategories.forEach(c => {
                    if (c.parentId && categoryMap.has(c.parentId)) {
                        c.parentId = categoryMap.get(c.parentId);
                    }
                });

                // Map Products to new IDs (including variants)
                const newProducts = INITIAL_PRODUCTS.map(p => ({
                    ...p,
                    id: `prod_${generateUUIDv7()}`,
                    categoryIds: p.categoryIds.map(cid => categoryMap.get(cid) || cid),
                    variants: p.variants?.map(v => ({ ...v, id: `var_${generateUUIDv7()}` })) || [],
                    sync_status: 'pending' as const,
                    workspaceId
                }));

                // Seed Suppliers for Guest Mode (Encrypted via middleware since key is set in AuthContext)
                const newSuppliers = INITIAL_SUPPLIERS.map(s => ({
                    ...s,
                    id: `sup_${generateUUIDv7()}`,
                    workspaceId,
                    sync_status: 'pending' as const
                }));

                await db.products.bulkAdd(newProducts);
                await db.categories.bulkAdd(newCategories);
                await db.suppliers.bulkAdd(newSuppliers);
            }
        };
        seedData();
    }, [workspaceId]);
    
    const addStockHistory = useCallback(async (productId: string, quantity: number, reason: string, variantId?: string) => {
        const newAdjustment: InventoryAdjustment = {
            id: `adj_${generateUUIDv7()}`,
            productId,
            variantId,
            quantity,
            reason,
            date: new Date().toISOString(),
            sync_status: 'pending',
            workspaceId
        };
        await db.inventoryAdjustments.add(newAdjustment);
    }, [workspaceId]);

    const calculateTotalStock = (product: Product): number => {
        if (product.variants && product.variants.length > 0) {
            return product.variants.reduce((sum, v) => sum + v.stock, 0);
        }
        return product.stock;
    };
    
    const addProduct = async (productData: Omit<Product, 'id' | 'stock' | 'priceHistory' | 'workspaceId'>) => {
        const newProduct: Product = {
            ...productData,
            id: `prod_${generateUUIDv7()}`,
            stock: productData.variants.length > 0 ? productData.variants.reduce((sum, v) => sum + v.stock, 0) : 0,
            priceHistory: [],
            sync_status: 'pending',
            workspaceId
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
        if (oldProduct.workspaceId !== workspaceId) return; // Security check
        
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
        if (!productId || typeof productId !== 'string') return { success: false, message: 'Invalid Product ID.' };

        const product = await db.products.get(productId);
        if (!product) return { success: false, message: 'Product not found.' };
        if (product.workspaceId !== workspaceId) return { success: false, message: 'Access denied.' };
        
        if (!force) {
            if (product.variants && product.variants.length > 0) {
                return { success: false, message: 'Cannot delete product because it has variants. Delete variants first or use Force Delete.' };
            }
            const totalStock = calculateTotalStock(product);
            if (totalStock > 0) {
                return { success: false, message: 'Cannot delete product with active stock.' };
            }
        }
        
        try {
            // Use transaction to ensure atomic deletion (notifications, adjustments, and product)
            await (db as any).transaction('rw', db.products, db.inventoryAdjustments, db.notifications, db.deletedRecords, async () => {
                const deletions: { id: string; table: string; deletedAt: string; sync_status: string }[] = [];

                // 1. Delete Stock History safely
                const adjustmentsToDelete = await db.inventoryAdjustments.where('productId').equals(productId).toArray();
                if (adjustmentsToDelete.length > 0) {
                    const adjKeys = adjustmentsToDelete.map(adj => adj.id);
                    await db.inventoryAdjustments.bulkDelete(adjKeys);
                    
                    // Record adjustment deletions.
                    const adjDeletions = adjKeys
                        .filter(k => k != null)
                        .map(id => ({
                            id: String(id), 
                            table: 'inventoryAdjustments', 
                            deletedAt: new Date().toISOString(), 
                            sync_status: 'pending' as const
                        }));
                    deletions.push(...adjDeletions);
                }
                
                // 2. Delete Notifications safely
                const relatedIds = [productId];
                if (product.variants && product.variants.length > 0) {
                    relatedIds.push(...product.variants.map(v => v.id).filter(id => !!id));
                }
                
                const notifKeys = await db.notifications.where('relatedId').anyOf(relatedIds).primaryKeys();
                if (notifKeys.length > 0) {
                    await Promise.all(notifKeys.map((key: string) => db.notifications.delete(key)));
                    
                    const notifDeletions = notifKeys
                        .filter(k => k != null)
                        .map(id => ({
                            id: String(id), 
                            table: 'notifications', 
                            deletedAt: new Date().toISOString(), 
                            sync_status: 'pending' as const
                        }));
                    deletions.push(...notifDeletions);
                }
                
                // 3. Delete Product
                await db.products.delete(productId);
                
                deletions.push({
                    id: String(productId),
                    table: 'products',
                    deletedAt: new Date().toISOString(),
                    sync_status: 'pending'
                });

                // 4. Record Deletion for Sync
                if (deletions.length > 0) {
                    // Filter invalid entries just in case
                    const validDeletions = deletions.filter(d => d.id && d.id !== 'undefined');
                    if (validDeletions.length > 0) {
                        await db.deletedRecords.bulkPut(validDeletions);
                    }
                }
            });
            
            return { success: true, message: 'Product and related records deleted successfully.' };
        } catch (error) {
            console.error("Failed to delete product:", error);
            return { success: false, message: `Failed to delete product: ${(error as any).message || error}` };
        }
    };

    const deleteVariant = async (productId: string, variantId: string, force: boolean = false): Promise<{ success: boolean; message: string }> => {
        if (!productId || !variantId || typeof productId !== 'string' || typeof variantId !== 'string') return { success: false, message: 'Invalid ID.' };

        const product = await db.products.get(productId);
        if (!product) return { success: false, message: 'Product not found.' };
        if (product.workspaceId !== workspaceId) return { success: false, message: 'Access denied.' };
        
        const variant = product.variants.find(v => v.id === variantId);
        if (!variant) return { success: false, message: 'Variant not found.' };
        
        if (!force) {
            // Prevent deletion if variant has stock
            if (variant.stock > 0) {
                return { success: false, message: 'Cannot delete variant with active stock.' };
            }
        }
        
        try {
            await (db as any).transaction('rw', db.products, db.inventoryAdjustments, db.notifications, db.deletedRecords, async () => {
                const deletions: { id: string; table: string; deletedAt: string; sync_status: string }[] = [];

                // 1. Delete Stock History for this variant safely
                const adjustmentsToDelete = await db.inventoryAdjustments.where('variantId').equals(variantId).toArray();
                if (adjustmentsToDelete.length > 0) {
                    const adjKeys = adjustmentsToDelete.map(adj => adj.id);
                    await db.inventoryAdjustments.bulkDelete(adjKeys);

                    const adjDeletions = adjKeys
                        .filter(k => k != null)
                        .map(id => ({
                            id: String(id), 
                            table: 'inventoryAdjustments', 
                            deletedAt: new Date().toISOString(), 
                            sync_status: 'pending' as const
                        }));
                    deletions.push(...adjDeletions);
                }

                // 2. Delete Notifications for this variant safely
                const notifKeys = await db.notifications.where('relatedId').equals(variantId).primaryKeys();
                if (notifKeys.length > 0) {
                    await Promise.all(notifKeys.map((key: string) => db.notifications.delete(key)));
                    const notifDeletions = notifKeys
                        .filter(k => k != null)
                        .map(id => ({
                            id: String(id), 
                            table: 'notifications', 
                            deletedAt: new Date().toISOString(), 
                            sync_status: 'pending' as const
                        }));
                    deletions.push(...notifDeletions);
                }

                // 3. Remove variant from product
                const newVariants = product.variants.filter(v => v.id !== variantId);
                
                const updatedProduct = { 
                    ...product, 
                    variants: newVariants, 
                    sync_status: 'pending' as const, 
                    updated_at: new Date().toISOString() 
                };
                updatedProduct.stock = updatedProduct.variants.reduce((sum, v) => sum + v.stock, 0);
                
                await db.products.put(updatedProduct);

                if (deletions.length > 0) {
                    const validDeletions = deletions.filter(d => d.id && d.id !== 'undefined');
                    if (validDeletions.length > 0) {
                        await db.deletedRecords.bulkPut(validDeletions);
                    }
                }
            });

            return { success: true, message: 'Variant and related records deleted successfully.' };
        } catch (error) {
            console.error("Failed to delete variant:", error);
            return { success: false, message: 'An error occurred while deleting the variant.' };
        }
    };

    const bulkDeleteProducts = async (productIds: string[]): Promise<{ success: boolean; message: string }> => {
        const productsToDelete = products.filter(p => productIds.includes(p.id));
        const deletable = productsToDelete.filter(p => p.stock <= 0);
        const failedCount = productsToDelete.length - deletable.length;
        
        if (deletable.length > 0) {
            try {
                const ids = deletable.map(p => p.id);
                const allRelatedIds = [...ids];
                deletable.forEach(p => {
                    if (p.variants) {
                        allRelatedIds.push(...p.variants.map(v => v.id));
                    }
                });

                await (db as any).transaction('rw', db.products, db.inventoryAdjustments, db.notifications, db.deletedRecords, async () => {
                    const deletions: { id: string; table: string; deletedAt: string; sync_status: string }[] = [];

                    // Safe deletion for bulk operations too
                    const adjKeys = await db.inventoryAdjustments.where('productId').anyOf(ids).primaryKeys();
                    if (adjKeys.length > 0) {
                        await Promise.all(adjKeys.map((k: string) => db.inventoryAdjustments.delete(k)));
                        deletions.push(...adjKeys.filter(k => k != null).map(id => ({
                            id: String(id), table: 'inventoryAdjustments', deletedAt: new Date().toISOString(), sync_status: 'pending'
                        })));
                    }

                    const notifKeys = await db.notifications.where('relatedId').anyOf(allRelatedIds).primaryKeys();
                    if (notifKeys.length > 0) {
                        await Promise.all(notifKeys.map((k: string) => db.notifications.delete(k)));
                        deletions.push(...notifKeys.filter(k => k != null).map(id => ({
                            id: String(id), table: 'notifications', deletedAt: new Date().toISOString(), sync_status: 'pending'
                        })));
                    }

                    await Promise.all(ids.map((id: string) => db.products.delete(id)));
                    
                    // Record deletions
                    deletions.push(...ids.map(id => ({
                        id: String(id),
                        table: 'products',
                        deletedAt: new Date().toISOString(),
                        sync_status: 'pending'
                    })));
                    
                    if (deletions.length > 0) {
                        const validDeletions = deletions.filter(d => d.id && d.id !== 'undefined');
                        if (validDeletions.length > 0) {
                            await db.deletedRecords.bulkPut(validDeletions);
                        }
                    }
                });
            } catch (error) {
                console.error("Bulk delete failed:", error);
                return { success: false, message: "Bulk deletion failed due to database error." };
            }
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

    const addCategory = (categoryData: Omit<Category, 'id' | 'workspaceId'>): { success: boolean, message?: string } => {
        if (categories.some(c => c.name.toLowerCase() === categoryData.name.toLowerCase() && c.parentId === categoryData.parentId)) {
            return { success: false, message: 'A category with this name already exists at this level.' };
        }
        const newCategory: Category = { 
            ...categoryData, 
            id: `cat_${generateUUIDv7()}`, 
            sync_status: 'pending',
            workspaceId
        };
        db.categories.add(newCategory);
        return { success: true };
    };

    const updateCategory = (categoryId: string, categoryData: Omit<Category, 'id' | 'workspaceId'>): { success: boolean, message?: string } => {
        const existing = categories.find(c => c.id === categoryId);
        if (!existing) return { success: false, message: "Category not found" };
        
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
        
        // Record deletion
        db.deletedRecords.put({
            id: String(categoryId),
            table: 'categories',
            deletedAt: new Date().toISOString(),
            sync_status: 'pending'
        });
        
        return { success: true };
    };
    
    const receiveStock = async (productId: string, quantity: number, variantId?: string) => {
        if (!productId) return;
        const product = await db.products.get(productId);
        if (!product || product.workspaceId !== workspaceId) return;
        const newStockLevel = (variantId ? product.variants.find(v => v.id === variantId)?.stock : product.stock) || 0;
        adjustStock(productId, newStockLevel + quantity, 'Stock Received', variantId);
    };

    const adjustStock = async (productId: string, newStockLevel: number, reason: string, variantId?: string) => {
        if (!productId) return;
        const product = await db.products.get(productId);
        if (!product || product.workspaceId !== workspaceId) return;

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
        // Deleting adjustment records - filtered by workspace to be safe
        const adjustments = await db.inventoryAdjustments
            .where('workspaceId').equals(workspaceId)
            .filter(adj => adj.reason.startsWith(reasonPrefix))
            .toArray();
            
        const ids = adjustments.map(a => a.id);
        
        await (db as any).transaction('rw', db.inventoryAdjustments, db.deletedRecords, async () => {
            if (ids.length > 0) {
                await Promise.all(ids.map((id: string) => db.inventoryAdjustments.delete(id)));
                const records = ids.map(id => ({
                    id: String(id),
                    table: 'inventoryAdjustments',
                    deletedAt: new Date().toISOString(),
                    sync_status: 'pending'
                }));
                // Use bulkPut to avoid errors on duplicates
                await db.deletedRecords.bulkPut(records);
            }
        });
    }, [workspaceId]);

    const importProducts = async (newProducts: Omit<Product, 'id' | 'workspaceId'>[]): Promise<{ success: boolean; message: string }> => {
        const existingSkus = new Set(products.map(p => p.sku));
        const productsToAdd: Product[] = [];
        let skippedCount = 0;

        newProducts.forEach((p, i) => {
            if (!existingSkus.has(p.sku)) {
                 productsToAdd.push({
                    ...p,
                    id: `prod_${generateUUIDv7()}`,
                    stock: p.stock || 0,
                    priceHistory: [],
                    categoryIds: [],
                    variationTypes: [],
                    variants: [],
                    sync_status: 'pending',
                    workspaceId
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

    const restoreDeletedProducts = async (items: CartItem[]): Promise<{ success: boolean; count: number }> => {
        const restoredIds = new Set<string>();

        // We wrap everything in a transaction to ensure category creation + cleanups + inserts happen atomically
        await (db as any).transaction('rw', db.products, db.categories, db.inventoryAdjustments, db.notifications, db.deletedRecords, async () => {
            
            // 1. Find or Create 'Restored' Category
            let restoredCategory = await db.categories.where('workspaceId').equals(workspaceId).filter(c => c.name === 'Restored').first();
            if (!restoredCategory) {
                 const catId = `cat_${generateUUIDv7()}`;
                 restoredCategory = {
                     id: catId,
                     name: 'Restored',
                     parentId: null,
                     workspaceId,
                     sync_status: 'pending'
                 };
                 await db.categories.add(restoredCategory);
            }

            for (const item of items) {
                // Prevent attempting to restore duplicates within the same transaction batch
                if (restoredIds.has(item.productId)) continue;
                
                // Check if product actually exists (perhaps restored by another process or query lag)
                const exists = await db.products.get(item.productId);
                if (exists) continue;

                // --- DEFENSIVE CLEANUP START ---
                // Ensure no orphan history records exist for this ID (fixes issue where restored products show old history)
                // 1. Clean Inventory Adjustments
                const adjKeys = await db.inventoryAdjustments.where('productId').equals(item.productId).primaryKeys();
                if (adjKeys.length > 0) {
                    await Promise.all(adjKeys.map((k: string) => db.inventoryAdjustments.delete(k)));
                }
                
                // 2. Clean Notifications
                const notifKeys = await db.notifications.where('relatedId').equals(item.productId).primaryKeys();
                if (notifKeys.length > 0) {
                    await Promise.all(notifKeys.map((k: string) => db.notifications.delete(k)));
                }

                // 3. Clean Deleted Records (Tombstones) if any
                // If we are restoring, we should remove the pending deletion record if it exists to avoid sync conflict
                const delKeys = await db.deletedRecords.where('id').equals(item.productId).primaryKeys();
                if (delKeys.length > 0) {
                    await Promise.all(delKeys.map((k: string) => db.deletedRecords.delete(k)));
                }
                // --- DEFENSIVE CLEANUP END ---

                const newProduct: Product = {
                    id: item.productId, // Reuse original ID to try and maintain link if possible
                    sku: item.sku,
                    name: item.name, // Use the name from the receipt (e.g. "Shirt (Red)")
                    retailPrice: item.retailPrice,
                    costPrice: item.costPrice,
                    stock: 0, // Stock will be incremented by the return transaction immediately after this
                    lowStockThreshold: 0,
                    categoryIds: [restoredCategory.id],
                    variationTypes: [], // Restore as simple product to ensure existence
                    variants: [],
                    priceHistory: [], // Explicitly empty price history
                    workspaceId,
                    sync_status: 'pending',
                    updated_at: new Date().toISOString()
                };
                
                await db.products.add(newProduct);
                restoredIds.add(item.productId);
            }
        });
        
        return { success: true, count: restoredIds.size };
    };

    const factoryReset = async (adminUser: User) => {
        // Clear all tables for this workspace
        await (db as any).transaction('rw', db.products, db.categories, db.inventoryAdjustments, db.notifications, db.deletedRecords, db.suppliers, async () => {
            await db.products.where('workspaceId').equals(workspaceId).delete();
            await db.categories.where('workspaceId').equals(workspaceId).delete();
            await db.inventoryAdjustments.where('workspaceId').equals(workspaceId).delete();
            await db.suppliers.where('workspaceId').equals(workspaceId).delete();
            // Reseed if Guest
            if (workspaceId === 'guest_workspace') {
                await db.products.bulkAdd(INITIAL_PRODUCTS.map(p => ({...p, sync_status: 'pending', workspaceId})));
                await db.categories.bulkAdd(DEFAULT_CATEGORIES.map(c => ({...c, sync_status: 'pending', workspaceId})));
                await db.suppliers.bulkAdd(INITIAL_SUPPLIERS.map(s => ({...s, sync_status: 'pending', workspaceId})));
            }
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
        bulkUpdateProductCategories,
        restoreDeletedProducts
    };

    return (
        <ProductContext.Provider value={value}>
            {children}
        </ProductContext.Provider>
    );
};