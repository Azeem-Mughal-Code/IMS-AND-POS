
import React, { useState, useMemo, useRef } from 'react';
import { Supplier, SortConfig, SupplierSortKeys } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { useSettings } from '../context/SettingsContext';
import { useUIState } from '../context/UIStateContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { PlusIcon, PencilIcon, TrashIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, PhotoIcon } from '../Icons';
import { INITIAL_SUPPLIERS } from '../../constants';
import { generateUUIDv7, generateUniqueNanoID } from '../../utils/idGenerator';

declare var html2canvas: any;

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

const SupplierDetailsModal: React.FC<{ supplier: Supplier; onClose: () => void }> = ({ supplier, onClose }) => {
    const printableRef = useRef<HTMLDivElement>(null);

    const handleSaveAsImage = () => {
        if (printableRef.current) {
            html2canvas(printableRef.current, { 
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
                link.download = `supplier-${supplier.publicId || supplier.id}.png`;
                link.href = newCanvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="printable-area p-4" ref={printableRef}>
                <div className="text-center border-b pb-4 mb-4 border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{supplier.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{supplier.publicId || supplier.id}</p>
                </div>
                <div className="space-y-4 text-gray-800 dark:text-gray-200">
                    {supplier.contactPerson && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact Person</p>
                            <p className="text-lg">{supplier.contactPerson}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {supplier.email && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Email</p>
                                <p>{supplier.email}</p>
                            </div>
                        )}
                        {supplier.phone && (
                            <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Phone</p>
                                <p>{supplier.phone}</p>
                            </div>
                        )}
                    </div>
                    {supplier.address && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Address</p>
                            <p className="whitespace-pre-wrap">{supplier.address}</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t pt-4 dark:border-gray-700 no-print">
                <button onClick={handleSaveAsImage} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Save Image">
                    <PhotoIcon className="h-5 w-5" />
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
            </div>
        </div>
    );
};


// Self-contained View for managing suppliers
export const SuppliersView: React.FC = () => {
    const { workspaceId, paginationConfig } = useSettings();
    const { showToast, suppliersViewState, onSuppliersViewUpdate } = useUIState();
    const [suppliers, setSuppliers] = usePersistedState<Supplier[]>(`ims-${workspaceId}-suppliers`, INITIAL_SUPPLIERS);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
    const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
    
    const { searchTerm, sortConfig, currentPage } = suppliersViewState;
    const itemsPerPage = paginationConfig.suppliers || 10;

    const requestSort = (key: SupplierSortKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onSuppliersViewUpdate({ sortConfig: { key, direction } });
    };

    const handleAddSupplier = (data: Omit<Supplier, 'id'>) => {
        if (suppliers.some(s => s.name.toLowerCase() === data.name.toLowerCase())) {
            return { success: false, message: 'A supplier with this name already exists.' };
        }
        
        const internalId = generateUUIDv7();
        const publicId = generateUniqueNanoID(suppliers, (s, id) => s.publicId === id, 6, 'SUP-');

        const newSupplier: Supplier = { 
            ...data, 
            id: internalId,
            publicId: publicId
        };
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
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) || (s.publicId && s.publicId.toLowerCase().includes(searchTerm.toLowerCase())))
            .sort((a,b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                const comparison = String(valA).localeCompare(String(valB));
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [suppliers, searchTerm, sortConfig]);

    const paginated = filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SupplierSortKeys }> = ({ children, sortKey }) => {
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={searchTerm} onChange={e => onSuppliersViewUpdate({ searchTerm: e.target.value, currentPage: 1 })} placeholder="Search suppliers..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"><PlusIcon /> Add Supplier</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                     <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <SortableHeader sortKey="publicId">Supplier ID</SortableHeader>
                            <SortableHeader sortKey="name">Name</SortableHeader>
                            <SortableHeader sortKey="contactPerson">Contact Person</SortableHeader>
                            <SortableHeader sortKey="email">Email</SortableHeader>
                            <SortableHeader sortKey="phone">Phone</SortableHeader>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(s => (
                            <tr key={s.id}>
                                <td data-label="ID" className="px-6 py-4 font-mono text-xs">
                                    <button onClick={() => setViewingSupplier(s)} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                        {s.publicId || s.id}
                                    </button>
                                </td>
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
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => onSuppliersViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
            
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

            {viewingSupplier && (
                <Modal isOpen={!!viewingSupplier} onClose={() => setViewingSupplier(null)} title="Supplier Details" size="md">
                    <SupplierDetailsModal supplier={viewingSupplier} onClose={() => setViewingSupplier(null)} />
                </Modal>
            )}
        </div>
    );
};
