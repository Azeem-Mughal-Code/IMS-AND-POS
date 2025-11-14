import React, { useState, useMemo } from 'react';
import { Supplier, PurchaseOrder, Product, POItem, ProcurementViewState } from '../types';
import { Modal } from './common/Modal';
import { Pagination } from './common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, PencilIcon, TrashIcon, ReceiveIcon } from './Icons';
import { FilterMenu, FilterSelectItem } from './common/FilterMenu';
import { Dropdown } from './common/Dropdown';

// --- PROPS INTERFACE ---
interface ProcurementProps {
  products: Product[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (supplierId: string) => { success: boolean, message?: string };
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
  updatePurchaseOrder: (po: PurchaseOrder) => void;
  receivePOItems: (poId: string, receivedItems: { productId: string, quantity: number }[]) => void;
  viewState: ProcurementViewState;
  onSuppliersViewUpdate: (updates: Partial<ProcurementViewState['suppliers']>) => void;
  onPOsViewUpdate: (updates: Partial<ProcurementViewState['purchaseOrders']>) => void;
  currency: string;
  isIntegerCurrency: boolean;
}

const formatCurrency = (amount: number, currency: string, isIntegerCurrency: boolean) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isIntegerCurrency ? 0 : 2,
    maximumFractionDigits: isIntegerCurrency ? 0 : 2,
}).format(amount);


const SupplierForm: React.FC<{ supplier?: Supplier, onSubmit: (data: Omit<Supplier, 'id'>) => void, onCancel: () => void }> = ({ supplier, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contactPerson: supplier?.contactPerson || '',
        email: supplier?.email || '',
        phone: supplier?.phone || '',
        address: supplier?.address || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label>
                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Supplier</button>
            </div>
        </form>
    );
};

