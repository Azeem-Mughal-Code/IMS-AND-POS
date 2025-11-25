
import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { View, Toast, Notification, NotificationType, InventoryViewState, ReportsViewState, UsersViewState, AnalysisViewState, POViewState, PruneTarget, CategoriesViewState, CustomerViewState, SuppliersViewState } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { db } from '../../utils/db';

// Define initial states for each view's state
const initialInventoryViewState: InventoryViewState = {
    searchTerm: '', stockFilter: 'All', categoryFilter: 'All', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1,
};
const initialReportsSalesViewState: ReportsViewState['sales'] = {
    searchTerm: '', typeFilter: 'All', statusFilter: 'All', salespersonFilter: 'All', timeRange: 'weekly', sortConfig: { key: 'date', direction: 'descending' }, currentPage: 1,
};
const initialReportsProductsViewState: ReportsViewState['products'] = {
    searchTerm: '', stockFilter: 'All', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1,
};
const initialReportsInventoryValuationViewState: ReportsViewState['inventoryValuation'] = {
    searchTerm: '', sortConfig: { key: 'potentialProfit', direction: 'descending' }, currentPage: 1,
};
const initialUsersViewState: UsersViewState = {
    searchTerm: '', sortConfig: { key: 'username', direction: 'ascending' }, currentPage: 1,
};
const initialAnalysisViewState: AnalysisViewState = {
    timeRange: 'weekly', searchTerm: '', sortConfig: { key: 'profit', direction: 'descending' }, currentPage: 1,
};
const initialPOViewState: POViewState = {
    searchTerm: '', statusFilter: 'All', supplierFilter: 'All', sortConfig: { key: 'dateCreated', direction: 'descending' }, currentPage: 1,
};
const initialCategoriesViewState: CategoriesViewState = {
    searchTerm: '', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1,
};
const initialCustomerViewState: CustomerViewState = {
    searchTerm: '', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1,
};
const initialSuppliersViewState: SuppliersViewState = {
    searchTerm: '', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1,
};

interface UIStateContextType {
    activeView: View;
    setActiveView: (view: View) => void;
    toasts: Toast[];
    showToast: (message: string, type: 'success' | 'error') => void;
    dismissToast: (id: string) => void;
    notifications: Notification[];
    addNotification: (message: string, type: NotificationType, relatedId?: string) => void;
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;
    clearNotifications: () => void;
    pruneData: (target: 'notifications' | 'stockHistory', options: { days: number }) => { success: boolean; message: string };
    inventoryViewState: InventoryViewState;
    onInventoryViewUpdate: (update: Partial<InventoryViewState>) => void;
    reportsViewState: ReportsViewState;
    onReportsSalesViewUpdate: (update: Partial<ReportsViewState['sales']>) => void;
    onReportsProductsViewUpdate: (update: Partial<ReportsViewState['products']>) => void;
    onReportsInventoryValuationViewUpdate: (update: Partial<ReportsViewState['inventoryValuation']>) => void;
    usersViewState: UsersViewState;
    onUsersViewUpdate: (update: Partial<UsersViewState>) => void;
    analysisViewState: AnalysisViewState;
    onAnalysisViewUpdate: (update: Partial<AnalysisViewState>) => void;
    poViewState: POViewState;
    onPOViewUpdate: (update: Partial<POViewState>) => void;
    categoriesViewState: CategoriesViewState;
    onCategoriesViewUpdate: (update: Partial<CategoriesViewState>) => void;
    customersViewState: CustomerViewState;
    onCustomersViewUpdate: (update: Partial<CustomerViewState>) => void;
    suppliersViewState: SuppliersViewState;
    onSuppliersViewUpdate: (update: Partial<SuppliersViewState>) => void;
    zoomLevel: number;
    setZoomLevel: (level: number) => void;
    factoryReset: () => void;
}

const UIStateContext = createContext<UIStateContextType | null>(null);

export const useUIState = () => {
    const context = useContext(UIStateContext);
    if (!context) throw new Error('useUIState must be used within a UIStateProvider');
    return context;
};

