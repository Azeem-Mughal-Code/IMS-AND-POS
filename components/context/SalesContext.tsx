import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { Sale, PurchaseOrder, POItem, Product, CartItem } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { useProducts } from './ProductContext';
import { useUIState } from './UIStateContext';

interface SalesContextType {
    sales: Sale[];
    purchaseOrders: PurchaseOrder[];
    processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
    deleteSale: (saleId: string) => { success: boolean, message?: string };
    clearSales: (options?: { statuses?: (Sale['status'])[] }) => void;
    pruneData: (target: 'sales' | 'purchaseOrders', options: { days: number; statuses?: Sale['status'][] }) => { success: boolean; message: string };
    addPurchaseOrder: (poData: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
    receivePOItems: (poId: string, items: { productId: string; variantId?: string; quantity: number }[]) => void;
    deletePurchaseOrder: (poId: string) => { success: boolean; message?: string };
    factoryReset: () => void;
}

const SalesContext = createContext<SalesContextType | null>(null);

export const useSales = () => {
    const context = useContext(SalesContext);
    if (!context) throw new Error('useSales must be used within a SalesProvider');
    return context;
};

export const SalesProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const ls_prefix = `ims-${businessName}`;
    const [sales, setSales] = useLocalStorage<Sale[]>(`${ls_prefix}-sales`, []);
    const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>(`${ls_prefix}-purchaseOrders`, []);
    const { products, adjustStock, removeStockHistoryByReason } = useProducts();
    const { addNotification } = useUIState();

    const processSale = (saleData: Omit<Sale, 'id' | 'date'>): Sale => {
        const newSale: Sale = {
            ...saleData,
            id: `sale_${Date.now()}`,
            date: new Date().toISOString(),
        };

        if (saleData.type === 'Sale') {
            newSale.status = 'Completed';
            // Decrease stock for sales
            saleData.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const currentStock = item.variantId 
                        ? product.variants.find(v => v.id === item.variantId)?.stock 
                        : product.stock;
                    if (typeof currentStock !== 'undefined') {
                        adjustStock(item.productId, currentStock - item.quantity, `Sale #${newSale.id}`, item.variantId);
                    }
                }
            });
        } else { // Return
            // Increase stock for returns
            saleData.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    const currentStock = item.variantId 
                        ? product.variants.find(v => v.id === item.variantId)?.stock 
                        : product.stock;
                    if (typeof currentStock !== 'undefined') {
                        adjustStock(item.productId, currentStock + item.quantity, `Return for Sale #${saleData.originalSaleId}`, item.variantId);
                    }
                }
            });
            // Update original sale status
            if (saleData.originalSaleId) {
                setSales(prev => prev.map(s => {
                    if (s.id === saleData.originalSaleId) {
                        const updatedItems = s.items.map(origItem => {
                            const returnedItem = saleData.items.find(retItem => retItem.id === origItem.id);
                            if (returnedItem) {
                                return { ...origItem, returnedQuantity: (origItem.returnedQuantity || 0) + returnedItem.quantity };
                            }
                            return origItem;
                        });
                        
                        const allReturned = updatedItems.every(item => (item.returnedQuantity || 0) >= item.quantity);
                        return { ...s, items: updatedItems, status: allReturned ? 'Refunded' : 'Partially Refunded' };
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
        removeStockHistoryByReason(`Sale #${saleId}`);
        removeStockHistoryByReason(`Return for Sale #${saleId}`);

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
    };

    const value = {
        sales,
        purchaseOrders,
        processSale,
        deleteSale,
        clearSales,
        pruneData,
        addPurchaseOrder,
        receivePOItems,
        deletePurchaseOrder,
        factoryReset
    };

    return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};