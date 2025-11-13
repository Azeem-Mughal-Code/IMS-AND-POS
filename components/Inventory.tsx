import React, { useState, useMemo, useEffect } from 'react';
import { Product, InventoryAdjustment, User, UserRole, InventoryViewState, Sale } from '../types';
import { Modal } from './common/Modal';
import { FilterMenu, FilterSelectItem } from './common/FilterMenu';
import { Pagination } from './common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon, ReceiveIcon, AdjustIcon, HistoryIcon, TrashIcon } from './Icons';

interface InventoryProps {
  products: Product[];
  sales: Sale[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => { success: boolean; message?: string };
  receiveStock: (productId: string, quantity: number) => void;
  adjustStock: (productId: string, quantity: number, reason: string) => void;
  inventoryAdjustments: InventoryAdjustment[];
  currentUser: User;
  currency: string;
  isIntegerCurrency: boolean;
  viewState: InventoryViewState;
  onViewStateUpdate: (updates: Partial<InventoryViewState>) => void;
}

const ProductForm: React.FC<{ product?: Product, onSubmit: (p: any) => void, onCancel: () => void }> = ({ product, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        sku: product?.sku || '',
        name: product?.name || '',
        retailPrice: product?.retailPrice || 0,
        costPrice: product?.costPrice || 0,
        stock: product?.stock || 0,
        lowStockThreshold: product?.lowStockThreshold || 0,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Retail Price</label>
                    <input type="number" name="retailPrice" value={formData.retailPrice} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cost Price</label>
                    <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} required min="0" step="0.01" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Stock</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} required min="0" step="1" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" disabled={!!product} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label>
                    <input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} required min="0" step="1" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Product</button>
            </div>
        </form>
    )
}

const StockActionForm: React.FC<{ title: string, onSubmit: (quantity: number, reason: string) => void, onCancel: () => void, requiresReason?: boolean }> = ({ title, onSubmit, onCancel, requiresReason=false }) => {
    const [quantity, setQuantity] = useState(0);
    const [reason, setReason] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(quantity, reason);
    }
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10))} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            {requiresReason && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Adjustment</label>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)} required placeholder="e.g. Stock count correction" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{title}</button>
            </div>
        </form>
    );
};

type SortableProductKeys = keyof Product;

