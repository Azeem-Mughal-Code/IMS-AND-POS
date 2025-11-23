
import React, { useState, useMemo, useRef } from 'react';
import { Customer, Sale, UserRole } from '../types';
import { useCustomers } from './context/CustomerContext';
import { useSales } from './context/SalesContext';
import { useAuth } from './context/AuthContext';
import { useUIState } from './context/UIStateContext';
import { useSettings } from './context/SettingsContext';
import { Modal } from './common/Modal';
import { Pagination } from './common/Pagination';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, HistoryIcon, PhotoIcon } from './Icons';
import { PrintableReceipt } from './common/PrintableReceipt';

declare var html2canvas: any;

type SortableCustomerKeys = 'id' | 'name' | 'email' | 'phone' | 'dateAdded' | 'orders' | 'totalSpent' | 'profit' | 'lastVisit';

const CustomerForm: React.FC<{
    customer?: Customer | null;
    onSubmit: (data: Omit<Customer, 'id' | 'dateAdded'>) => void;
    onCancel: () => void;
}> = ({ customer, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        address: customer?.address || '',
        notes: customer?.notes || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{customer ? 'Save Changes' : 'Add Customer'}</button>
            </div>
        </form>
    );
};

type TimeRange = 'today' | 'weekly' | 'monthly' | 'yearly' | 'all';