const PrintablePO: React.FC<{ po: PurchaseOrder, currency: string, isIntegerCurrency: boolean }> = ({ po, currency, isIntegerCurrency }) => (
    <div className="printable-area p-4 text-gray-900 dark:text-white">
        <h2 className="text-2xl font-bold mb-4">Purchase Order #{po.id}</h2>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div><strong>Supplier:</strong> {po.supplierName}</div>
            <div><strong>Date Created:</strong> {new Date(po.dateCreated).toLocaleDateString()}</div>
            <div><strong>Status:</strong> {po.status}</div>
            <div><strong>Date Expected:</strong> {new Date(po.dateExpected).toLocaleDateString()}</div>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-100 dark:bg-gray-700"><tr><th className="p-2">SKU</th><th className="p-2">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Cost</th><th className="p-2 text-right">Total</th></tr></thead>
            <tbody>
                {po.items.map(item => (
                    <tr key={item.productId} className="border-b dark:border-gray-600">
                        <td className="p-2">{item.sku}</td><td className="p-2">{item.name}</td>
                        <td className="p-2 text-right">{item.quantityOrdered}</td>
                        <td className="p-2 text-right">{formatCurrency(item.costPrice, currency, isIntegerCurrency)}</td>
                        <td className="p-2 text-right">{formatCurrency(item.costPrice * item.quantityOrdered, currency, isIntegerCurrency)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="font-bold"><td colSpan={4} className="p-2 text-right">Grand Total</td><td className="p-2 text-right">{formatCurrency(po.totalCost, currency, isIntegerCurrency)}</td></tr>
            </tfoot>
        </table>
        {po.notes && <div className="mt-4 text-sm"><strong>Notes:</strong> {po.notes}</div>}
    </div>
);

const ReceivePOModal: React.FC<{
    po: PurchaseOrder;
    onClose: () => void;
    receivePOItems: (poId: string, items: { productId: string, quantity: number }[]) => void;
}> = ({ po, onClose, receivePOItems }) => {
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

    const handleQuantityChange = (productId: string, value: string) => {
        const item = po.items.find(i => i.productId === productId);
        if (!item) return;
        const maxReceivable = item.quantityOrdered - item.quantityReceived;
        const quantity = Math.max(0, Math.min(parseInt(value) || 0, maxReceivable));
        setReceivedQuantities(prev => ({ ...prev, [productId]: quantity }));
    };

    const handleSubmit = () => {
        // FIX: Use Object.keys to avoid TypeScript inferring the quantity as `unknown`.
        const itemsToReceive = Object.keys(receivedQuantities)
            .filter((productId) => receivedQuantities[productId] > 0)
            .map((productId) => ({ productId, quantity: receivedQuantities[productId] }));

        if (itemsToReceive.length > 0) {
            receivePOItems(po.id, itemsToReceive);
        }
        onClose();
    };

    return (
        <div className="space-y-4">
            <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700"><tr><th className="p-2 text-left">Product</th><th className="p-2">Ordered</th><th className="p-2">Received</th><th className="p-2">Receiving Now</th></tr></thead>
                    <tbody>
                        {po.items.map(item => {
                            const maxReceivable = item.quantityOrdered - item.quantityReceived;
                            return (
                                <tr key={item.productId} className="border-b dark:border-gray-600">
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2 text-center">{item.quantityOrdered}</td>
                                    <td className="p-2 text-center">{item.quantityReceived}</td>
                                    <td className="p-2"><input type="number" min="0" max={maxReceivable} value={receivedQuantities[item.productId] || ''} onChange={e => handleQuantityChange(item.productId, e.target.value)} className="w-24 text-center rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" disabled={maxReceivable <= 0} /></td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">Receive Items</button>
            </div>
        </div>
    );
};


// --- MAIN PROCUREMENT COMPONENT ---
export const Procurement: React.FC<ProcurementProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'purchaseOrders' | 'suppliers'>('purchaseOrders');
    
    const TabButton: React.FC<{ tabId: 'suppliers' | 'purchaseOrders', label: string }> = ({ tabId, label }) => (
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
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Procurement</h1>
                <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    <div className="flex items-center space-x-1">
                       <TabButton tabId="purchaseOrders" label="Purchase Orders" />
                       <TabButton tabId="suppliers" label="Suppliers" />
                    </div>
                </div>
            </div>
            {activeTab === 'suppliers' ? <SuppliersView {...props} /> : <PurchaseOrdersView {...props} />}
        </div>
    )
};

const SuppliersView: React.FC<ProcurementProps> = ({ suppliers, addSupplier, updateSupplier, deleteSupplier, viewState, onSuppliersViewUpdate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { searchTerm, sortConfig, currentPage, itemsPerPage } = viewState.suppliers;

    type SortableSupplierKeys = keyof Omit<Supplier, 'id' | 'address'>;

    const requestSort = (key: SortableSupplierKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onSuppliersViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSorted = useMemo(() => {
        return suppliers
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => {
                const valA = a[sortConfig.key as SortableSupplierKeys] || '';
                const valB = b[sortConfig.key as SortableSupplierKeys] || '';
                const comparison = valA.toString().localeCompare(valB.toString());
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [suppliers, searchTerm, sortConfig]);

    const paginated = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const openModal = (supplier?: Supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleSubmit = (data: Omit<Supplier, 'id'>) => {
        if (editingSupplier) {
            updateSupplier({ ...editingSupplier, ...data });
        } else {
            addSupplier(data);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        const result = deleteSupplier(id);
        setFeedback(result.success ? {type: 'success', text: 'Supplier deleted.'} : {type: 'error', text: result.message!});
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4 flex justify-between items-center">
                <div className="relative flex-grow max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input type="text" value={searchTerm} onChange={e => onSuppliersViewUpdate({searchTerm: e.target.value})} placeholder="Search suppliers..." className="w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                <button onClick={() => openModal()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><PlusIcon /> Add Supplier</button>
            </div>
            {feedback && <p className={`px-4 text-sm ${feedback.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{feedback.text}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Contact Person</th>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Phone</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(s => (
                            <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.name}</td>
                                <td className="px-6 py-4">{s.contactPerson}</td>
                                <td className="px-6 py-4">{s.email}</td>
                                <td className="px-6 py-4">{s.phone}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => openModal(s)} className="p-1 text-blue-500 hover:text-blue-700"><PencilIcon/></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSorted.length / itemsPerPage)} onPageChange={page => onSuppliersViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'} size="lg">
                <SupplierForm supplier={editingSupplier} onSubmit={handleSubmit} onCancel={() => setIsModalOpen(false)} />
             </Modal>
        </div>
    )
}

const PurchaseOrdersView: React.FC<ProcurementProps> = ({ purchaseOrders, receivePOItems, viewState, onPOsViewUpdate, currency, isIntegerCurrency }) => {
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
    const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);

    const { searchTerm, statusFilter, sortConfig, currentPage, itemsPerPage } = viewState.purchaseOrders;
    
    type SortablePOKeys = 'id' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
    const statusOptions = [{value: 'All', label: 'All Statuses'}, {value: 'Pending', label: 'Pending'}, {value: 'Partial', label: 'Partial'}, {value: 'Received', label: 'Received'}];

    const requestSort = (key: SortablePOKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onPOsViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSorted = useMemo(() => {
        return purchaseOrders
            .filter(po => 
                (statusFilter === 'All' || po.status === statusFilter) &&
                (po.id.toLowerCase().includes(searchTerm.toLowerCase()) || po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a,b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
                else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
                
                if (sortConfig.key === 'dateCreated') return sortConfig.direction === 'ascending' ? comparison : -comparison; // default date sort is descending
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [purchaseOrders, searchTerm, statusFilter, sortConfig]);

    const paginated = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusChip = (status: 'Pending' | 'Partial' | 'Received') => {
        const styles = {
            Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            Partial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            Received: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={searchTerm} onChange={e => onPOsViewUpdate({searchTerm: e.target.value})} placeholder="Search POs..." className="w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    <FilterMenu activeFilterCount={statusFilter !== 'All' ? 1 : 0}>
                        <FilterSelectItem label="Status" value={statusFilter} onChange={v => onPOsViewUpdate({statusFilter: v})} options={statusOptions} />
                    </FilterMenu>
                </div>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">PO ID</th><th className="px-6 py-3">Supplier</th><th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Status</th><th className="px-6 py-3">Total</th><th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(po => (
                            <tr key={po.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-mono text-gray-900 dark:text-white">{po.id}</td>
                                <td className="px-6 py-4">{po.supplierName}</td>
                                <td className="px-6 py-4">{new Date(po.dateCreated).toLocaleDateString()}</td>
                                <td className="px-6 py-4">{getStatusChip(po.status)}</td>
                                <td className="px-6 py-4">{formatCurrency(po.totalCost, currency, isIntegerCurrency)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setViewingPO(po)} className="px-2 py-1 text-sm text-blue-600 hover:underline">View</button>
                                    {po.status !== 'Received' && <button onClick={() => setReceivingPO(po)} className="px-2 py-1 text-sm text-green-600 hover:underline">Receive</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSorted.length / itemsPerPage)} onPageChange={page => onPOsViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
             
             {viewingPO &&
                <Modal isOpen={!!viewingPO} onClose={() => setViewingPO(null)} title={`Purchase Order - ${viewingPO.id}`}>
                    <PrintablePO po={viewingPO} currency={currency} isIntegerCurrency={isIntegerCurrency} />
                    <div className="flex justify-end gap-2 pt-4 no-print">
                        <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Print</button>
                        <button onClick={() => setViewingPO(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
                    </div>
                </Modal>
             }
             {receivingPO &&
                <Modal isOpen={!!receivingPO} onClose={() => setReceivingPO(null)} title={`Receive Items for PO #${receivingPO.id}`}>
                    <ReceivePOModal po={receivingPO} onClose={() => setReceivingPO(null)} receivePOItems={receivePOItems} />
                </Modal>
             }
        </div>
    );
};
