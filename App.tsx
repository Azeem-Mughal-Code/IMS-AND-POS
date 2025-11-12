import React, { useState, useCallback, FormEvent, useEffect, useRef } from 'react';
import { Product, Sale, User, UserRole, View, InventoryAdjustment } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from './constants';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { UserSettings } from './components/UserSettings';
import { DashboardIcon, POSIcon, InventoryIcon, ReportsIcon, UsersIcon, UserIcon, LogoutIcon, SettingsIcon, SunIcon, MoonIcon, ComputerDesktopIcon, ChevronDownIcon } from './components/Icons';
import { Modal } from './components/common/Modal';

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

// MainLayout Component for the authenticated app view
const MainLayout: React.FC<{
  currentUser: User;
  businessName: string;
  onLogout: () => void;
  products: Product[];
  sales: Sale[];
  inventoryAdjustments: InventoryAdjustment[];
  users: User[];
  activeView: View;
  setActiveView: (view: View) => void;
  processSale: (saleData: Omit<Sale, 'id' | 'date'>) => Sale;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (updatedProduct: Product) => void;
  receiveStock: (productId: string, quantity: number) => void;
  adjustStock: (productId: string, newStockLevel: number, reason: string) => void;
  addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
  updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
  deleteUser: (userId: string) => { success: boolean, message?: string };
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}> = (props) => {
  const { currentUser, businessName, onLogout, products, sales, inventoryAdjustments, users, activeView, setActiveView, updateUser, theme, setTheme, ...rest } = props;
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  
  const [profileUsername, setProfileUsername] = useState(currentUser.username);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen && !isEditProfileModalOpen && !isThemeModalOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen, isEditProfileModalOpen, isThemeModalOpen]);

  useEffect(() => {
    if (isEditProfileModalOpen) {
      setProfileUsername(currentUser.username);
      setProfilePassword('');
      setProfileConfirmPassword('');
      setProfileError('');
      setProfileSuccess('');
    }
  }, [isEditProfileModalOpen, currentUser.username]);

  const handleProfileUpdate = () => {
    setProfileError('');
    setProfileSuccess('');

    if (profilePassword && profilePassword.length < 4) {
      setProfileError("New password must be at least 4 characters long.");
      return;
    }

    if (profilePassword !== profileConfirmPassword) {
        setProfileError("Passwords do not match.");
        return;
    }
    
    const result = updateUser(currentUser.id, profileUsername, profilePassword);
    
    if (result.success) {
        setProfileSuccess("Profile updated successfully!");
        setProfilePassword('');
        setProfileConfirmPassword('');
    } else {
        setProfileError(result.message || "Failed to update profile.");
    }
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard products={products} sales={sales} />;
      case 'pos': return <POS products={products} sales={sales} processSale={rest.processSale} />;
      case 'inventory': return <Inventory products={products} addProduct={rest.addProduct} updateProduct={rest.updateProduct} receiveStock={rest.receiveStock} adjustStock={rest.adjustStock} inventoryAdjustments={inventoryAdjustments} currentUser={currentUser} />;
      case 'reports': return <Reports sales={sales} products={products} currentUser={currentUser} processSale={rest.processSale} />;
      case 'users':
        if (currentUser.role === UserRole.Admin) {
            return <UserSettings users={users} currentUser={currentUser} addUser={rest.addUser} deleteUser={rest.deleteUser} />;
        }
        return <div className="p-6"><p>Access Denied. You must be an admin to view this page.</p></div>;
      default: return <Dashboard products={products} sales={sales} />;
    }
  };

  const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button onClick={() => setActiveView(view)} className={`flex items-center space-x-3 p-3 rounded-lg w-full text-left transition-colors ${activeView === view ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  const BottomNavItem: React.FC<{ view?: View; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ view, icon, label, onClick }) => (
    <button onClick={onClick ?? (() => view && setActiveView(view))} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors ${activeView === view ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6' })}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  const ThemeSelector: React.FC<{ theme: 'light' | 'dark' | 'system', setTheme: (theme: 'light' | 'dark' | 'system') => void }> = ({ theme, setTheme }) => {
    const options = [
        { value: 'light', label: 'Light', icon: <SunIcon /> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon /> }
    ];

    return (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className={`flex flex-col items-center justify-center p-2 rounded-md text-sm font-medium transition-colors ${
                        theme === option.value
                            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {option.icon}
                    <span className="mt-1">{option.label}</span>
                </button>
            ))}
        </div>
    );
};


  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate">{businessName}</h1>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {currentUser.role === UserRole.Admin && <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />}
          <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
          {currentUser.role === UserRole.Admin && <NavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />}
          <NavItem view="reports" icon={<ReportsIcon />} label="Reports" />
          {currentUser.role === UserRole.Admin && <NavItem view="users" icon={<UsersIcon />} label="Users" />}
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
                            <button onClick={() => setIsEditProfileModalOpen(true)} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <UserIcon className="h-5 w-5" /> <span>Edit Profile</span>
                            </button>
                            <button onClick={() => setIsThemeModalOpen(true)} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <SettingsIcon className="h-5 w-5" /> <span>Change Theme</span>
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
        {currentUser.role === UserRole.Admin && <BottomNavItem view="users" icon={<UsersIcon />} label="Users" />}
        <BottomNavItem icon={<SettingsIcon />} label="Settings" onClick={() => setIsMobileSettingsOpen(true)} />
      </nav>
      
      <Modal isOpen={isMobileSettingsOpen} onClose={() => setIsMobileSettingsOpen(false)} title="Settings" size="sm">
          <div className="space-y-2">
              <button onClick={() => setIsEditProfileModalOpen(true)} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <UserIcon className="h-6 w-6" /> <span>Edit Profile</span>
              </button>
              <button onClick={() => setIsThemeModalOpen(true)} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <SettingsIcon className="h-6 w-6" /> <span>Change Theme</span>
              </button>
              <div className="my-2 h-px bg-gray-200 dark:bg-gray-600"></div>
              <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 dark:hover:bg-opacity-50">
                  <LogoutIcon className="h-6 w-6" /> <span>Logout</span>
              </button>
          </div>
      </Modal>

      <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Edit Profile" size="md">
         <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input type="text" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password (optional)</label>
                <input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Leave blank to keep current" className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <input type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            {profileError && <p className="text-red-500 text-sm text-center mt-2">{profileError}</p>}
            {profileSuccess && <p className="text-green-500 text-sm text-center mt-2">{profileSuccess}</p>}
         </div>
        <div className="flex justify-end items-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 gap-2">
            <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
            <button type="button" onClick={handleProfileUpdate} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
        </div>
      </Modal>

      <Modal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} title="Change Theme" size="sm">
        <ThemeSelector theme={theme} setTheme={setTheme} />
        <div className="flex justify-end pt-6 mt-2">
            <button type="button" onClick={() => setIsThemeModalOpen(false)} className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Done</button>
        </div>
      </Modal>
    </div>
  );
};


