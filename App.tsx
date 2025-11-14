import React, { useState, useCallback, FormEvent, useEffect, useRef } from 'react';
import { Product, Sale, User, UserRole, View, InventoryAdjustment, InventoryViewState, ReportsViewState, UsersViewState, AnalysisViewState, PurchaseOrder, POItem, POViewState, Payment, PaymentType } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from './constants';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Analysis } from './components/Analysis';
import { DashboardIcon, POSIcon, InventoryIcon, ReportsIcon, UsersIcon, UserIcon, LogoutIcon, SettingsIcon, AnalysisIcon, ChevronDownIcon } from './components/Icons';

// Component to select a business workspace
const BusinessSelector: React.FC<{ onSelect: (name: string) => void }> = ({ onSelect }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSelect(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">IMS / POS System</h1>
          <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-6">Enter Business Name</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
              <input
                id="businessName"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                placeholder="e.g., My Awesome Store"
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// AuthForm Component for Login/Signup within a business context
const AuthForm: React.FC<{
  businessName: string;
  users: User[];
  onLogin: (username: string, pass: string) => boolean;
  onSignup: (username: string, pass: string) => { success: boolean, message?: string };
  onGoBack: () => void;
}> = ({ businessName, users, onLogin, onSignup, onGoBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isNewBusiness = users.length === 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    let success = false;
    if (isNewBusiness) {
        if (password.length < 4) {
            setError("Password must be at least 4 characters long.");
            return;
        }
        const result = onSignup(username, password);
        success = result.success;
        if (!success) setError(result.message || 'Could not create account.');
    } else {
        success = onLogin(username, password);
        if (!success) setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2 truncate">{businessName}</h1>
          <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-6">
            {isNewBusiness ? 'Create Admin Account' : 'Login'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
              {isNewBusiness ? 'Create Account' : 'Login'}
            </button>
          </form>
          <div className="text-center mt-6">
            <button onClick={onGoBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Not your business? Go back.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


interface MainLayoutProps {
  currentUser: User;
  businessName: string;
  onLogout: () => void;
  products: Product[];
  sales: Sale[];
  inventoryAdjustments: InventoryAdjustment[];
  users: User[];
  purchaseOrders: PurchaseOrder[];
  activeView: View;
  setActiveView: (view: View) => void;
  processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (updatedProduct: Product) => void;
  receiveStock: (productId: string, quantity: number) => void;
  adjustStock: (productId: string, newStockLevel: number, reason: string) => void;
  deleteProduct: (productId: string) => { success: boolean; message?: string };
  addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
  updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
  updatePurchaseOrder: (po: PurchaseOrder) => void;
  receivePOItems: (poId: string, receivedItems: { productId: string, quantity: number }[]) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  inventoryViewState: InventoryViewState;
  onInventoryViewUpdate: (updates: Partial<InventoryViewState>) => void;
  reportsViewState: ReportsViewState;
  onReportsSalesViewUpdate: (updates: Partial<ReportsViewState['sales']>) => void;
  onReportsProductsViewUpdate: (updates: Partial<ReportsViewState['products']>) => void;
  onReportsInventoryValuationViewUpdate: (updates: Partial<ReportsViewState['inventoryValuation']>) => void;
  usersViewState: UsersViewState;
  onUsersViewUpdate: (updates: Partial<UsersViewState>) => void;
  analysisViewState: AnalysisViewState;
  onAnalysisViewUpdate: (updates: Partial<AnalysisViewState>) => void;
  poViewState: POViewState;
  onPOViewUpdate: (updates: Partial<POViewState>) => void;
  importProducts: (newProducts: Omit<Product, 'id'>[]) => { success: boolean, message: string };
  clearSales: () => void;
  factoryReset: () => void;
  itemsPerPage: number;
  setItemsPerPage: (size: number) => void;
  currency: string;
  setCurrency: (currency: string) => void;
  isSplitPaymentEnabled: boolean;
  setIsSplitPaymentEnabled: (enabled: boolean) => void;
  isChangeDueEnabled: boolean;
  setIsChangeDueEnabled: (enabled: boolean) => void;
  isIntegerCurrency: boolean;
  setIsIntegerCurrency: (enabled: boolean) => void;
  isTaxEnabled: boolean;
  setIsTaxEnabled: (enabled: boolean) => void;
  taxRate: number;
  setTaxRate: (rate: number) => void;
  isDiscountEnabled: boolean;
  setIsDiscountEnabled: (enabled: boolean) => void;
  discountRate: number;
  setDiscountRate: (rate: number) => void;
  discountThreshold: number;
  setDiscountThreshold: (threshold: number) => void;
  deviceView: 'mobile' | 'tablet' | 'desktop';
  setDeviceView: (view: 'mobile' | 'tablet' | 'desktop') => void;
}

// MainLayout Component for the authenticated app view
const MainLayout: React.FC<MainLayoutProps> = (props) => {
  const { currentUser, businessName, onLogout, products, sales, activeView, setActiveView, analysisViewState, onAnalysisViewUpdate, currency, isIntegerCurrency } = props;
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);


  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard products={products} sales={sales} currency={currency} isIntegerCurrency={isIntegerCurrency} />;
      case 'pos': return <POS {...props} />;
      case 'inventory': return <Inventory 
          {...props} 
          viewState={props.inventoryViewState} 
          onViewStateUpdate={props.onInventoryViewUpdate}
          poViewState={props.poViewState}
          onPOViewStateUpdate={props.onPOViewUpdate}
          inventoryValuationViewState={props.reportsViewState.inventoryValuation}
          onInventoryValuationViewStateUpdate={props.onReportsInventoryValuationViewUpdate}
        />;
      case 'reports': return <Reports 
          {...props} 
          salesViewState={props.reportsViewState.sales} 
          onSalesViewStateUpdate={props.onReportsSalesViewUpdate}
          productsViewState={props.reportsViewState.products}
          onProductsViewStateUpdate={props.onReportsProductsViewUpdate}
        />;
      case 'analysis': return <Analysis products={products} sales={sales} viewState={analysisViewState} onViewStateUpdate={onAnalysisViewUpdate} currency={currency} isIntegerCurrency={isIntegerCurrency} />;
      case 'settings': return <Settings {...props} />;
      default: return <Dashboard products={products} sales={sales} currency={currency} isIntegerCurrency={isIntegerCurrency} />;
    }
  };

  const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button onClick={() => setActiveView(view)} className={`flex items-center space-x-3 p-3 rounded-lg w-full text-left transition-colors ${activeView === view ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  const BottomNavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button onClick={() => setActiveView(view)} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors ${activeView === view ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6' })}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate">{businessName}</h1>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {currentUser.role === UserRole.Admin && <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />}
          <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
          {currentUser.role === UserRole.Admin && <NavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />}
          <NavItem view="reports" icon={<ReportsIcon />} label="Reports" />
          {currentUser.role === UserRole.Admin && <NavItem view="analysis" icon={<AnalysisIcon />} label="Analysis" />}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700" ref={profileDropdownRef}>
            <div className="relative">
                <button onClick={() => setIsProfileDropdownOpen(p => !p)} className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full"><UserIcon /></div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm truncate">{currentUser.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                    </div>
                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isProfileDropdownOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <div className="p-2">
                            <button onClick={() => { setActiveView('settings'); setIsProfileDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <SettingsIcon className="h-5 w-5" /> <span>Settings</span>
                            </button>
                            <div className="my-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                            <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 dark:hover:bg-opacity-50">
                                <LogoutIcon className="h-5 w-5" /> <span>Logout</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{renderView()}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around shadow-lg">
        {currentUser.role === UserRole.Admin && <BottomNavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />}
        <BottomNavItem view="pos" icon={<POSIcon />} label="POS" />
        {currentUser.role === UserRole.Admin && <BottomNavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />}
        <BottomNavItem view="reports" icon={<ReportsIcon />} label="Reports" />
        {currentUser.role === UserRole.Admin && <BottomNavItem view="analysis" icon={<AnalysisIcon />} label="Analysis" />}
        <BottomNavItem view="settings" icon={<SettingsIcon />} label="Settings" />
      </nav>
    </div>
  );
};


const BusinessWorkspace: React.FC<{ businessName: string, onGoBack: () => void }> = ({ businessName, onGoBack }) => {
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
  const [deviceView, setDeviceView] = useLocalStorage<'mobile' | 'tablet' | 'desktop'>(`${ls_prefix}-deviceView`, 'desktop');

  const [activeView, setActiveView] = useState<View>('dashboard');
  const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>('ims-theme', 'system');
  
  // States for individual views
  const [inventoryViewState, setInventoryViewState] = useState<InventoryViewState>({
    searchTerm: '',
    stockFilter: 'All',
    sortConfig: { key: 'name', direction: 'ascending' },
    currentPage: 1,
    itemsPerPage: 10,
  });

  const [reportsViewState, setReportsViewState] = useState<ReportsViewState>({
    sales: {
        searchTerm: '',
        typeFilter: 'All',
        statusFilter: 'All',
        timeRange: 'all',
        sortConfig: { key: 'date', direction: 'descending' },
        currentPage: 1,
        itemsPerPage: 10,
    },
    products: {
        searchTerm: '',
        stockFilter: 'All',
        sortConfig: { key: 'name', direction: 'ascending' },
        currentPage: 1,
        itemsPerPage: 10,
    },
    inventoryValuation: {
        searchTerm: '',
        sortConfig: { key: 'totalRetailValue', direction: 'descending' },
        currentPage: 1,
        itemsPerPage: 10,
    }
  });

  const [usersViewState, setUsersViewState] = useState<UsersViewState>({
    searchTerm: '',
    sortConfig: { key: 'username', direction: 'ascending' },
    currentPage: 1,
    itemsPerPage: 10,
  });
  
  const [analysisViewState, setAnalysisViewState] = useState<AnalysisViewState>({
    timeRange: 'all',
    searchTerm: '',
    sortConfig: { key: 'profit', direction: 'descending' },
    currentPage: 1,
    itemsPerPage: 10,
  });
  
  const [poViewState, setPOViewState] = useState<POViewState>({
      searchTerm: '',
      statusFilter: 'All',
      sortConfig: { key: 'dateCreated', direction: 'descending' },
      currentPage: 1,
      itemsPerPage: 10,
  });

  const handleInventoryViewUpdate = useCallback((updates: Partial<InventoryViewState>) => {
    setInventoryViewState(prev => {
        const newState = { ...prev, ...updates };
        const filterChanged = (updates.searchTerm !== undefined && updates.searchTerm !== prev.searchTerm) ||
                            (updates.stockFilter !== undefined && updates.stockFilter !== prev.stockFilter) ||
                            (updates.itemsPerPage !== undefined && updates.itemsPerPage !== prev.itemsPerPage);
        if (filterChanged) {
            newState.currentPage = 1;
        }
        return newState;
    });
  }, []);
  
  const handleReportsSalesViewUpdate = useCallback((updates: Partial<ReportsViewState['sales']>) => {
    setReportsViewState(prev => {
        const newSalesState = { ...prev.sales, ...updates };
        const filterChanged = (updates.searchTerm !== undefined && updates.searchTerm !== prev.sales.searchTerm) ||
                            (updates.typeFilter !== undefined && updates.typeFilter !== prev.sales.typeFilter) ||
                            (updates.statusFilter !== undefined && updates.statusFilter !== prev.sales.statusFilter) ||
                            (updates.timeRange !== undefined && updates.timeRange !== prev.sales.timeRange) ||
                            (updates.itemsPerPage !== undefined && updates.itemsPerPage !== prev.sales.itemsPerPage);
        if (filterChanged) {
            newSalesState.currentPage = 1;
        }
        return { ...prev, sales: newSalesState };
    });
  }, []);

  const handleReportsProductsViewUpdate = useCallback((updates: Partial<ReportsViewState['products']>) => {
    setReportsViewState(prev => {
        const newProductsState = { ...prev.products, ...updates };
        const filterChanged = (updates.searchTerm !== undefined && updates.searchTerm !== prev.products.searchTerm) ||
                            (updates.stockFilter !== undefined && updates.stockFilter !== prev.products.stockFilter) ||
                            (updates.itemsPerPage !== undefined && updates.itemsPerPage !== prev.products.itemsPerPage);
        if (filterChanged) {
            newProductsState.currentPage = 1;
        }
        return { ...prev, products: newProductsState };
    });
  }, []);
  
  const handleReportsInventoryValuationViewUpdate = useCallback((updates: Partial<ReportsViewState['inventoryValuation']>) => {
    setReportsViewState(prev => {
        const newValuationState = { ...prev.inventoryValuation, ...updates };
        const filterChanged = (updates.searchTerm !== undefined && updates.searchTerm !== prev.inventoryValuation.searchTerm) ||
                              (updates.itemsPerPage !== undefined && updates.itemsPerPage !== prev.inventoryValuation.itemsPerPage);
        if (filterChanged) {
            newValuationState.currentPage = 1;
        }
        return { ...prev, inventoryValuation: newValuationState };
    });
  }, []);

  const handleUsersViewUpdate = useCallback((updates: Partial<UsersViewState>) => {
    setUsersViewState(prev => {
        const newState = { ...prev, ...updates };
        const filterChanged = (updates.searchTerm !== undefined && updates.searchTerm !== prev.searchTerm) ||
                            (updates.itemsPerPage !== undefined && updates.itemsPerPage !== prev.itemsPerPage);
        if (filterChanged) {
            newState.currentPage = 1;
        }
        return newState;
    });
  }, []);
  
  const handleAnalysisViewUpdate = useCallback((updates: Partial<AnalysisViewState>) => {
    setAnalysisViewState(prev => {
        const newState = { ...prev, ...updates };
        const filterChanged = (updates.searchTerm !== undefined && updates.searchTerm !== prev.searchTerm) ||
                            (updates.timeRange !== undefined && updates.timeRange !== prev.timeRange) ||
                            (updates.itemsPerPage !== undefined && updates.itemsPerPage !== prev.itemsPerPage);
        if (filterChanged) {
            newState.currentPage = 1;
        }
        return newState;
    });
  }, []);
  
  const handlePOViewUpdate = useCallback((updates: Partial<POViewState>) => {
    setPOViewState(prev => {
        const newState = { ...prev, ...updates };
        if (updates.searchTerm !== undefined || updates.statusFilter !== undefined || updates.itemsPerPage !== undefined) {
            newState.currentPage = 1;
        }
        return newState;
    });
  }, []);

  useEffect(() => {
    setInventoryViewState(prev => ({ ...prev, itemsPerPage, currentPage: 1 }));
    setReportsViewState(prev => ({
      ...prev,
      sales: { ...prev.sales, itemsPerPage, currentPage: 1 },
      products: { ...prev.products, itemsPerPage, currentPage: 1 },
      inventoryValuation: { ...prev.inventoryValuation, itemsPerPage, currentPage: 1 },
    }));
    setUsersViewState(prev => ({ ...prev, itemsPerPage, currentPage: 1 }));
    setAnalysisViewState(prev => ({ ...prev, itemsPerPage, currentPage: 1 }));
    setPOViewState(prev => ({ ...prev, itemsPerPage, currentPage: 1 }));
  }, [itemsPerPage]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && mediaQuery.matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  useEffect(() => {
    if (currentUser?.role === UserRole.Cashier) {
        setActiveView('pos');
    }
  }, [currentUser]);

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

  const logout = () => setCurrentUser(null);
  
  const addUser = (username: string, pass: string, role: UserRole): { success: boolean, message?: string } => {
     if (users.some(u => u.username === username)) {
      return { success: false, message: 'Username is already taken.' };
    }
    const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role };
    setUsers(prev => [...prev, newUser]);
    return { success: true };
  };

  const deleteUser = (userId: string): { success: boolean, message?: string } => {
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

    if (currentUser?.role !== UserRole.Admin) return { success: false, message: 'Permission denied.' };
    
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

    // Plausibility Check: Ensure current time is after the last transaction time.
    if (sales.length > 0) {
        const lastSaleDate = new Date(sales[0].date);
        // Add a small buffer (e.g., 1 second) to account for rapid transactions or clock skew.
        if (now.getTime() < lastSaleDate.getTime() - 1000) { 
            throw new Error('System clock appears to be incorrect. Please check your device time settings and try again.');
        }
    }

    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Find the highest sequence number from today's sales
    const maxSequence = sales
        .filter(sale => sale.id.startsWith(datePrefix))
        .reduce((max, sale) => {
            const parts = sale.id.split('-');
            if (parts.length > 1) {
                const sequence = parseInt(parts[1], 10);
                if (!isNaN(sequence) && sequence > max) {
                    return sequence;
                }
            }
            return max;
        }, 0);

    const nextSequence = maxSequence + 1;
    const sequenceString = String(nextSequence).padStart(4, '0');
    const newId = `${datePrefix}-${sequenceString}`;

    const itemsWithDefaults = saleData.type === 'Sale' 
        ? saleData.items.map(item => ({...item, returnedQuantity: 0}))
        : saleData.items;

    const newSale: Sale = {
        ...saleData,
        id: newId,
        date: now.toISOString(),
        ...(saleData.type === 'Sale' && { items: itemsWithDefaults, status: 'Completed' })
    };

    setSales(prevSales => {
        let updatedSales = [newSale, ...prevSales];

        if (newSale.type === 'Return' && newSale.originalSaleId) {
            const originalSaleIndex = updatedSales.findIndex(s => s.id === newSale.originalSaleId);
            if (originalSaleIndex > -1) {
                const originalSale = { ...updatedSales[originalSaleIndex] };
                
                originalSale.items = originalSale.items.map(origItem => {
                    const returnedItem = newSale.items.find(retItem => retItem.id === origItem.id);
                    if (returnedItem) {
                        const currentReturned = origItem.returnedQuantity || 0;
                        return { ...origItem, returnedQuantity: currentReturned + returnedItem.quantity };
                    }
                    return origItem;
                });

                const allItemsReturned = originalSale.items.every(item => (item.returnedQuantity || 0) >= item.quantity);
                
                if (allItemsReturned) {
                    originalSale.status = 'Refunded';
                } else {
                    originalSale.status = 'Partially Refunded';
                }
                
                updatedSales[originalSaleIndex] = originalSale;
            }
        }
        return updatedSales;
    });

    const adjustments: InventoryAdjustment[] = newSale.items.map(cartItem => ({ 
        productId: cartItem.id, 
        date: newSale.date, 
        quantity: newSale.type === 'Return' ? cartItem.quantity : -cartItem.quantity,
        reason: `${newSale.type} #${newSale.id.slice(-8)}` 
    }));
    setInventoryAdjustments(prev => [...prev, ...adjustments]);

    setProducts(prevProducts => {
        const updatedProducts = [...prevProducts];
        newSale.items.forEach(cartItem => {
            const productIndex = updatedProducts.findIndex(p => p.id === cartItem.id);
            if (productIndex !== -1) {
                const stockChange = cartItem.quantity * (newSale.type === 'Return' ? 1 : -1);
                updatedProducts[productIndex].stock += stockChange;
            }
        });
        return updatedProducts;
    });
    return newSale;
  }, [sales, setSales, setProducts, setInventoryAdjustments]);

  const importProducts = useCallback((newProducts: Omit<Product, 'id'>[]): { success: boolean; message: string } => {
    let importedCount = 0;
    let skippedCount = 0;
    const existingSkus = new Set(products.map(p => p.sku));

    const productsToAdd = newProducts.filter(p => {
        if(existingSkus.has(p.sku)) {
            skippedCount++;
            return false;
        }
        // Basic validation
        if (!p.sku || !p.name || isNaN(p.retailPrice) || isNaN(p.costPrice) || isNaN(p.stock) || isNaN(p.lowStockThreshold)) {
            return false;
        }
        existingSkus.add(p.sku);
        importedCount++;
        return true;
    }).map(p => ({ ...p, id: `prod_${Date.now()}_${p.sku}` }));
    
    setProducts(prev => [...prev, ...productsToAdd]);
    
    return { success: true, message: `Successfully imported ${importedCount} products. Skipped ${skippedCount} products with duplicate SKUs.` };

  }, [products, setProducts]);

  const clearSales = useCallback(() => {
    setSales([]);
    // Also remove sale-related inventory adjustments
    setInventoryAdjustments(prev => prev.filter(adj => !adj.reason.startsWith('Sale #') && !adj.reason.startsWith('Return #')));
  }, [setSales, setInventoryAdjustments]);

  const factoryReset = useCallback(() => {
    setProducts(INITIAL_PRODUCTS);
    setSales([]);
    setInventoryAdjustments([]);
    const currentAdmin = users.find(u => u.id === currentUser?.id);
    setUsers(currentAdmin ? [currentAdmin] : []);
  }, [setProducts, setSales, setInventoryAdjustments, setUsers, users, currentUser]);
  
  const addPurchaseOrder = useCallback((poData: Omit<PurchaseOrder, 'id'>): PurchaseOrder => {
      const newPO: PurchaseOrder = { ...poData, id: `po_${Date.now()}` };
      setPurchaseOrders(prev => [newPO, ...prev]);
      return newPO;
  }, [setPurchaseOrders]);

  const updatePurchaseOrder = useCallback((updatedPO: PurchaseOrder) => setPurchaseOrders(prev => prev.map(po => po.id === updatedPO.id ? updatedPO : po)), [setPurchaseOrders]);

  const receivePOItems = useCallback((poId: string, receivedItems: { productId: string, quantity: number }[]) => {
      const po = purchaseOrders.find(p => p.id === poId);
      if(!po) return;

      let anyReceived = false;
      const updatedItems = po.items.map(item => {
          const received = receivedItems.find(r => r.productId === item.productId);
          if (received && received.quantity > 0) {
              anyReceived = true;
              const newReceivedQty = item.quantityReceived + received.quantity;
              return { ...item, quantityReceived: Math.min(newReceivedQty, item.quantityOrdered) };
          }
          return item;
      });
      
      if(!anyReceived) return;

      const totalOrdered = updatedItems.reduce((sum, i) => sum + i.quantityOrdered, 0);
      const totalReceived = updatedItems.reduce((sum, i) => sum + i.quantityReceived, 0);
      const newStatus = totalReceived >= totalOrdered ? 'Received' : 'Partial';

      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, items: updatedItems, status: newStatus } : p));
      
      const adjustments: InventoryAdjustment[] = [];
      const updatedProducts = products.map(prod => {
          const received = receivedItems.find(r => r.productId === prod.id);
          if(received && received.quantity > 0) {
              adjustments.push({
                  productId: prod.id,
                  date: new Date().toISOString(),
                  quantity: received.quantity,
                  reason: `Received from PO #${po.id.slice(-6)}`
              });
              return { ...prod, stock: prod.stock + received.quantity };
          }
          return prod;
      });
      setProducts(updatedProducts);
      setInventoryAdjustments(prev => [...prev, ...adjustments]);

  }, [purchaseOrders, products, setPurchaseOrders, setProducts, setInventoryAdjustments]);


  if (!currentUser) {
    return <AuthForm businessName={businessName} users={users} onLogin={login} onSignup={signup} onGoBack={onGoBack} />;
  }
  
  const availableViews: View[] = currentUser.role === UserRole.Admin 
    ? ['dashboard', 'pos', 'inventory', 'reports', 'analysis', 'settings'] 
    : ['pos', 'reports', 'settings'];
  const currentViewIsValid = availableViews.includes(activeView);

  const deviceViewClasses = {
    mobile: 'max-w-sm mx-auto shadow-lg ring-1 ring-black/5 h-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700',
    tablet: 'max-w-3xl mx-auto shadow-lg ring-1 ring-black/5 h-full overflow-hidden rounded-xl border border-gray-300 dark:border-gray-700',
    desktop: 'w-full h-full',
  };

  return (
    <div className="h-screen p-0 sm:py-4 sm:px-8">
      <div className={`transition-all duration-300 ${deviceViewClasses[deviceView]}`}>
        <MainLayout
          currentUser={currentUser}
          businessName={businessName}
          onLogout={logout}
          products={products}
          sales={sales}
          inventoryAdjustments={inventoryAdjustments}
          users={users}
          purchaseOrders={purchaseOrders}
          activeView={currentViewIsValid ? activeView : availableViews[0]}
          setActiveView={setActiveView}
          processSale={processSale}
          addProduct={addProduct}
          updateProduct={updateProduct}
          deleteProduct={deleteProduct}
          receiveStock={receiveStock}
          adjustStock={adjustStock}
          addUser={addUser}
          updateUser={updateUser}
          deleteUser={deleteUser}
          addPurchaseOrder={addPurchaseOrder}
          updatePurchaseOrder={updatePurchaseOrder}
          receivePOItems={receivePOItems}
          theme={theme}
          setTheme={setTheme}
          inventoryViewState={inventoryViewState}
          onInventoryViewUpdate={handleInventoryViewUpdate}
          reportsViewState={reportsViewState}
          onReportsSalesViewUpdate={handleReportsSalesViewUpdate}
          onReportsProductsViewUpdate={handleReportsProductsViewUpdate}
          onReportsInventoryValuationViewUpdate={handleReportsInventoryValuationViewUpdate}
          usersViewState={usersViewState}
          onUsersViewUpdate={handleUsersViewUpdate}
          analysisViewState={analysisViewState}
          onAnalysisViewUpdate={handleAnalysisViewUpdate}
          poViewState={poViewState}
          onPOViewUpdate={handlePOViewUpdate}
          importProducts={importProducts}
          clearSales={clearSales}
          factoryReset={factoryReset}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          currency={currency}
          setCurrency={setCurrency}
          isSplitPaymentEnabled={isSplitPaymentEnabled}
          setIsSplitPaymentEnabled={setIsSplitPaymentEnabled}
          isChangeDueEnabled={isChangeDueEnabled}
          setIsChangeDueEnabled={setIsChangeDueEnabled}
          isIntegerCurrency={isIntegerCurrency}
          setIsIntegerCurrency={setIsIntegerCurrency}
          isTaxEnabled={isTaxEnabled}
          setIsTaxEnabled={setIsTaxEnabled}
          taxRate={taxRate}
          setTaxRate={setTaxRate}
          isDiscountEnabled={isDiscountEnabled}
          setIsDiscountEnabled={setIsDiscountEnabled}
          discountRate={discountRate}
          setDiscountRate={setDiscountRate}
          discountThreshold={discountThreshold}
          setDiscountThreshold={setDiscountThreshold}
          deviceView={deviceView}
          setDeviceView={setDeviceView}
        />
      </div>
    </div>
  );
};


const App: React.FC = () => {
    const [businessName, setBusinessName] = useLocalStorage<string | null>('ims-current-business', null);

    if (!businessName) {
        return <BusinessSelector onSelect={setBusinessName} />;
    }

    return <BusinessWorkspace key={businessName} businessName={businessName} onGoBack={() => setBusinessName(null)} />;
};

export default App;