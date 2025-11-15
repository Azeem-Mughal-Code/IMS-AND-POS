// FIX: Added 'useMemo' to the import statement.
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import { 
    Product, Sale, User, UserRole, View, InventoryAdjustment, InventoryViewState, ReportsViewState, 
    UsersViewState, AnalysisViewState, PurchaseOrder, POViewState, PaymentType, CashierPermissions,
    Notification, NotificationType, Currency, PruneTarget, Toast
} from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { INITIAL_PRODUCTS, DEFAULT_CURRENCIES } from '../../constants';

// Define the shape of the context value
interface AppContextType {
    // State
    businessName: string;
    products: Product[];
    sales: Sale[];
    inventoryAdjustments: InventoryAdjustment[];
    users: User[];
    purchaseOrders: PurchaseOrder[];
    currentUser: User | null;
    notifications: Notification[];
    toasts: Toast[];
    itemsPerPage: number;
    currency: string; // The currency CODE
    currencies: Currency[];
    currencyDisplay: 'code' | 'symbol';
    isSplitPaymentEnabled: boolean;
    isChangeDueEnabled: boolean;
    isIntegerCurrency: boolean;
    isTaxEnabled: boolean;
    taxRate: number;
    isDiscountEnabled: boolean;
    discountRate: number;
    discountThreshold: number;
    activeView: View;
    theme: 'light' | 'dark' | 'system';
    inventoryViewState: InventoryViewState;
    reportsViewState: ReportsViewState;
    usersViewState: UsersViewState;
    analysisViewState: AnalysisViewState;
    poViewState: POViewState;
    cashierPermissions: CashierPermissions;
    
    // Setters & Functions
    login: (username: string, pass: string) => boolean;
    signup: (username: string, pass: string) => { success: boolean, message?: string };
    onLogout: (user: User) => void;
    addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
    updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
    deleteUser: (userId: string) => { success: boolean; message?: string };
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string) => { success: boolean; message?: string };
    deleteSale: (saleId: string) => { success: boolean, message?: string };
    receiveStock: (productId: string, quantity: number) => void;
    adjustStock: (productId: string, newStockLevel: number, reason: string) => void;
    processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
    importProducts: (newProducts: Omit<Product, 'id'>[]) => { success: boolean; message: string };
    clearSales: (config?: { statuses?: (Sale['status'])[] }) => void;
    factoryReset: () => void;
    pruneData: (target: PruneTarget, options: { days: number; statuses?: (Sale['status'])[] }) => { success: boolean; message: string };
    addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
    updatePurchaseOrder: (po: PurchaseOrder) => void;
    deletePurchaseOrder: (poId: string) => { success: boolean; message?: string };
    receivePOItems: (poId: string, receivedItems: { productId: string, quantity: number }[]) => void;
    addNotification: (message: string, type: NotificationType, relatedId?: string) => void;
    markNotificationAsRead: (notificationId: string) => void;
    markAllNotificationsAsRead: () => void;
    clearNotifications: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
    dismissToast: (id: string) => void;
    restoreBackup: (backupData: any) => { success: boolean, message: string };
    setActiveView: (view: View) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setItemsPerPage: (size: number) => void;
    setCurrency: (currencyCode: string) => void;
    addCurrency: (currency: Currency) => { success: boolean, message?: string };
    updateCurrency: (code: string, updates: Partial<Omit<Currency, 'code'>>) => { success: boolean, message?: string };
    deleteCurrency: (code: string) => { success: boolean, message?: string };
    setCurrencyDisplay: (display: 'code' | 'symbol') => void;
    formatCurrency: (amount: number) => string;
    setIsSplitPaymentEnabled: (enabled: boolean) => void;
    setIsChangeDueEnabled: (enabled: boolean) => void;
    setIsIntegerCurrency: (enabled: boolean) => void;
    setIsTaxEnabled: (enabled: boolean) => void;
    setTaxRate: (rate: number) => void;
    setIsDiscountEnabled: (enabled: boolean) => void;
    setDiscountRate: (rate: number) => void;
    setDiscountThreshold: (threshold: number) => void;
    setCashierPermissions: (permissions: CashierPermissions) => void;
    onInventoryViewUpdate: (updates: Partial<InventoryViewState>) => void;
    onReportsSalesViewUpdate: (updates: Partial<ReportsViewState['sales']>) => void;
    onReportsProductsViewUpdate: (updates: Partial<ReportsViewState['products']>) => void;
    onReportsInventoryValuationViewUpdate: (updates: Partial<ReportsViewState['inventoryValuation']>) => void;
    onUsersViewUpdate: (updates: Partial<UsersViewState>) => void;
    onAnalysisViewUpdate: (updates: Partial<AnalysisViewState>) => void;
    onPOViewUpdate: (updates: Partial<POViewState>) => void;
}