const BusinessWorkspace: React.FC<{ businessName: string, onGoBack: () => void }> = ({ businessName, onGoBack }) => {
  const ls_prefix = `ims-${businessName}`;
  const [products, setProducts] = useLocalStorage<Product[]>(`${ls_prefix}-products`, INITIAL_PRODUCTS);
  const [sales, setSales] = useLocalStorage<Sale[]>(`${ls_prefix}-sales`, []);
  const [inventoryAdjustments, setInventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>(`${ls_prefix}-adjustments`, []);
  const [users, setUsers] = useLocalStorage<User[]>(`${ls_prefix}-users`, []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`${ls_prefix}-currentUser`, null);
  
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>('ims-theme', 'system');

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
    const itemsWithDefaults = saleData.type === 'Sale' 
        ? saleData.items.map(item => ({...item, returnedQuantity: 0}))
        : saleData.items;

    const newSale: Sale = {
        ...saleData,
        id: `sale_${Date.now()}`,
        date: new Date().toISOString(),
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
  }, [setSales, setProducts, setInventoryAdjustments]);

  if (!currentUser) {
    return <AuthForm businessName={businessName} users={users} onLogin={login} onSignup={signup} onGoBack={onGoBack} />;
  }
  
  const availableViews: View[] = currentUser.role === UserRole.Admin 
    ? ['dashboard', 'pos', 'inventory', 'reports', 'users'] 
    : ['pos', 'reports'];
  const currentViewIsValid = availableViews.includes(activeView);

  return (
    <MainLayout
      currentUser={currentUser}
      businessName={businessName}
      onLogout={logout}
      products={products}
      sales={sales}
      inventoryAdjustments={inventoryAdjustments}
      users={users}
      activeView={currentViewIsValid ? activeView : availableViews[0]}
      setActiveView={setActiveView}
      processSale={processSale}
      addProduct={addProduct}
      updateProduct={updateProduct}
      receiveStock={receiveStock}
      adjustStock={adjustStock}
      addUser={addUser}
      updateUser={updateUser}
      deleteUser={deleteUser}
      theme={theme}
      setTheme={setTheme}
    />
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