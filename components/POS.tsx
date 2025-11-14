import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CartItem, PaymentType, Sale, User, Payment } from '../types';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon, PhotoIcon } from './Icons';
import { Modal } from './common/Modal';

declare var html2canvas: any;

interface POSProps {
  products: Product[];
  sales: Sale[];
  processSale: (sale: Omit<Sale, 'id' | 'date'>) => Sale;
  currency: string;
  currentUser: User;
  isSplitPaymentEnabled: boolean;
  isChangeDueEnabled: boolean;
  isIntegerCurrency: boolean;
  isTaxEnabled: boolean;
  taxRate: number;
  isDiscountEnabled: boolean;
  discountRate: number;
  discountThreshold: number;
  businessName: string;
}

const SimplePaymentModalContent: React.FC<{
    total: number;
    onCompleteSale: (payments: Payment[]) => void;
    onClose: () => void;
    currency: string;
    isChangeDueEnabled: boolean;
    isIntegerCurrency: boolean;
}> = ({ total, onCompleteSale, onClose, currency, isChangeDueEnabled, isIntegerCurrency }) => {
    // Default amount tendered to total, especially important when change is disabled.
    const [amountTendered, setAmountTendered] = useState(total.toFixed(2));

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: isIntegerCurrency ? 0 : 2,
      maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount);

    const numericAmountTendered = parseFloat(amountTendered) || 0;
    // Calculate change only if enabled, otherwise it's 0.
    const changeDue = isChangeDueEnabled && numericAmountTendered > total ? numericAmountTendered - total : 0;
    // Can complete if change is enabled and amount is sufficient, OR if change is disabled (exact amount).
    const canComplete = isChangeDueEnabled ? numericAmountTendered >= total : true;

    const handlePayment = (type: PaymentType) => {
        if (!canComplete) return;
        // Use the entered amount if change is enabled, otherwise use the exact total.
        const paymentAmount = isChangeDueEnabled ? numericAmountTendered : total;
        const payments: Payment[] = [{ type, amount: paymentAmount }];
        onCompleteSale(payments);
    };


    return (
        <div className="space-y-4">
            <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-300">Total Due</p>
                <p className="text-5xl font-bold text-gray-800 dark:text-white">{formatCurrency(total)}</p>
            </div>

            <div className="pt-4 border-t">
                 {isChangeDueEnabled && (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Tendered</label>
                            <input 
                                type="number"
                                value={amountTendered}
                                onChange={(e) => setAmountTendered(e.target.value)}
                                placeholder="Amount"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                            />
                        </div>
                        
                        <div className="flex justify-between text-xl font-semibold mb-4">
                            <span>Change Due:</span>
                            <span className="text-green-500">{formatCurrency(changeDue)}</span>
                        </div>
                    </>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <button onClick={() => handlePayment(PaymentType.Cash)} disabled={!canComplete} className="w-full py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-blue-300">Cash</button>
                    <button onClick={() => handlePayment(PaymentType.Card)} disabled={!canComplete} className="w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300">Card</button>
                    <button onClick={() => handlePayment(PaymentType.Other)} disabled={!canComplete} className="w-full py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-300">Other</button>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
            </div>
        </div>
    );
};


const PaymentModalContent: React.FC<{
    total: number,
    onCompleteSale: (payments: Payment[]) => void,
    onClose: () => void,
    currency: string,
    isChangeDueEnabled: boolean,
    isIntegerCurrency: boolean
}> = ({ total, onCompleteSale, onClose, currency, isChangeDueEnabled, isIntegerCurrency }) => {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [currentAmount, setCurrentAmount] = useState('');

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: isIntegerCurrency ? 0 : 2,
      maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount);

    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
    const remaining = total - totalPaid;
    const change = isChangeDueEnabled && totalPaid > total ? totalPaid - total : 0;
    const canComplete = totalPaid >= total;
    
    useEffect(() => {
        // Set initial amount to total due
        if (total > 0) {
            setCurrentAmount(total.toFixed(2));
        }
    }, [total]);

    const addPayment = (type: PaymentType) => {
        let amount = parseFloat(currentAmount);
        if (isNaN(amount) || amount <= 0) return;

        // If change is disabled, cap amount at remaining.
        // The check is now more robust to prevent capping on subsequent payments when change is enabled.
        if (!isChangeDueEnabled && amount > remaining) {
            amount = remaining;
        }

        if (amount > 0.005) { // Check for amounts bigger than half a cent
            setPayments(prev => [...prev, { type, amount }]);
            const newRemaining = remaining - amount;
            setCurrentAmount(newRemaining > 0 ? newRemaining.toFixed(2) : '');
        }
    };

    const removePayment = (index: number) => {
        const paymentToRemove = payments[index];
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
        const newTotalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
        setCurrentAmount((total - newTotalPaid).toFixed(2));
    };

    return (
        <div className="space-y-4">
            <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-300">Total Due</p>
                <p className="text-5xl font-bold text-gray-800 dark:text-white">{formatCurrency(total)}</p>
            </div>
            
            {payments.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Payments Applied:</h3>
                    {payments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                            <span className="font-medium">{p.type}: {formatCurrency(p.amount)}</span>
                            <button onClick={() => removePayment(i)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon /></button>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-4 border-t">
                 {remaining > 0 ? (
                    <div className="flex justify-between text-xl font-semibold mb-4">
                        <span>Remaining:</span>
                        <span className="text-red-500">{formatCurrency(remaining)}</span>
                    </div>
                ) : isChangeDueEnabled ? (
                    <div className="flex justify-between text-xl font-semibold mb-4">
                        <span>Change Due:</span>
                        <span className="text-green-500">{formatCurrency(change)}</span>
                    </div>
                ) : (
                    <div className="flex justify-between text-xl font-semibold mb-4">
                        <span>Remaining:</span>
                        <span className="text-green-500">{formatCurrency(0)}</span>
                    </div>
                )}


                <div className="flex items-center gap-2">
                     <input 
                        type="number"
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(e.target.value)}
                        placeholder="Amount"
                        className="flex-grow block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                     />
                     <button onClick={() => setCurrentAmount(remaining.toFixed(2))} disabled={remaining <= 0} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">
                         Full
                     </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <button onClick={() => addPayment(PaymentType.Cash)} className="w-full py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-blue-300" disabled={remaining <= 0}>Cash</button>
                    <button onClick={() => addPayment(PaymentType.Card)} className="w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300" disabled={remaining <= 0}>Card</button>
                    <button onClick={() => addPayment(PaymentType.Other)} className="w-full py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-300" disabled={remaining <= 0}>Other</button>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="button" onClick={() => onCompleteSale(payments)} disabled={!canComplete} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400">Complete Sale</button>
            </div>
        </div>
    )
}


export const POS: React.FC<POSProps> = ({ products, sales, processSale, currency, currentUser, isSplitPaymentEnabled, isChangeDueEnabled, isIntegerCurrency, isTaxEnabled, taxRate, isDiscountEnabled, discountRate, discountThreshold, businessName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [mode, setMode] = useState<'Sale' | 'Return'>('Sale');
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnSearchTerm, setReturnSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'error', text: string } | null>(null);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const handleSaveAsImage = () => {
    if (printableAreaRef.current) {
        html2canvas(printableAreaRef.current, { 
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                clonedDoc.documentElement.classList.remove('dark');
            }
        }).then((canvas: HTMLCanvasElement) => {
            const PADDING = 20;
            const newCanvas = document.createElement('canvas');
            newCanvas.width = canvas.width + PADDING * 2;
            newCanvas.height = canvas.height + PADDING * 2;
            const ctx = newCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, newCanvas.width, newCanvas.height);
                ctx.drawImage(canvas, PADDING, PADDING);
            }

            const link = document.createElement('a');
            link.download = `receipt-${lastSale?.id}.png`;
            link.href = newCanvas.toDataURL('image/png');
            link.click();
        });
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isIntegerCurrency ? 0 : 2,
    maximumFractionDigits: isIntegerCurrency ? 0 : 2,
  }).format(amount);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);
  }, [searchTerm, products]);

  const switchMode = (newMode: 'Sale' | 'Return') => {
    setMode(newMode);
    setCart([]);
    setSearchTerm('');
    setSelectedSaleForReturn(null);
    setReturnSearchTerm('');
    setFeedback(null);
  };
  
  const addToCart = (product: Product) => {
    setFeedback(null);
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
            return prevCart.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
        }
        return prevCart;
      }
      if (product.stock > 0) {
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
          if (newQuantity > 0 && newQuantity <= item.stock) {
            return { ...item, quantity: newQuantity };
          }
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };
  
  const handleReturnQtyChange = (product: CartItem, returnQtyStr: string) => {
    const returnQty = parseInt(returnQtyStr, 10) || 0;
    const maxReturnable = product.quantity - (product.returnedQuantity || 0);
    const newReturnQty = Math.max(0, Math.min(returnQty, maxReturnable));

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (newReturnQty > 0) {
        if (existingItem) {
          return prevCart.map(item =>
            item.id === product.id ? { ...item, quantity: newReturnQty } : item
          );
        }
        return [...prevCart, { ...product, quantity: newReturnQty }];
      }
      return prevCart.filter(item => item.id !== product.id);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  }

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    
    if (mode === 'Return') {
        const tax = isTaxEnabled ? subtotal * taxRate : 0;
        const total = subtotal + tax;
        return { subtotal: -subtotal, tax: -tax, total: -total, discount: 0 };
    }

    const discount = (isDiscountEnabled && subtotal >= discountThreshold)
        ? subtotal * discountRate
        : 0;

    const taxableAmount = subtotal - discount;
    const tax = isTaxEnabled ? taxableAmount * taxRate : 0;
    const total = taxableAmount + tax;

    return { subtotal, discount, tax, total };
  }, [cart, mode, isTaxEnabled, taxRate, isDiscountEnabled, discountThreshold, discountRate]);

  const handleCompleteSale = (payments: Payment[]) => {
    const cogs = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
    const signedCogs = mode === 'Return' ? -cogs : cogs;
    
    const sale: Omit<Sale, 'id' | 'date'> = {
      items: cart,
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      total: totals.total,
      cogs: signedCogs,
      profit: totals.total - signedCogs,
      payments,
      type: mode,
      salespersonId: currentUser.id,
      salespersonName: currentUser.username,
      ...(mode === 'Return' && selectedSaleForReturn && { originalSaleId: selectedSaleForReturn.id })
    };
    
    try {
        const newSale = processSale(sale);
        
        setLastSale(newSale);
        setCart([]);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        if (mode === 'Return') {
          setSelectedSaleForReturn(null);
        }
    } catch (error) {
        if (error instanceof Error) {
            setFeedback({ type: 'error', text: error.message });
        } else {
            setFeedback({ type: 'error', text: 'An unknown error occurred while processing the sale.' });
        }
        setIsPaymentModalOpen(false);
    }
  };
  
  const startNewSale = () => {
    setIsReceiptModalOpen(false);
    setLastSale(null);
  }

  const returnableSales = useMemo(() => {
    return sales
      .filter(s => 
        s.type === 'Sale' && 
        s.status !== 'Refunded' &&
        (!returnSearchTerm || s.id.toLowerCase().includes(returnSearchTerm.toLowerCase()))
      )
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [sales, returnSearchTerm]);


  const renderSaleMode = () => (
    <>
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
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
                <div key={p.id} onClick={() => addToCart(p)} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between">
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
        {cart.length === 0 && ( <div className="text-center py-20 text-gray-500"><p>Cart is empty</p></div> )}
      </div>
    </>
  );

  const renderReturnMode = () => {
    if (!selectedSaleForReturn) {
      return (
        <>
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
            <input
              type="text"
              placeholder="Search by Receipt ID..."
              value={returnSearchTerm}
              onChange={e => setReturnSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-grow bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-y-auto">
             <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700 text-gray-800 dark:text-gray-200">Select a Sale to Return</h3>
             {returnableSales.length > 0 ? returnableSales.map(sale => (
               <div key={sale.id} onClick={() => setSelectedSaleForReturn(sale)} className="p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                 <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 dark:text-white truncate">Receipt ID: <span className="font-mono">{sale.id}</span></span>
                    <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</span>
                 </div>
                 <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date(sale.date).toLocaleString()} &middot; {sale.status}</div>
               </div>
             )) : <div className="p-10 text-center text-gray-500">No returnable sales found.</div>}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="mb-4">
            <div className="p-3 bg-blue-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">Returning items from <span className="font-mono">{selectedSaleForReturn.id}</span></h3>
                    <button onClick={() => { setSelectedSaleForReturn(null); setCart([]); }} className="text-sm text-blue-600 hover:underline">Change Sale</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(selectedSaleForReturn.date).toLocaleString()}</p>
            </div>
        </div>
        <div className="flex-grow bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2 text-center">Return Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {selectedSaleForReturn.items.map(item => {
                const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                const currentReturnQty = cart.find(c => c.id === item.id)?.quantity || 0;
                if (maxReturnable <= 0) {
                    return (
                        <tr key={item.id} className="bg-gray-50 dark:bg-gray-700 opacity-60">
                            <td className="px-4 py-3">
                                <p className="font-medium text-gray-500 dark:text-gray-400 line-through">{item.name}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">All items returned</p>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">-</td>
                        </tr>
                    );
                }
                return (
                    <tr key={item.id}>
                        <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {maxReturnable} of {item.quantity} available to return
                            </p>
                        </td>
                        <td className="px-4 py-3">
                            <input
                                type="number"
                                min="0"
                                max={maxReturnable}
                                value={currentReturnQty}
                                onChange={e => handleReturnQtyChange(item, e.target.value)}
                                className="w-20 text-center p-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };


  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-100 dark:bg-gray-900">
      {/* Left side: Product Search & Cart */}
      <div className="w-full md:w-3/5 p-4 flex flex-col">
        <div className="flex mb-4 rounded-lg bg-gray-200 dark:bg-gray-700 p-1">
            <button 
                onClick={() => switchMode('Sale')}
                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'Sale' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
                Sale
            </button>
            <button 
                onClick={() => switchMode('Return')}
                className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'Return' ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
            >
                Return
            </button>
        </div>
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-md text-sm ${feedback.type === 'error' ? 'bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200' : ''}`} role="alert">
            {feedback.text}
          </div>
        )}
        {mode === 'Sale' ? renderSaleMode() : renderReturnMode()}
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
            {totals.discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="font-medium">-{formatCurrency(totals.discount)}</span>
              </div>
            )}
            {isTaxEnabled && (
                <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Tax ({ (taxRate * 100).toFixed(2) }%)</span>
                <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(totals.tax)}</span>
                </div>
            )}
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

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Payment">
        {isSplitPaymentEnabled ? (
            <PaymentModalContent 
                total={Math.abs(totals.total)} 
                onCompleteSale={handleCompleteSale}
                onClose={() => setIsPaymentModalOpen(false)}
                currency={currency}
                isChangeDueEnabled={isChangeDueEnabled}
                isIntegerCurrency={isIntegerCurrency}
            />
        ) : (
            <SimplePaymentModalContent
                total={Math.abs(totals.total)}
                onCompleteSale={handleCompleteSale}
                onClose={() => setIsPaymentModalOpen(false)}
                currency={currency}
                isChangeDueEnabled={isChangeDueEnabled}
                isIntegerCurrency={isIntegerCurrency}
            />
        )}
      </Modal>

      <Modal isOpen={isReceiptModalOpen} onClose={startNewSale} title={`${lastSale?.type} Receipt - ${lastSale?.id}`}>
        {lastSale && (
          <div>
            <div className="printable-area" ref={printableAreaRef}>
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{businessName}</h2>
              </div>
              <div className="space-y-4 text-sm">
                  <p>Date: {new Date(lastSale.date).toLocaleString()}</p>
                  <p>Cashier: {lastSale.salespersonName}</p>
                  {lastSale.originalSaleId && <p>Original Sale: <span className="font-mono">{lastSale.originalSaleId}</span></p>}
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
                      {lastSale.discount > 0 && (
                          <div className="flex justify-between"><span>Discount:</span> <span>-{formatCurrency(lastSale.discount)}</span></div>
                      )}
                      <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(lastSale.tax)}</span></div>
                      <div className="flex justify-between text-lg font-bold"><span>Total:</span> <span>{formatCurrency(lastSale.total)}</span></div>
                  </div>
                  <div>
                      <h4 className="font-semibold">Payments:</h4>
                      {lastSale.payments.map((p, i) => (
                          <div key={i} className="flex justify-between">
                              <span>{p.type}:</span>
                              <span>{formatCurrency(p.amount)}</span>
                          </div>
                      ))}
                       <div className="border-t mt-2 pt-2 border-gray-200 dark:border-gray-600 font-semibold">
                         {isChangeDueEnabled && ((): {totalPaid: number, changeDue: number} => {
                              const totalPaid = lastSale.payments.reduce((sum, p) => sum + p.amount, 0);
                              const changeDue = totalPaid - Math.abs(lastSale.total);
                              return {totalPaid, changeDue};
                          })().changeDue > 0.005 && (
                              <div className="flex justify-between text-green-600 dark:text-green-400">
                                  <span>Change Due:</span>
                                  <span>
                                      {formatCurrency(
                                          lastSale.payments.reduce((sum, p) => sum + p.amount, 0) - Math.abs(lastSale.total)
                                      )}
                                  </span>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
            </div>
            <div className="flex justify-end items-center gap-2 pt-4 no-print">
                <button onClick={handleSaveAsImage} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <PhotoIcon className="h-5 w-5" />
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                <button onClick={startNewSale} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">New Transaction</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
