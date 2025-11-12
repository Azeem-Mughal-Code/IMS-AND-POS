import React, { useMemo } from 'react';
import { Product, Sale } from '../types';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
}

const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

export const Reports: React.FC<ReportsProps> = ({ sales, products }) => {

  const totalSales = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, sale) => sum + sale.profit, 0), [sales]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">Total Sales</h2>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalSales)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">Total Profit</h2>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalProfit)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 p-4">Sales History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Sale ID</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Items</th>
                <th scope="col" className="px-6 py-3">Total</th>
                <th scope="col" className="px-6 py-3">Profit</th>
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{s.id.slice(-8)}</td>
                  <td className="px-6 py-4">{new Date(s.date).toLocaleString()}</td>
                  <td className="px-6 py-4">{s.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td className="px-6 py-4">{formatCurrency(s.total)}</td>
                  <td className="px-6 py-4">{formatCurrency(s.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 p-4">Stock Levels</h2>
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">SKU</th>
                <th scope="col" className="px-6 py-3">Name</th>
                <th scope="col" className="px-6 py-3">Stock</th>
                <th scope="col" className="px-6 py-3">Low Stock Threshold</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.sku}</td>
                  <td className="px-6 py-4">{p.name}</td>
                  <td className="px-6 py-4">{p.stock}</td>
                  <td className="px-6 py-4">{p.lowStockThreshold}</td>
                  <td className="px-6 py-4">
                    {p.stock <= 0 ? 
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Out of Stock</span> :
                    p.stock <= p.lowStockThreshold ?
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Low Stock</span> :
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">In Stock</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
