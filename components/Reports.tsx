import React, { useMemo, useState, useEffect } from 'react';
import { Product, Sale, User, UserRole } from '../types';
import { Modal } from './common/Modal';
import { TAX_RATE } from '../constants';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  currentUser: User;
  processSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
}

const formatCurrency = (amount: number) => {
    const value = Math.abs(amount).toFixed(2);
    return amount < 0 ? `-$${value}`: `$${value}`;
}

export const Reports: React.FC<ReportsProps> = ({ sales, products, currentUser, processSale }) => {
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleRefund = () => {
    if (!viewingSale || viewingSale.type !== 'Sale' || viewingSale.status === 'Refunded') return;

    const subtotal = viewingSale.items.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const cogs = viewingSale.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

    const refundTransaction: Omit<Sale, 'id' | 'date'> = {
        items: viewingSale.items,
        subtotal: -subtotal,
        tax: -tax,
        total: -total,
        cogs: -cogs,
        profit: (-total) - (-cogs),
        paymentType: viewingSale.paymentType,
        type: 'Return',
        originalSaleId: viewingSale.id,
    };

    try {
        processSale(refundTransaction);
        setStatusMessage({ type: 'success', text: `Successfully refunded sale ${viewingSale.id.slice(-8)}.` });
    } catch (e) {
        setStatusMessage({ type: 'error', text: 'An error occurred while processing the refund.' });
    } finally {
        setViewingSale(null);
    }
  };

  const totalSales = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, sale) => sum + sale.profit, 0), [sales]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reports</h1>

      {statusMessage && (
        <div className={`border px-4 py-3 rounded relative mb-4 ${statusMessage.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`} role="alert">
          <span className="block sm:inline">{statusMessage.text}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setStatusMessage(null)}>
            <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
      )}

      {currentUser.role === UserRole.Admin && (
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
      )}


      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 p-4">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">ID</th>
                <th scope="col" className="px-6 py-3">Date</th>
                <th scope="col" className="px-6 py-3">Type</th>
                <th scope="col" className="px-6 py-3">Items</th>
                <th scope="col" className="px-6 py-3">Total</th>
                {currentUser.role === UserRole.Admin && <th scope="col" className="px-6 py-3">Profit</th>}
              </tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{s.id.slice(-8)}</td>
                  <td className="px-6 py-4">{new Date(s.date).toLocaleString()}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${s.type === 'Return' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                        {s.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => setViewingSale(s)} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      {s.items.reduce((sum, item) => sum + item.quantity, 0)}
                    </button>
                  </td>
                  <td className="px-6 py-4">{formatCurrency(s.total)}</td>
                  {currentUser.role === UserRole.Admin && <td className="px-6 py-4">{formatCurrency(s.profit)}</td>}
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

      <Modal isOpen={!!viewingSale} onClose={() => setViewingSale(null)} title={`${viewingSale?.type} Details - ${viewingSale?.id.slice(-8)}`} size="md">
        {viewingSale && (
            <div className="printable-area">
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="font-semibold text-gray-800 dark:text-gray-200">Date:</span> {new Date(viewingSale.date).toLocaleString()}</p>
                    <div className="border-t border-b py-2 my-2 border-gray-200 dark:border-gray-600">
                        <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Items</h4>
                        {viewingSale.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center mb-1">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                    <p className="text-gray-500 dark:text-gray-400">{item.quantity} &times; {formatCurrency(item.retailPrice)}</p>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.retailPrice * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-1 font-medium text-gray-800 dark:text-gray-200">
                        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(viewingSale.subtotal)}</span></div>
                        <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(viewingSale.tax)}</span></div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white"><span>Total:</span> <span>{formatCurrency(viewingSale.total)}</span></div>
                    </div>
                    <p><span className="font-semibold text-gray-800 dark:text-gray-200">Payment:</span> {viewingSale.paymentType}</p>
                </div>
                 <div className="flex justify-end gap-2 pt-4 no-print">
                    {viewingSale.type === 'Sale' ? (
                      viewingSale.status === 'Refunded' ? (
                        <span className="px-4 py-2 bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md cursor-not-allowed">Refunded</span>
                      ) : (
                        <button onClick={handleRefund} className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600">Refund</button>
                      )
                    ) : null}
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                    <button onClick={() => setViewingSale(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};