import React, { useState, useMemo } from 'react';
import { Product, InventoryAdjustment, User, UserRole } from '../types';
import { Modal } from './common/Modal';

interface InventoryProps {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  receiveStock: (productId: string, quantity: number) => void;
  adjustStock: (productId: string, quantity: number, reason: string) => void;
  inventoryAdjustments: InventoryAdjustment[];
  currentUser: User;
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

export const Inventory: React.FC<InventoryProps> = ({ products, addProduct, updateProduct, receiveStock, adjustStock, inventoryAdjustments, currentUser }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'receive' | 'adjust' | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<Product | null>(null);


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

  const productHistory = useMemo(() => {
    if (!viewingHistoryFor) return [];
    return inventoryAdjustments
        .filter(adj => adj.productId === viewingHistoryFor.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [viewingHistoryFor, inventoryAdjustments]);

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

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">SKU</th>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Retail Price</th>
              <th scope="col" className="px-6 py-3">Cost Price</th>
              <th scope="col" className="px-6 py-3">Stock</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.sku}</td>
                <td className="px-6 py-4">{p.name}</td>
                <td className="px-6 py-4">${p.retailPrice.toFixed(2)}</td>
                <td className="px-6 py-4">${p.costPrice.toFixed(2)}</td>
                <td className={`px-6 py-4 font-semibold ${p.stock <= p.lowStockThreshold ? 'text-red-500' : 'text-green-500'}`}>{p.stock}</td>
                <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                  {currentUser.role === UserRole.Admin && (
                    <>
                      <button onClick={() => handleOpenEditModal(p)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</button>
                      <button onClick={() => openStockModal(p.id, 'receive')} className="font-medium text-green-600 dark:text-green-500 hover:underline">Receive</button>
                      <button onClick={() => openStockModal(p.id, 'adjust')} className="font-medium text-yellow-600 dark:text-yellow-500 hover:underline">Adjust</button>
                    </>
                  )}
                  <button onClick={() => openHistoryModal(p)} className="font-medium text-gray-600 dark:text-gray-400 hover:underline">History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};