export const Inventory: React.FC<InventoryProps> = ({ products, sales, addProduct, updateProduct, deleteProduct, receiveStock, adjustStock, inventoryAdjustments, currentUser, currency, isIntegerCurrency, viewState, onViewStateUpdate }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'receive' | 'adjust' | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<Product | null>(null);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: isIntegerCurrency ? 0 : 2,
    maximumFractionDigits: isIntegerCurrency ? 0 : 2,
  }).format(amount);

  const { searchTerm, stockFilter, sortConfig, currentPage, itemsPerPage } = viewState;
  const activeFilterCount = stockFilter !== 'All' ? 1 : 0;

  const stockFilterOptions = [
    { value: 'All', label: 'All Stock Status' },
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
  ];

  const requestSort = (key: SortableProductKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    onViewStateUpdate({ sortConfig: { key, direction } });
  };

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products
        .filter(p => {
            if (stockFilter === 'In Stock') return p.stock > p.lowStockThreshold;
            if (stockFilter === 'Low Stock') return p.stock > 0 && p.stock <= p.lowStockThreshold;
            if (stockFilter === 'Out of Stock') return p.stock <= 0;
            return true;
        })
        .filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );
    
    return filtered.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        let comparison = 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

}, [products, searchTerm, stockFilter, sortConfig]);

  const totalItems = filteredAndSortedProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
  }, [filteredAndSortedProducts, currentPage, itemsPerPage]);


  const handleOpenAddModal = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };
  
  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (productData: any) => {
    if (editingProduct) {
      updateProduct({ ...editingProduct, ...productData });
    } else {
      addProduct(productData);
    }
    setIsProductModalOpen(false);
    setEditingProduct(undefined);
  };

  const openStockModal = (productId: string, action: 'receive' | 'adjust') => {
      setSelectedProductId(productId);
      setStockAction(action);
      setIsStockModalOpen(true);
  };
  
  const handleStockSubmit = (quantity: number, reason: string) => {
      if(selectedProductId && stockAction) {
          if (stockAction === 'receive') {
              receiveStock(selectedProductId, quantity);
          } else {
              adjustStock(selectedProductId, quantity, reason);
          }
      }
      setIsStockModalOpen(false);
      setSelectedProductId(null);
      setStockAction(null);
  };

  const openHistoryModal = (product: Product) => {
    setViewingHistoryFor(product);
    setIsHistoryModalOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setFeedback(null);
    const hasSalesHistory = sales.some(sale => sale.items.some(item => item.id === product.id));
    if (hasSalesHistory) {
        setFeedback({type: 'error', text: 'Cannot delete product with sales history. Consider setting stock to zero.'});
    } else {
        setProductToDelete(product);
    }
  };

  const confirmDelete = () => {
    if (productToDelete) {
      const result = deleteProduct(productToDelete.id);
      if (result.success) {
        setFeedback({type: 'success', text: 'Product deleted successfully.'});
      } else {
        setFeedback({type: 'error', text: result.message || 'Failed to delete product.'});
      }
      setProductToDelete(null);
    }
  };


  const productHistory = useMemo(() => {
    if (!viewingHistoryFor) return [];
    return inventoryAdjustments
        .filter(adj => adj.productId === viewingHistoryFor.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingHistoryFor, inventoryAdjustments]);

  const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableProductKeys }> = ({ children, sortKey }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1.5 group">
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                {isSorted ? (
                    sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                ) : <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-500 transition-colors" />}
            </button>
        </th>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
        {currentUser.role === UserRole.Admin && (
          <button onClick={handleOpenAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
              Add Product
          </button>
        )}
      </div>
      
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'}`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-grow">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={searchTerm}
                        onChange={e => onViewStateUpdate({ searchTerm: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <FilterMenu activeFilterCount={activeFilterCount}>
                    <FilterSelectItem
                        label="Stock Status"
                        value={stockFilter}
                        onChange={(value) => onViewStateUpdate({ stockFilter: value })}
                        options={stockFilterOptions}
                    />
                </FilterMenu>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
              <tr>
                <SortableHeader sortKey="sku">SKU</SortableHeader>
                <SortableHeader sortKey="name">Name</SortableHeader>
                <SortableHeader sortKey="retailPrice">Retail Price</SortableHeader>
                <SortableHeader sortKey="costPrice">Cost Price</SortableHeader>
                <SortableHeader sortKey="stock">Stock</SortableHeader>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(p => (
                <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.sku}</td>
                  <td className="px-6 py-4">{p.name}</td>
                  <td className="px-6 py-4">{formatCurrency(p.retailPrice)}</td>
                  <td className="px-6 py-4">{formatCurrency(p.costPrice)}</td>
                  <td className={`px-6 py-4 font-semibold ${p.stock <= p.lowStockThreshold ? 'text-red-500' : 'text-green-500'}`}>{p.stock}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-1 sm:gap-2">
                        <button onClick={() => openHistoryModal(p)} title="View History" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <HistoryIcon />
                        </button>
                        {currentUser.role === UserRole.Admin && (
                        <>
                            <button onClick={() => openStockModal(p.id, 'receive')} title="Receive Stock" className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <ReceiveIcon />
                            </button>
                            <button onClick={() => openStockModal(p.id, 'adjust')} title="Adjust Stock" className="p-2 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <AdjustIcon />
                            </button>
                            <button onClick={() => handleOpenEditModal(p)} title="Edit Product" className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleDeleteClick(p)} title="Delete Product" className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <TrashIcon />
                            </button>
                        </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
           currentPage={currentPage}
           totalPages={totalPages}
           onPageChange={(page) => onViewStateUpdate({ currentPage: page })}
           itemsPerPage={itemsPerPage}
           totalItems={totalItems}
         />
      </div>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add New Product'} size="lg">
        <ProductForm product={editingProduct} onSubmit={handleProductSubmit} onCancel={() => setIsProductModalOpen(false)} />
      </Modal>

      <Modal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} title={stockAction === 'receive' ? 'Receive Stock' : 'Adjust Stock'} size="sm">
          <StockActionForm 
            title={stockAction === 'receive' ? 'Receive Stock' : 'Adjust Stock'}
            onSubmit={handleStockSubmit} 
            onCancel={() => setIsStockModalOpen(false)}
            requiresReason={stockAction === 'adjust'}
          />
      </Modal>
      
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`Stock History for ${viewingHistoryFor?.name}`} size="lg">
        {viewingHistoryFor && (
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Change</th>
                            <th scope="col" className="px-6 py-3">Reason</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productHistory.length > 0 ? productHistory.map((adj, index) => (
                            <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                <td className="px-6 py-4">{new Date(adj.date).toLocaleString()}</td>
                                <td className={`px-6 py-4 font-bold ${adj.quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                                </td>
                                <td className="px-6 py-4">{adj.reason}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="text-center py-10 text-gray-500 dark:text-gray-400">No history found for this product.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </Modal>

       <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirm Deletion" size="sm">
        {productToDelete && (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the product <span className="font-bold">{productToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setProductToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete Product
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};