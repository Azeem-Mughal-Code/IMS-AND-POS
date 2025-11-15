import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
    Product, Sale, User, UserRole, View, InventoryAdjustment, InventoryViewState, ReportsViewState, 
    UsersViewState, AnalysisViewState, PurchaseOrder, POViewState, PaymentType
} from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from '../../constants';

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
    itemsPerPage: number;
    currency: string;
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
    
    // Setters & Functions
    login: (username: string, pass: string) => boolean;
    signup: (username: string, pass: string) => { success: boolean, message?: string };
    onLogout: () => void;
    addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
    updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
    deleteUser: (userId: string) => { success: boolean; message?: string };
    addProduct: (product: Omit<Product, 'id'>) => void;
    updateProduct: (updatedProduct: Product) => void;
    deleteProduct: (productId: string) => { success: boolean; message?: string };
    receiveStock: (productId: string, quantity: number) => void;
    adjustStock: (productId: string, newStockLevel: number, reason: string) => void;
    processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
    importProducts: (newProducts: Omit<Product, 'id'>[]) => { success: boolean; message: string };
    clearSales: () => void;
    factoryReset: () => void;
    addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
    updatePurchaseOrder: (po: PurchaseOrder) => void;
    deletePurchaseOrder: (poId: string) => { success: boolean; message?: string };
    receivePOItems: (poId: string, receivedItems: { productId: string, quantity: number }[]) => void;
    setActiveView: (view: View) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    setItemsPerPage: (size: number) => void;
    setCurrency: (currency: string) => void;
    setIsSplitPaymentEnabled: (enabled: boolean) => void;
    setIsChangeDueEnabled: (enabled: boolean) => void;
    setIsIntegerCurrency: (enabled: boolean) => void;
    setIsTaxEnabled: (enabled: boolean) => void;
    setTaxRate: (rate: number) => void;
    setIsDiscountEnabled: (enabled: boolean) => void;
    setDiscountRate: (rate: number) => void;
    setDiscountThreshold: (threshold: number) => void;
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
    
    const [itemsPerPage, setItemsPerPage] = useLocalStorage<number>(`${ls_prefix}-itemsPerPage`, 10);
    const [currency, setCurrency] = useLocalStorage<string>(`${ls_prefix}-currency`, 'USD');
    const [isSplitPaymentEnabled, setIsSplitPaymentEnabled] = useLocalStorage<boolean>(`${ls_prefix}-splitPaymentEnabled`, false);
    const [isChangeDueEnabled, setIsChangeDueEnabled] = useLocalStorage<boolean>(`${ls_prefix}-changeDueEnabled`, true);
    const [isIntegerCurrency, setIsIntegerCurrency] = useLocalStorage<boolean>(`${ls_prefix}-isIntegerCurrency`, false);
    const [isTaxEnabled, setIsTaxEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isTaxEnabled`, true);
    const [taxRate, setTaxRate] = useLocalStorage<number>(`${ls_prefix}-taxRate`, 0.08);
    const [isDiscountEnabled, setIsDiscountEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isDiscountEnabled`, true);
    const [discountRate, setDiscountRate] = useLocalStorage<number>(`${ls_prefix}-discountRate`, 0.05); // 5%
    const [discountThreshold, setDiscountThreshold] = useLocalStorage<number>(`${ls_prefix}-discountThreshold`, 100);

    const [activeView, setActiveView] = useState<View>('dashboard');
    const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>('ims-theme', 'system');
    
    // States for individual views
    const [inventoryViewState, setInventoryViewState] = useState<InventoryViewState>({ searchTerm: '', stockFilter: 'All', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1, itemsPerPage: 10 });
    const [reportsViewState, setReportsViewState] = useState<ReportsViewState>({ sales: { searchTerm: '', typeFilter: 'All', statusFilter: 'All', timeRange: 'all', sortConfig: { key: 'id', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 }, products: { searchTerm: '', stockFilter: 'All', sortConfig: { key: 'name', direction: 'ascending' }, currentPage: 1, itemsPerPage: 10 }, inventoryValuation: { searchTerm: '', sortConfig: { key: 'totalRetailValue', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 }});
    const [usersViewState, setUsersViewState] = useState<UsersViewState>({ searchTerm: '', sortConfig: { key: 'username', direction: 'ascending' }, currentPage: 1, itemsPerPage: 10 });
    const [analysisViewState, setAnalysisViewState] = useState<AnalysisViewState>({ timeRange: 'all', searchTerm: '', sortConfig: { key: 'profit', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 });
    const [poViewState, setPOViewState] = useState<POViewState>({ searchTerm: '', statusFilter: 'All', sortConfig: { key: 'id', direction: 'descending' }, currentPage: 1, itemsPerPage: 10 });

    const login = (username: string, pass: string): boolean => {
        const user = users.find(u => u.username === username && u.password === pass);
        if (user) {
          setCurrentUser(user);
          setActiveView(user.role === UserRole.Admin ? 'dashboard' : 'pos');
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

    const onLogout = () => setCurrentUser(null);
  
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
        setProducts(prevProducts => prevProducts.map(p => { const item = newSale.items.find(i => i.id === p.id); return item ? { ...p, stock: p.stock + (item.quantity * (newSale.type === 'Return' ? 1 : -1)) } : p; }));
        return newSale;
    }, [sales, setSales, setProducts, setInventoryAdjustments]);
   
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
   
     const clearSales = useCallback(() => { setSales([]); setInventoryAdjustments(prev => prev.filter(adj => !adj.reason.startsWith('Sale #') && !adj.reason.startsWith('Return #'))); }, [setSales, setInventoryAdjustments]);
     const factoryReset = useCallback(() => { setProducts(INITIAL_PRODUCTS); setSales([]); setInventoryAdjustments([]); const admin = users.find(u => u.id === currentUser?.id); setUsers(admin ? [admin] : []); }, [setProducts, setSales, setInventoryAdjustments, setUsers, users, currentUser]);
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

    const onInventoryViewUpdate = useCallback((updates: Partial<InventoryViewState>) => setInventoryViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.stockFilter !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);
    const onReportsSalesViewUpdate = useCallback((updates: Partial<ReportsViewState['sales']>) => setReportsViewState(prev => ({...prev, sales: {...prev.sales, ...updates, currentPage: (updates.searchTerm !== undefined || updates.typeFilter !== undefined || updates.statusFilter !== undefined || updates.timeRange !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.sales.currentPage}})), []);
    const onReportsProductsViewUpdate = useCallback((updates: Partial<ReportsViewState['products']>) => setReportsViewState(prev => ({...prev, products: {...prev.products, ...updates, currentPage: (updates.searchTerm !== undefined || updates.stockFilter !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.products.currentPage}})), []);
    const onReportsInventoryValuationViewUpdate = useCallback((updates: Partial<ReportsViewState['inventoryValuation']>) => setReportsViewState(prev => ({...prev, inventoryValuation: {...prev.inventoryValuation, ...updates, currentPage: (updates.searchTerm !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.inventoryValuation.currentPage}})), []);
    const onUsersViewUpdate = useCallback((updates: Partial<UsersViewState>) => setUsersViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);
    const onAnalysisViewUpdate = useCallback((updates: Partial<AnalysisViewState>) => setAnalysisViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.timeRange !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);
    const onPOViewUpdate = useCallback((updates: Partial<POViewState>) => setPOViewState(prev => ({...prev, ...updates, currentPage: (updates.searchTerm !== undefined || updates.statusFilter !== undefined || updates.itemsPerPage !== undefined) ? 1 : prev.currentPage})), []);

    // Provide all state and functions
    const value: AppContextType = {
        businessName, products, sales, inventoryAdjustments, users, purchaseOrders, currentUser, itemsPerPage, currency,
        isSplitPaymentEnabled, isChangeDueEnabled, isIntegerCurrency, isTaxEnabled, taxRate, isDiscountEnabled,
        discountRate, discountThreshold, activeView, theme, inventoryViewState, reportsViewState, usersViewState,
        analysisViewState, poViewState,
        login, signup, onLogout, addUser, updateUser, deleteUser, addProduct, updateProduct, deleteProduct, receiveStock,
        adjustStock, processSale, importProducts, clearSales, factoryReset, addPurchaseOrder, updatePurchaseOrder,
        deletePurchaseOrder, receivePOItems, setActiveView, setTheme, setItemsPerPage, setCurrency, setIsSplitPaymentEnabled,
        setIsChangeDueEnabled, setIsIntegerCurrency, setIsTaxEnabled, setTaxRate, setIsDiscountEnabled, setDiscountRate,
        setDiscountThreshold, onInventoryViewUpdate, onReportsSalesViewUpdate, onReportsProductsViewUpdate,
        onReportsInventoryValuationViewUpdate, onUsersViewUpdate, onAnalysisViewUpdate, onPOViewUpdate
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