export const UIStateProvider: React.FC<{ children: ReactNode; workspaceId: string }> = ({ children, workspaceId }) => {
    const ls_prefix = `ims-${workspaceId}`;
    const [activeView, setActiveView] = usePersistedState<View>(`${ls_prefix}-activeView`, 'dashboard');
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // Replaced usePersistedState with Dexie useLiveQuery for notifications
    const notifications = useLiveQuery(() => db.notifications.orderBy('timestamp').reverse().toArray()) || [];

    const [inventoryViewState, setInventoryViewState] = usePersistedState<InventoryViewState>(`${ls_prefix}-inventoryViewState`, initialInventoryViewState);
    const [reportsViewState, setReportsViewState] = usePersistedState<ReportsViewState>(`${ls_prefix}-reportsViewState`, {
        sales: initialReportsSalesViewState,
        products: initialReportsProductsViewState,
        inventoryValuation: initialReportsInventoryValuationViewState,
    });
    const [usersViewState, setUsersViewState] = usePersistedState<UsersViewState>(`${ls_prefix}-usersViewState`, initialUsersViewState);
    const [analysisViewState, setAnalysisViewState] = usePersistedState<AnalysisViewState>(`${ls_prefix}-analysisViewState`, initialAnalysisViewState);
    const [poViewState, setPOViewState] = usePersistedState<POViewState>(`${ls_prefix}-poViewState`, initialPOViewState);
    const [categoriesViewState, setCategoriesViewState] = usePersistedState<CategoriesViewState>(`${ls_prefix}-categoriesViewState`, initialCategoriesViewState);
    const [customersViewState, setCustomersViewState] = usePersistedState<CustomerViewState>(`${ls_prefix}-customersViewState`, initialCustomerViewState);
    const [suppliersViewState, setSuppliersViewState] = usePersistedState<SuppliersViewState>(`${ls_prefix}-suppliersViewState`, initialSuppliersViewState);
    const [zoomLevel, setZoomLevel] = usePersistedState<number>(`${ls_prefix}-zoomLevel`, 0.85);

    const showToast = (message: string, type: 'success' | 'error') => {
        const id = `toast_${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type }]);
    };
    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    const addNotification = (message: string, type: NotificationType, relatedId?: string) => {
        const newNotification: Notification = { 
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2,5)}`, 
            timestamp: new Date().toISOString(), 
            type, 
            message, 
            isRead: false, 
            relatedId 
        };
        db.notifications.add(newNotification);
    };
    
    const markNotificationAsRead = (id: string) => {
        db.notifications.update(id, { isRead: true });
    };
    
    const markAllNotificationsAsRead = () => {
        db.notifications.toCollection().modify({ isRead: true });
    };
    
    const clearNotifications = () => {
        db.notifications.clear();
    };

    const onInventoryViewUpdate = (update: Partial<InventoryViewState>) => setInventoryViewState(prev => ({ ...prev, ...update }));
    const onReportsSalesViewUpdate = (update: Partial<ReportsViewState['sales']>) => setReportsViewState(prev => ({ ...prev, sales: { ...prev.sales, ...update } }));
    const onReportsProductsViewUpdate = (update: Partial<ReportsViewState['products']>) => setReportsViewState(prev => ({ ...prev, products: { ...prev.products, ...update } }));
    const onReportsInventoryValuationViewUpdate = (update: Partial<ReportsViewState['inventoryValuation']>) => setReportsViewState(prev => ({ ...prev, inventoryValuation: { ...prev.inventoryValuation, ...update } }));
    const onUsersViewUpdate = (update: Partial<UsersViewState>) => setUsersViewState(prev => ({ ...prev, ...update }));
    const onAnalysisViewUpdate = (update: Partial<AnalysisViewState>) => setAnalysisViewState(prev => ({ ...prev, ...update }));
    const onPOViewUpdate = (update: Partial<POViewState>) => setPOViewState(prev => ({ ...prev, ...update }));
    const onCategoriesViewUpdate = (update: Partial<CategoriesViewState>) => setCategoriesViewState(prev => ({ ...prev, ...update }));
    const onCustomersViewUpdate = (update: Partial<CustomerViewState>) => setCustomersViewState(prev => ({ ...prev, ...update }));
    const onSuppliersViewUpdate = (update: Partial<SuppliersViewState>) => setSuppliersViewState(prev => ({ ...prev, ...update }));
    
    const pruneData = (target: 'notifications' | 'stockHistory', options: { days: number }): { success: boolean; message: string } => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - options.days);
        const cutoffIso = cutoffDate.toISOString();
        
        if(target === 'notifications') {
            db.notifications.where('timestamp').below(cutoffIso).delete();
            return { success: true, message: `Pruning notifications older than ${options.days} days.`}
        }
        // Stock history pruning would be handled in ProductContext if it were persisted there.
        // Since it's passed from SalesContext, we'll assume this is for notifications only for now.
        return { success: false, message: 'Pruning for this data type is not implemented.' };
    };

    const factoryReset = () => {
        setActiveView('dashboard');
        db.notifications.clear();
        setInventoryViewState(initialInventoryViewState);
        setReportsViewState({ sales: initialReportsSalesViewState, products: initialReportsProductsViewState, inventoryValuation: initialReportsInventoryValuationViewState });
        setUsersViewState(initialUsersViewState);
        setAnalysisViewState(initialAnalysisViewState);
        setPOViewState(initialPOViewState);
        setCategoriesViewState(initialCategoriesViewState);
        setCustomersViewState(initialCustomerViewState);
        setSuppliersViewState(initialSuppliersViewState);
    };

    const value = {
        activeView, setActiveView,
        toasts, showToast, dismissToast,
        notifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead, clearNotifications,
        pruneData,
        inventoryViewState, onInventoryViewUpdate,
        reportsViewState, onReportsSalesViewUpdate, onReportsProductsViewUpdate, onReportsInventoryValuationViewUpdate,
        usersViewState, onUsersViewUpdate,
        analysisViewState, onAnalysisViewUpdate,
        poViewState, onPOViewUpdate,
        categoriesViewState, onCategoriesViewUpdate,
        customersViewState, onCustomersViewUpdate,
        suppliersViewState, onSuppliersViewUpdate,
        zoomLevel, setZoomLevel,
        factoryReset
    };

    return <UIStateContext.Provider value={value}>{children}</UIStateContext.Provider>;
};
