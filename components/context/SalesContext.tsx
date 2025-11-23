
import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Sale, PurchaseOrder, POItem, Product, CartItem, Shift, PaymentType, HeldOrder } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { useProducts } from './ProductContext';
import { useUIState } from './UIStateContext';
import { useAuth } from './AuthContext';

interface SalesContextType {
    sales: Sale[];
    purchaseOrders: PurchaseOrder[];
    heldOrders: HeldOrder[];
    processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
    deleteSale: (saleId: string) => { success: boolean, message?: string };
    clearSales: (options?: { statuses?: (Sale['status'])[] }) => void;
    pruneData: (target: 'sales' | 'purchaseOrders', options: { days: number; statuses?: Sale['status'][] }) => { success: boolean; message: string };
    addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
    receivePOItems: (poId: string, items: { productId: string; variantId?: string; quantity: number }[]) => void;
    deletePurchaseOrder: (poId: string) => { success: boolean; message?: string };
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
    const ls_prefix = `ims-${workspaceId}`;
    const { currentUser } = useAuth();
    const [sales, setSales] = usePersistedState<Sale[]>(`${ls_prefix}-sales`, []);
    const [purchaseOrders, setPurchaseOrders] = usePersistedState<PurchaseOrder[]>(`${ls_prefix}-purchaseOrders`, []);
    const [heldOrders, setHeldOrders] = usePersistedState<HeldOrder[]>(`${ls_prefix}-heldOrders`, []);
    const [shifts, setShifts] = usePersistedState<Shift[]>(`${ls_prefix}-shifts`, []);
    
    const { products, adjustStock, removeStockHistoryByReason } = useProducts();
    const { addNotification } = useUIState();

    // Derived current shift
    const currentShift = useMemo(() => shifts.find(s => s.status === 'Open') || null, [shifts]);

