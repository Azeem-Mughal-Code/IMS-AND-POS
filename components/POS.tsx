import React, { useState, useMemo } from 'react';
import { Product, CartItem, PaymentType, Sale } from '../types';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon } from './Icons';
import { Modal } from './common/Modal';
import { TAX_RATE } from '../constants';

interface POSProps {
  products: Product[];
  processSale: (sale: Omit<Sale, 'id' | 'date'>) => Sale;
}

const formatCurrency = (amount: number) => {
  const value = amount.toFixed(2);
  return amount < 0 ? `-${formatCurrency(-amount)}` : `$${value}`;
}

export const POS: React.FC<POSProps> = ({ products, processSale }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [mode, setMode] = useState<'Sale' | 'Return'>('Sale');

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [searchTerm, products]);
  
  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        const canAdd = mode === 'Return' || existingItem.quantity < product.stock;
        if (canAdd) {
            return prevCart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
        }
        return prevCart;
      }
      const canAdd = mode === 'Return' || product.stock > 0;
      if (canAdd) {
        return [...prevCart, { ...product, quantity: 1 }];
      }
      return prevCart;
    });
    setSearchTerm('');
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          const canUpdate = mode === 'Return' || (newQuantity > 0 && newQuantity <= item.stock);
          if (canUpdate) {
            return { ...item, quantity: newQuantity };
          }
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };
  
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    if (mode === 'Return') {
        return { subtotal: -subtotal, tax: -tax, total: -total };
    }
    return { subtotal, tax, total };
  }, [cart, mode]);

  const handleCompleteSale = (paymentType: PaymentType) => {
    const cogs = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
    const signedCogs = mode === 'Return' ? -cogs : cogs;
    
    const sale: Omit<Sale, 'id' | 'date'> = {
      items: cart,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      cogs: signedCogs,
      profit: totals.total - signedCogs,
      paymentType,
      type: mode,
    };
    
    const newSale = processSale(sale);
    
    setLastSale(newSale);
    setCart([]);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
  };
  
  const startNewSale = () => {
    setIsReceiptModalOpen(false);
    setLastSale(null);
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-100 dark:bg-gray-900">
      {/* Left side: Product Search & Cart */}
      <div className="w-full md:w-3/5 p-4 flex flex-col">
        <div className="flex mb-4 rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
            <button 
                onClick={() => { setMode('Sale'); setCart([]); }}
                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'Sale' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
                Sale
            </button>
            <button 
                onClick={() => { setMode('Return'); setCart([]); }}
                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'Return' ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
                Return
            </button>
        </div>
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Scan barcode or search product..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(p => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{formatCurrency(p.retailPrice)}</span>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-gray-500">No products found</div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-grow bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-center">Quantity</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {cart.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"><MinusIcon /></button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"><PlusIcon /></button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 dark:text-gray-200">{formatCurrency(item.retailPrice)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">{formatCurrency(item.retailPrice * item.quantity)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cart.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <p>Cart is empty</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Right side: Totals & Payment */}
      <div className="w-full md:w-2/5 p-4 flex flex-col">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex-grow flex flex-col">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">{mode === 'Sale' ? 'Order Summary' : 'Return Summary'}</h2>
          <div className="space-y-3 text-lg flex-grow">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
              <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">Tax ({ (TAX_RATE * 100).toFixed(0) }%)</span>
              <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(totals.tax)}</span>
            </div>
             <div className="flex justify-between text-2xl font-bold pt-4 border-t border-gray-200 dark:border-gray-600">
              <span className="text-gray-800 dark:text-white">Total</span>
              <span className={`${mode === 'Sale' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(totals.total)}</span>
            </div>
          </div>
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.length === 0}
            className={`w-full text-white font-bold py-4 rounded-lg text-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${mode === 'Sale' ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'}`}
          >
            {mode === 'Sale' ? 'PAY' : 'REFUND'}
          </button>
        </div>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Select Payment Method">
        <div className="space-y-4">
            <p className="text-center text-3xl font-bold text-gray-800 dark:text-white">{formatCurrency(totals.total)}</p>
            <div className="grid grid-cols-1 gap-4">
                <button onClick={() => handleCompleteSale(PaymentType.Cash)} className="w-full py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">Cash</button>
                <button onClick={() => handleCompleteSale(PaymentType.Card)} className="w-full py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600">Card</button>
                <button onClick={() => handleCompleteSale(PaymentType.Other)} className="w-full py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600">Other</button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={isReceiptModalOpen} onClose={startNewSale} title={`${lastSale?.type} Receipt - ${lastSale?.id.slice(-8)}`}>
        {lastSale && (
          <div className="printable-area">
            <div className="space-y-4 text-sm">
                <p>Date: {new Date(lastSale.date).toLocaleString()}</p>
                <div className="border-t border-b py-2 border-gray-200 dark:border-gray-600">
                    {lastSale.items.map(item => (
                        <div key={item.id} className="flex justify-between">
                            <span>{item.name} x{item.quantity}</span>
                            <span>{formatCurrency(item.retailPrice * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                 <div className="space-y-1 font-medium">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(lastSale.subtotal)}</span></div>
                    <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(lastSale.tax)}</span></div>
                    <div className="flex justify-between text-lg font-bold"><span>Total:</span> <span>{formatCurrency(lastSale.total)}</span></div>
                </div>
                <p>Payment: {lastSale.paymentType}</p>
                 <div className="flex justify-end gap-2 pt-4 no-print">
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                    <button onClick={startNewSale} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">New Transaction</button>
                </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};