const TimeRangeButton: React.FC<{
    label: string;
    range: TimeRange;
    currentTimeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
}> = ({ label, range, currentTimeRange, setTimeRange }) => (
    <button
        onClick={() => setTimeRange(range)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            currentTimeRange === range
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const CustomerDetails: React.FC<{ customer: Customer; onClose: () => void }> = ({ customer, onClose }) => {
    const { sales } = useSales();
    const { formatCurrency, formatDateTime } = useSettings();
    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
    const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
    const printableAreaRef = useRef<HTMLDivElement>(null);

    const handleSaveAsImage = () => {
        if (printableAreaRef.current && viewingReceipt) {
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
                link.download = `receipt-${viewingReceipt.id}.png`;
                link.href = newCanvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    const getStartOfWeek = (date: Date): Date => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const filteredSales = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return sales.filter(s => {
            if (s.customerId !== customer.id) return false;
            
            const saleDate = new Date(s.date);
            switch (timeRange) {
                case 'today': return saleDate >= today;
                case 'weekly': return saleDate >= getStartOfWeek(now);
                case 'monthly': return saleDate >= new Date(now.getFullYear(), now.getMonth(), 1);
                case 'yearly': return saleDate >= new Date(now.getFullYear(), 0, 1);
                case 'all': default: return true;
            }
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [sales, customer.id, timeRange]);

    const stats = useMemo(() => {
        const totalSpent = filteredSales.reduce((acc, s) => acc + s.total, 0);
        const totalProfit = filteredSales.reduce((acc, s) => acc + s.profit, 0);
        const totalVisits = filteredSales.length;
        return { totalSpent, totalProfit, totalVisits };
    }, [filteredSales]);

    const getStatusBadge = (sale: Sale) => {
        const status = sale.type === 'Sale' ? sale.status : sale.type;
        const styles = {
            'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            'Return': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
            'Refunded': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            'Partially Refunded': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        };
        const style = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{customer.name}</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mt-1">
                        {customer.email && <p>Email: {customer.email}</p>}
                        {customer.phone && <p>Phone: {customer.phone}</p>}
                        {customer.address && <p>Address: {customer.address}</p>}
                    </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-none">
                    <TimeRangeButton label="Today" range="today" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                    <TimeRangeButton label="Week" range="weekly" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                    <TimeRangeButton label="Month" range="monthly" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                    <TimeRangeButton label="Year" range="yearly" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                    <TimeRangeButton label="All" range="all" currentTimeRange={timeRange} setTimeRange={setTimeRange} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-blue-300">Total Spent</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(stats.totalSpent)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-green-300">Total Profit</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{formatCurrency(stats.totalProfit)}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-purple-300">Total Visits</p>
                    <p className="text-xl font-bold text-purple-700 dark:text-purple-400">{stats.totalVisits}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-yellow-300">Avg. Order Value</p>
                    <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{formatCurrency(stats.totalVisits > 0 ? stats.totalSpent / stats.totalVisits : 0)}</p>
                </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Purchase History</h3>
            <div className="border rounded-lg dark:border-gray-700 overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Receipt ID</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Items</th>
                            <th className="px-6 py-3 text-right">Total</th>
                            <th className="px-6 py-3 text-right">Profit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredSales.length > 0 ? (
                            filteredSales.map(sale => (
                                <tr key={sale.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(sale.date)}</td>
                                    <td className="px-6 py-4 font-mono text-xs">
                                        <button 
                                            onClick={() => setViewingReceipt(sale)}
                                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                        >
                                            {sale.id}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(sale)}
                                    </td>
                                    <td className="px-6 py-4">{sale.items.reduce((acc, item) => acc + item.quantity, 0)} items</td>
                                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(sale.total)}</td>
                                    <td className="px-6 py-4 text-right text-green-600 dark:text-green-400">{formatCurrency(sale.profit)}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No sales found in this time range.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-4 flex justify-end">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
            </div>

            {viewingReceipt && (
                <Modal isOpen={!!viewingReceipt} onClose={() => setViewingReceipt(null)} title={`Receipt - ${viewingReceipt.id}`} size="md">
                    <PrintableReceipt ref={printableAreaRef} sale={viewingReceipt} />
                    <div className="flex justify-end items-center gap-2 pt-4 no-print">
                        <button onClick={handleSaveAsImage} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <PhotoIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                        <button onClick={() => setViewingReceipt(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export const Customers: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
    const { sales } = useSales();
    const { currentUser } = useAuth();
    const { customersViewState, onCustomersViewUpdate, showToast } = useUIState();
    const { formatDateTime, formatCurrency, paginationConfig } = useSettings();

    const [activeTab, setActiveTab] = useState<'personal' | 'valuation'>('personal');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

    const { searchTerm, sortConfig, currentPage } = customersViewState;
    const itemsPerPage = paginationConfig.customers || 10;

    const customerMetrics = useMemo(() => {
        const metrics: Record<string, { orders: number; totalSpent: number; profit: number; lastVisit: string }> = {};
        // Initialize for all customers
        customers.forEach(c => {
            metrics[c.id] = { orders: 0, totalSpent: 0, profit: 0, lastVisit: '' };
        });
        // Aggregate sales data
        sales.forEach(s => {
            if (s.customerId && metrics[s.customerId]) {
                metrics[s.customerId].orders += 1;
                metrics[s.customerId].totalSpent += s.total;
                metrics[s.customerId].profit += s.profit;
                const saleDate = s.date;
                if (!metrics[s.customerId].lastVisit || new Date(saleDate) > new Date(metrics[s.customerId].lastVisit)) {
                    metrics[s.customerId].lastVisit = saleDate;
                }
            }
        });
        return metrics;
    }, [customers, sales]);

    const handleFormSubmit = (data: Omit<Customer, 'id' | 'dateAdded'>) => {
        if (editingCustomer) {
            const result = updateCustomer(editingCustomer.id, data);
            if (result.success) {
                showToast('Customer updated successfully.', 'success');
                setIsModalOpen(false);
            } else {
                showToast(result.message || 'Failed to update.', 'error');
            }
        } else {
            const result = addCustomer(data);
            if (result.success) {
                showToast('Customer added successfully.', 'success');
                setIsModalOpen(false);
            } else {
                showToast(result.message || 'Failed to add.', 'error');
            }
        }
    };

    const handleDelete = () => {
        if (!customerToDelete) return;
        const result = deleteCustomer(customerToDelete.id);
        showToast('Customer deleted successfully.', 'success');
        setCustomerToDelete(null);
    };

    const requestSort = (key: SortableCustomerKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onCustomersViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSortedCustomers = useMemo(() => {
        return customers
            .filter(c => 
                c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm) ||
                c.id.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const key = sortConfig.key;
                let valA: string | number = '';
                let valB: string | number = '';

                if (key === 'orders' || key === 'totalSpent' || key === 'profit' || key === 'lastVisit') {
                    const metricA = customerMetrics[a.id];
                    const metricB = customerMetrics[b.id];
                    if (key === 'lastVisit') {
                        valA = metricA ? new Date(metricA.lastVisit).getTime() : 0;
                        valB = metricB ? new Date(metricB.lastVisit).getTime() : 0;
                    } else {
                        valA = metricA ? metricA[key] : 0;
                        valB = metricB ? metricB[key] : 0;
                    }
                } else {
                    valA = a[key] || '';
                    valB = b[key] || '';
                }

                let comparison = 0;
                if (key === 'dateAdded' || key === 'lastVisit') {
                    comparison = new Date(valA).getTime() - new Date(valB).getTime();
                } else if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                } else {
                    comparison = String(valA).localeCompare(String(valB));
                }
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [customers, searchTerm, sortConfig, customerMetrics]);

    const paginatedCustomers = filteredAndSortedCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredAndSortedCustomers.length / itemsPerPage);

    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableCustomerKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestSort(sortKey)}>
                <div className="flex items-center gap-1.5">
                    <span>{children}</span>
                    {isSorted ? (
                        sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                    ) : <ChevronDownIcon className="h-4 w-4 invisible" />}
                </div>
            </th>
        );
    };

    const canViewProfit = currentUser?.role === UserRole.Admin;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Customers</h1>
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    <button 
                        onClick={() => setActiveTab('personal')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'personal' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Personal Data
                    </button>
                    <button 
                        onClick={() => setActiveTab('valuation')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'valuation' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Valuation & Sales
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative flex-grow w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                            <input type="text" value={searchTerm} onChange={e => onCustomersViewUpdate({ searchTerm: e.target.value, currentPage: 1 })} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"><PlusIcon /> Add Customer</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <SortableHeader sortKey="id">ID</SortableHeader>
                                <SortableHeader sortKey="name">Name</SortableHeader>
                                
                                {activeTab === 'personal' && (
                                    <>
                                        <SortableHeader sortKey="email">Email</SortableHeader>
                                        <SortableHeader sortKey="phone">Phone</SortableHeader>
                                        <th className="px-6 py-3">Address</th>
                                        <SortableHeader sortKey="dateAdded">Date Added</SortableHeader>
                                    </>
                                )}

                                {activeTab === 'valuation' && (
                                    <>
                                        <SortableHeader sortKey="orders">Orders</SortableHeader>
                                        <SortableHeader sortKey="totalSpent">Spent</SortableHeader>
                                        {canViewProfit && <SortableHeader sortKey="profit">Profit</SortableHeader>}
                                        <SortableHeader sortKey="lastVisit">Last Visit</SortableHeader>
                                    </>
                                )}
                                
                                {activeTab === 'personal' && <th className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedCustomers.map(c => {
                                const metrics = customerMetrics[c.id];
                                return (
                                    <tr key={c.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        {activeTab === 'personal' ? (
                                            <td className="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white select-text">{c.id}</td>
                                        ) : (
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => setViewingCustomer(c)}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs font-semibold"
                                                >
                                                    {c.id}
                                                </button>
                                            </td>
                                        )}
                                        
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{c.name}</td>
                                        
                                        {activeTab === 'personal' && (
                                            <>
                                                <td className="px-6 py-4">{c.email || '-'}</td>
                                                <td className="px-6 py-4">{c.phone || '-'}</td>
                                                <td className="px-6 py-4 truncate max-w-xs" title={c.address}>{c.address || '-'}</td>
                                                <td className="px-6 py-4">{formatDateTime(c.dateAdded)}</td>
                                            </>
                                        )}

                                        {activeTab === 'valuation' && (
                                            <>
                                                <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{metrics.orders}</td>
                                                <td className="px-6 py-4 font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(metrics.totalSpent)}</td>
                                                {canViewProfit && <td className="px-6 py-4 text-green-600 dark:text-green-400">{formatCurrency(metrics.profit)}</td>}
                                                <td className="px-6 py-4 text-xs text-gray-500">{metrics.lastVisit ? formatDateTime(metrics.lastVisit) : 'Never'}</td>
                                            </>
                                        )}

                                        {activeTab === 'personal' && (
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:text-blue-700" title="Edit"><PencilIcon /></button>
                                                <button onClick={() => setCustomerToDelete(c)} className="p-1 text-red-500 hover:text-red-700" title="Delete"><TrashIcon /></button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {paginatedCustomers.length === 0 && (
                                <tr><td colSpan={activeTab === 'personal' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">No customers found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => onCustomersViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSortedCustomers.length} />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? 'Edit Customer' : 'Add Customer'}>
                <CustomerForm customer={editingCustomer} onSubmit={handleFormSubmit} onCancel={() => setIsModalOpen(false)} />
            </Modal>

            <Modal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} title="Confirm Deletion" size="sm">
                {customerToDelete && (
                    <div className="space-y-4">
                        <p className="text-gray-700 dark:text-gray-300">Are you sure you want to delete <strong>{customerToDelete.name}</strong>?</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setCustomerToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                        </div>
                    </div>
                )}
            </Modal>

            {viewingCustomer && (
                <Modal isOpen={!!viewingCustomer} onClose={() => setViewingCustomer(null)} title="Customer Valuation Details" size="xl">
                    <CustomerDetails customer={viewingCustomer} onClose={() => setViewingCustomer(null)} />
                </Modal>
            )}
        </div>
    );
};
