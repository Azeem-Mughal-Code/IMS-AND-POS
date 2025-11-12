import React, { useState, useCallback } from 'react';
import { Product, Sale, UserRole, View, InventoryAdjustment } from './types';
import useLocalStorage from './hooks/useLocalStorage';
import { INITIAL_PRODUCTS } from './constants';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { Reports } from './components/Reports';
import { DashboardIcon, POSIcon, InventoryIcon, ReportsIcon } from './components/Icons';

const App: React.FC = () => {
  const [products, setProducts] = useLocalStorage<Product[]>('ims-products', INITIAL_PRODUCTS);
  const [sales, setSales] = useLocalStorage<Sale[]>('ims-sales', []);
  const [inventoryAdjustments, setInventoryAdjustments] = useLocalStorage<InventoryAdjustment[]>('ims-adjustments', []);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.Admin);
  const [activeView, setActiveView] = useState<View>('dashboard');

  const addProduct = useCallback((product: Omit<Product, 'id'>) => {
    setProducts(prev => [...prev, { ...product, id: `prod_${Date.now()}` }]);
  }, [setProducts]);

  const updateProduct = useCallback((updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  }, [setProducts]);

  const receiveStock = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) return;
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: p.stock + quantity } : p));
    setInventoryAdjustments(prev => [...prev, {
      productId,
      date: new Date().toISOString(),
      quantity: quantity,
      reason: 'Stock Received'
    }]);
  }, [setProducts, setInventoryAdjustments]);

  const adjustStock = useCallback((productId: string, newStockLevel: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const change = newStockLevel - product.stock;
    if (change === 0) return;

    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStockLevel } : p));
    setInventoryAdjustments(prev => [...prev, {
        productId,
        date: new Date().toISOString(),
        quantity: change,
        reason: reason || 'Manual Adjustment'
    }]);
  }, [products, setProducts, setInventoryAdjustments]);

  const processSale = useCallback((saleData: Omit<Sale, 'id' | 'date'>) => {
    const newSale: Sale = {
      ...saleData,
      id: `sale_${Date.now()}`,
      date: new Date().toISOString()
    };
    setSales(prev => [newSale, ...prev]);
    
    const adjustments: InventoryAdjustment[] = [];
    newSale.items.forEach(cartItem => {
        adjustments.push({
            productId: cartItem.id,
            date: newSale.date,
            quantity: -cartItem.quantity,
            reason: `Sale #${newSale.id.slice(-8)}`
        });
    });
    setInventoryAdjustments(prev => [...prev, ...adjustments]);


    // Update stock levels
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

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard products={products} sales={sales} />;
      case 'pos':
        return <POS products={products} processSale={processSale} />;
      case 'inventory':
        return <Inventory products={products} addProduct={addProduct} updateProduct={updateProduct} receiveStock={receiveStock} adjustStock={adjustStock} inventoryAdjustments={inventoryAdjustments} />;
      case 'reports':
        return <Reports sales={sales} products={products} />;
      default:
        return <Dashboard products={products} sales={sales} />;
    }
  };

  const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center space-x-3 p-3 rounded-lg w-full text-left transition-colors ${
        activeView === view
          ? 'bg-blue-600 text-white'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">IMS / POS</h1>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {userRole === UserRole.Admin && (
            <>
              <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />
              <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
              <NavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />
              <NavItem view="reports" icon={<ReportsIcon />} label="Reports" />
            </>
          )}
           {userRole === UserRole.Cashier && (
            <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
           )}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center cursor-pointer">
            <span className="mr-3 text-sm font-medium">{userRole}</span>
            <div className="relative">
              <input type="checkbox" id="role-toggle" className="sr-only" checked={userRole === UserRole.Admin} onChange={() => {
                setUserRole(prev => prev === UserRole.Admin ? UserRole.Cashier : UserRole.Admin);
                setActiveView(userRole === UserRole.Admin ? 'pos' : 'dashboard');
              }} />
              <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
              <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
            </div>
          </label>
           <style>{`
             input:checked ~ .dot {
              transform: translateX(100%);
              background-color: #48bb78;
             }
           `}</style>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
