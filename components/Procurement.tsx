
import React, { useState } from 'react';
import { PurchaseOrdersView } from './inventory/PurchaseOrdersView';
import { SuppliersView } from './inventory/SuppliersView';

export const Procurement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'purchaseOrders' | 'suppliers'>('purchaseOrders');

  const TabButton: React.FC<{ tabId: 'purchaseOrders' | 'suppliers', label: string }> = ({ tabId, label }) => (
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
    <div className="p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Procurement</h1>
      </div>

       <div className="mb-6 flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start overflow-x-auto">
            <div className="flex items-center space-x-1">
                <TabButton tabId="purchaseOrders" label="Purchase Orders" />
                <TabButton tabId="suppliers" label="Suppliers" />
            </div>
        </div>
      
      {activeTab === 'purchaseOrders' && <PurchaseOrdersView />}
      {activeTab === 'suppliers' && <SuppliersView />}
    </div>
  );
};
