
import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Sale, PurchaseOrder, POItem, Product, CartItem, Shift, PaymentType, HeldOrder, NotificationType } from '../../types';
import { useProducts } from './ProductContext';
import { useUIState } from './UIStateContext';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { generateUUIDv7, generateUniqueNanoID } from '../../utils/idGenerator';
import { db } from '../../utils/db';

interface SalesContextType {
    sales: Sale[];
    purchaseOrders: PurchaseOrder[];
    heldOrders: HeldOrder[];
    shifts: Shift[];
    processSale: (saleData: Omit<Sale, 'id' | 'date' | 'workspaceId'>) => Promise<Sale>;
    deleteSale: (saleId: string) => Promise<{ success: boolean; message?: string }>;
    clearSales: (options?: { statuses?: (Sale['status'])[] }) => void;
    pruneData: (target: 'sales' | 'purchaseOrders', options: { days: number; statuses?: Sale['status'][] }) => { success: boolean; message: string };
    addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'workspaceId'>) => PurchaseOrder;
    receivePOItems: (poId: string, items: { productId: string; variantId?: string; quantity: number }[]) => void;
    deletePurchaseOrder: (poId: string) => Promise<{ success: boolean; message?: string }>;
    factoryReset: () => void;
    currentShift: Shift | null;
    openShift: (float: number) => void;
    closeShift: (actualCash: number, notes: string) => Promise<{ success: boolean; message?: string }>;
    holdOrder: (order: Omit<HeldOrder, 'id' | 'date' | 'workspaceId'>) => void;
    deleteHeldOrder: (orderId: string) => void;
}

const SalesContext = createContext<SalesContextType | null>(null);

export const useSales = () => {
    const context = useContext(SalesContext);
    if (!context) throw new Error('useSales must be used within a SalesProvider');
    return context;
};

