
import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Sale, PurchaseOrder, POItem, Product, CartItem, Shift, PaymentType, HeldOrder, NotificationType } from '../../types';
import { useProducts } from './ProductContext';
import { useUIState } from './UIStateContext';
import { useAuth } from './AuthContext';
import { generateUUIDv7, generateUniqueNanoID } from '../../utils/idGenerator';
import { db } from '../../utils/db';

interface SalesContextType {
    sales: Sale[];
    purchaseOrders: PurchaseOrder[];
    heldOrders: HeldOrder[];
    shifts: Shift[];
    processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
    deleteSale: (saleId: string) => Promise<{ success: boolean; message?: string }>;
    clearSales: (options?: { statuses?: (Sale['status'])[] }) => void;
    pruneData: (target: 'sales' | 'purchaseOrders', options: { days: number; statuses?: Sale['status'][] }) => { success: boolean; message: string };
    addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
    receivePOItems: (poId: string, items: { productId: string; variantId?: string; quantity: number }[]) => void;
    deletePurchaseOrder: (poId: string) => Promise<{ success: boolean; message?: string }>;
    factoryReset: () => void;
    currentShift: Shift | null;
    openShift: (float: number) => void;
    closeShift: (actualCash: number, notes: string) => { success: boolean, message?: string };
    holdOrder: (order: Omit<HeldOrder, 'id' | 'date'>) => void;
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
    
    // Reactive Data from Dexie
    const sales = useLiveQuery(() => db.sales.orderBy('date').reverse().toArray()) || [];
    const purchaseOrders = useLiveQuery(() => db.purchaseOrders.orderBy('dateCreated').reverse().toArray()) || [];
    const heldOrders = useLiveQuery(() => db.heldOrders.toArray()) || [];
    const shifts = useLiveQuery(() => db.shifts.orderBy('startTime').reverse().toArray()) || [];
    
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

