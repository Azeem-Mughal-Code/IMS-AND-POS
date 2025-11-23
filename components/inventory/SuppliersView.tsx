
import React, { useState, useMemo } from 'react';
import { Supplier, SortConfig, SupplierSortKeys } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { useSettings } from '../context/SettingsContext';
import { useUIState } from '../context/UIStateContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { INITIAL_SUPPLIERS } from '../../constants';

// Self-contained Supplier Form
const SupplierForm: React.FC<{ 
    supplier?: Supplier | null; 
    onSubmit: (data: Omit<Supplier, 'id'>) => { success: boolean, message?: string }; 
    onCancel: () => void; 
}> = ({ supplier, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contactPerson: supplier?.contactPerson || '',
        email: supplier?.email || '',
        phone: supplier?.phone || '',
        address: supplier?.address || '',
    });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = onSubmit(formData);
        if (!result.success) {
            setError(result.message || 'An error occurred.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact Person</label><input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" /></div>
                 <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label><input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label><textarea name="address" value={formData.address} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" /></div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{supplier ? 'Save Changes' : 'Add Supplier'}</button>
            </div>
        </form>
    );
};


// Self-contained View for managing suppliers
export const SuppliersView: React.FC = () => {
    const { workspaceId } = useSettings();
    const { showToast } = useUIState();
    const [suppliers, setSuppliers] = usePersistedState<Supplier[]>(`ims-${workspaceId}-suppliers`, INITIAL_SUPPLIERS);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
    
    // Local view state management
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig<SupplierSortKeys>>({ key: 'name', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const handleAddSupplier = (data: Omit<Supplier, 'id'>) => {
        if (suppliers.some(s => s.name.toLowerCase() === data.name.toLowerCase())) {
            return { success: false, message: 'A supplier with this name already exists.' };
        }
        const newSupplier: Supplier = { ...data, id: `sup_${Date.now()}` };
        setSuppliers(prev => [...prev, newSupplier]);
        showToast('Supplier added successfully.', 'success');
        setIsModalOpen(false);
        return { success: true };
    };

    const handleUpdateSupplier = (data: Omit<Supplier, 'id'>) => {
        if (!editingSupplier) return { success: false };
        if (suppliers.some(s => s.name.toLowerCase() === data.name.toLowerCase() && s.id !== editingSupplier.id)) {
            return { success: false, message: 'A supplier with this name already exists.' };
        }
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...data } : s));
        showToast('Supplier updated successfully.', 'success');
        setIsModalOpen(false);
        setEditingSupplier(null);
        return { success: true };
    };
    
    const handleDeleteSupplier = () => {
        if (!deletingSupplier) return;
        // NOTE: In a real app, check if supplier is used in any POs before deleting.
        setSuppliers(prev => prev.filter(s => s.id !== deletingSupplier.id));
        showToast('Supplier deleted successfully.', 'success');
        setDeletingSupplier(null);
    }
    
    const filteredAndSorted = useMemo(() => {
        return suppliers
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())))
            .sort((a,b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                const comparison = String(valA).localeCompare(String(valB));
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [suppliers, searchTerm, sortConfig]);

    const paginated = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search suppliers..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"><PlusIcon /> Add Supplier</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                     <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">Supplier ID</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Contact Person</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(s => (
                            <tr key={s.id}>
                                <td data-label="ID" className="px-6 py-4 font-mono text-xs">{s.id}</td>
                                <td data-label="Name" className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.name}</td>
                                <td data-label="Contact" className="px-6 py-4">{s.contactPerson}</td>
                                <td data-label="Email" className="px-6 py-4">{s.email}</td>
                                <td data-label="Phone" className="px-6 py-4">{s.phone}</td>
                                <td data-label="Actions" className="px-6 py-4 flex items-center gap-2 justify-end">
                                    <button onClick={() => { setEditingSupplier(s); setIsModalOpen(true); }} className="p-1 text-blue-500 hover:text-blue-700"><PencilIcon /></button>
                                    <button onClick={() => setDeletingSupplier(s)} className="p-1 text-red-500"><TrashIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSorted.length / itemsPerPage)} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
            
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingSupplier(null); }} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}>
                <SupplierForm supplier={editingSupplier} onSubmit={editingSupplier ? handleUpdateSupplier : handleAddSupplier} onCancel={() => { setIsModalOpen(false); setEditingSupplier(null); }} />
            </Modal>
             <Modal isOpen={!!deletingSupplier} onClose={() => setDeletingSupplier(null)} title="Confirm Deletion">
                {deletingSupplier && (
                    <div>
                        <p className="text-gray-900 dark:text-gray-200">Are you sure you want to delete <span className="font-bold">{deletingSupplier.name}</span>?</p>
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setDeletingSupplier(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-md">Cancel</button>
                            <button onClick={handleDeleteSupplier} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};