export const SalesProvider: React.FC<{ children: ReactNode; workspaceId: string }> = ({ children, workspaceId }) => {
    const { currentUser } = useAuth();
    const { includeTaxInProfit } = useSettings();
    
    // Reactive Data from Dexie, filtered by workspaceId
    const sales = useLiveQuery(async () => {
        const list = await db.sales.where('workspaceId').equals(workspaceId).toArray();
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [workspaceId]) || [];

    const purchaseOrders = useLiveQuery(async () => {
        const list = await db.purchaseOrders.where('workspaceId').equals(workspaceId).toArray();
        return list.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());
    }, [workspaceId]) || [];

    const shifts = useLiveQuery(async () => {
        const list = await db.shifts.where('workspaceId').equals(workspaceId).toArray();
        return list.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [workspaceId]) || [];

    const heldOrders = useLiveQuery(() => db.heldOrders.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]) || [];
    
    const { products, adjustStock, removeStockHistoryByReason } = useProducts();
    const { addNotification, notifications } = useUIState();

    // Check for overdue Purchase Orders
    useEffect(() => {
        const checkOverduePOs = () => {
            const now = new Date();
            purchaseOrders.forEach(po => {
                if (po.status !== 'Received' && po.dateExpected) {
                    const expectedDate = new Date(po.dateExpected);
                    if (now > expectedDate) {
                        const alreadyNotified = notifications.some(n => 
                            n.relatedId === po.id && 
                            n.type === NotificationType.PO && 
                            n.message.includes('overdue')
                        );

                        if (!alreadyNotified) {
                            addNotification(
                                `PO #${po.publicId || po.id} from ${po.supplierName} is overdue (Exp: ${expectedDate.toLocaleDateString()})`, 
                                NotificationType.PO, 
                                po.id
                            );
                        }
                    }
                }
            });
        };
        checkOverduePOs();
    }, [purchaseOrders, addNotification, notifications]);

    const currentShift = useMemo(() => shifts.find(s => s.status === 'Open') || null, [shifts]);

    const processSale = async (saleData: Omit<Sale, 'id' | 'date' | 'workspaceId'>): Promise<Sale> => {
        let finalType: 'Sale' | 'Return' = saleData.total >= 0 ? 'Sale' : 'Return';
        const isReturn = finalType === 'Return';
        
        const internalId = generateUUIDv7();
        const prefix = isReturn ? 'RET-' : 'TRX-';
        const publicId = generateUniqueNanoID<Sale>(sales, (s, id) => s.publicId === id, 8, prefix);

        let originalSalePublicId: string | undefined = undefined;
        if (saleData.originalSaleId) {
            const originalSale = sales.find(s => s.id === saleData.originalSaleId);
            originalSalePublicId = originalSale?.publicId;
        }

        // Recalculate profit based on current setting to ensure consistency at moment of sale creation
        const safeTotal = parseFloat(String(saleData.total)) || 0;
        const safeTax = parseFloat(String(saleData.tax)) || 0;
        const safeCogs = parseFloat(String(saleData.cogs)) || 0;
        
        // Profit = (Total - Tax) - COGS if includeTaxInProfit is false
        // Profit = Total - COGS if includeTaxInProfit is true
        const revenue = safeTotal - (includeTaxInProfit ? 0 : safeTax);
        const profit = revenue - safeCogs;

        const newSale: Sale = {
            ...saleData,
            profit, // Override the profit from POS calculation with the context-aware one
            type: finalType,
            id: internalId,
            publicId: publicId,
            originalSalePublicId: originalSalePublicId,
            date: new Date().toISOString(),
            status: 'Completed',
            sync_status: 'pending',
            workspaceId
        };

        // Process each item for stock adjustment
        for (const item of newSale.items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const currentStock = item.variantId 
                    ? product.variants.find(v => v.id === item.variantId)?.stock 
                    : product.stock;
                
                if (typeof currentStock !== 'undefined') {
                    // await adjustStock? adjustStock is synchronous wrapper in ProductContext but async internally.
                    // Fire and forget is usually okay for stock if it's atomic in DB, but here we invoke it.
                    adjustStock(item.productId, currentStock - item.quantity, `Sale #${newSale.publicId}`, item.variantId);
                }
            }
        }

        // Process updates to ORIGINAL sales if any items are returns linked to history
        const salesToUpdate = new Map<string, CartItem[]>();

        newSale.items.forEach(item => {
            if (item.quantity < 0 && item.originalSaleId) {
                const existing = salesToUpdate.get(item.originalSaleId) || [];
                existing.push(item);
                salesToUpdate.set(item.originalSaleId, existing);
            }
        });

        if (salesToUpdate.size > 0) {
            for (const [rawSaleId, returnItems] of Array.from(salesToUpdate.entries())) {
                const saleId = String(rawSaleId);
                try {
                    const sale = await db.sales.get(saleId);
                    if (sale && sale.workspaceId === workspaceId) {
                        const updatedItems = sale.items.map(origItem => {
                            const matchingReturns = returnItems.filter(ri => 
                                ri.productId === origItem.productId && 
                                ri.variantId === origItem.variantId
                            );
                            if (matchingReturns.length > 0) {
                                const quantityReturnedNow = matchingReturns.reduce((sum, ri) => sum + Math.abs(ri.quantity), 0);
                                return { ...origItem, returnedQuantity: (origItem.returnedQuantity || 0) + quantityReturnedNow };
                            }
                            return origItem;
                        });
                        const allReturned = updatedItems.every(item => (item.returnedQuantity || 0) >= item.quantity);
                        
                        await db.sales.put({ 
                            ...sale,
                            items: updatedItems, 
                            status: allReturned ? 'Refunded' : 'Partially Refunded',
                            sync_status: 'pending',
                            updated_at: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    console.error(`Failed to update original sale history for ${saleId}:`, e);
                }
            }
        }

        // Add sale to DB
        await db.sales.add(newSale);

        // Update shift
        if (currentShift) {
            const cashPayment = newSale.payments.find(p => p.type === PaymentType.Cash);
            if (cashPayment && cashPayment.amount !== 0) {
                const shiftId = currentShift.id;
                const cashAmount = cashPayment.amount;

                await (db as any).transaction('rw', db.shifts, async () => {
                    const s = await db.shifts.get(shiftId);
                    if (s) {
                        const safeFloat = (val: any) => {
                            const n = parseFloat(val);
                            return isNaN(n) ? 0 : n;
                        };

                        const currentSales = safeFloat(s.cashSales);
                        const currentRefunds = safeFloat(s.cashRefunds);
                        
                        // Use put with full object instead of update to ensure encryption middleware works correctly
                        const updatedShift = {
                            ...s,
                            cashSales: cashAmount > 0 ? currentSales + cashAmount : currentSales,
                            cashRefunds: cashAmount < 0 ? currentRefunds + Math.abs(cashAmount) : currentRefunds,
                            sync_status: 'pending',
                            updated_at: new Date().toISOString()
                        };
                        await db.shifts.put(updatedShift);
                    }
                }).catch((e: any) => console.error("Failed to update shift", e));
            }
        }

        return newSale;
    };

    const deleteSale = async (saleId: string) => {
        if (!saleId) return { success: false, message: "Invalid Sale ID." };
        
        const saleToDelete = await db.sales.get(saleId);
        if(!saleToDelete) return { success: false, message: "Sale not found." };
        if (saleToDelete.workspaceId !== workspaceId) return { success: false, message: "Access denied." };
        
        const associatedReturns = await db.sales.where('originalSaleId').equals(saleId).toArray();
        const associatedReturnIds = associatedReturns.map(r => r.id);
        
        await (db as any).transaction('rw', db.sales, db.deletedRecords, db.inventoryAdjustments, async () => {
            await db.sales.delete(saleId);
            if (associatedReturnIds.length > 0) {
                await db.sales.bulkDelete(associatedReturnIds);
            }

            const deletions = [saleId, ...associatedReturnIds].map(id => ({
                id, 
                table: 'sales', 
                deletedAt: new Date().toISOString(), 
                sync_status: 'pending'
            }));
            await db.deletedRecords.bulkAdd(deletions);
        });

        const refId = saleToDelete.publicId || saleToDelete.id;
        removeStockHistoryByReason(`Sale #${refId}`); 

        associatedReturns.forEach(ret => {
            const retRefId = ret.publicId || ret.id;
            removeStockHistoryByReason(`Sale #${retRefId}`);
        });
        
        return { success: true, message: `Sale ${refId} and associated records deleted.` };
    };

    const clearSales = (options?: { statuses?: (Sale['status'])[] }) => {
        let salesToClear = sales;
        
        if (!options?.statuses) {
            salesToClear = sales.filter(s => s.type === 'Sale');
        } else {
            if (options.statuses.length === 0) return;
            salesToClear = sales.filter(s => s.type === 'Sale' && options.statuses!.includes(s.status!));
        }

        if (salesToClear.length === 0) return;

        const salesToClearIds = salesToClear.map(s => s.id);

        salesToClear.forEach(s => {
            const refId = s.publicId || s.id;
            removeStockHistoryByReason(`Sale #${refId}`);
        });

        const returnsToClear = sales.filter(s => s.type === 'Return' && s.originalSaleId && salesToClearIds.includes(s.originalSaleId));
        const returnsToClearIds = returnsToClear.map(s => s.id);

        returnsToClear.forEach(s => {
            const refId = s.publicId || s.id;
            removeStockHistoryByReason(`Sale #${refId}`);
        });

        const allIds = [...salesToClearIds, ...returnsToClearIds];
        
        (db as any).transaction('rw', db.sales, db.deletedRecords, async () => {
            await db.sales.bulkDelete(allIds);
            
            const deletions = allIds.map(id => ({
                id, 
                table: 'sales', 
                deletedAt: new Date().toISOString(), 
                sync_status: 'pending'
            }));
            await db.deletedRecords.bulkAdd(deletions);
        });
    };
    
    const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'workspaceId'>): PurchaseOrder => {
        const internalId = generateUUIDv7();
        const publicId = generateUniqueNanoID<PurchaseOrder>(purchaseOrders, (p, id) => p.publicId === id, 6, 'PO-');

        const newPO: PurchaseOrder = {
            ...poData,
            id: internalId,
            publicId: publicId,
            sync_status: 'pending',
            workspaceId
        };
        db.purchaseOrders.add(newPO);
        addNotification(`New PO #${newPO.publicId} created for ${newPO.supplierName}.`, NotificationType.PO, newPO.id);
        return newPO;
    };
    
    const receivePOItems = (poId: string, items: { productId: string; variantId?: string; quantity: number }[]) => {
        const po = purchaseOrders.find(p => p.id === poId);
        if (!po) return;
        const poRef = po.publicId || poId;

        items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const currentStock = item.variantId
                    ? product.variants.find(v => v.id === item.variantId)?.stock
                    : product.stock;
                
                if (typeof currentStock !== 'undefined') {
                    adjustStock(item.productId, currentStock + item.quantity, `Received from PO #${poRef}`, item.variantId);
                }
            }
        });

        const updatedItems = po.items.map(item => {
            const received = items.find(r => r.productId === item.productId && r.variantId === item.variantId);
            if (received) {
                return { ...item, quantityReceived: item.quantityReceived + received.quantity };
            }
            return item;
        });
        
        const allReceived = updatedItems.every(item => item.quantityReceived >= item.quantityOrdered);
        const newStatus = allReceived ? 'Received' : 'Partial';
        if(newStatus !== po.status) {
            addNotification(`PO #${po.publicId || po.id} is now ${newStatus}.`, NotificationType.PO, poId);
        }
        
        db.purchaseOrders.update(poId, { 
            items: updatedItems, 
            status: newStatus, 
            sync_status: 'pending', 
            updated_at: new Date().toISOString() 
        });
    };
    
    const deletePurchaseOrder = async (poId: string) => {
        const po = await db.purchaseOrders.get(poId);
        if(!po) return { success: false, message: 'Purchase Order not found.'};
        if (po.workspaceId !== workspaceId) return { success: false, message: 'Access denied.' };
        
        await (db as any).transaction('rw', db.purchaseOrders, db.notifications, db.deletedRecords, async () => {
            await db.notifications.where('relatedId').equals(poId).delete();
            await db.purchaseOrders.delete(poId);
            
            await db.deletedRecords.add({
                id: poId,
                table: 'purchaseOrders',
                deletedAt: new Date().toISOString(),
                sync_status: 'pending'
            });
        });
        
        return { success: true, message: 'Purchase Order deleted.'};
    };
    
    const pruneData = (target: 'sales' | 'purchaseOrders', options: { days: number; statuses?: Sale['status'][] }): { success: boolean; message: string } => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.days);
        
        if (target === 'sales') {
            const salesToClear = sales.filter(s => {
                if (new Date(s.date) >= cutoffDate) return false;
                if (s.type === 'Return') return false;
                if (options.statuses && options.statuses.length > 0) {
                    return options.statuses.includes(s.status!);
                }
                return true;
            });

            const salesToClearIds = salesToClear.map(s => s.id);

            if (salesToClearIds.length === 0) {
                return { success: true, message: 'No sales records matched the criteria for pruning.' };
            }

            salesToClear.forEach(s => {
                const ref = s.publicId || s.id;
                removeStockHistoryByReason(`Sale #${ref}`);
            });
            
            const returnsToRemove = sales.filter(s => s.type === 'Return' && s.originalSaleId && salesToClearIds.includes(s.originalSaleId));
            const returnsToRemoveIds = returnsToRemove.map(s => s.id);
            
            returnsToRemove.forEach(s => {
                const ref = s.publicId || s.id;
                removeStockHistoryByReason(`Sale #${ref}`);
            });

            const allIds = [...salesToClearIds, ...returnsToRemoveIds];
            
            (db as any).transaction('rw', db.sales, db.deletedRecords, async () => {
                await db.sales.bulkDelete(allIds);
                const deletions = allIds.map(id => ({
                    id, 
                    table: 'sales', 
                    deletedAt: new Date().toISOString(), 
                    sync_status: 'pending'
                }));
                await db.deletedRecords.bulkAdd(deletions);
            });

            return { success: true, message: `Pruned ${allIds.length} records.`};
        }

        if (target === 'purchaseOrders') {
            const toDeleteIds = purchaseOrders.filter(po => new Date(po.dateCreated) < cutoffDate).map(po => po.id);
            
            (db as any).transaction('rw', db.purchaseOrders, db.notifications, db.deletedRecords, async () => {
                for(const id of toDeleteIds) {
                    await db.notifications.where('relatedId').equals(id).delete();
                }
                await db.purchaseOrders.bulkDelete(toDeleteIds);
                
                const deletions = toDeleteIds.map(id => ({
                    id, 
                    table: 'purchaseOrders', 
                    deletedAt: new Date().toISOString(), 
                    sync_status: 'pending'
                }));
                await db.deletedRecords.bulkAdd(deletions);
            });

            return { success: true, message: `Pruned ${toDeleteIds.length} purchase orders.`};
        }
        
        return { success: false, message: 'Invalid data target for pruning.' };
    };

    const factoryReset = () => {
        (db as any).transaction('rw', db.sales, db.purchaseOrders, db.shifts, db.heldOrders, db.notifications, db.deletedRecords, async () => {
            await db.sales.where('workspaceId').equals(workspaceId).delete();
            await db.purchaseOrders.where('workspaceId').equals(workspaceId).delete();
            await db.shifts.where('workspaceId').equals(workspaceId).delete();
            await db.heldOrders.where('workspaceId').equals(workspaceId).delete();
            await db.notifications.where('workspaceId').equals(workspaceId).delete();
        });
    };

    const openShift = (float: number) => {
        if (currentShift) return;
        const internalId = generateUUIDv7();
        const publicId = generateUniqueNanoID<Shift>(shifts, (s, id) => s.publicId === id, 6, 'SHF-');
        const newShift: Shift = {
            id: internalId,
            publicId: publicId,
            openedByUserId: currentUser?.id || 'unknown',
            openedByUserName: currentUser?.username || 'Unknown',
            startTime: new Date().toISOString(),
            startFloat: float,
            status: 'Open',
            cashSales: 0,
            cashRefunds: 0,
            sync_status: 'pending',
            workspaceId
        };
        db.shifts.add(newShift);
        addNotification(`Shift started by ${newShift.openedByUserName} with float ${float}`, NotificationType.USER);
    };

    const closeShift = async (actualCash: number, notes: string): Promise<{ success: boolean; message?: string }> => {
        if (!currentShift) return { success: false, message: 'No active shift.' };
        
        try {
            await (db as any).transaction('rw', db.shifts, async () => {
                const s = await db.shifts.get(currentShift.id);
                if (!s) throw new Error("Shift not found in DB");
                
                const safeFloat = (val: any) => {
                    const n = parseFloat(val);
                    return isNaN(n) ? 0 : n;
                };

                const safeStart = safeFloat(s.startFloat);
                const safeSales = safeFloat(s.cashSales);
                const safeRefunds = safeFloat(s.cashRefunds);
                
                const expectedCash = safeStart + safeSales - safeRefunds;
                const difference = actualCash - expectedCash;

                // Use put with full object instead of update to ensure encryption middleware works correctly
                const updatedShift = {
                    ...s,
                    closedByUserId: currentUser?.id,
                    closedByUserName: currentUser?.username,
                    endTime: new Date().toISOString(),
                    endFloat: expectedCash,
                    actualCash,
                    difference,
                    notes,
                    status: 'Closed',
                    sync_status: 'pending',
                    updated_at: new Date().toISOString()
                };
                await db.shifts.put(updatedShift);
            });
            
            addNotification(`Shift closed by ${currentUser?.username}.`, NotificationType.USER);
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Failed to close shift.' };
        }
    };

    const holdOrder = (order: Omit<HeldOrder, 'id' | 'date' | 'workspaceId'>) => {
        const newHeldOrder: HeldOrder = {
            ...order,
            id: generateUUIDv7(),
            publicId: generateUniqueNanoID<HeldOrder>(heldOrders, (o, id) => o.publicId === id, 4, 'HLD-'),
            date: new Date().toISOString(),
            workspaceId
        };
        db.heldOrders.add(newHeldOrder);
    };

    const deleteHeldOrder = (orderId: string) => {
        db.heldOrders.delete(orderId);
        db.deletedRecords.add({
            id: orderId,
            table: 'heldOrders',
            deletedAt: new Date().toISOString(),
            sync_status: 'pending'
        });
    };

    const value = {
        sales,
        purchaseOrders,
        heldOrders,
        shifts,
        processSale,
        deleteSale,
        clearSales,
        pruneData,
        addPurchaseOrder,
        receivePOItems,
        deletePurchaseOrder,
        factoryReset,
        currentShift,
        openShift,
        closeShift,
        holdOrder,
        deleteHeldOrder
    };

    return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};