    const processSale = (saleData: Omit<Sale, 'id' | 'date'>): Sale => {
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

        const newSale: Sale = {
            ...saleData,
            type: finalType,
            id: internalId,
            publicId: publicId,
            originalSalePublicId: originalSalePublicId,
            date: new Date().toISOString(),
            status: 'Completed',
            sync_status: 'pending'
        };

        // Process each item for stock adjustment
        newSale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const currentStock = item.variantId 
                    ? product.variants.find(v => v.id === item.variantId)?.stock 
                    : product.stock;
                
                if (typeof currentStock !== 'undefined') {
                    adjustStock(item.productId, currentStock - item.quantity, `Sale #${newSale.publicId}`, item.variantId);
                }
            }
        });

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
            salesToUpdate.forEach(async (returnItems, saleId) => {
                const sale = await db.sales.get(saleId);
                if (sale) {
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
                    await db.sales.update(saleId, { 
                        items: updatedItems, 
                        status: allReturned ? 'Refunded' : 'Partially Refunded',
                        sync_status: 'pending',
                        updated_at: new Date().toISOString()
                    });
                }
            });
        }

        if (currentShift) {
            const cashPayment = newSale.payments.find(p => p.type === PaymentType.Cash);
            if (cashPayment) {
                const cashAmount = cashPayment.amount;
                const s = currentShift;
                db.shifts.update(s.id, {
                    cashSales: cashAmount > 0 ? s.cashSales + cashAmount : s.cashSales,
                    cashRefunds: cashAmount < 0 ? s.cashRefunds + Math.abs(cashAmount) : s.cashRefunds,
                    sync_status: 'pending',
                    updated_at: new Date().toISOString()
                });
            }
        }

        db.sales.add(newSale);
        return newSale;
    };

    const deleteSale = async (saleId: string) => {
        const saleToDelete = await db.sales.get(saleId);
        if(!saleToDelete) return { success: false, message: "Sale not found." };
        
        // Rule 1: When a sale record is deleted, delete its related return records and stock history.
        // Also delete stock history of the related return records.
        
        // 1. Identify associated returns
        const associatedReturns = await db.sales.where('originalSaleId').equals(saleId).toArray();
        const associatedReturnIds = associatedReturns.map(r => r.id);
        
        // 2. Delete the main sale and associated returns
        await db.sales.delete(saleId);
        if (associatedReturnIds.length > 0) {
            await db.sales.bulkDelete(associatedReturnIds);
        }

        // 3. Delete Stock History for MAIN sale
        const refId = saleToDelete.publicId || saleToDelete.id;
        removeStockHistoryByReason(`Sale #${refId}`); 

        // 4. Delete Stock History for RELATED returns
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

        // Also delete returns associated with these sales
        const returnsToClear = sales.filter(s => s.type === 'Return' && s.originalSaleId && salesToClearIds.includes(s.originalSaleId));
        const returnsToClearIds = returnsToClear.map(s => s.id);

        // Delete stock history for returns too
        returnsToClear.forEach(s => {
            const refId = s.publicId || s.id;
            removeStockHistoryByReason(`Sale #${refId}`);
        });

        db.sales.bulkDelete([...salesToClearIds, ...returnsToClearIds]);
    };
    
    const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id'>): PurchaseOrder => {
        const internalId = generateUUIDv7();
        const publicId = generateUniqueNanoID<PurchaseOrder>(purchaseOrders, (p, id) => p.publicId === id, 6, 'PO-');

        const newPO: PurchaseOrder = {
            ...poData,
            id: internalId,
            publicId: publicId,
            sync_status: 'pending'
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
        
        // Rule 3: When a PO is deleted, its related notifications will also be deleted.
        await db.notifications.where('relatedId').equals(poId).delete();
        await db.purchaseOrders.delete(poId);
        
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
            
            // Also delete returns
            const returnsToRemove = sales.filter(s => s.type === 'Return' && s.originalSaleId && salesToClearIds.includes(s.originalSaleId));
            const returnsToRemoveIds = returnsToRemove.map(s => s.id);
            
            returnsToRemove.forEach(s => {
                const ref = s.publicId || s.id;
                removeStockHistoryByReason(`Sale #${ref}`);
            });

            const allIds = [...salesToClearIds, ...returnsToRemoveIds];
            
            db.sales.bulkDelete(allIds);
            return { success: true, message: `Pruned ${allIds.length} records.`};
        }

        if (target === 'purchaseOrders') {
            const toDeleteIds = purchaseOrders.filter(po => new Date(po.dateCreated) < cutoffDate).map(po => po.id);
            // Also delete notifications for these POs
            toDeleteIds.forEach(id => {
                db.notifications.where('relatedId').equals(id).delete();
            });
            db.purchaseOrders.bulkDelete(toDeleteIds);
            return { success: true, message: `Pruned ${toDeleteIds.length} purchase orders.`};
        }
        
        return { success: false, message: 'Invalid data target for pruning.' };
    };

    const factoryReset = () => {
        (db as any).transaction('rw', db.sales, db.purchaseOrders, db.shifts, db.heldOrders, db.notifications, async () => {
            await db.sales.clear();
            await db.purchaseOrders.clear();
            await db.shifts.clear();
            await db.heldOrders.clear();
            await db.notifications.clear();
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
            sync_status: 'pending'
        };
        db.shifts.add(newShift);
        addNotification(`Shift started by ${newShift.openedByUserName} with float ${float}`, NotificationType.USER);
    };

    const closeShift = (actualCash: number, notes: string) => {
        if (!currentShift) return { success: false, message: 'No active shift.' };
        
        const expectedCash = currentShift.startFloat + currentShift.cashSales - currentShift.cashRefunds;
        const difference = actualCash - expectedCash;

        db.shifts.update(currentShift.id, {
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
        });
        addNotification(`Shift closed by ${currentUser?.username}. Difference: ${difference}`, NotificationType.USER);
        return { success: true };
    };

    const holdOrder = (order: Omit<HeldOrder, 'id' | 'date'>) => {
        const newHeldOrder: HeldOrder = {
            ...order,
            id: generateUUIDv7(),
            publicId: generateUniqueNanoID<HeldOrder>(heldOrders, (o, id) => o.publicId === id, 4, 'HLD-'),
            date: new Date().toISOString(),
        };
        db.heldOrders.add(newHeldOrder);
    };

    const deleteHeldOrder = (orderId: string) => {
        db.heldOrders.delete(orderId);
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