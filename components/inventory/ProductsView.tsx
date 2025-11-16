import React, { useState, useMemo, useEffect } from 'react';
import { Product, InventoryAdjustment } from '../../types';
import { useAppContext } from '../context/AppContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, AdjustIcon, HistoryIcon, ChevronUpIcon, ChevronDownIcon, ReceiveIcon } from '../Icons';
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

const ReceiveStockModal: React.FC<{ product: Product, onClose: () => void }> = ({ product, onClose }) => {
    const { receiveStock } = useAppContext();
    const [quantity, setQuantity] = useState(1);
    const handleSubmit = () => {
        if (quantity > 0) {
            receiveStock(product.id, quantity);
        }
        onClose();
    };
    return (
        <div className="space-y-4">
            <p>Current stock for <strong>{product.name}</strong> is {product.stock}.</p>
            <div>
                <label className="block text-sm font-medium">Quantity to Receive</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} min="1" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">Receive Stock</button>
            </div>
        </div>
    );
};

const AdjustStockModal: React.FC<{ product: Product, onClose: () => void }> = ({ product, onClose }) => {
    const { adjustStock } = useAppContext();
    const [newStock, setNewStock] = useState(product.stock);
    const [reason, setReason] = useState('');
    const handleSubmit = () => {
        if (newStock !== product.stock) {
            adjustStock(product.id, newStock, reason || 'Manual Adjustment');
        }
        onClose();
    };
    return (
        <div className="space-y-4">
             <p>Current stock for <strong>{product.name}</strong> is {product.stock}.</p>
            <div>
                <label className="block text-sm font-medium">New Stock Level</label>
                <input type="number" value={newStock} onChange={e => setNewStock(parseInt(e.target.value))} min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" />
            </div>
            <div>
                <label className="block text-sm font-medium">Reason for Adjustment</label>
                <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Cycle Count" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">Adjust Stock</button>
            </div>
        </div>
    );
};

const HistoryModal: React.FC<{ product: Product, onClose: () => void }> = ({ product, onClose }) => {
    const { inventoryAdjustments } = useAppContext();
    const productHistory = inventoryAdjustments.filter(adj => adj.productId === product.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return (
        <div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs uppercase dark:text-gray-400">
                        <tr><th className="p-2">Date</th><th className="p-2">Change</th><th className="p-2">Reason</th></tr>
                    </thead>
                    <tbody>
                        {productHistory.map((adj, i) => (
                             <tr key={i} className="border-b dark:border-gray-200 dark:bg-white">
                                <td className="p-2 whitespace-nowrap dark:text-gray-900">{new Date(adj.date).toLocaleString()}</td>
                                <td className={`p-2 font-semibold ${adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}</td>
                                <td className="p-2 dark:text-gray-900">{adj.reason}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {productHistory.length === 0 && <p className="p-4 text-center text-gray-500">No adjustment history found.</p>}
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700">
                 <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
            </div>
        </div>
    );
};

export const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, inventoryViewState, onInventoryViewUpdate, formatCurrency } = useAppContext();
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [receivingProduct, setReceivingProduct] = useState<Product | null>(null);
    const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

    const { searchTerm, stockFilter, sortConfig, currentPage, itemsPerPage } = inventoryViewState;
    
    type SortableProductKeys = 'sku' | 'name' | 'stock' | 'retailPrice' | 'costPrice';

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
            // FIX: Map the result from deleteProduct to the feedback state shape.
            setFeedback({ type: result.success ? 'success' : 'error', text: result.message || 'An error occurred.' });
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
                        <ChevronDownIcon className="h-4 w-4 invisible" />
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
            {feedback && <div className={`mx-4 mb-4 px-4 py-2 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'}`}>{feedback.text}</div>}
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
                                <td className="px-6 py-4 flex items-center gap-1">
                                    <button onClick={() => setReceivingProduct(p)} title="Receive Stock" className="p-2 text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ReceiveIcon /></button>
                                    <button onClick={() => setAdjustingProduct(p)} title="Adjust Stock" className="p-2 text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><AdjustIcon /></button>
                                    <button onClick={() => setHistoryProduct(p)} title="View History" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><HistoryIcon /></button>
                                    <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} title="Edit Product" className="p-2 text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><PencilIcon /></button>
                                    <button onClick={() => setProductToDelete(p)} title="Delete Product" className="p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><TrashIcon /></button>
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
             {receivingProduct && <Modal isOpen={!!receivingProduct} onClose={() => setReceivingProduct(null)} title={`Receive Stock: ${receivingProduct.name}`}><ReceiveStockModal product={receivingProduct} onClose={() => setReceivingProduct(null)} /></Modal>}
             {adjustingProduct && <Modal isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} title={`Adjust Stock: ${adjustingProduct.name}`}><AdjustStockModal product={adjustingProduct} onClose={() => setAdjustingProduct(null)} /></Modal>}
             {historyProduct && <Modal isOpen={!!historyProduct} onClose={() => setHistoryProduct(null)} title={`History: ${historyProduct.name}`}><HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} /></Modal>}
        </div>
    );
};