import React, { useState, useCallback, FormEvent } from 'react';
import { Product, Sale, User, UserRole, View, InventoryAdjustment } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from './constants';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { DashboardIcon, POSIcon, InventoryIcon, ReportsIcon, UserIcon, LogoutIcon } from './components/Icons';
import { Modal } from './components/common/Modal';

// AuthForm Component for Login/Signup
const AuthForm: React.FC<{
  onLogin: (username: string, pass: string) => boolean;
  onSignup: (username: string, pass: string) => boolean;
}> = ({ onLogin, onSignup }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    let success = false;
    if (isLogin) {
      success = onLogin(username, password);
      if (!success) setError('Invalid username or password.');
    } else {
      if (password.length < 4) {
        setError('Password must be at least 4 characters long.');
        return;
      }
      success = onSignup(username, password);
      if (!success) setError('Username already taken.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">IMS / POS System</h1>
          <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-6">{isLogin ? 'Login' : 'Sign Up'}</h2>
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
              {isLogin ? 'Login' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError('') }} className="font-medium text-blue-600 hover:underline">
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// MainLayout Component for the authenticated app view
const MainLayout: React.FC<{
  currentUser: User;
  onLogout: () => void;
  products: Product[];
  sales: Sale[];
  inventoryAdjustments: InventoryAdjustment[];
  activeView: View;
  setActiveView: (view: View) => void;
  processSale: (saleData: Omit<Sale, 'id' | 'date'>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (updatedProduct: Product) => void;
  receiveStock: (productId: string, quantity: number) => void;
  adjustStock: (productId: string, newStockLevel: number, reason: string) => void;
}> = (props) => {
  const { currentUser, onLogout, products, sales, inventoryAdjustments, activeView, setActiveView, ...rest } = props;
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard products={products} sales={sales} />;
      case 'pos': return <POS products={products} processSale={rest.processSale} />;
      case 'inventory': return <Inventory products={products} addProduct={rest.addProduct} updateProduct={rest.updateProduct} receiveStock={rest.receiveStock} adjustStock={rest.adjustStock} inventoryAdjustments={inventoryAdjustments} />;
      case 'reports': return <Reports sales={sales} products={products} />;
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
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex-col hidden md:flex">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">IMS / POS</h1>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {currentUser.role === UserRole.Admin && (
            <>
              <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />
              <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
              <NavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />
              <NavItem view="reports" icon={<ReportsIcon />} label="Reports" />
            </>
          )}
           {currentUser.role === UserRole.Cashier && (
            <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
           )}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full"><UserIcon /></div>
                <div>
                    <p className="font-semibold text-sm">{currentUser.username}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                </div>
            </div>
            <button onClick={onLogout} className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500">
                <LogoutIcon />
                <span>Logout</span>
            </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{renderView()}</main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around shadow-lg">
        {currentUser.role === UserRole.Admin && (
          <>
            <BottomNavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />
            <BottomNavItem view="pos" icon={<POSIcon />} label="POS" />
            <BottomNavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />
            <BottomNavItem view="reports" icon={<ReportsIcon />} label="Reports" />
          </>
        )}
        {currentUser.role === UserRole.Cashier && <BottomNavItem view="pos" icon={<POSIcon />} label="Point of Sale" />}
        <BottomNavItem icon={<UserIcon />} label="Profile" onClick={() => setIsSettingsModalOpen(true)} />
      </nav>
      
      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="User Profile">
        <div className="p-4 flex flex-col items-center space-y-4">
            <div className="p-3 bg-gray-200 dark:bg-gray-600 rounded-full"><UserIcon /></div>
            <div className="text-center">
                <p className="font-semibold text-lg">{currentUser.username}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser.role}</p>
            </div>
            <button onClick={() => { onLogout(); setIsSettingsModalOpen(false); }} className="w-full max-w-xs mt-4 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600">
                <LogoutIcon />
                <span>Logout</span>
            </button>
        </div>
      </Modal>
    </div>
  );
};


// App Component - manages state and auth logic
const App: React.FC = () => {
  const [products, setProducts] = useLocalStorage<Product[]>('ims-products', INITIAL_PRODUCTS);
  const [sales, setSales] = useLocalStorage<Sale[]>('ims-sales', []);
  const [inventoryAdjustments, setInventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('ims-adjustments', []);
  const [activeView, setActiveView] = useState<View>('dashboard');

  const [users, setUsers] = useLocalStorage<User[]>('ims-users', [{ id: 'user_admin_01', username: 'admin', password: 'password', role: UserRole.Admin }]);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('ims-currentUser', null);

  const login = (username: string, pass: string): boolean => {
    const user = users.find(u => u.username === username && u.password === pass);
    if (user) {
      setCurrentUser(user);
      setActiveView(user.role === UserRole.Cashier ? 'pos' : 'dashboard');
      return true;
    }
    return false;
  };

  const signup = (username: string, pass: string): boolean => {
    if (users.some(u => u.username === username)) {
      return false; // Username exists
    }
    const newUser: User = {
      id: `user_${Date.now()}`,
      username,
      // FIX: Correctly assign the 'pass' parameter to the 'password' property.
      password: pass,
      role: UserRole.Cashier // Default role for new users
    };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    setActiveView('pos');
    return true;
  };
  
  const logout = () => setCurrentUser(null);

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    setProducts(prev => [...prev, { ...product, id: `prod_${Date.now()}` }]);
  }, [setProducts]);

  const updateProduct = useCallback((updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  }, [setProducts]);

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

  const processSale = useCallback((saleData: Omit<Sale, 'id' | 'date'>) => {
    const newSale: Sale = { ...saleData, id: `sale_${Date.now()}`, date: new Date().toISOString() };
    setSales(prev => [newSale, ...prev]);
    
    const adjustments: InventoryAdjustment[] = newSale.items.map(cartItem => ({
        productId: cartItem.id,
        date: newSale.date,
        quantity: -cartItem.quantity,
        reason: `Sale #${newSale.id.slice(-8)}`
    }));
    setInventoryAdjustments(prev => [...prev, ...adjustments]);

    setProducts(prevProducts => {
      const updatedProducts = [...prevProducts];
      newSale.items.forEach(cartItem => {
        const productIndex = updatedProducts.findIndex(p => p.id === cartItem.id);
        if (productIndex !== -1) {
          updatedProducts[productIndex].stock -= cartItem.quantity;
        }
      });
      return updatedProducts;
    });
  }, [setSales, setProducts, setInventoryAdjustments]);

  if (!currentUser) {
    return <AuthForm onLogin={login} onSignup={signup} />;
  }

  return (
    <MainLayout
      currentUser={currentUser}
      onLogout={logout}
      products={products}
      sales={sales}
      inventoryAdjustments={inventoryAdjustments}
      activeView={activeView}
      setActiveView={setActiveView}
      processSale={processSale}
      addProduct={addProduct}
      updateProduct={updateProduct}
      receiveStock={receiveStock}
      adjustStock={adjustStock}
    />
  );
};

export default App;