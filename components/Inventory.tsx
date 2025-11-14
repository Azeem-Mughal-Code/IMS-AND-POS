import React, { useState, useMemo, useEffect, forwardRef, useRef } from 'react';
import { Product, InventoryAdjustment, User, UserRole, InventoryViewState, Sale, PurchaseOrder, POItem, POViewState, ReportsViewState } from '../types';
import { Modal } from './common/Modal';
import { FilterMenu, FilterSelectItem } from './common/FilterMenu';
import { Pagination } from './common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon, ReceiveIcon, AdjustIcon, HistoryIcon, TrashIcon, PlusIcon, MinusIcon, PhotoIcon } from './Icons';

declare var html2canvas: any;

interface InventoryProps {
  products: Product[];
  sales: Sale[];
  purchaseOrders: PurchaseOrder[];
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => { success: boolean; message?: string };
  receiveStock: (productId: string, quantity: number) => void;
  adjustStock: (productId: string, quantity: number, reason: string) => void;
  receivePOItems: (poId: string, receivedItems: { productId: string, quantity: number }[]) => void;
  inventoryAdjustments: InventoryAdjustment[];
  currentUser: User;
  currency: string;
  isIntegerCurrency: boolean;
  viewState: InventoryViewState;
  onViewStateUpdate: (updates: Partial<InventoryViewState>) => void;
  poViewState: POViewState;
  onPOViewStateUpdate: (updates: Partial<POViewState>) => void;
  inventoryValuationViewState: ReportsViewState['inventoryValuation'];
  onInventoryValuationViewStateUpdate: (updates: Partial<ReportsViewState['inventoryValuation']>) => void;
  businessName: string;
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

const CreatePOModal: React.FC<{
    products: Product[];
    onClose: () => void;
    addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
    onPOCreated: (po: PurchaseOrder) => void;
    currency: string;
    isIntegerCurrency: boolean;
}> = ({ products, onClose, addPurchaseOrder, onPOCreated, currency, isIntegerCurrency }) => {
    const [supplierName, setSupplierName] = useState('');
    const [expectedDate, setExpectedDate] = useState(() => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([]);
    const [productSearch, setProductSearch] = useState('');

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: isIntegerCurrency ? 0 : 2, maximumFractionDigits: isIntegerCurrency ? 0 : 2 }).format(amount);

    const searchedProducts = useMemo(() => {
        if (!productSearch) return [];
        const itemIds = new Set(items.map(i => i.productId));
        return products.filter(p => !itemIds.has(p.id) && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))).slice(0, 5);
    }, [productSearch, products, items]);

    const addItem = (product: Product) => {
        const newItem: POItem = {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            quantityOrdered: 1,
            quantityReceived: 0,
            costPrice: product.costPrice,
        };
        setItems(prev => [...prev, newItem]);
        setProductSearch('');
    };

    const updateItem = (productId: string, field: 'quantityOrdered' | 'costPrice', value: number) => {
        setItems(prev => prev.map(item => item.productId === productId ? { ...item, [field]: value } : item));
    };

    const removeItem = (productId: string) => {
        setItems(prev => prev.filter(item => item.productId !== productId));
    };

    const totalCost = useMemo(() => items.reduce((sum, item) => sum + item.quantityOrdered * item.costPrice, 0), [items]);

    const handleSubmit = () => {
        if (!supplierName.trim() || items.length === 0) return;

        const po: Omit<PurchaseOrder, 'id'> = {
            supplierName: supplierName.trim(),
            dateCreated: new Date().toISOString(),
            dateExpected: new Date(expectedDate).toISOString(),
            status: 'Pending',
            items,
            notes,
            totalCost,
        };
        const newPO = addPurchaseOrder(po);
        onPOCreated(newPO);
    };

    return (
        <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier Name</label>
                    <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} required placeholder="Enter supplier name" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Date</label>
                    <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
            </div>
            <div className="relative">
                <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search to add products..." className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                {searchedProducts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg">
                        {searchedProducts.map(p => <div key={p.id} onClick={() => addItem(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer dark:text-gray-200">{p.name} ({p.sku})</div>)}
                    </div>
                )}
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0"><tr><th className="px-2 py-1 dark:text-gray-200">Product</th><th className="px-2 py-1 dark:text-gray-200">Qty</th><th className="px-2 py-1 dark:text-gray-200">Cost</th><th className="px-2 py-1 dark:text-gray-200">Total</th><th className="px-2 py-1"></th></tr></thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.productId} className="border-b dark:border-gray-700">
                                <td className="p-2 dark:text-gray-200">{item.name}</td>
                                <td className="p-2 w-20"><input type="number" min="1" value={item.quantityOrdered} onChange={e => updateItem(item.productId, 'quantityOrdered', parseInt(e.target.value) || 1)} className="w-full text-center rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200" /></td>
                                <td className="p-2 w-24"><input type="number" min="0" step="0.01" value={item.costPrice} onChange={e => updateItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)} className="w-full text-center rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-200" /></td>
                                <td className="p-2 w-24 text-right dark:text-gray-200">{formatCurrency(item.quantityOrdered * item.costPrice)}</td>
                                <td className="p-2 text-center w-10"><button onClick={() => removeItem(item.productId)} className="text-red-500"><TrashIcon /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end font-bold text-lg dark:text-white">Total: {formatCurrency(totalCost)}</div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button onClick={handleSubmit} disabled={items.length === 0 || !supplierName.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">Save Purchase Order</button>
            </div>
        </div>
    );
};

