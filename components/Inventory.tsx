import React, { useState, useMemo } from 'react';
import { useAppContext } from './context/AppContext';
import { ProductsView } from './inventory/ProductsView';
import { PurchaseOrdersView } from './inventory/PurchaseOrdersView';
import { InventoryValuationView } from './inventory/InventoryValuationView';
import { UserRole } from '../types';

export const Inventory: React.FC = () => {
  const { currentUser, verticalPadding, horizontalPadding } = useAppContext();
  const [activeTab, setActiveTab] = useState<'products' | 'purchaseOrders' | 'valuation'>('products');

  const paddingClass = useMemo(() => {
    const verticalPaddingMap = {
        xs: 'py-2',
        sm: 'py-3',
        md: 'py-6',
        lg: 'py-9',
        xl: 'py-12',
    };
    const horizontalPaddingMap = {
        xs: 'px-2',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8',
        xl: 'px-10',
    };
    return `${verticalPaddingMap[verticalPadding]} ${horizontalPaddingMap[horizontalPadding]}`;
  }, [verticalPadding, horizontalPadding]);

  const TabButton: React.FC<{ tabId: 'products' | 'purchaseOrders' | 'valuation', label: string }> = ({ tabId, label }) => (
    <button
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            activeTab === tabId
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
  );

  return (
    <div className={paddingClass}>
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
      </div>

       <div className="mb-6 flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start">
            <div className="flex items-center space-x-1">
                <TabButton tabId="products" label="Products" />
                <TabButton tabId="purchaseOrders" label="Purchase Orders" />
                {currentUser.role === UserRole.Admin && <TabButton tabId="valuation" label="Valuation" />}
            </div>
        </div>
      
      {activeTab === 'products' && <ProductsView />}
      {activeTab === 'purchaseOrders' && <PurchaseOrdersView />}
      {activeTab === 'valuation' && currentUser.role === UserRole.Admin && <InventoryValuationView />}
    </div>
  );
};