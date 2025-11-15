import React, { forwardRef } from 'react';
import { Sale } from '../../types';
import { useAppContext } from '../context/AppContext';

interface PrintableReceiptProps {
    sale: Sale;
}

export const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(({ sale }, ref) => {
    const { businessName, currency, isIntegerCurrency, isChangeDueEnabled } = useAppContext();
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: isIntegerCurrency ? 0 : 2,
        maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount);
    
    return (
        <div className="printable-area" ref={ref}>
            <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{businessName}</h2>
                <p className="text-sm">Receipt: <span className="font-mono">{sale.id}</span></p>
            </div>
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p><span className="font-semibold text-gray-800 dark:text-gray-200">Date:</span> {new Date(sale.date).toLocaleString()}</p>
                <p><span className="font-semibold text-gray-800 dark:text-gray-200">Cashier:</span> {sale.salespersonName}</p>
                {sale.originalSaleId && <p><span className="font-semibold text-gray-800 dark:text-gray-200">Original Sale:</span> <span className="font-mono">{sale.originalSaleId}</span></p>}
                <div className="border-t border-b py-2 my-2 border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Items</h4>
                    {sale.items.map(item => (
                         <div key={item.id} className={`flex justify-between items-center mb-1 ${item.returnedQuantity && item.returnedQuantity >= item.quantity ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                             <div>
                                <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                <p className="text-sm">
                                {item.quantity} &times; {formatCurrency(item.retailPrice)}
                                {item.returnedQuantity && item.returnedQuantity > 0 && <span className="ml-2 font-semibold not-line-through text-orange-600 dark:text-orange-400">(Returned: {item.returnedQuantity})</span>}
                                </p>
                            </div>
                            <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.retailPrice * item.quantity)}</span>
                        </div>
                    ))}
                </div>
                 <div className="space-y-1 font-medium">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(sale.subtotal)}</span></div>
                    {sale.discount > 0 && (
                        <div className="flex justify-between"><span>Discount:</span> <span>{sale.type === 'Sale' ? '-' : ''}{formatCurrency(sale.discount)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(sale.tax)}</span></div>
                    <div className="flex justify-between text-lg font-bold"><span>Total:</span> <span>{formatCurrency(sale.total)}</span></div>
                </div>
                <div>
                    <h4 className="font-semibold">Payments:</h4>
                    {sale.payments.map((p, i) => (
                        <div key={i} className="flex justify-between">
                            <span>{p.type}:</span>
                            <span>{formatCurrency(p.amount)}</span>
                        </div>
                    ))}
                     <div className="border-t mt-2 pt-2 border-gray-200 dark:border-gray-600 font-semibold">
                       {isChangeDueEnabled && ((): {totalPaid: number, changeDue: number} => {
                            const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                            const changeDue = totalPaid - Math.abs(sale.total);
                            return {totalPaid, changeDue};
                        })().changeDue > 0.005 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Change Due:</span>
                                <span>
                                    {formatCurrency(
                                        sale.payments.reduce((sum, p) => sum + p.amount, 0) - Math.abs(sale.total)
                                    )}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});