    const processSale = (saleData: Omit<Sale, 'id' | 'date'>): Sale => {
        // Determine type based on total if not explicitly set correctly for mixed carts
        // Although POS usually passes it, for mixed carts with positive total, it's a sale (Exchange).
        // If negative total, it's a Return.
        let finalType: 'Sale' | 'Return' = saleData.total >= 0 ? 'Sale' : 'Return';
        
        // If explicitly 'Return' passed but total is positive (weird?), trust calculations
        // But generally, POS should set this. If mixed, 'Sale' is appropriate for Exchange.
        
        const prefix = finalType === 'Return' ? 'return' : 'sale';
        const newSale: Sale = {
            ...saleData,
            type: finalType,
            id: `${prefix}_${Date.now()}`,
            date: new Date().toISOString(),
            status: 'Completed', // Default status
        };

        // Process each item for stock adjustment
        // This handles both sales (qty > 0) and returns (qty < 0) in a single loop
        newSale.items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const currentStock = item.variantId 
                    ? product.variants.find(v => v.id === item.variantId)?.stock 
                    : product.stock;
                
                if (typeof currentStock !== 'undefined') {
                    // item.quantity is positive for sale (stock goes down), negative for return (stock goes up)
                    // newStock = currentStock - quantity
                    adjustStock(item.productId, currentStock - item.quantity, `Transaction #${newSale.id}`, item.variantId);
                }
            }
        });

        // Process updates to ORIGINAL sales if any items are returns linked to history
        const salesToUpdate = new Map<string, CartItem[]>(); // Map<SaleID, ItemsToUpdate[]>

        newSale.items.forEach(item => {
            if (item.quantity < 0 && item.originalSaleId) {
                // This is a return item linked to a past sale
                const existing = salesToUpdate.get(item.originalSaleId) || [];
                existing.push(item);
                salesToUpdate.set(item.originalSaleId, existing);
            }
        });

        if (salesToUpdate.size > 0) {
            setSales(prev => prev.map(s => {
                if (salesToUpdate.has(s.id)) {
                    const returnItems = salesToUpdate.get(s.id)!;
                    const updatedItems = s.items.map(origItem => {
                        // Find corresponding return items for this original item
                        // Logic: match productId and variantId
                        const matchingReturns = returnItems.filter(ri => 
                            ri.productId === origItem.productId && 
                            ri.variantId === origItem.variantId
                        );
                        
                        if (matchingReturns.length > 0) {
                            // Sum the absolute quantity returned in this transaction
                            const quantityReturnedNow = matchingReturns.reduce((sum, ri) => sum + Math.abs(ri.quantity), 0);
                            return { ...origItem, returnedQuantity: (origItem.returnedQuantity || 0) + quantityReturnedNow };
                        }
                        return origItem;
                    });

                    // Check if fully refunded
                    const allReturned = updatedItems.every(item => (item.returnedQuantity || 0) >= item.quantity);
                    return { ...s, items: updatedItems, status: allReturned ? 'Refunded' : 'Partially Refunded' };
                }
                return s;
            }));
        }

        // Update Shift Stats if applicable
        if (currentShift) {
            // Calculate net cash movement
            const cashPayment = newSale.payments.find(p => p.type === PaymentType.Cash);
            if (cashPayment) {
                // If cash payment is positive, it's money IN (Sale)
                // If cash payment is negative, it's money OUT (Refund)
                const cashAmount = cashPayment.amount;
                setShifts(prev => prev.map(s => {
                    if (s.id === currentShift.id) {
                        return {
                            ...s,
                            cashSales: cashAmount > 0 ? s.cashSales + cashAmount : s.cashSales,
                            cashRefunds: cashAmount < 0 ? s.cashRefunds + Math.abs(cashAmount) : s.cashRefunds,
                        };
                    }
                    return s;
                }));
            }
        }

        setSales(prev => [newSale, ...prev]);
        return newSale;
    };

    const deleteSale = (saleId: string) => {
        const saleToDelete = sales.find(s => s.id === saleId);
        if(!saleToDelete) return { success: false, message: "Sale not found." };
        if(saleToDelete.type === 'Return') return { success: false, message: "Delete the original sale transaction, not the return."};
        
        const associatedReturnIds = sales.filter(s => s.originalSaleId === saleId).map(s => s.id);
        
        setSales(prev => prev.filter(s => s.id !== saleId && !associatedReturnIds.includes(s.id)));

        // Remove stock history for the sale and its returns
        removeStockHistoryByReason(`Transaction #${saleId}`); // Updated naming convention
        removeStockHistoryByReason(`Sale #${saleId}`); // Legacy compat
        removeStockHistoryByReason(`Return for Sale #${saleId}`); // Legacy compat

        return { success: true, message: `Sale ${saleId} and associated returns deleted.` };
    };

    const clearSales = (options?: { statuses?: (Sale['status'])[] }) => {
        const allSales = sales; // Capture current state
        let salesToClearIds: Set<string>;

        if (!options?.statuses) { // undefined means clear all
            salesToClearIds = new Set(allSales.filter(s => s.type === 'Sale').map(s => s.id));
        } else {
            if (options.statuses.length === 0) return; // Empty array means do nothing
            salesToClearIds = new Set(allSales.filter(s => s.type === 'Sale' && options.statuses!.includes(s.status!)).map(s => s.id));
        }

        if (salesToClearIds.size === 0) return;

        // Process side effects for cleared sales
        salesToClearIds.forEach(id => {
            removeStockHistoryByReason(`Transaction #${id}`);
            removeStockHistoryByReason(`Sale #${id}`);
            removeStockHistoryByReason(`Return for Sale #${id}`);
        });

        const salesToKeep = allSales.filter(s => 
            !salesToClearIds.has(s.id) && 
            !(s.type === 'Return' && s.originalSaleId && salesToClearIds.has(s.originalSaleId))
        );

        setSales(salesToKeep);
    };
    
    const addPurchaseOrder = (poData: Omit<PurchaseOrder, 'id'>): PurchaseOrder => {
        const newPO: PurchaseOrder = {
            ...poData,
            id: `po_${Date.now()}`,
        };
        setPurchaseOrders(prev => [newPO, ...prev]);
        addNotification(`New PO #${newPO.id} created for ${newPO.supplierName}.`, 'PO', newPO.id);
        return newPO;
    };
    
    const receivePOItems = (poId: string, items: { productId: string; variantId?: string; quantity: number }[]) => {
        items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const currentStock = item.variantId
                    ? product.variants.find(v => v.id === item.variantId)?.stock
                    : product.stock;
                
                if (typeof currentStock !== 'undefined') {
                    adjustStock(item.productId, currentStock + item.quantity, `Received from PO #${poId}`, item.variantId);
                }
            }
        });

        setPurchaseOrders(prev => prev.map(po => {
            if (po.id === poId) {
                const updatedItems = po.items.map(poItem => {
                    const received = items.find(r => r.productId === poItem.productId && r.variantId === poItem.variantId);
                    if (received) {
                        return { ...poItem, quantityReceived: poItem.quantityReceived + received.quantity };
                    }
                    return poItem;
                });
                
                const allReceived = updatedItems.every(item => item.quantityReceived >= item.quantityOrdered);
                const newStatus = allReceived ? 'Received' : 'Partial';
                if(newStatus !== po.status) {
                    addNotification(`PO #${poId} is now ${newStatus}.`, 'PO', poId);
                }
                return { ...po, items: updatedItems, status: newStatus };
            }
            return po;
        }));
    };
    
    const deletePurchaseOrder = (poId: string) => {
        const po = purchaseOrders.find(p => p.id === poId);
        if(!po) return { success: false, message: 'Purchase Order not found.'};
        if(po.status !== 'Pending') return { success: false, message: 'Only POs with Pending status can be deleted.'};
        setPurchaseOrders(prev => prev.filter(p => p.id !== poId));
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

            const salesToClearIds = new Set(salesToClear.map(s => s.id));

            if (salesToClearIds.size === 0) {
                return { success: true, message: 'No sales records matched the criteria for pruning.' };
            }

            salesToClearIds.forEach(id => {
                removeStockHistoryByReason(`Transaction #${id}`);
                removeStockHistoryByReason(`Sale #${id}`);
                removeStockHistoryByReason(`Return for Sale #${id}`);
            });
            
            const returnsRemovedCount = sales.filter(s => s.type === 'Return' && s.originalSaleId && salesToClearIds.has(s.originalSaleId)).length;
            const totalRemoved = salesToClearIds.size + returnsRemovedCount;
            
            setSales(prev => prev.filter(s => 
                !salesToClearIds.has(s.id) && 
                !(s.type === 'Return' && s.originalSaleId && salesToClearIds.has(s.originalSaleId))
            ));
            
            return { success: true, message: `Pruned ${totalRemoved} records.`};
        }

        if (target === 'purchaseOrders') {
            const originalCount = purchaseOrders.length;
            setPurchaseOrders(prev => prev.filter(po => new Date(po.dateCreated) >= cutoffDate));
            const newCount = purchaseOrders.length;
            return { success: true, message: `Pruned ${originalCount - newCount} purchase orders.`};
        }
        
        return { success: false, message: 'Invalid data target for pruning.' };
    };

    const factoryReset = () => {
        setSales([]);
        setPurchaseOrders([]);
        setShifts([]);
        setHeldOrders([]);
    };

    // Shift Management Functions
    const openShift = (float: number) => {
        if (currentShift) return;
        const newShift: Shift = {
            id: `shift_${Date.now()}`,
            openedByUserId: currentUser?.id || 'unknown',
            openedByUserName: currentUser?.username || 'Unknown',
            startTime: new Date().toISOString(),
            startFloat: float,
            status: 'Open',
            cashSales: 0,
            cashRefunds: 0,
        };
        setShifts(prev => [newShift, ...prev]);
        addNotification(`Shift started by ${newShift.openedByUserName} with float ${float}`, 'USER');
    };

    const closeShift = (actualCash: number, notes: string) => {
        if (!currentShift) return { success: false, message: 'No active shift.' };
        
        const expectedCash = currentShift.startFloat + currentShift.cashSales - currentShift.cashRefunds;
        const difference = actualCash - expectedCash;

        setShifts(prev => prev.map(s => {
            if (s.id === currentShift.id) {
                return {
                    ...s,
                    closedByUserId: currentUser?.id,
                    closedByUserName: currentUser?.username,
                    endTime: new Date().toISOString(),
                    endFloat: expectedCash,
                    actualCash,
                    difference,
                    notes,
                    status: 'Closed',
                };
            }
            return s;
        }));
        addNotification(`Shift closed by ${currentUser?.username}. Difference: ${difference}`, 'USER');
        return { success: true };
    };

    const holdOrder = (order: Omit<HeldOrder, 'id' | 'date'>) => {
        const newHeldOrder: HeldOrder = {
            ...order,
            id: `hold_${Date.now()}`,
            date: new Date().toISOString(),
        };
        setHeldOrders(prev => [newHeldOrder, ...prev]);
    };

    const deleteHeldOrder = (orderId: string) => {
        setHeldOrders(prev => prev.filter(o => o.id !== orderId));
    };

    const value = {
        sales,
        purchaseOrders,
        heldOrders,
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
