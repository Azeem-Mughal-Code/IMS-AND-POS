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
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrder: (po: PurchaseOrder) => void;
  receivePOItems: (poId: string, receivedItems: { productId: string, quantity: number }[]) => void;
  viewState: ProcurementViewState;
  onSuppliersViewUpdate: (updates: Partial<ProcurementViewState['suppliers']>) => void;
  onPOsViewUpdate: (updates: Partial<ProcurementViewState['purchaseOrders']>) => void;
  currency: string;
}

// --- SUB-COMPONENTS ---

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
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full input-field" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label>
                    <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full input-field" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full input-field" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full input-field" />
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="mt-1 block w-full input-field" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Supplier</button>
            </div>
        </form>
    );
};

// --- MAIN PROCUREMENT COMPONENT ---
export const Procurement: React.FC<ProcurementProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'suppliers' | 'purchaseOrders'>('purchaseOrders');
    
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

    const requestSort = (key: keyof Supplier) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onSuppliersViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSorted = useMemo(() => {
        return suppliers
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a,b) => {
                const comparison = a[sortConfig.key as keyof Supplier]!.toString().localeCompare(b[sortConfig.key as keyof Supplier]!.toString());
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
                    <input type="text" value={searchTerm} onChange={e => onSuppliersViewUpdate({searchTerm: e.target.value})} placeholder="Search suppliers..." className="w-full pl-10 input-field" />
                </div>
                <button onClick={() => openModal()} className="btn-primary flex items-center gap-2"><PlusIcon /> Add Supplier</button>
            </div>
            {feedback && <p className={`px-4 text-sm ${feedback.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{feedback.text}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="table-header">
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
                            <tr key={s.id} className="table-row">
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

const PurchaseOrdersView: React.FC<ProcurementProps> = (props) => {
    // This would contain the logic for displaying, filtering, and managing purchase orders.
    // For brevity, this part is simplified. Full implementation would be similar to SuppliersView.
    return <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Purchase Orders</h2>
        <p className="text-gray-600 dark:text-gray-400">Purchase order management is under construction.</p>
    </div>;
}

// Minimalistic CSS classes for reuse
const globalStyles = `
  .input-field {
    @apply block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200;
  }
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700;
  }
  .btn-secondary {
    @apply px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500;
  }
  .table-header {
      @apply text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400;
  }
  .table-row {
      @apply bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600;
  }
`;

const StyleInjector: React.FC = () => {
    return <style>{globalStyles}</style>
};

// Add StyleInjector to Procurement component if needed, or define in a global stylesheet.
// For this single-file setup, this would be one way to scope styles.