const PrintablePO = forwardRef<HTMLDivElement, { po: PurchaseOrder, currency: string, isIntegerCurrency: boolean, businessName: string }>(({ po, currency, isIntegerCurrency, businessName }, ref) => {
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: isIntegerCurrency ? 0 : 2, maximumFractionDigits: isIntegerCurrency ? 0 : 2 }).format(amount);
    return (
        <div className="printable-area p-4 text-gray-900 dark:text-white" ref={ref}>
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold">{businessName}</h2>
            </div>
            <h2 className="text-2xl font-bold mb-4">Purchase Order #{po.id}</h2>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div><strong>Supplier:</strong> {po.supplierName}</div>
                <div><strong>Date Created:</strong> {new Date(po.dateCreated).toLocaleDateString()}</div>
                <div><strong>Status:</strong> {po.status}</div>
                <div><strong>Date Expected:</strong> {new Date(po.dateExpected).toLocaleDateString()}</div>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 dark:bg-gray-700"><tr className="dark:text-gray-200"><th className="p-2">SKU</th><th className="p-2">Product</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Cost</th><th className="p-2 text-right">Total</th></tr></thead>
                <tbody>
                    {po.items.map(item => (
                        <tr key={item.productId} className="border-b dark:border-gray-600 dark:text-gray-200">
                            <td className="p-2">{item.sku}</td><td className="p-2">{item.name}</td>
                            <td className="p-2 text-right">{item.quantityOrdered}</td>
                            <td className="p-2 text-right">{formatCurrency(item.costPrice)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.costPrice * item.quantityOrdered)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-bold dark:text-gray-200"><td colSpan={4} className="p-2 text-right">Grand Total</td><td className="p-2 text-right">{formatCurrency(po.totalCost)}</td></tr>
                </tfoot>
            </table>
            {po.notes && <div className="mt-4 text-sm"><strong>Notes:</strong> {po.notes}</div>}
        </div>
    );
});

type SortableProductKeys = keyof Product;

const ProductsView: React.FC<InventoryProps> = ({ products, sales, addProduct, updateProduct, deleteProduct, receiveStock, adjustStock, inventoryAdjustments, currentUser, currency, isIntegerCurrency, viewState, onViewStateUpdate }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  const handleOpenAddModal = () => {
    setEditingProduct(undefined);
    setIsProductModalOpen(true);
  };

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
    <>
        {feedback && (
            <div className={`my-4 px-4 py-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'}`} role="alert">
            {feedback.text}
            </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto flex-grow">
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
                 {currentUser.role === UserRole.Admin && (
                    <button onClick={handleOpenAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full md:w-auto justify-center flex-shrink-0">
                        <PlusIcon /> Add Product
                    </button>
                )}
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
    </>
  );
}

const PurchaseOrdersView: React.FC<Pick<InventoryProps, 'purchaseOrders' | 'receivePOItems' | 'poViewState' | 'onPOViewStateUpdate' | 'currency' | 'isIntegerCurrency' | 'currentUser' | 'businessName'> & { setIsCreatePOModalOpen: (isOpen: boolean) => void }> = ({ purchaseOrders, receivePOItems, poViewState, onPOViewStateUpdate, currency, isIntegerCurrency, currentUser, setIsCreatePOModalOpen, businessName }) => {
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
    const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
    const printableRef = useRef<HTMLDivElement>(null);

    const handleSaveAsImage = (poId: string) => {
        if (printableRef.current) {
            html2canvas(printableRef.current, { 
                backgroundColor: '#ffffff',
                onclone: (clonedDoc) => {
                    clonedDoc.documentElement.classList.remove('dark');
                }
            }).then((canvas: HTMLCanvasElement) => {
                const PADDING = 20;
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
                link.download = `po-${poId}.png`;
                link.href = newCanvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: isIntegerCurrency ? 0 : 2,
        maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount);

    const { searchTerm, statusFilter, sortConfig, currentPage, itemsPerPage } = poViewState;
    
    type SortablePOKeys = 'id' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
    const statusOptions = [{value: 'All', label: 'All Statuses'}, {value: 'Pending', label: 'Pending'}, {value: 'Partial', label: 'Partial'}, {value: 'Received', label: 'Received'}];

    const requestSort = (key: SortablePOKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onPOViewStateUpdate({ sortConfig: { key, direction } });
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
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto flex-grow">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={searchTerm} onChange={e => onPOViewStateUpdate({searchTerm: e.target.value})} placeholder="Search POs..." className="w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    <FilterMenu activeFilterCount={statusFilter !== 'All' ? 1 : 0}>
                        <FilterSelectItem label="Status" value={statusFilter} onChange={v => onPOViewStateUpdate({statusFilter: v})} options={statusOptions} />
                    </FilterMenu>
                </div>
                {currentUser.role === UserRole.Admin && (
                    <button onClick={() => setIsCreatePOModalOpen(true)} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center gap-2 w-full md:w-auto justify-center flex-shrink-0">
                        <PlusIcon /> Create Purchase Order
                    </button>
                )}
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
                                <td className="px-6 py-4">{formatCurrency(po.totalCost)}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setViewingPO(po)} className="px-2 py-1 text-sm text-blue-600 hover:underline">View</button>
                                    {po.status !== 'Received' && <button onClick={() => setReceivingPO(po)} className="px-2 py-1 text-sm text-green-600 hover:underline">Receive</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSorted.length / itemsPerPage)} onPageChange={page => onPOViewStateUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
             
             {viewingPO &&
                <Modal isOpen={!!viewingPO} onClose={() => setViewingPO(null)} title={`Purchase Order - ${viewingPO.id}`}>
                    <PrintablePO ref={printableRef} po={viewingPO} currency={currency} isIntegerCurrency={isIntegerCurrency} businessName={businessName}/>
                    <div className="flex justify-end items-center gap-2 pt-4 no-print">
                        <button onClick={() => handleSaveAsImage(viewingPO.id)} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <PhotoIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
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

    const handleReceiveAll = () => {
        const newQuantities = po.items.reduce((acc, item) => {
            const maxReceivable = item.quantityOrdered - item.quantityReceived;
            if (maxReceivable > 0) {
                acc[item.productId] = maxReceivable;
            }
            return acc;
        }, {} as Record<string, number>);
        setReceivedQuantities(newQuantities);
    };

    const handleSubmit = () => {
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
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                        <tr className="dark:text-gray-200">
                            <th className="p-2 text-left">Product</th>
                            <th className="p-2 text-center">Ordered</th>
                            <th className="p-2 text-center">Received</th>
                            <th className="p-2 text-center">
                                Receiving Now
                                <button onClick={handleReceiveAll} className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none">
                                    (Receive All)
                                </button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {po.items.map(item => {
                            const maxReceivable = item.quantityOrdered - item.quantityReceived;
                            return (
                                <tr key={item.productId} className="border-b dark:border-gray-600 dark:text-gray-200">
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2 text-center">{item.quantityOrdered}</td>
                                    <td className="p-2 text-center">{item.quantityReceived}</td>
                                    <td className="p-2 text-center">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max={maxReceivable} 
                                            value={receivedQuantities[item.productId] || ''} 
                                            onChange={e => handleQuantityChange(item.productId, e.target.value)} 
                                            className="w-24 text-center rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 dark:text-gray-200" 
                                            disabled={maxReceivable <= 0}
                                        />
                                    </td>
                                </tr>
                            );
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

type SortableInventoryValuationKeys = 'sku' | 'name' | 'stock' | 'totalCostValue' | 'totalRetailValue' | 'potentialProfit';

const InventoryValuationView: React.FC<{
    products: Product[];
    viewState: ReportsViewState['inventoryValuation'];
    onViewStateUpdate: (updates: Partial<ReportsViewState['inventoryValuation']>) => void;
    currency: string;
    isIntegerCurrency: boolean;
}> = ({ products, viewState, onViewStateUpdate, currency, isIntegerCurrency }) => {
    
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: isIntegerCurrency ? 0 : 2,
        maximumFractionDigits: isIntegerCurrency ? 0 : 2,
    }).format(amount);

    const { searchTerm, sortConfig, currentPage, itemsPerPage } = viewState;

    const requestValuationSort = (key: SortableInventoryValuationKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onViewStateUpdate({ sortConfig: { key, direction } });
    };

    const { inventoryValuationData, valuationTotals } = useMemo(() => {
        const data = products.map(p => ({
            ...p,
            totalCostValue: p.costPrice * p.stock,
            totalRetailValue: p.retailPrice * p.stock,
            potentialProfit: (p.retailPrice - p.costPrice) * p.stock
        }));

        const totals = {
            totalCostValue: data.reduce((sum, p) => sum + p.totalCostValue, 0),
            totalRetailValue: data.reduce((sum, p) => sum + p.totalRetailValue, 0),
            potentialProfit: data.reduce((sum, p) => sum + p.potentialProfit, 0),
        };
        return { inventoryValuationData: data, valuationTotals: totals };
    }, [products]);

    const filteredAndSortedValuationData = useMemo(() => {
        const filtered = inventoryValuationData
            .filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.sku.toLowerCase().includes(searchTerm.toLowerCase())
            );

        return filtered.sort((a, b) => {
            const key = sortConfig.key;
            const valA = a[key as keyof typeof a];
            const valB = b[key as keyof typeof b];
            let comparison = 0;

            if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }, [inventoryValuationData, searchTerm, sortConfig]);

    const valuationTotalItems = filteredAndSortedValuationData.length;
    const valuationTotalPages = Math.ceil(valuationTotalItems / itemsPerPage);
    const paginatedValuationData = useMemo(() => {
        return filteredAndSortedValuationData.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredAndSortedValuationData, currentPage, itemsPerPage]);

    const SortableValuationHeader: React.FC<{ children: React.ReactNode, sortKey: SortableInventoryValuationKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3">
                <button onClick={() => requestValuationSort(sortKey)} className="flex items-center gap-1.5 group">
                    <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                    {isSorted ? (
                        sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                    ) : <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-500 transition-colors" />}
                </button>
            </th>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                 <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={searchTerm}
                        onChange={e => onViewStateUpdate({ searchTerm: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                        <tr>
                            <SortableValuationHeader sortKey="sku">SKU</SortableValuationHeader>
                            <SortableValuationHeader sortKey="name">Name</SortableValuationHeader>
                            <SortableValuationHeader sortKey="stock">Stock</SortableValuationHeader>
                            <SortableValuationHeader sortKey="totalCostValue">Total Cost Value</SortableValuationHeader>
                            <SortableValuationHeader sortKey="totalRetailValue">Total Retail Value</SortableValuationHeader>
                            <SortableValuationHeader sortKey="potentialProfit">Potential Profit</SortableValuationHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedValuationData.map(p => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.sku}</td>
                                <td className="px-6 py-4">{p.name}</td>
                                <td className="px-6 py-4">{p.stock}</td>
                                <td className="px-6 py-4">{formatCurrency(p.totalCostValue)}</td>
                                <td className="px-6 py-4">{formatCurrency(p.totalRetailValue)}</td>
                                <td className="px-6 py-4 font-semibold text-green-600 dark:text-green-400">{formatCurrency(p.potentialProfit)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                        <tr className="font-semibold text-gray-900 dark:text-white">
                            <th scope="row" colSpan={3} className="px-6 py-3 text-right">Totals</th>
                            <td className="px-6 py-3">{formatCurrency(valuationTotals.totalCostValue)}</td>
                            <td className="px-6 py-3">{formatCurrency(valuationTotals.totalRetailValue)}</td>
                            <td className="px-6 py-3">{formatCurrency(valuationTotals.potentialProfit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
             <Pagination
                currentPage={currentPage}
                totalPages={valuationTotalPages}
                onPageChange={(page) => onViewStateUpdate({ currentPage: page })}
                itemsPerPage={itemsPerPage}
                totalItems={valuationTotalItems}
            />
        </div>
    );
}

export const Inventory: React.FC<InventoryProps> = (props) => {
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [lastCreatedPO, setLastCreatedPO] = useState<PurchaseOrder | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'purchaseOrders' | 'valuation'>('products');
  const lastCreatedPORef = useRef<HTMLDivElement>(null);

  const handleSaveLastPOAsImage = () => {
    if (lastCreatedPORef.current && lastCreatedPO) {
        html2canvas(lastCreatedPORef.current, { 
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                clonedDoc.documentElement.classList.remove('dark');
            }
        }).then((canvas: HTMLCanvasElement) => {
            const PADDING = 20;
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
            link.download = `po-${lastCreatedPO.id}.png`;
            link.href = newCanvas.toDataURL('image/png');
            link.click();
        });
    }
  };

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);
  
  const handlePOCreated = (po: PurchaseOrder) => {
      setIsCreatePOModalOpen(false);
      setFeedback({ type: 'success', text: `Purchase Order ${po.id} created.`});
      setLastCreatedPO(po);
  };

  const TabButton: React.FC<{ tabId: 'products' | 'purchaseOrders' | 'valuation', label: string }> = ({ tabId, label }) => (
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
    <div className="p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Inventory Management</h1>
      </div>

       <div className="mb-6 flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start">
            <div className="flex items-center space-x-1">
                <TabButton tabId="products" label="Products" />
                <TabButton tabId="purchaseOrders" label="Purchase Orders" />
                {props.currentUser.role === UserRole.Admin && <TabButton tabId="valuation" label="Valuation" />}
            </div>
        </div>
      
      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'}`} role="alert">
          {feedback.text}
        </div>
      )}

      {activeTab === 'products' && (
          <ProductsView {...props} />
      )}
      {activeTab === 'purchaseOrders' && (
          <PurchaseOrdersView 
            {...props}
            setIsCreatePOModalOpen={setIsCreatePOModalOpen}
          />
      )}
      {activeTab === 'valuation' && props.currentUser.role === UserRole.Admin && (
          <InventoryValuationView 
            products={props.products}
            viewState={props.inventoryValuationViewState}
            onViewStateUpdate={props.onInventoryValuationViewStateUpdate}
            currency={props.currency}
            isIntegerCurrency={props.isIntegerCurrency}
          />
      )}
      
      {isCreatePOModalOpen &&
        <Modal isOpen={isCreatePOModalOpen} onClose={() => setIsCreatePOModalOpen(false)} title="Create Purchase Order" size="lg">
            <CreatePOModal 
                products={props.products}
                onClose={() => setIsCreatePOModalOpen(false)}
                addPurchaseOrder={props.addPurchaseOrder}
                onPOCreated={handlePOCreated}
                currency={props.currency}
                isIntegerCurrency={props.isIntegerCurrency}
            />
        </Modal>
      }

      {lastCreatedPO && 
        <Modal isOpen={!!lastCreatedPO} onClose={() => setLastCreatedPO(null)} title={`Purchase Order - ${lastCreatedPO.id}`}>
            <PrintablePO ref={lastCreatedPORef} po={lastCreatedPO} currency={props.currency} isIntegerCurrency={props.isIntegerCurrency} businessName={props.businessName} />
            <div className="flex justify-end items-center gap-2 pt-4 no-print">
                <button onClick={handleSaveLastPOAsImage} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <PhotoIcon className="h-5 w-5" />
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                <button onClick={() => setLastCreatedPO(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
            </div>
        </Modal>
      }
    </div>
  );
};