// Create the context
const AppContext = createContext<AppContextType | null>(null);

// Create a custom hook for easy consumption
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

// Create the provider component
export const AppProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const ls_prefix = `ims-${businessName}`;
    const [products, setProducts] = useLocalStorage<Product[]>(`${ls_prefix}-products`, INITIAL_PRODUCTS);
    const [sales, setSales] = useLocalStorage<Sale[]>(`${ls_prefix}-sales`, []);
    const [inventoryAdjustments, setInventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>(`${ls_prefix}-adjustments`, []);
    const [users, setUsers] = useLocalStorage<User[]>(`${ls_prefix}-users`, []);
    const [purchaseOrders, setPurchaseOrders] = useLocalStorage<PurchaseOrder[]>(`${ls_prefix}-purchaseOrders`, []);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`${ls_prefix}-currentUser`, null);
    const [notifications, setNotifications] = useLocalStorage<Notification[]>(`${ls_prefix}-notifications`, []);
    
    const [itemsPerPage, setItemsPerPage] = useLocalStorage<number>(`${ls_prefix}-itemsPerPage`, 10);
    const [currency, setCurrency] = useLocalStorage<string>(`${ls_prefix}-currency`, 'USD');
    const [currencies, setCurrencies] = useLocalStorage<Currency[]>(`${ls_prefix}-currencies`, DEFAULT_CURRENCIES);
    const [currencyDisplay, setCurrencyDisplay] = useLocalStorage<'code' | 'symbol'>(`${ls_prefix}-currencyDisplay`, 'symbol');
    const [isSplitPaymentEnabled, setIsSplitPaymentEnabled] = useLocalStorage<boolean>(`${ls_prefix}-splitPaymentEnabled`, false);
    const [isChangeDueEnabled, setIsChangeDueEnabled] = useLocalStorage<boolean>(`${ls_prefix}-changeDueEnabled`, true);
    const [isIntegerCurrency, setIsIntegerCurrency] = useLocalStorage<boolean>(`${ls_prefix}-isIntegerCurrency`, false);
    const [isTaxEnabled, setIsTaxEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isTaxEnabled`, true);
    const [taxRate, setTaxRate] = useLocalStorage<number>(`${ls_prefix}-taxRate`, 0.08);
    const [isDiscountEnabled, setIsDiscountEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isDiscountEnabled`, true);
    const [discountRate, setDiscountRate] = useLocalStorage<number>(`${ls_prefix}-discountRate`, 0.05); // 5%
    const [discountThreshold, setDiscountThreshold] = useLocalStorage<number>(`${ls_prefix}-discountThreshold`, 100);
    const [cashierPermissions, setCashierPermissions] = useLocalStorage<CashierPermissions>(`${ls_prefix}-cashierPermissions`, {
        canProcessReturns: true,
        canViewReports: true,
        canViewAnalysis: false,
        canEditOwnProfile: true,
        canViewDashboard: false,
        canViewInventory: false,
        canEditBehaviorSettings: false,
    });

    const [activeView, setActiveView] = useState<View>('dashboard');
    const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>('ims-theme', 'system');
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // States for individual views
    const [inventoryViewState, setInventoryViewState] = useState<InventoryViewState>({ searchTerm: '', stockFilter: 'All', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1, itemsPerPage: 10 });
    const [reportsViewState, setReportsViewState] = useState<ReportsViewState>({ sales: { searchTerm: '', typeFilter: 'All', statusFilter: 'All', salespersonFilter: 'All', timeRange: 'all', sortConfig: { key: 'id', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 }, products: { searchTerm: '', stockFilter: 'All', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1, itemsPerPage: 10 }, inventoryValuation: { searchTerm: '', sortConfig: { key: 'totalRetailValue', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 }});
    const [usersViewState, setUsersViewState] = useState<UsersViewState>({ searchTerm: '', sortConfig: { key: 'username', direction: 'ascending' }, currentPage: 1, itemsPerPage: 10 });
    const [analysisViewState, setAnalysisViewState] = useState<AnalysisViewState>({ timeRange: 'all', searchTerm: '', sortConfig: { key: 'profit', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 });
    const [poViewState, setPOViewState] = useState<POViewState>({ searchTerm: '', statusFilter: 'All', sortConfig: { key: 'id', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 });

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToasts(prev => [...prev, { id: `toast_${Date.now()}`, message, type }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addCurrency = (newCurrency: Currency): { success: boolean, message?: string } => {
        if (currencies.some(c => c.code.toUpperCase() === newCurrency.code.toUpperCase())) {
            return { success: false, message: 'A currency with this code already exists.' };
        }
        setCurrencies(prev => [...prev, { ...newCurrency, code: newCurrency.code.toUpperCase() }]);
        return { success: true };
    };

    const updateCurrency = (code: string, updates: Partial<Omit<Currency, 'code'>>): { success: boolean, message?: string } => {
        setCurrencies(prev => prev.map(c => c.code === code ? { ...c, ...updates } : c));
        return { success: true };
    };

    const deleteCurrency = (code: string): { success: boolean, message?: string } => {
        if (code === currency) {
            return { success: false, message: 'Cannot delete the currently active currency.' };
        }
        setCurrencies(prev => prev.filter(c => c.code !== code));
        return { success: true };
    };

    const formatCurrency = useCallback((amount: number) => {
        const currentCurrencyInfo = currencies.find(c => c.code === currency) || DEFAULT_CURRENCIES[0];
        
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: isIntegerCurrency ? 0 : 2,
            maximumFractionDigits: isIntegerCurrency ? 0 : 2,
        });

        const formattedAmount = formatter.format(amount);

        if (currencyDisplay === 'symbol') {
            // Very basic placement, real-world would need locale info
            return `${currentCurrencyInfo.symbol}${formattedAmount}`;
        } else {
            return `${formattedAmount} ${currentCurrencyInfo.code}`;
        }
    }, [currency, currencies, currencyDisplay, isIntegerCurrency]);

    const addNotification = useCallback((message: string, type: NotificationType, relatedId?: string) => {
        const newNotification: Notification = {
            id: `notif_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type,
            message,
            relatedId,
            isRead: false,
        };
        setNotifications(prev => [newNotification, ...prev]);
    }, [setNotifications]);

    useEffect(() => {
        // Check for overdue POs on app load
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        purchaseOrders.forEach(po => {
            if (po.status !== 'Received' && new Date(po.dateExpected) < today) {
                const existingNotification = notifications.find(n => n.type === NotificationType.PO && n.relatedId === po.id && n.message.includes('overdue'));
                if (!existingNotification) {
                    addNotification(`PO #${po.id} from ${po.supplierName} is overdue.`, NotificationType.PO, po.id);
                }
            }
        });
    }, []); // Runs once on mount


    const login = (username: string, pass: string): boolean => {
        const user = users.find(u => u.username === username && u.password === pass);
        if (user) {
          setCurrentUser(user);
          setActiveView(user.role === UserRole.Admin ? 'dashboard' : 'pos');
          if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged in.`, NotificationType.USER, user.id);
          }
          return true;
        }
        return false;
    };
      
    const signup = (username: string, pass: string): { success: boolean, message?: string } => {
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'Username is already taken.' };
        }
        const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role: UserRole.Admin };
        setUsers([newUser]);
        setCurrentUser(newUser);
        setActiveView('dashboard');
        return { success: true };
    };

    const onLogout = (user: User) => {
        if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged out.`, NotificationType.USER, user.id);
        }
        setCurrentUser(null);
    };
  
    // ... All other data manipulation functions from the original App.tsx's BusinessWorkspace ...
    const addUser = (username: string, pass: string, role: UserRole): { success: boolean, message?: string } => {
        if (users.some(u => u.username === username)) {
         return { success: false, message: 'Username is already taken.' };
       }
       const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role };
       setUsers(prev => [...prev, newUser]);
       return { success: true };
     };
   
     const deleteUser = (userId: string): { success: boolean; message?: string } => {
         const userToDelete = users.find(u => u.id === userId);
         if (!userToDelete) return { success: false, message: 'User not found.' };
         if (userToDelete.role === UserRole.Admin) return { success: false, message: 'Cannot delete an admin account.' };
         if (userToDelete.id === currentUser?.id) return { success: false, message: 'Cannot delete your own account.' };
         setUsers(prev => prev.filter(u => u.id !== userId));
         return { success: true };
     };
   
     const updateUser = (userId: string, newUsername: string, newPassword?: string): { success: boolean, message?: string } => {
       const userToUpdate = users.find(u => u.id === userId);
       if (!userToUpdate) return { success: false, message: 'User not found.' };
   
       if (currentUser?.role !== UserRole.Admin && currentUser?.id !== userId) return { success: false, message: 'Permission denied.' };
       
       if (userToUpdate.role === UserRole.Admin && userToUpdate.id !== currentUser.id) {
           return { success: false, message: "Admins cannot edit other admin accounts."};
       }
   
       if (users.some(u => u.username === newUsername && u.id !== userId)) {
         return { success: false, message: 'Username is already taken.' };
       }
   
       let updatedUser: User | null = null;
       const updatedUsers = users.map(user => {
         if (user.id === userId) {
           updatedUser = { ...user, username: newUsername, password: newPassword && newPassword.length > 0 ? newPassword : user.password };
           return updatedUser;
         }
         return user;
       });
       setUsers(updatedUsers);
       if (currentUser?.id === userId && updatedUser) setCurrentUser(updatedUser);
       return { success: true };
     };
   
     const addProduct = useCallback((product: Omit<Product, 'id'>) => setProducts(prev => [...prev, { ...product, id: `prod_${Date.now()}` }]), [setProducts]);
     const updateProduct = useCallback((updatedProduct: Product) => setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)), [setProducts]);
   
     const deleteProduct = useCallback((productId: string): { success: boolean; message?: string } => {
       const productInSale = sales.some(sale => sale.items.some(item => item.id === productId));
       if (productInSale) {
           return { success: false, message: 'Cannot delete product with sales history. Consider setting stock to 0 instead.' };
       }
       setProducts(prev => prev.filter(p => p.id !== productId));
       return { success: true };
     }, [sales, setProducts]);

     const deleteSale = useCallback((saleId: string): { success: boolean, message?: string } => {
        const saleToDelete = sales.find(s => s.id === saleId);
        if (!saleToDelete) {
            return { success: false, message: 'Sale not found.' };
        }
    
        // Find related returns to delete them as well
        const relatedReturnIds = sales
            .filter(s => s.type === 'Return' && s.originalSaleId === saleId)
            .map(s => s.id);
        
        const idsToDelete = [saleId, ...relatedReturnIds];
    
        // Delete sales and returns
        setSales(prevSales => prevSales.filter(s => !idsToDelete.includes(s.id)));
    
        // Delete related stock history, but do not revert stock levels
        setInventoryAdjustments(prev => prev.filter(adj => 
            !idsToDelete.some(id => adj.reason.includes(`#${id}`))
        ));
    
        return { success: true, message: `Sale ${saleId} and associated data have been deleted. Stock levels were not changed.` };
    }, [sales, setSales, setInventoryAdjustments]);
   
     const receiveStock = useCallback((productId: string, quantity: number) => {
       if (quantity <= 0) return;
       setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + quantity } : p));
       setInventoryAdjustments(prev => [...prev, { productId, date: new Date().toISOString(), quantity: quantity, reason: 'Stock Received' }]);
     }, [setProducts, setInventoryAdjustments]);
   
     const adjustStock = useCallback((productId: string, newStockLevel: number, reason: string) => {
       const product = products.find(p => p.id === productId);
       if (!product) return;
       const change = newStockLevel - product.stock;
       if (change === 0) return;
       setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStockLevel } : p));
       setInventoryAdjustments(prev => [...prev, { productId, date: new Date().toISOString(), quantity: change, reason: reason || 'Manual Adjustment' }]);
     }, [products, setProducts, setInventoryAdjustments]);
   
     const processSale = useCallback((saleData: Omit<Sale, 'id' | 'date'>): Sale => {
        const now = new Date();
        const year = String(now.getFullYear()).slice(-2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePrefix = `${year}${month}${day}`;
        const maxSequence = sales.filter(sale => sale.id.startsWith(datePrefix)).reduce((max, sale) => Math.max(max, parseInt(sale.id.split('-')[1], 10) || 0), 0);
        const newId = `${datePrefix}-${String(maxSequence + 1).padStart(4, '0')}`;
        const newSale: Sale = { ...saleData, id: newId, date: now.toISOString(), ...(saleData.type === 'Sale' && { items: saleData.items.map(item => ({...item, returnedQuantity: 0})), status: 'Completed' })};
        setSales(prev => [newSale, ...prev].map(s => {
            if (newSale.type === 'Return' && s.id === newSale.originalSaleId) {
                const updatedSale = { ...s };
                updatedSale.items = updatedSale.items.map(origItem => {
                    const returnedItem = newSale.items.find(retItem => retItem.id === origItem.id);
                    return returnedItem ? { ...origItem, returnedQuantity: (origItem.returnedQuantity || 0) + returnedItem.quantity } : origItem;
                });
                updatedSale.status = updatedSale.items.every(item => (item.returnedQuantity || 0) >= item.quantity) ? 'Refunded' : 'Partially Refunded';
                return updatedSale;
            }
            return s;
        }));
        const adjustments: InventoryAdjustment[] = newSale.items.map(cartItem => ({ productId: cartItem.id, date: newSale.date, quantity: newSale.type === 'Return' ? cartItem.quantity : -cartItem.quantity, reason: `${newSale.type} #${newSale.id}` }));
        setInventoryAdjustments(prev => [...prev, ...adjustments]);
        
        setProducts(prevProducts => {
            const updatedProducts = prevProducts.map(p => { 
                const item = newSale.items.find(i => i.id === p.id); 
                if (item) {
                    const oldStock = p.stock;
                    const newStock = p.stock + (item.quantity * (newSale.type === 'Return' ? 1 : -1));
                    
                    // Check for stock notifications
                    if (newSale.type === 'Sale') {
                        if (newStock <= 0 && oldStock > 0) {
                            addNotification(`'${p.name}' is out of stock.`, NotificationType.STOCK, p.id);
                        } else if (newStock <= p.lowStockThreshold && oldStock > p.lowStockThreshold) {
                            addNotification(`'${p.name}' is low on stock (${newStock} remaining).`, NotificationType.STOCK, p.id);
                        }
                    }
                    return { ...p, stock: newStock };
                }
                return p;
            });
            return updatedProducts;
        });

        return newSale;
    }, [sales, setSales, setProducts, setInventoryAdjustments, addNotification]);
   
     const importProducts = useCallback((newProducts: Omit<Product, 'id'>[]): { success: boolean; message: string } => {
        let importedCount = 0, skippedCount = 0;
        const existingSkus = new Set(products.map(p => p.sku));
        const productsToAdd = newProducts.filter(p => {
            if(existingSkus.has(p.sku) || !p.sku || !p.name || isNaN(p.retailPrice) || isNaN(p.costPrice) || isNaN(p.stock) || isNaN(p.lowStockThreshold)) {
                skippedCount++;
                return false;
            }
            existingSkus.add(p.sku);
            importedCount++;
            return true;
        }).map(p => ({ ...p, id: `prod_${Date.now()}_${p.sku}` }));
        setProducts(prev => [...prev, ...productsToAdd]);
        return { success: true, message: `Imported ${importedCount} products. Skipped ${skippedCount}.` };
     }, [products, setProducts]);
   
    const clearSales = useCallback((config?: { statuses?: (Sale['status'])[] }) => {
        const statuses = config?.statuses;

        // If no config is provided, clear all sales.
        if (!statuses) {
            setSales([]);
            setInventoryAdjustments(prev => prev.filter(adj => !adj.reason.startsWith('Sale #') && !adj.reason.startsWith('Return #')));
            return;
        }
        
        // If an empty array of statuses is passed, do nothing.
        if (statuses.length === 0) {
            return;
        }

        // Filter sales by the provided statuses.
        const targetSaleIds = new Set(sales
            .filter(s => s.type === 'Sale' && s.status && statuses.includes(s.status))
            .map(s => s.id));
        
        if (targetSaleIds.size === 0) return;

        // Find all related transaction IDs (original sales + their returns)
        const idsToDelete = new Set(sales
            .filter(s => (s.type === 'Sale' && targetSaleIds.has(s.id)) || (s.type === 'Return' && s.originalSaleId && targetSaleIds.has(s.originalSaleId)))
            .map(s => s.id));
        
        setSales(prev => prev.filter(s => !idsToDelete.has(s.id)));
        setInventoryAdjustments(prev => prev.filter(adj => 
            !Array.from(idsToDelete).some(id => adj.reason.includes(`#${id}`))
        ));
    }, [sales, setSales, setInventoryAdjustments]);
     
     const factoryReset = useCallback(() => { setProducts(INITIAL_PRODUCTS); setSales([]); setInventoryAdjustments([]); const admin = users.find(u => u.id === currentUser?.id); setUsers(admin ? [admin] : []); setNotifications([]); }, [setProducts, setSales, setInventoryAdjustments, setUsers, users, currentUser, setNotifications]);
     
    const pruneData = useCallback((target: PruneTarget, options: { days: number; statuses?: (Sale['status'])[] }): { success: boolean; message: string } => {
        const { days, statuses } = options;
        if (days <= 0) {
            return { success: false, message: 'Please provide a positive number of days.' };
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        let count = 0;

        switch (target) {
            case 'sales': {
                const salesToPrune = sales.filter(s => {
                    if (s.type !== 'Sale' || new Date(s.date) >= cutoffDate) {
                        return false;
                    }
                    // If no statuses are specified, prune all old sales.
                    if (!statuses || statuses.length === 0) {
                        return true;
                    }
                    // Otherwise, only prune sales with matching statuses.
                    return s.status && statuses.includes(s.status);
                });
                
                const oldSaleIds = new Set(salesToPrune.map(s => s.id));

                if (oldSaleIds.size === 0) {
                    return { success: true, message: `No matching sales records older than ${days} days found to delete.` };
                }

                const relatedReturns = sales.filter(s => s.type === 'Return' && s.originalSaleId && oldSaleIds.has(s.originalSaleId));
                
                const allIdsToDelete = new Set([
                    ...salesToPrune.map(s => s.id),
                    ...relatedReturns.map(s => s.id)
                ]);

                setSales(prevSales => prevSales.filter(s => !allIdsToDelete.has(s.id)));
                
                setInventoryAdjustments(prev => prev.filter(adj => 
                    !Array.from(allIdsToDelete).some(id => adj.reason.includes(`#${id}`))
                ));
                
                return { success: true, message: `Successfully deleted ${salesToPrune.length} sales and ${relatedReturns.length} associated returns older than ${days} days. Stock levels were not changed.` };
            }

            case 'purchaseOrders':
                const posToKeep = purchaseOrders.filter(po => {
                    if (po.status !== 'Received') return true; // Keep if not completed
                    return new Date(po.dateCreated) >= cutoffDate;
                });
                count = purchaseOrders.length - posToKeep.length;
                if (count > 0) setPurchaseOrders(posToKeep);
                return { success: true, message: `Successfully deleted ${count} completed purchase order records older than ${days} days.` };
                
            case 'stockHistory':
                const adjustmentsToKeep = inventoryAdjustments.filter(adj => new Date(adj.date) >= cutoffDate);
                count = inventoryAdjustments.length - adjustmentsToKeep.length;
                if (count > 0) setInventoryAdjustments(adjustmentsToKeep);
                return { success: true, message: `Successfully deleted ${count} stock history records older than ${days} days.` };
            
            case 'notifications':
                const notificationsToKeep = notifications.filter(n => new Date(n.timestamp) >= cutoffDate);
                count = notifications.length - notificationsToKeep.length;
                if (count > 0) setNotifications(notificationsToKeep);
                return { success: true, message: `Successfully deleted ${count} notification records older than ${days} days.` };
                
            default:
                return { success: false, message: 'Invalid data target specified for pruning.' };
        }
    }, [sales, purchaseOrders, inventoryAdjustments, notifications, setSales, setPurchaseOrders, setInventoryAdjustments, setNotifications]);
     
     const addPurchaseOrder = useCallback((poData: Omit<PurchaseOrder, 'id'>): PurchaseOrder => { const newPO: PurchaseOrder = { ...poData, id: `po_${Date.now()}` }; setPurchaseOrders(prev => [newPO, ...prev]); return newPO; }, [setPurchaseOrders]);
     const updatePurchaseOrder = useCallback((updatedPO: PurchaseOrder) => setPurchaseOrders(prev => prev.map(po => po.id === updatedPO.id ? updatedPO : po)), [setPurchaseOrders]);
     
     const deletePurchaseOrder = useCallback((poId: string): { success: boolean; message?: string } => {
        const poToDelete = purchaseOrders.find(po => po.id === poId);
        if (!poToDelete) {
            return { success: false, message: 'Purchase Order not found.' };
        }
        const hasReceivedItems = poToDelete.items.some(item => item.quantityReceived > 0);
        if (hasReceivedItems) {
            return { success: false, message: 'Cannot delete a Purchase Order that has received items.' };
        }
        setPurchaseOrders(prev => prev.filter(po => po.id !== poId));
        return { success: true };
     }, [purchaseOrders, setPurchaseOrders]);

     const receivePOItems = useCallback((poId: string, receivedItems: { productId: string, quantity: number }[]) => {
        const po = purchaseOrders.find(p => p.id === poId);
        if(!po) return;
        const updatedItems = po.items.map(item => { const r = receivedItems.find(i => i.productId === item.productId); return r ? { ...item, quantityReceived: Math.min(item.quantityReceived + r.quantity, item.quantityOrdered) } : item; });
        const newStatus = updatedItems.every(i => i.quantityReceived >= i.quantityOrdered) ? 'Received' : updatedItems.some(i => i.quantityReceived > 0) ? 'Partial' : 'Pending';
        setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, items: updatedItems, status: newStatus } : p));
        setProducts(prevProds => prevProds.map(prod => { const r = receivedItems.find(i => i.productId === prod.id); return r ? { ...prod, stock: prod.stock + r.quantity } : prod; }));
        setInventoryAdjustments(prev => [...prev, ...receivedItems.map(r => ({ productId: r.productId, date: new Date().toISOString(), quantity: r.quantity, reason: `PO #${po.id}` }))]);
     }, [purchaseOrders, setPurchaseOrders, setProducts, setInventoryAdjustments]);

    const markNotificationAsRead = useCallback((notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    }, [setNotifications]);

    const markAllNotificationsAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, [setNotifications]);
    
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, [setNotifications]);

    const restoreBackup = (backupData: any): { success: boolean; message: string } => {
        if (backupData.businessName !== businessName) {
            return { success: false, message: `Backup is for a different business ('${backupData.businessName}'). Current business is '${businessName}'.` };
        }

        const restore = (setter: Function, data: any, defaultValue: any) => {
            setter(data !== undefined ? data : defaultValue);
        };
        
        restore(setProducts, backupData.products, INITIAL_PRODUCTS);
        restore(setSales, backupData.sales, []);
        restore(setInventoryAdjustments, backupData.inventoryAdjustments, []);
        restore(setUsers, backupData.users, []);
        restore(setPurchaseOrders, backupData.purchaseOrders, []);
        restore(setNotifications, backupData.notifications, []);
        restore(setItemsPerPage, backupData.itemsPerPage, 10);
        restore(setCurrency, backupData.currency, 'USD');
        restore(setCurrencies, backupData.currencies, DEFAULT_CURRENCIES);
        restore(setCurrencyDisplay, backupData.currencyDisplay, 'symbol');
        restore(setIsSplitPaymentEnabled, backupData.isSplitPaymentEnabled, false);
        restore(setIsChangeDueEnabled, backupData.isChangeDueEnabled, true);
        restore(setIsIntegerCurrency, backupData.isIntegerCurrency, false);
        restore(setIsTaxEnabled, backupData.isTaxEnabled, true);
        restore(setTaxRate, backupData.taxRate, 0.08);
        restore(setIsDiscountEnabled, backupData.isDiscountEnabled, true);
        restore(setDiscountRate, backupData.discountRate, 0.05);
        restore(setDiscountThreshold, backupData.discountThreshold, 100);
        restore(setTheme, backupData.theme, 'system');
        restore(setCashierPermissions, backupData.cashierPermissions, {
            canProcessReturns: true, canViewReports: true, canViewAnalysis: false, canEditOwnProfile: true,
            canViewDashboard: false, canViewInventory: false, canEditBehaviorSettings: false,
        });

        const restoredUsers = backupData.users || [];
        const newCurrentUser = restoredUsers.find((u: User) => u.id === currentUser?.id);
        setCurrentUser(newCurrentUser || null);

        return { success: true, message: 'Restore successful! The application will now reload.' };
    };

    const onInventoryViewUpdate = useCallback((updates: Partial<InventoryViewState>) => setInventoryViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.stockFilter !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);
    const onReportsSalesViewUpdate = useCallback((updates: Partial<ReportsViewState['sales']>) => setReportsViewState(prev => ({...prev, sales: {...prev.sales, ...updates, currentPage: (updates.searchTerm !== undefined || updates.typeFilter !== undefined || updates.statusFilter !== undefined || updates.salespersonFilter !== undefined || updates.timeRange !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.sales.currentPage}})), []);
    const onReportsProductsViewUpdate = useCallback((updates: Partial<ReportsViewState['products']>) => setReportsViewState(prev => ({...prev, products: {...prev.products, ...updates, currentPage: (updates.searchTerm !== undefined || updates.stockFilter !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.products.currentPage}})), []);
    const onReportsInventoryValuationViewUpdate = useCallback((updates: Partial<ReportsViewState['inventoryValuation']>) => setReportsViewState(prev => ({...prev, inventoryValuation: {...prev.inventoryValuation, ...updates, currentPage: (updates.searchTerm !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.inventoryValuation.currentPage}})), []);
    const onUsersViewUpdate = useCallback((updates: Partial<UsersViewState>) => setUsersViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);
    const onAnalysisViewUpdate = useCallback((updates: Partial<AnalysisViewState>) => setAnalysisViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.timeRange !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);
    const onPOViewUpdate = useCallback((updates: Partial<POViewState>) => setPOViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.statusFilter !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);

    // Provide all state and functions
    const value: AppContextType = {
        businessName, products, sales, inventoryAdjustments, users, purchaseOrders, currentUser, notifications, toasts, itemsPerPage, currency,
        currencies, currencyDisplay, isSplitPaymentEnabled, isChangeDueEnabled, isIntegerCurrency, isTaxEnabled, taxRate, isDiscountEnabled,
        discountRate, discountThreshold, activeView, theme, inventoryViewState, reportsViewState, usersViewState,
        analysisViewState, poViewState, cashierPermissions,
        login, signup, onLogout, addUser, updateUser, deleteUser, addProduct, updateProduct, deleteProduct, deleteSale, receiveStock,
        adjustStock, processSale, importProducts, clearSales, factoryReset, pruneData, addPurchaseOrder, updatePurchaseOrder,
        deletePurchaseOrder, receivePOItems, addNotification, markNotificationAsRead, markAllNotificationsAsRead, clearNotifications, showToast, dismissToast, restoreBackup, setActiveView, setTheme, setItemsPerPage, setCurrency, addCurrency, updateCurrency, deleteCurrency, setCurrencyDisplay, formatCurrency, setIsSplitPaymentEnabled,
        setIsChangeDueEnabled, setIsIntegerCurrency, setIsTaxEnabled, setTaxRate, setIsDiscountEnabled, setDiscountRate,
        setDiscountThreshold, setCashierPermissions, onInventoryViewUpdate, onReportsSalesViewUpdate, onReportsProductsViewUpdate,
        onReportsInventoryValuationViewUpdate, onUsersViewUpdate, onAnalysisViewUpdate, onPOViewUpdate
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};