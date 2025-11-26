
import React, { forwardRef } from 'react';
import { Sale } from '../../types';
import { useSettings } from '../context/SettingsContext';

interface PrintableReceiptProps {
    sale: Sale;
}

export const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(({ sale }, ref) => {
    const { workspaceName, formatCurrency, formatDateTime, storeAddress, storePhone, receiptFooter } = useSettings();
    
    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
    const changeDue = totalPaid - sale.total;

    // Fallback to internal ID if publicId is missing (legacy data)
    const displayId = sale.publicId || sale.id;

    return (
        <div className="printable-area" ref={ref}>
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{workspaceName}</h2>
                {storeAddress && <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{storeAddress}</p>}
                {storePhone && <p className="text-xs text-gray-600 dark:text-gray-400">{storePhone}</p>}
                <p className="text-sm mt-2 font-semibold text-gray-900 dark:text-gray-200">Receipt #: <span className="font-mono text-black dark:text-white font-bold">{displayId}</span></p>
            </div>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="border-b pb-2 border-gray-200 dark:border-gray-600 text-xs">
                    <p><span className="font-semibold text-gray-900 dark:text-gray-200">Date:</span> {formatDateTime(sale.date)}</p>
                    <p><span className="font-semibold text-gray-900 dark:text-gray-200">Cashier:</span> {sale.salespersonName}</p>
                    {sale.customerName && <p><span className="font-semibold text-gray-900 dark:text-gray-200">Customer:</span> {sale.customerName}</p>}
                    {sale.originalSalePublicId && (
                        <p><span className="font-semibold text-gray-900 dark:text-gray-200">Original Receipt:</span> <span className="font-mono">{sale.originalSalePublicId}</span></p>
                    )}
                    {!sale.originalSalePublicId && sale.originalSaleId && (
                        <p><span className="font-semibold text-gray-900 dark:text-gray-200">Original Sale Ref:</span> <span className="font-mono">{sale.originalSaleId}</span></p>
                    )}
                </div>
                
                <div className="py-2">
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-200 uppercase text-xs">Items</h4>
                    {sale.items.map(item => {
                        // Logic to check if item is fully returned
                        const isFullyReturned = sale.type === 'Sale' && item.returnedQuantity && item.returnedQuantity >= item.quantity;
                        
                        return (
                             <div key={item.id} className="flex justify-between items-start mb-2">
                                 <div>
                                    <p className={`font-medium text-gray-900 dark:text-white ${isFullyReturned ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>{item.name}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className={isFullyReturned ? 'line-through' : ''}>{item.quantity} x {formatCurrency(item.retailPrice)}</span>
                                        {sale.type === 'Sale' && item.returnedQuantity && item.returnedQuantity > 0 && (
                                            <span className="ml-2 font-semibold text-orange-600 dark:text-orange-400 inline-block">
                                                (Ret: {item.returnedQuantity})
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <span className={`font-medium text-gray-900 dark:text-white ${isFullyReturned ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                                    {formatCurrency(item.retailPrice * item.quantity)}
                                </span>
                            </div>
                        );
                    })}
                </div>
                
                 <div className="space-y-1 font-medium border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-900 dark:text-white">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(sale.subtotal)}</span></div>
                    {sale.discount > 0 && (
                        <div className="flex justify-between"><span>Discount:</span> <span>{sale.type === 'Sale' ? '-' : ''}{formatCurrency(sale.discount)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(sale.tax)}</span></div>
                    <div className="flex justify-between text-lg font-bold mt-2"><span>Total:</span> <span>{formatCurrency(sale.total)}</span></div>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                    <h4 className="font-semibold text-xs uppercase mb-1 text-gray-900 dark:text-gray-200">Payments</h4>
                    {sale.payments.map((p, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-800 dark:text-gray-300">
                            <span>{p.type}:</span>
                            <span>{formatCurrency(p.amount)}</span>
                        </div>
                    ))}
                     <div className="mt-2 pt-2 font-semibold">
                       {changeDue > 0.005 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Change Due:</span>
                                <span>{formatCurrency(changeDue)}</span>
                            </div>
                        )}
                    </div>
                </div>
                {receiptFooter && <div className="text-center pt-4 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{receiptFooter}</div>}
            </div>
        </div>
    );
});
