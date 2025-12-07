
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem, PaymentType, Sale, Payment, ProductVariant, Customer, HeldOrder } from '../types';
import { SearchIcon, PlusIcon, MinusIcon, TrashIcon, PhotoIcon, ChevronDownIcon, TagIcon, UserCircleIcon, CheckCircleIcon, ClipboardIcon, ArrowUturnLeftIcon, BanknotesIcon, DangerIcon } from './Icons';
import { Modal } from './common/Modal';
import { PrintableReceipt } from './common/PrintableReceipt';
import { Pagination } from './common/Pagination';
import { UserRole } from '../types';
import { useProducts } from './context/ProductContext';
import { useSales } from './context/SalesContext';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import { useUIState } from './context/UIStateContext';
import { useCustomers } from './context/CustomerContext';
import { VariantSelectionModal } from './common/ProductVariantSelector';
import { FilterMenu, FilterSelectItem } from './common/FilterMenu';
import usePersistedState from '../hooks/usePersistedState';

declare var html2canvas: any;

const DiscountModalContent: React.FC<{
    currentDiscount: { type: 'percent' | 'fixed', value: number } | null;
    defaultDiscountRate: number;
    isDefaultDiscountEnabled: boolean;
    defaultDiscountThreshold: number;
    formatCurrency: (val: number) => string;
    onApply: (discount: { type: 'percent' | 'fixed', value: number } | null) => void;
    onClose: () => void;
}> = ({ currentDiscount, defaultDiscountRate, isDefaultDiscountEnabled, defaultDiscountThreshold, formatCurrency, onApply, onClose }) => {
    const [mode, setMode] = useState<'default' | 'custom'>(currentDiscount ? 'custom' : 'default');
    const [type, setType] = useState<'percent' | 'fixed'>(currentDiscount?.type || 'percent');
    const [value, setValue] = useState<string>(currentDiscount ? currentDiscount.value.toString() : '0');

    const handleApply = () => {
        if (mode === 'default') {
            onApply(null);
        } else {
            const numVal = parseFloat(value);
            if (isNaN(numVal) || numVal < 0) return;
            onApply({ type, value: numVal });
        }
        onClose();
    };

    const defaultLabel = isDefaultDiscountEnabled 
        ? `Default Discount (${(defaultDiscountRate * 100).toFixed(1)}% on orders over ${formatCurrency(defaultDiscountThreshold)})`
        : 'Default Discount (Disabled)';

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount Mode</label>
                <div className="flex flex-col gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input 
                            type="radio" 
                            name="discountMode" 
                            checked={mode === 'default'} 
                            onChange={() => setMode('default')} 
                            className="text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-gray-800 dark:text-gray-200">{defaultLabel}</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input 
                            type="radio" 
                            name="discountMode" 
                            checked={mode === 'custom'} 
                            onChange={() => setMode('custom')} 
                            className="text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-gray-800 dark:text-gray-200">Custom Discount</span>
                    </label>
                </div>
            </div>

            {mode === 'custom' && (
                <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-600 space-y-4">
                    <div className="flex rounded-md shadow-sm">
                        <button
                            type="button"
                            onClick={() => setType('percent')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-l-md border ${type === 'percent' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                        >
                            Percentage (%)
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('fixed')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-r-md border-t border-b border-r ${type === 'fixed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                        >
                            Fixed Amount
                        </button>
                    </div>
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                            placeholder="0.00"
                        />
                        {type === 'percent' && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">%</span>
                            </div>
                        )}
                    </div>
                    <button 
                        type="button" 
                        onClick={() => { setType('fixed'); setValue('0'); }}
                        className="text-xs text-red-600 hover:underline"
                    >
                        Set to No Discount (Fixed $0)
                    </button>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="button" onClick={handleApply} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Apply</button>
            </div>
        </div>
    );
};

const TaxModalContent: React.FC<{
    currentTax: { type: 'percent' | 'fixed', value: number } | null;
    defaultTaxRate: number;
    isDefaultTaxEnabled: boolean;
    onApply: (tax: { type: 'percent' | 'fixed', value: number } | null) => void;
    onClose: () => void;
}> = ({ currentTax, defaultTaxRate, isDefaultTaxEnabled, onApply, onClose }) => {
    const [mode, setMode] = useState<'default' | 'custom'>((currentTax === null || (currentTax.type === 'percent' && currentTax.value === defaultTaxRate * 100 && isDefaultTaxEnabled)) ? 'default' : 'custom');
    const [type, setType] = useState<'percent' | 'fixed'>(currentTax?.type || 'percent');
    const [value, setValue] = useState<string>(currentTax ? currentTax.value.toString() : (defaultTaxRate * 100).toString());

    const handleApply = () => {
        if (mode === 'default') {
            onApply(null); // Null implies default tax logic
        } else {
            const numVal = parseFloat(value);
            if (isNaN(numVal) || numVal < 0) return;
            onApply({ type, value: numVal });
        }
        onClose();
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Mode</label>
                <div className="flex flex-col gap-2">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input 
                            type="radio" 
                            name="taxMode" 
                            checked={mode === 'default'} 
                            onChange={() => setMode('default')} 
                            className="text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-gray-800 dark:text-gray-200">Default Tax ({isDefaultTaxEnabled ? `${(defaultTaxRate * 100).toFixed(1)}%` : 'Disabled'})</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                        <input 
                            type="radio" 
                            name="taxMode" 
                            checked={mode === 'custom'} 
                            onChange={() => setMode('custom')} 
                            className="text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-gray-800 dark:text-gray-200">Custom Tax</span>
                    </label>
                </div>
            </div>

            {mode === 'custom' && (
                <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-600 space-y-4">
                    <div className="flex rounded-md shadow-sm">
                        <button
                            type="button"
                            onClick={() => setType('percent')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-l-md border ${type === 'percent' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                        >
                            Percentage
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('fixed')}
                            className={`flex-1 px-3 py-2 text-xs font-medium rounded-r-md border-t border-b border-r ${type === 'fixed' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                        >
                            Fixed Amount
                        </button>
                    </div>
                    <div className="relative rounded-md shadow-sm">
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className={`block w-full rounded-md border-gray-300 dark:border-gray-600 pr-12 focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                            placeholder="0.00"
                        />
                        {type === 'percent' && (
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-500 sm:text-sm">%</span>
                            </div>
                        )}
                    </div>
                    <button 
                        type="button" 
                        onClick={() => { setType('fixed'); setValue('0'); }}
                        className="text-xs text-red-600 hover:underline"
                    >
                        Set to No Tax (Fixed $0)
                    </button>
                </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="button" onClick={handleApply} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Apply</button>
            </div>
        </div>
    );
};

const CustomerSelectionModal: React.FC<{
    onSelect: (customer: Customer | null) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const { customers } = useCustomers();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone?.includes(searchTerm) ||
        c.publicId?.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);

    return (
        <div className="h-[50vh] flex flex-col">
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    placeholder="Search by name, phone, or ID..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="flex-grow overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                        <div 
                            key={customer.id}
                            onClick={() => { onSelect(customer); onClose(); }}
                            className="p-3 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center"
                        >
                            <div>
                                <p className="font-semibold text-gray-800 dark:text-white">{customer.name} <span className="text-xs font-mono text-gray-500">({customer.publicId})</span></p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone || customer.email}</p>
                            </div>
                            <div className="text-blue-600 dark:text-blue-400 text-sm">Select</div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 mt-8">No customers found.</div>
                )}
            </div>
            <div className="pt-4 border-t dark:border-gray-700">
                <button 
                    onClick={() => { onSelect(null); onClose(); }}
                    className="w-full py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                    Continue as Guest
                </button>
            </div>
        </div>
    );
};

const OpenShiftModal: React.FC<{ onOpenShift: (float: number) => void }> = ({ onOpenShift }) => {
    const [float, setFloat] = useState('');
    return (
        <div className="text-center space-y-6 p-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Start Your Shift</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Please count the cash in the drawer to begin.</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">Opening Float Amount</label>
                <input
                    type="number"
                    value={float}
                    onChange={e => setFloat(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-2xl py-3 border-2 border-blue-200 dark:border-blue-800 rounded-lg focus:ring-0 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                />
            </div>
            <button 
                onClick={() => onOpenShift(parseFloat(float) || 0)}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
                Open Register
            </button>
        </div>
    );
};

const CloseShiftModal: React.FC<{ onCloseShift: (actual: number, notes: string) => Promise<void>, onCancel: () => void }> = ({ onCloseShift, onCancel }) => {
    const { currentShift } = useSales();
    const { formatCurrency } = useSettings();
    const [actualCash, setActualCash] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!currentShift) return null;

    const startFloat = currentShift.startFloat || 0;
    const cashSales = currentShift.cashSales || 0;
    const cashRefunds = currentShift.cashRefunds || 0;
    
    const expectedCash = startFloat + cashSales - cashRefunds;
    const difference = (parseFloat(actualCash) || 0) - expectedCash;

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await onCloseShift(parseFloat(actualCash) || 0, notes);
        setIsSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2 bg-gray-100 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Opening Float</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(startFloat)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Cash Sales</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(cashSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Cash Refunds</span>
                    <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(cashRefunds)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-2 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                    <span>Expected Cash</span>
                    <span>{formatCurrency(expectedCash)}</span>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actual Cash Count</label>
                <input
                    type="number"
                    value={actualCash}
                    onChange={e => setActualCash(e.target.value)}
                    className="w-full p-3 text-xl border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    placeholder="0.00"
                    autoFocus
                />
            </div>

            {(parseFloat(actualCash) || 0) > 0 && (
                <div className={`p-3 rounded-lg text-center font-bold ${difference >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                    Difference: {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    placeholder="Any discrepancies or notes..."
                />
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg disabled:opacity-50">Cancel</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:opacity-50">
                    {isSubmitting ? 'Closing...' : 'End Shift'}
                </button>
            </div>
        </div>
    );
};

const HoldOrderModal: React.FC<{ onHold: (note: string) => void; onCancel: () => void }> = ({ onHold, onCancel }) => {
    const [note, setNote] = useState('');
    return (
        <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">Enter a reference note for this order (e.g., Customer Name).</p>
            <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Order Reference"
                autoFocus
                className="w-full p-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
            <div className="flex justify-end gap-2">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancel</button>
                <button onClick={() => onHold(note)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Hold Order</button>
            </div>
        </div>
    );
};

const RetrieveOrderModal: React.FC<{ onClose: () => void; onLoad: (order: HeldOrder) => void; onDelete: (id: string) => void; heldOrders: HeldOrder[] }> = ({ onClose, onLoad, onDelete, heldOrders }) => {
    const { formatDateTime, formatCurrency } = useSettings();

    return (
        <div className="h-[60vh] flex flex-col">
            <div className="flex-grow overflow-y-auto">
                {heldOrders.length === 0 ? (
                    <p className="text-center text-gray-500 mt-10">No held orders.</p>
                ) : (
                    <div className="space-y-2">
                        {heldOrders.map(order => (
                            <div key={order.id} className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        {order.publicId ? <span className="font-mono text-blue-600 mr-2">[{order.publicId}]</span> : null}
                                        {order.note || 'Unnamed Order'}
                                    </p>
                                    <p className="text-sm text-gray-500">{formatDateTime(order.date)}</p>
                                    <p className="text-sm text-gray-500">{order.items.length} items • Total: {formatCurrency(order.items.reduce((sum, i) => sum + i.retailPrice * i.quantity, 0))}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onDelete(order.id)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md"><TrashIcon /></button>
                                    <button onClick={() => onLoad(order)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Load</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="pt-4 border-t dark:border-gray-700 mt-4 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Close</button>
            </div>
        </div>
    );
};

const MissingProductModal: React.FC<{ 
    missingItems: CartItem[]; 
    onRefundOnly: () => void; 
    onRestoreAndRefund: () => void;
    onCancel: () => void;
}> = ({ missingItems, onRefundOnly, onRestoreAndRefund, onCancel }) => {
    const { formatCurrency } = useSettings();
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <DangerIcon className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <div>
                    <h3 className="font-bold text-orange-800 dark:text-orange-200">Missing Inventory Items</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        The following items in this return are no longer in your inventory database.
                        How would you like to handle the stock?
                    </p>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 max-h-48 overflow-y-auto">
                <ul className="space-y-2">
                    {missingItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{item.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 font-mono">{item.sku}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row justify-end pt-4 border-t dark:border-gray-700">
                <button 
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                >
                    Cancel
                </button>
                <button 
                    onClick={onRefundOnly}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                    Refund Money Only
                </button>
                <button 
                    onClick={onRestoreAndRefund}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                >
                    Restore Items & Refund
                </button>
            </div>
        </div>
    );
};

interface POSProps {
}

const PaymentModalContent: React.FC<{
    total: number,
    onCompleteSale: (payments: Payment[]) => Promise<void>,
    onClose: () => void,
}> = ({ total, onCompleteSale, onClose }) => {
    const { isIntegerCurrency, formatCurrency } = useSettings();
    const { showToast } = useUIState();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [currentAmount, setCurrentAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const isRefund = total < 0;
    const absTotal = Math.abs(total);

    const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + Math.abs(p.amount), 0), [payments]);
    const remaining = Math.max(0, absTotal - totalPaid);
    
    // Change is due if we paid more than total
    const change = totalPaid > absTotal ? totalPaid - absTotal : 0;
    
    // Can complete if paid enough (remaining <= 0)
    const canComplete = totalPaid >= absTotal - 0.001; 
    
    useEffect(() => {
        if (remaining > 0) {
            setCurrentAmount(remaining.toFixed(isIntegerCurrency ? 0 : 2));
        } else {
            setCurrentAmount('');
        }
    }, [total, totalPaid, isIntegerCurrency, absTotal, remaining]);

    const addPayment = (type: PaymentType) => {
        let amount = parseFloat(currentAmount);
        if (isNaN(amount) || amount <= 0) return;

        setPayments(prev => [...prev, { type, amount: isRefund ? -amount : amount }]);
    };

    const removePayment = (index: number) => {
        const newPayments = payments.filter((_, i) => i !== index);
        setPayments(newPayments);
    };

    const handleComplete = async () => {
        setIsProcessing(true);
        await onCompleteSale(payments);
        setIsProcessing(false);
    }

    return (
        <div className="space-y-4 text-gray-900 dark:text-gray-100">
            <div className="flex justify-between items-start">
                <div className="flex-grow text-center">
                    <p className="text-lg text-gray-600 dark:text-gray-300">{isRefund ? 'Refund Amount' : 'Total Due'}</p>
                    <p className={`text-5xl font-bold ${isRefund ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white'}`}>{formatCurrency(absTotal)}</p>
                </div>
            </div>
            
            {payments.length > 0 && (
                <div className="space-y-2 border-t pt-4 border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Payments Applied:</h3>
                    {payments.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                            <span className="font-medium text-gray-900 dark:text-white">{p.type}: {formatCurrency(Math.abs(p.amount))}</span>
                            <button onClick={() => removePayment(i)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon /></button>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                 {remaining > 0.001 ? (
                    <div className="flex justify-between text-xl font-semibold mb-4">
                        <span className="text-gray-900 dark:text-white">Remaining:</span>
                        <span className="text-red-500">{formatCurrency(remaining)}</span>
                    </div>
                ) : !isRefund ? (
                    <div className="flex justify-between text-xl font-semibold mb-4">
                        <span className="text-gray-900 dark:text-white">Change Due:</span>
                        <span className="text-green-500">{formatCurrency(change)}</span>
                    </div>
                ) : (
                    <div className="flex justify-between text-xl font-semibold mb-4">
                        <span className="text-gray-900 dark:text-white">Remaining:</span>
                        <span className="text-green-500">{formatCurrency(0)}</span>
                    </div>
                )}


                <div className="flex items-center gap-2">
                     <input 
                        type="number"
                        value={currentAmount}
                        onChange={(e) => setCurrentAmount(e.target.value)}
                        placeholder="Amount"
                        disabled={remaining <= 0.001}
                        className="flex-grow block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800"
                     />
                     <button onClick={() => setCurrentAmount(remaining.toFixed(isIntegerCurrency ? 0 : 2))} disabled={remaining <= 0.001} className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-50 disabled:opacity-50 text-gray-800 dark:text-white">
                         Full
                     </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    <button onClick={() => addPayment(PaymentType.Cash)} disabled={remaining <= 0.001} className="w-full py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed">Cash</button>
                    <button onClick={() => addPayment(PaymentType.Card)} disabled={remaining <= 0.001} className="w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed">Card</button>
                    <button onClick={() => addPayment(PaymentType.Other)} disabled={remaining <= 0.001} className="w-full py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed">Other</button>
                </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} disabled={isProcessing} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button type="button" onClick={handleComplete} disabled={!canComplete || isProcessing} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                    {isProcessing ? 'Processing...' : `Complete ${isRefund ? 'Refund' : 'Sale'}`}
                </button>
            </div>
        </div>
    );
};


export const POS: React.FC<POSProps> = () => {
  const { products, categories, restoreDeletedProducts } = useProducts();
  const { sales, processSale, currentShift, openShift, closeShift, holdOrder, heldOrders, retrieveOrder, deleteHeldOrder } = useSales();
  const { currentUser } = useAuth();
  const { workspaceId, isTaxEnabled, taxRate, isDiscountEnabled, discountRate, discountThreshold, isIntegerCurrency, cashierPermissions, formatCurrency, formatDateTime, paginationConfig } = useSettings();
  const { showToast, setActiveView } = useUIState();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cart, setCart] = usePersistedState<CartItem[]>(`ims-${workspaceId}-pos-cart`, []);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentModalKey, setPaymentModalKey] = useState(Date.now());
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  const [activeTab, setActiveTab] = useState<'Register' | 'Returns'>('Register');
  const [selectedSaleForReturnId, setSelectedSaleForReturnId] = useState<string | null>(null);
  const [returnSearchTerm, setReturnSearchTerm] = useState<string>('');
  
  const [catalogPage, setCatalogPage] = useState(1);
  const [salesPage, setSalesPage] = useState(1);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [variantSelectionProduct, setVariantSelectionProduct] = useState<Product | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const [cartDiscount, setCartDiscount] = usePersistedState<{ type: 'percent' | 'fixed', value: number } | null>(`ims-${workspaceId}-pos-discount`, null);
  const [cartTax, setCartTax] = usePersistedState<{ type: 'percent' | 'fixed', value: number } | null>(`ims-${workspaceId}-pos-tax`, null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isClearCartConfirmOpen, setIsClearCartConfirmOpen] = useState(false);
  const [isHoldOrderModalOpen, setIsHoldOrderModalOpen] = useState(false);
  const [isRetrieveOrderModalOpen, setIsRetrieveOrderModalOpen] = useState(false);
  
  const [selectedCustomer, setSelectedCustomer] = usePersistedState<Customer | null>(`ims-${workspaceId}-pos-customer`, null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState(false);
  const [isStartShiftModalOpen, setIsStartShiftModalOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Missing Item Modal State
  const [isMissingItemsModalOpen, setIsMissingItemsModalOpen] = useState(false);
  const [missingReturnItems, setMissingReturnItems] = useState<CartItem[]>([]);
  const [pendingSalePayments, setPendingSalePayments] = useState<Payment[] | null>(null);

  const canProcessReturns = currentUser.role === UserRole.Admin || cashierPermissions.canProcessReturns;
  
  const selectedSaleForReturn = useMemo(() => {
      if (!selectedSaleForReturnId) return null;
      return sales.find(s => s.id === selectedSaleForReturnId) || null;
  }, [sales, selectedSaleForReturnId]);

  const openPaymentModal = useCallback(() => {
    if (cart.length > 0) {
        setPaymentModalKey(Date.now());
        setIsPaymentModalOpen(true);
    }
  }, [cart]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        if (e.altKey && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            openPaymentModal();
        }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [openPaymentModal]);
  
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [activeTab]);

  const handleSaveAsImage = () => {
    if (printableAreaRef.current) {
        html2canvas(printableAreaRef.current, { 
            backgroundColor: '#ffffff',
            onclone: (clonedDoc: Document) => {
                clonedDoc.documentElement.classList.remove('dark');
            }
        }).then((canvas: HTMLCanvasElement) => {
            const PADDING = 40;
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
            const saleId = lastSale ? (lastSale.publicId || lastSale.id) : 'unknown';
            link.download = `receipt-${saleId}.png`;
            link.href = newCanvas.toDataURL('image/png');
            link.click();
        });
    }
  };

  const categoryOptions = useMemo(() => {
      const options: { value: string; label: string }[] = [];
      const buildOptions = (parentId: string | null = null, prefix = '') => {
          categories
              .filter(c => c.parentId === parentId)
              .forEach(c => {
                  options.push({ value: c.id, label: `${prefix}${c.name}` });
                  buildOptions(c.id, `${prefix}${c.name} > `);
              });
      };
      buildOptions();
      return [{ value: 'All', label: 'All Categories' }, ...options];
  }, [categories]);

  const allFilteredProducts = useMemo<Product[]>(() => {
    let result = products;

    if (selectedCategory !== 'All') {
        const getDescendantIds = (categoryId: string): string[] => {
            const children = categories.filter(c => c.parentId === categoryId);
            let ids = children.map(c => c.id);
            children.forEach(child => {
                ids = [...ids, ...getDescendantIds(child.id)];
            });
            return ids;
        };
        const filterIds = [selectedCategory, ...getDescendantIds(selectedCategory)];
        result = result.filter(p => p.categoryIds.some(id => filterIds.includes(id)));
    }

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        result = result.filter(p =>
            p.name.toLowerCase().includes(lowerTerm) ||
            p.sku.toLowerCase().includes(lowerTerm)
        );
    }
    return result;
  }, [searchTerm, products, selectedCategory, categories]);

  const catalogItemsPerPage = paginationConfig.posCatalog || 10;
  useEffect(() => {
      setCatalogPage(1);
  }, [searchTerm, catalogItemsPerPage, selectedCategory]);

  const paginatedProducts = useMemo<Product[]>(() => {
      const start = (catalogPage - 1) * catalogItemsPerPage;
      return allFilteredProducts.slice(start, start + catalogItemsPerPage);
  }, [allFilteredProducts, catalogPage, catalogItemsPerPage]);

  const catalogTotalPages = Math.ceil(allFilteredProducts.length / catalogItemsPerPage);

  
  const handleAddVariantToCart = (product: Product, variant: ProductVariant) => {
    setCart(prevCart => {
        const existingItem = prevCart.find(item => item.id === variant.id && item.quantity > 0);
        if (existingItem) {
            if (existingItem.quantity < variant.stock) {
                return prevCart.map(item =>
                    item.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return prevCart;
        } else {
            if (variant.stock > 0) {
                const composedName = `${product.name} (${Object.values(variant.options).join(' / ')})`;
                const composedSku = `${product.sku}-${variant.skuSuffix}`;
                const newItem: CartItem = {
                    id: variant.id,
                    productId: product.id,
                    variantId: variant.id,
                    name: composedName,
                    sku: composedSku,
                    retailPrice: variant.retailPrice,
                    costPrice: Number(variant.costPrice) || 0,
                    stock: variant.stock,
                    quantity: 1,
                };
                return [...prevCart, newItem];
            }
        }
        return prevCart;
    });
    setVariantSelectionProduct(null);
};


  const addToCart = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
        setVariantSelectionProduct(product);
        setSearchTerm('');
        setHighlightedIndex(-1);
        return;
    }
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id && item.quantity > 0);
      if (existingItem) {
        if (existingItem.quantity < product.stock) {
            return prevCart.map(item =>
                item.id === product.id && item.quantity > 0 ? { ...item, quantity: item.quantity + 1 } : item
            );
        }
        return prevCart;
      }
      if (product.stock > 0) {
        const newItem: CartItem = {
            id: product.id,
            productId: product.id,
            name: product.name,
            sku: product.sku,
            retailPrice: product.retailPrice,
            costPrice: Number(product.costPrice) || 0,
            stock: product.stock,
            quantity: 1,
        };
        return [...prevCart, newItem];
      }
      return prevCart;
    });
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const addReturnItemToCart = (originalSale: Sale, item: CartItem, returnQty: number) => {
      const maxReturnable = item.quantity - (item.returnedQuantity || 0);
      const returnItemId = `${item.id}_return_${originalSale.id}`;
      const existingItem = cart.find(ci => ci.id === returnItemId);
      const currentInCart = existingItem ? Math.abs(existingItem.quantity) : 0;
      
      if (currentInCart + returnQty > maxReturnable) {
          showToast(`Cannot return more than ${maxReturnable} of this item.`, 'error');
          return;
      }

      setCart(prevCart => {
          if (existingItem) {
              return prevCart.map(ci => ci.id === returnItemId ? { ...ci, quantity: ci.quantity - returnQty } : ci);
          }
          
          const newItem: CartItem = {
              ...item,
              id: returnItemId,
              quantity: -returnQty, 
              originalSaleId: originalSale.id,
              name: `${item.name} (Return)`,
          };
          return [...prevCart, newItem];
      });
      
      showToast("Item added to cart for return", 'success');
  }

  const updateQuantity = (item: CartItem, change: number) => {
    setCart(prevCart => {
      return prevCart.map(cartItem => {
        if (cartItem.id === item.id) {
          const newQuantity = cartItem.quantity + change;
          
          if (item.quantity > 0) {
              if (newQuantity <= 0) return cartItem;
              if (newQuantity > item.stock) return cartItem;
          }
          
          if (item.quantity < 0) {
              if (newQuantity >= 0) return cartItem;
              // Validate against max returnable quantity from original sale
              if (item.originalSaleId) {
                  const originalSale = sales.find(s => s.id === item.originalSaleId);
                  if (originalSale) {
                      const originalItem = originalSale.items.find(i => 
                          i.productId === item.productId && 
                          i.variantId === item.variantId
                      );
                      
                      if (originalItem) {
                          const maxReturnable = originalItem.quantity - (originalItem.returnedQuantity || 0);
                          // newQuantity is negative (e.g. -2), so use Math.abs to compare
                          if (Math.abs(newQuantity) > maxReturnable) return cartItem;
                      }
                  }
              }
          }

          return { ...cartItem, quantity: newQuantity };
        }
        return cartItem;
      });
    });
  };
  
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  }

  const handleClearCart = () => {
      setCart([]);
      setCartDiscount(null);
      setCartTax(null);
      setIsClearCartConfirmOpen(false);
      setSelectedCustomer(null);
  }

  const handleHoldOrder = (note: string) => {
      if (cart.length === 0) return;
      holdOrder({
          items: cart,
          customer: selectedCustomer,
          discount: cartDiscount,
          isTaxExempt: false, // Legacy, kept as false
          customTax: cartTax,
          note: note || `Order ${new Date().toLocaleTimeString()}`,
      });
      showToast("Order held successfully.", 'success');
      handleClearCart();
      setIsHoldOrderModalOpen(false);
  };

  const handleLoadHeldOrder = (order: HeldOrder) => {
      setCart(order.items);
      setSelectedCustomer(order.customer);
      setCartDiscount(order.discount);
      if (order.customTax) {
          setCartTax(order.customTax);
      } else if (order.isTaxExempt) {
          // Backwards compatibility for held orders before tax update
          setCartTax({ type: 'fixed', value: 0 });
      } else {
          setCartTax(null);
      }
      deleteHeldOrder(order.id);
      setIsRetrieveOrderModalOpen(false);
      showToast("Order loaded.", 'success');
  };

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    
    const roundCurrency = (amount: number) => {
        if (isIntegerCurrency) {
            return Math.round(amount);
        }
        return Math.round(amount * 100) / 100;
    };
    
    let discount = 0;
    const positiveSubtotal = cart.filter(i => i.quantity > 0).reduce((sum, i) => sum + i.retailPrice * i.quantity, 0);
    
    if (cartDiscount) {
        if (cartDiscount.type === 'percent') {
            discount = positiveSubtotal * (cartDiscount.value / 100);
        } else {
            discount = cartDiscount.value;
        }
    } else if (isDiscountEnabled && positiveSubtotal >= discountThreshold) {
        discount = positiveSubtotal * discountRate;
    }
    
    discount = Math.min(discount, positiveSubtotal);
    const roundedDiscount = roundCurrency(discount);

    const netTaxableAmount = subtotal - roundedDiscount;
    
    let tax = 0;
    if (cartTax) {
        // Manual override for this cart
        if (cartTax.type === 'fixed') {
            tax = cartTax.value;
        } else {
            tax = netTaxableAmount * (cartTax.value / 100);
        }
    } else if (isTaxEnabled) {
        // Default system tax
        tax = netTaxableAmount * taxRate;
    }
    
    const roundedTax = roundCurrency(tax);
    const total = subtotal - roundedDiscount + roundedTax;

    return { 
        subtotal: roundCurrency(subtotal), 
        discount: roundedDiscount, 
        tax: roundedTax, 
        total: roundCurrency(total) 
    };
  }, [cart, isTaxEnabled, taxRate, isDiscountEnabled, discountThreshold, discountRate, isIntegerCurrency, cartDiscount, cartTax]);

  // Actual transaction processing logic, extracted for re-use
  const executeTransaction = async (payments: Payment[]) => {
    const safeNumber = (n: any) => {
        const num = Number(n);
        return isNaN(num) ? 0 : num;
    };

    const cogs = cart.reduce((sum, item) => sum + safeNumber(item.costPrice) * item.quantity, 0);
    
    const distinctOriginalIds = [...new Set(cart.map(i => i.originalSaleId).filter((id): id is string => !!id))];
    const originalSaleId = distinctOriginalIds.length === 1 ? distinctOriginalIds[0] : undefined;

    const safeTotal = safeNumber(totals.total);
    const safeTax = safeNumber(totals.tax);
    const safeSubtotal = safeNumber(totals.subtotal);
    const safeDiscount = safeNumber(totals.discount);
    
    // Profit = (Total - Tax) - COGS if includeTaxInProfit is false
    // Profit = Total - COGS if includeTaxInProfit is true (Handled in SalesContext, passing raw here)
    
    // Note: Profit calc logic is duplicated here for passing to `processSale`, but `processSale` recalculates it.
    // We pass placeholder profit or calculate it consistent with SalesContext.
    // Let's calculate purely for type satisfaction, SalesContext recalculates based on settings.
    const revenue = safeTotal - safeTax;
    const profit = revenue - cogs;

    const sale: Omit<Sale, 'id' | 'date' | 'workspaceId'> = {
      items: cart,
      subtotal: safeSubtotal,
      discount: safeDiscount,
      tax: safeTax,
      total: safeTotal,
      cogs: cogs,
      profit: safeNumber(profit), 
      payments,
      type: safeTotal >= 0 ? 'Sale' : 'Return',
      salespersonId: currentUser.id,
      salespersonName: currentUser.username,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      originalSaleId: originalSaleId,
    };
    
    try {
        const newSale = await processSale(sale);
        
        setLastSale(newSale);
        setCart([]);
        setCartDiscount(null);
        setCartTax(null);
        setSelectedCustomer(null);
        setIsPaymentModalOpen(false);
        setIsReceiptModalOpen(true);
        setActiveTab('Register');
        setSelectedSaleForReturnId(null);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while processing the sale.';
        showToast(errorMessage, 'error');
        setIsPaymentModalOpen(false);
    }
  };

  const handleCompleteSale = async (payments: Payment[]) => {
    // If it's a return (total < 0), check for missing items in inventory
    if (totals.total < 0) {
        const missing = cart.filter(item => {
            // Only check negative quantity items (returns)
            if (item.quantity >= 0) return false;
            // Check if product exists in current inventory context
            return !products.find(p => p.id === item.productId);
        });

        if (missing.length > 0) {
            setMissingReturnItems(missing);
            setPendingSalePayments(payments);
            setIsMissingItemsModalOpen(true);
            setIsPaymentModalOpen(false); // Close payment modal to show warning
            return;
        }
    }

    await executeTransaction(payments);
  };

  const handleRefundOnly = async () => {
      setIsMissingItemsModalOpen(false);
      if (pendingSalePayments) {
          await executeTransaction(pendingSalePayments);
          setPendingSalePayments(null);
          showToast("Return processed. Inventory was not updated for missing items.", 'success');
      }
  };

  const handleRestoreAndRefund = async () => {
      setIsMissingItemsModalOpen(false);
      if (pendingSalePayments && missingReturnItems.length > 0) {
          const result = await restoreDeletedProducts(missingReturnItems);
          if (result.success) {
              await executeTransaction(pendingSalePayments);
              showToast(`Return processed. ${result.count} products restored to inventory.`, 'success');
          } else {
              showToast("Failed to restore products.", 'error');
          }
          setPendingSalePayments(null);
          setMissingReturnItems([]);
      }
  };
  
  const startNewSale = () => {
    setIsReceiptModalOpen(false);
    setLastSale(null);
  }

  const allReturnableSales = useMemo(() => {
    return sales
      .filter(s => 
        s.type === 'Sale' && 
        s.status !== 'Refunded' &&
        (!returnSearchTerm || (s.publicId && s.publicId.toLowerCase().includes(returnSearchTerm.toLowerCase())) || s.id.toLowerCase().includes(returnSearchTerm.toLowerCase()))
      )
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, returnSearchTerm]);

  const salesItemsPerPage = paginationConfig.posSales || 10;
  useEffect(() => {
      setSalesPage(1);
  }, [returnSearchTerm, salesItemsPerPage]);

  const paginatedReturnSales = useMemo(() => {
      const start = (salesPage - 1) * salesItemsPerPage;
      return allReturnableSales.slice(start, start + salesItemsPerPage);
  }, [allReturnableSales, salesPage, salesItemsPerPage]);

  const salesTotalPages = Math.ceil(allReturnableSales.length / salesItemsPerPage);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, allFilteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allFilteredProducts.length) {
            addToCart(allFilteredProducts[highlightedIndex]);
        } else if (allFilteredProducts.length > 0) {
             const exactMatch = allFilteredProducts.find(p => p.sku.toLowerCase() === searchTerm.toLowerCase());
             if (exactMatch) addToCart(exactMatch);
        }
    } else if (e.key === 'Escape') {
        setSearchTerm('');
        setHighlightedIndex(-1);
    }
  };


  const renderRegisterTab = () => (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 p-1 flex-grow content-start">
        {paginatedProducts.length > 0 ? (
            paginatedProducts.map((p: Product) => (
                <div 
                    key={p.id} 
                    onClick={() => addToCart(p)} 
                    className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-full"
                >
                    <div>
                        <h4 className="font-medium text-sm leading-tight line-clamp-2 text-gray-900 dark:text-white mb-1">{p.name}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">{p.sku}</p>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                        <span className="font-bold text-sm text-blue-600 dark:text-blue-400">{formatCurrency(p.retailPrice)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full w-fit ${p.stock <= 0 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                            {p.stock} left
                        </span>
                    </div>
                </div>
            ))
        ) : (
            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                <p>No products found matching "{searchTerm}".</p>
            </div>
        )}
      </div>
      <Pagination
        currentPage={catalogPage}
        totalPages={catalogTotalPages}
        onPageChange={setCatalogPage}
        itemsPerPage={catalogItemsPerPage}
        totalItems={allFilteredProducts.length}
      />
    </div>
  );

  const renderReturnLookupTab = () => {
    if (!selectedSaleForReturn) {
      return (
        <div className="flex flex-col h-full">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
            <input
              type="text"
              placeholder="Search Receipt # (e.g. TRX-123)..."
              value={returnSearchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReturnSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md flex-grow flex flex-col">
             <h3 className="text-lg font-semibold p-4 border-b dark:border-gray-700 text-gray-800 dark:text-white">Select a Sale</h3>
             <div className="flex-grow overflow-y-auto">
                 {paginatedReturnSales.length > 0 ? paginatedReturnSales.map((sale: Sale) => (
                   <div key={sale.id} onClick={() => setSelectedSaleForReturnId(sale.id)} className="p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                     <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                            ID: <span className="font-mono text-blue-600 dark:text-blue-400">{sale.publicId || sale.id}</span>
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</span>
                     </div>
                     <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                         <span>{formatDateTime(sale.date)}</span>
                         <span className={`px-2 py-0.5 rounded-full text-xs ${sale.status === 'Partially Refunded' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>{sale.status}</span>
                     </div>
                   </div>
                 )) : <div className="p-10 text-center text-gray-500 dark:text-gray-400">No found sales.</div>}
             </div>
             <Pagination
                currentPage={salesPage}
                totalPages={salesTotalPages}
                onPageChange={setSalesPage}
                itemsPerPage={salesItemsPerPage}
                totalItems={allReturnableSales.length}
             />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <div className="mb-4">
            <div className="p-3 bg-blue-50 dark:bg-gray-700 rounded-lg border border-blue-100 dark:border-gray-600">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 dark:text-white truncate">Sale <span className="font-mono">{selectedSaleForReturn.publicId || selectedSaleForReturn.id}</span></h3>
                    <button onClick={() => setSelectedSaleForReturnId(null)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Back to Search</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDateTime(selectedSaleForReturn.date)}</p>
            </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3 text-center">Sold</th>
                <th className="px-4 py-3 text-center">Ret'd</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {selectedSaleForReturn.items.map(item => {
                const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                const inCartReturnQty = cart.find(c => c.id === `${item.id}_return_${selectedSaleForReturn.id}`)?.quantity || 0;
                
                if (maxReturnable <= 0) {
                    return (
                        <tr key={item.id} className="bg-gray-50 dark:bg-gray-700 opacity-60">
                            <td className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{item.name}</td>
                            <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{item.quantity}</td>
                            <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{item.returnedQuantity}</td>
                            <td className="px-4 py-3 text-center text-xs text-gray-400">Done</td>
                        </tr>
                    );
                }
                return (
                    <tr key={item.id}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-4 py-3 text-center text-gray-900 dark:text-white">{item.quantity}</td>
                        <td className="px-4 py-3 text-center text-orange-600 dark:text-orange-400">{item.returnedQuantity || 0}</td>
                        <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                                <button 
                                    onClick={() => addReturnItemToCart(selectedSaleForReturn, item, 1)}
                                    className="p-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 text-xs font-semibold flex items-center gap-1 transition-colors"
                                    title="Return 1 Item"
                                >
                                    <ArrowUturnLeftIcon className="h-4 w-4" />
                                    <span>1</span>
                                </button>
                                <button 
                                    onClick={() => addReturnItemToCart(selectedSaleForReturn, item, maxReturnable)}
                                    className="p-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                                    title={`Return All (${maxReturnable})`}
                                >
                                    <ArrowUturnLeftIcon className="h-4 w-4" />
                                    <span>All</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleCloseShift = async (actual: number, notes: string) => {
      const result = await closeShift(actual, notes);
      if (result.success) {
          setIsCloseShiftModalOpen(false);
          showToast('Shift closed successfully.', 'success');
      } else {
          showToast(result.message || 'Failed to close shift.', 'error');
      }
  }

  const totalAmount = totals.total;
  const isRefund = totalAmount < 0;

  // Determine Discount Label
  let discountLabel = "No Disc";
  if (cartDiscount) {
      if (cartDiscount.type === 'percent') discountLabel = `${cartDiscount.value}%`;
      else discountLabel = "Custom";
  } else if (isDiscountEnabled) {
      // Default auto discount applies potentially
      // Show default rate
      discountLabel = `${(discountRate * 100).toFixed(0)}%`; 
  }

  // Determine Tax Label
  let taxLabel = "No Tax";
  if (cartTax) {
      if (cartTax.type === 'percent') taxLabel = `${cartTax.value}%`;
      else taxLabel = "Custom";
  } else if (isTaxEnabled) {
      taxLabel = `${(taxRate * 100).toFixed(1)}%`;
  }

  const showSubtotal = totals.discount > 0 || totals.tax > 0;

  return (
    <div className="relative flex flex-col min-h-full bg-gray-100 dark:bg-gray-900">
        {!currentShift && (
            <div className="absolute inset-0 z-30 bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-gray-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Shift Not Started</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">
                        You need to open a shift to access the Point of Sale register.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => setIsStartShiftModalOpen(true)}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all transform hover:scale-[1.02] shadow-md"
                        >
                            Start Shift
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="px-4 pt-4 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Point of Sale</h1>
            <div className="flex items-center gap-3">
                <button onClick={() => setIsRetrieveOrderModalOpen(true)} className="relative px-3 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium flex items-center gap-2">
                    <ClipboardIcon className="w-4 h-4" />
                    Retrieve
                    {heldOrders.length > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                            {heldOrders.length}
                        </span>
                    )}
                </button>
                {currentShift && (
                    <button 
                        onClick={() => setIsCloseShiftModalOpen(true)}
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-semibold"
                    >
                        Close Shift
                    </button>
                )}
            </div>
        </div>

      <div className="flex flex-col md:flex-row gap-4 items-start p-4">
        <div className="w-full md:w-3/5 flex flex-col gap-4">
            <div className="flex rounded-lg bg-gray-200 dark:bg-gray-700 p-1 flex-shrink-0 sticky top-0 z-10 shadow-sm">
                <button 
                    onClick={() => setActiveTab('Register')}
                    className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'Register' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                >
                    Catalog
                </button>
                {canProcessReturns && (
                    <button 
                        onClick={() => setActiveTab('Returns')}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'Returns' ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Returns / Lookup
                    </button>
                )}
            </div>
            <div className="flex-col">
                {activeTab === 'Register' ? renderRegisterTab() : renderReturnLookupTab()}
            </div>
        </div>
        
        <div className="w-full md:w-2/5 flex flex-col gap-4">
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex gap-2 mb-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Scan barcode or search product..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setHighlightedIndex(-1); }}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        {searchTerm && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {allFilteredProducts.length > 0 ? (
                                    allFilteredProducts.map((p, index) => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => addToCart(p)} 
                                            className={`p-3 cursor-pointer flex justify-between items-center border-b border-gray-100 dark:border-gray-600 last:border-0 ${highlightedIndex === index ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                        >
                                            <span className="text-gray-900 dark:text-white font-medium">{p.name}</span>
                                            <span className="text-gray-500 dark:text-gray-300 text-sm">{formatCurrency(p.retailPrice)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-gray-500 dark:text-gray-400">No products found</div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex-shrink-0">
                        <FilterMenu activeFilterCount={selectedCategory !== 'All' ? 1 : 0}>
                            <FilterSelectItem 
                                label="Category" 
                                value={selectedCategory} 
                                onChange={setSelectedCategory} 
                                options={categoryOptions} 
                            />
                        </FilterMenu>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left mb-2">
                        <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-2 py-2">Item</th>
                                <th className="px-2 py-2 text-center">Qty</th>
                                <th className="px-2 py-2 text-right">Total</th>
                                <th className="px-1 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {cart.map(item => {
                                const isReturn = item.quantity < 0;
                                let isMaxReached = false;

                                if (isReturn && item.originalSaleId) {
                                    const originalSale = sales.find(s => s.id === item.originalSaleId);
                                    if (originalSale) {
                                        const originalItem = originalSale.items.find(i => 
                                            i.productId === item.productId && i.variantId === item.variantId
                                        );
                                        if (originalItem) {
                                            const maxReturnable = originalItem.quantity - (originalItem.returnedQuantity || 0);
                                            // item.quantity is negative, so |item.quantity| is how many we are returning
                                            if (Math.abs(item.quantity) >= maxReturnable) isMaxReached = true;
                                        }
                                    }
                                } else if (!isReturn) {
                                    if (item.quantity >= item.stock) isMaxReached = true;
                                }

                                return (
                                <tr key={item.id} className={item.quantity < 0 ? "bg-red-50 dark:bg-red-900/10" : ""}>
                                    <td className="px-2 py-3 whitespace-nowrap">
                                        <div className={`font-medium ${item.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                                            {item.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatCurrency(item.retailPrice)}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => updateQuantity(item, item.quantity > 0 ? -1 : 1)} className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-50 disabled:opacity-50 text-gray-600 dark:text-gray-200" disabled={item.quantity === 1 || item.quantity === -1}>
                                                <MinusIcon />
                                            </button>
                                            <span className={`w-6 text-center font-semibold text-gray-900 dark:text-white ${item.quantity < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{Math.abs(item.quantity)}</span>
                                            <button 
                                                onClick={() => updateQuantity(item, item.quantity > 0 ? 1 : -1)} 
                                                className="p-1 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-50 text-gray-600 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                disabled={isMaxReached}
                                            >
                                                <PlusIcon />
                                            </button>
                                        </div>
                                    </td>
                                    <td className={`px-2 py-3 text-right font-semibold whitespace-nowrap ${item.quantity < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {formatCurrency(item.retailPrice * item.quantity)}
                                    </td>
                                    <td className="px-1 py-3 text-center">
                                        <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 p-1"><TrashIcon /></button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {cart.length === 0 && ( <div className="text-center py-4 text-gray-500 dark:text-gray-400"><p>Cart is empty</p></div> )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="mb-4">
                    <button 
                        onClick={() => setIsCustomerModalOpen(true)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg border transition-colors ${selectedCustomer ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <div className="flex items-center gap-2">
                            <UserCircleIcon className={`h-5 w-5 ${selectedCustomer ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${selectedCustomer ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                                {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.publicId || 'N/A'})` : 'Add Customer'}
                            </span>
                        </div>
                        <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                    <button 
                        onClick={() => setIsClearCartConfirmOpen(true)} 
                        disabled={cart.length === 0}
                        className="flex flex-col items-center justify-center p-2 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <TrashIcon className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold uppercase">Clear</span>
                    </button>
                    <button 
                        onClick={() => setIsDiscountModalOpen(true)} 
                        disabled={cart.length === 0}
                        className={`flex flex-col items-center justify-center p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            cartDiscount 
                                ? (cartDiscount.value === 0 
                                    ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' 
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400')
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        <TagIcon className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold uppercase">{discountLabel}</span>
                    </button>
                    <button 
                        onClick={() => setIsHoldOrderModalOpen(true)}
                        disabled={cart.length === 0}
                        className="flex flex-col items-center justify-center p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                    >
                        <ClipboardIcon className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold uppercase">Hold</span>
                    </button>
                    <button 
                        onClick={() => setIsTaxModalOpen(true)} 
                        disabled={cart.length === 0}
                        className={`flex flex-col items-center justify-center p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                            cartTax 
                                ? (cartTax.value === 0 
                                    ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10' 
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400')
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                        <BanknotesIcon className="h-4 w-4 mb-1" />
                        <span className="text-[10px] font-bold uppercase">{taxLabel}</span>
                    </button>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {showSubtotal && (
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                    )}
                    {(totals.discount > 0) && (
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                            <span>Discount</span>
                            <span>-{formatCurrency(totals.discount)}</span>
                        </div>
                    )}
                    {(totals.tax > 0) && (
                        <div className="flex justify-between">
                            <span>Tax {cartTax ? '(Custom)' : (isTaxEnabled ? `(${taxRate * 100}%)` : '(0%)')}</span>
                            <span>{formatCurrency(totals.tax)}</span>
                        </div>
                    )}
                </div>
                
                <div className="flex justify-between items-center text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    <span>Total</span>
                    <span className={isRefund ? 'text-red-600 dark:text-red-400' : ''}>{formatCurrency(totals.total)}</span>
                </div>

                <button 
                    onClick={openPaymentModal}
                    disabled={cart.length === 0}
                    className={`w-full py-4 text-lg font-bold text-white rounded-lg shadow-lg transition-all ${
                        cart.length === 0 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : isRefund 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-0.5'
                    }`}
                >
                    {isRefund ? 'Process Refund' : 'Pay Now'}
                </button>
            </div>
        </div>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Payment" size="lg" key={paymentModalKey}>
        <PaymentModalContent total={totals.total} onCompleteSale={handleCompleteSale} onClose={() => setIsPaymentModalOpen(false)} />
      </Modal>

      <Modal isOpen={isReceiptModalOpen} onClose={startNewSale} title="Receipt" size="md">
        {lastSale && (
            <>
                <PrintableReceipt ref={printableAreaRef} sale={lastSale} />
                <div className="flex justify-end items-center gap-2 pt-4 no-print">
                    <button onClick={handleSaveAsImage} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <PhotoIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                    <button onClick={startNewSale} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">New Sale</button>
                </div>
            </>
        )}
      </Modal>

      <Modal isOpen={isDiscountModalOpen} onClose={() => setIsDiscountModalOpen(false)} title="Apply Discount" size="sm">
          <DiscountModalContent 
            currentDiscount={cartDiscount} 
            defaultDiscountRate={discountRate} 
            isDefaultDiscountEnabled={isDiscountEnabled} 
            defaultDiscountThreshold={discountThreshold}
            formatCurrency={formatCurrency}
            onApply={setCartDiscount} 
            onClose={() => setIsDiscountModalOpen(false)} 
          />
      </Modal>

      <Modal isOpen={isTaxModalOpen} onClose={() => setIsTaxModalOpen(false)} title="Tax Settings" size="sm">
          <TaxModalContent 
            currentTax={cartTax} 
            defaultTaxRate={taxRate}
            isDefaultTaxEnabled={isTaxEnabled}
            onApply={setCartTax} 
            onClose={() => setIsTaxModalOpen(false)} 
          />
      </Modal>

      <Modal isOpen={isClearCartConfirmOpen} onClose={() => setIsClearCartConfirmOpen(false)} title="Clear Cart" size="sm">
          <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">Are you sure you want to clear the cart? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                  <button onClick={() => setIsClearCartConfirmOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancel</button>
                  <button onClick={handleClearCart} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Clear Cart</button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} title="Select Customer" size="md">
          <CustomerSelectionModal onSelect={setSelectedCustomer} onClose={() => setIsCustomerModalOpen(false)} />
      </Modal>

      <Modal isOpen={isStartShiftModalOpen} onClose={() => setIsStartShiftModalOpen(false)} title="Start Shift" size="sm">
          <OpenShiftModal onOpenShift={(float) => { openShift(float); setIsStartShiftModalOpen(false); }} />
      </Modal>

      <Modal isOpen={isCloseShiftModalOpen} onClose={() => setIsCloseShiftModalOpen(false)} title="Close Shift" size="md">
          <CloseShiftModal onCloseShift={handleCloseShift} onCancel={() => setIsCloseShiftModalOpen(false)} />
      </Modal>

      <Modal isOpen={isHoldOrderModalOpen} onClose={() => setIsHoldOrderModalOpen(false)} title="Hold Order" size="sm">
          <HoldOrderModal onHold={handleHoldOrder} onCancel={() => setIsHoldOrderModalOpen(false)} />
      </Modal>

      <Modal isOpen={isRetrieveOrderModalOpen} onClose={() => setIsRetrieveOrderModalOpen(false)} title="Retrieve Held Order" size="md">
          <RetrieveOrderModal onClose={() => setIsRetrieveOrderModalOpen(false)} onLoad={handleLoadHeldOrder} onDelete={deleteHeldOrder} heldOrders={heldOrders} />
      </Modal>

      <Modal isOpen={isMissingItemsModalOpen} onClose={() => setIsMissingItemsModalOpen(false)} title="Missing Inventory Items" size="md">
          <MissingProductModal 
              missingItems={missingReturnItems} 
              onRefundOnly={handleRefundOnly} 
              onRestoreAndRefund={handleRestoreAndRefund} 
              onCancel={() => {
                  setIsMissingItemsModalOpen(false);
                  setPendingSalePayments(null);
              }}
          />
      </Modal>

      {variantSelectionProduct && (
          <VariantSelectionModal 
            product={variantSelectionProduct} 
            onConfirm={(prod, variant) => handleAddVariantToCart(prod, variant)} 
            onClose={() => setVariantSelectionProduct(null)} 
          />
      )}
    </div>
  );
};
