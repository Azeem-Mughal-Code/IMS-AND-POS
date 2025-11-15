import React, { useState, useMemo, useEffect } from 'react';
import { Product } from '../../types';
import { useAppContext } from '../context/AppContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, AdjustIcon, HistoryIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';
import { FilterMenu, FilterSelectItem } from '../common/FilterMenu';

const ProductForm: React.FC<{ product?: Product | null; onSubmit: (data: Omit<Product, 'id' | 'stock'>) => void; onCancel: () => void; }> = ({ product, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        sku: product?.sku || '',
        name: product?.name || '',
        retailPrice: product?.retailPrice || 0,
        costPrice: product?.costPrice || 0,
        lowStockThreshold: product?.lowStockThreshold || 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">SKU</label><input type="text" name="sku" value={formData.sku} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Retail Price</label><input type="number" name="retailPrice" value={formData.retailPrice} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Cost Price</label><input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Low Stock Threshold</label><input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{product ? 'Save Changes' : 'Add Product'}</button>
            </div>
        </form>
    );
};


export const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, adjustStock, inventoryViewState, onInventoryViewUpdate, currency, isIntegerCurrency } = useAppContext();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const { searchTerm, stockFilter, sortConfig, currentPage, itemsPerPage } = inventoryViewState;
    
    type SortableProductKeys = 'sku' | 'name' | 'stock' | 'retailPrice' | 'costPrice';

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency', currency, minimumFractionDigits: isIntegerCurrency ? 0 : 2, maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount);

    useEffect(() => { if (feedback) { const timer = setTimeout(() => setFeedback(null), 5000); return () => clearTimeout(timer); } }, [feedback]);

    const requestSort = (key: SortableProductKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onInventoryViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSortedProducts = useMemo(() => {
        return products
            .filter(p => (stockFilter === 'All' || (stockFilter === 'In Stock' && p.stock > p.lowStockThreshold) || (stockFilter === 'Low Stock' && p.stock <= p.lowStockThreshold && p.stock > 0) || (stockFilter === 'Out of Stock' && p.stock <= 0)))
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const valA = a[sortConfig.key as keyof Product];
                const valB = b[sortConfig.key as keyof Product];
                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
                else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [products, searchTerm, stockFilter, sortConfig]);

    const paginatedProducts = useMemo(() => filteredAndSortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredAndSortedProducts, currentPage, itemsPerPage]);

    const handleFormSubmit = (data: Omit<Product, 'id' | 'stock'>) => {
        if (editingProduct) {
            updateProduct({ ...editingProduct, ...data });
            setFeedback({ type: 'success', text: 'Product updated successfully.' });
        } else {
            addProduct({ ...data, stock: 0 });
            setFeedback({ type: 'success', text: 'Product added successfully.' });
        }
        setIsProductModalOpen(false);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            const result = deleteProduct(productToDelete.id);
            setFeedback(result);
            setProductToDelete(null);
        }
    };
    
    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableProductKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3">
                <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1.5 group">
                    <span>{children}</span>
                    {isSorted ? (
                        sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                    ) : (
                        <ChevronDownIcon className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                    )}
                </button>
            </th>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={searchTerm} onChange={e => onInventoryViewUpdate({ searchTerm: e.target.value })} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"><PlusIcon /> Add Product</button>
                        <FilterMenu activeFilterCount={stockFilter !== 'All' ? 1 : 0}>
                            <FilterSelectItem label="Stock Status" value={stockFilter} onChange={v => onInventoryViewUpdate({ stockFilter: v })} options={[{ value: 'All', label: 'All' }, { value: 'In Stock', label: 'In Stock' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Out of Stock', label: 'Out of Stock' }]} />
                        </FilterMenu>
                    </div>
                </div>
            </div>
            {feedback && <div className={`mx-4 mb-4 px-4 py-2 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{feedback.text}</div>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <SortableHeader sortKey="sku">SKU</SortableHeader>
                            <SortableHeader sortKey="name">Name</SortableHeader>
                            <SortableHeader sortKey="stock">Stock</SortableHeader>
                            <SortableHeader sortKey="retailPrice">Retail Price</SortableHeader>
                            <SortableHeader sortKey="costPrice">Cost Price</SortableHeader>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedProducts.map(p => (
                            <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-mono">{p.sku}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                <td className="px-6 py-4">{p.stock}</td><td className="px-6 py-4">{formatCurrency(p.retailPrice)}</td><td className="px-6 py-4">{formatCurrency(p.costPrice)}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} className="p-1 text-blue-500 hover:text-blue-700"><PencilIcon /></button>
                                    <button onClick={() => setProductToDelete(p)} className="p-1 text-red-500 hover:text-red-700"><TrashIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSortedProducts.length / itemsPerPage)} onPageChange={page => onInventoryViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSortedProducts.length} />
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'}><ProductForm product={editingProduct} onSubmit={handleFormSubmit} onCancel={() => setIsProductModalOpen(false)} /></Modal>
            <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirm Deletion">
                {productToDelete && <div><p>Are you sure you want to delete {productToDelete.name}? This cannot be undone.</p><div className="flex justify-end gap-2 pt-4"><button onClick={() => setProductToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button></div></div>}
            </Modal>
        </div>
    );
};