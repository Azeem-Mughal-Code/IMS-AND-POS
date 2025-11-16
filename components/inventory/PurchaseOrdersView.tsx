import React, { useState, useMemo, useRef, forwardRef } from 'react';
import { PurchaseOrder, POItem, Product, Supplier } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
// FIX: Replaced useAppContext with specific context hooks to resolve import error.
import { useProducts } from '../context/ProductContext';
import { useSales } from '../context/SalesContext';
import { useSettings } from '../context/SettingsContext';
import { useUIState } from '../context/UIStateContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, PlusIcon, TrashIcon, PhotoIcon, EyeIcon, ReceiveIcon } from '../Icons';
import { FilterMenu, FilterSelectItem } from '../common/FilterMenu';

declare var html2canvas: any;

const PrintablePO = forwardRef<HTMLDivElement, { po: PurchaseOrder }>(({ po }, ref) => {
    // FIX: Replaced useAppContext with useSettings hook.
    const { businessName, formatCurrency, formatDateTime } = useSettings();

    return (
        <div className="printable-area text-gray-900 dark:text-white" ref={ref}>
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold">{businessName}</h2>
                <p className="text-lg">Purchase Order</p>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs">
                <div><strong>PO Number:</strong> <span className="font-mono">{po.id}</span></div>
                <div><strong>Supplier:</strong> {po.supplierName}</div>
                <div><strong>Date Created:</strong> {formatDateTime(po.dateCreated, { year: 'numeric', month: 'numeric', day: 'numeric' })}</div>
                <div><strong>Date Expected:</strong> {formatDateTime(po.dateExpected, { year: 'numeric', month: 'numeric', day: 'numeric' })}</div>
                <div><strong>Status:</strong> {po.status}</div>
            </div>
            <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <tr>
                        <th className="py-0.5 px-2">SKU</th>
                        <th className="py-0.5 px-2">Product</th>
                        <th className="py-0.5 px-2 text-right">Qty</th>
                        <th className="py-0.5 px-2 text-right">Cost</th>
                        <th className="py-0.5 px-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-white">
                    {po.items.map(item => (
                        <tr key={item.productId} className="border-b dark:border-gray-600">
                            <td className="py-0.5 px-2">{item.sku}</td>
                            <td className="py-0.5 px-2">{item.name}</td>
                            <td className="py-0.5 px-2 text-right">{item.quantityOrdered}</td>
                            <td className="py-0.5 px-2 text-right">{formatCurrency(item.costPrice)}</td>
                            <td className="py-0.5 px-2 text-right">{formatCurrency(item.costPrice * item.quantityOrdered)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="text-gray-900 dark:text-white">
                    <tr className="font-bold">
                        <td colSpan={4} className="py-0.5 px-2 text-right">Grand Total</td>
                        <td className="py-0.5 px-2 text-right">{formatCurrency(po.totalCost)}</td>
                    </tr>
                </tfoot>
            </table>
            {po.notes && <div className="mt-4 text-xs"><strong>Notes:</strong> {po.notes}</div>}
        </div>
    );
});

const ReceivePOModal: React.FC<{ po: PurchaseOrder; onClose: () => void; }> = ({ po, onClose }) => {
    // FIX: Replaced useAppContext with useSales hook.
    const { receivePOItems } = useSales();
    const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

    const handleQuantityChange = (productId: string, value: string) => {
        const item = po.items.find(i => i.productId === productId);
        if (!item) return;
        const maxReceivable = item.quantityOrdered - item.quantityReceived;
        const quantity = Math.max(0, Math.min(parseInt(value) || 0, maxReceivable));
        setReceivedQuantities(prev => ({ ...prev, [productId]: quantity }));
    };

    const handleReceiveAll = () => {
        const newQuantities: Record<string, number> = {};
        po.items.forEach(item => {
            const maxReceivable = item.quantityOrdered - item.quantityReceived;
            if (maxReceivable > 0) {
                newQuantities[item.productId] = maxReceivable;
            }
        });
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
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 uppercase">
                        <tr>
                            <th className="p-2 text-left">Product</th>
                            <th className="p-2">Ordered</th>
                            <th className="p-2">Received</th>
                            <th className="p-2">Receiving Now</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-900 dark:text-white">
                        {po.items.map(item => {
                            const maxReceivable = item.quantityOrdered - item.quantityReceived;
                            return (
                                <tr key={item.productId} className="border-b dark:border-gray-600 bg-white dark:bg-gray-800">
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2 text-center">{item.quantityOrdered}</td>
                                    <td className="p-2 text-center">{item.quantityReceived}</td>
                                    <td className="p-2">
                                        <input type="number" min="0" max={maxReceivable} value={receivedQuantities[item.productId] || ''} onChange={e => handleQuantityChange(item.productId, e.target.value)} className="w-24 text-center rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" disabled={maxReceivable <= 0} />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={handleReceiveAll} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Receive All</button>
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md">Receive Items</button>
            </div>
        </div>
    );
};

const CreatePOModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    // FIX: Replaced useAppContext with specific context hooks.
    const { products } = useProducts();
    const { addPurchaseOrder } = useSales();
    const { formatCurrency, businessName } = useSettings();
    const [suppliers] = useLocalStorage<Supplier[]>(`ims-${businessName}-suppliers`, []);

    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [customSupplierName, setCustomSupplierName] = useState('');
    const [items, setItems] = useState<POItem[]>([]);
    const [expectedDate, setExpectedDate] = useState<string>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default to 1 week from now
    const [notes, setNotes] = useState('');
    const [productSearch, setProductSearch] = useState('');

    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        const currentItemIds = new Set(items.map(i => i.productId));
        return products.filter(p => !currentItemIds.has(p.id) && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))).slice(0, 5);
    }, [productSearch, products, items]);

    const handleAutoFill = () => {
        const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold);
        const newItems: POItem[] = lowStockProducts.map(p => {
            const reorderQty = Math.max(1, (p.lowStockThreshold * 2) - p.stock);
            return {
                productId: p.id, name: p.name, sku: p.sku,
                quantityOrdered: reorderQty, quantityReceived: 0, costPrice: p.costPrice
            };
        });
        const currentItemIds = new Set(items.map(i => i.productId));
        const itemsToAdd = newItems.filter(i => !currentItemIds.has(i.productId));
        setItems(prev => [...prev, ...itemsToAdd]);
    };

    const handleAddItem = (product: Product) => {
        setItems(prev => [...prev, {
            productId: product.id, name: product.name, sku: product.sku,
            quantityOrdered: 1, quantityReceived: 0, costPrice: product.costPrice
        }]);
        setProductSearch('');
    };

    const handleRemoveItem = (productId: string) => setItems(prev => prev.filter(i => i.productId !== productId));

    const handleQtyChange = (productId: string, qtyStr: string) => {
        const qty = parseInt(qtyStr, 10);
        setItems(prev => prev.map(item => item.productId === productId ? { ...item, quantityOrdered: Math.max(0, isNaN(qty) ? 0 : qty) } : item));
    };

    const totalCost = useMemo(() => items.reduce((sum, item) => sum + item.costPrice * item.quantityOrdered, 0), [items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalSupplierName = selectedSupplier === '_CUSTOM_' ? customSupplierName.trim() : selectedSupplier;
        if (!finalSupplierName.trim() || items.length === 0 || !expectedDate) {
            return;
        }

        addPurchaseOrder({
            supplierName: finalSupplierName,
            dateCreated: new Date().toISOString(),
            dateExpected: new Date(expectedDate).toISOString(),
            status: 'Pending',
            items,
            notes,
            totalCost
        });
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Name</label>
                    <select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)} required className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                        <option value="" disabled>Select a supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        <option value="_CUSTOM_">-- Enter Custom Name --</option>
                    </select>
                    {selectedSupplier === '_CUSTOM_' && (
                        <input
                            type="text"
                            value={customSupplierName}
                            onChange={e => setCustomSupplierName(e.target.value)}
                            required
                            placeholder="Custom Supplier Name"
                            className="mt-2 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        />
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Delivery</label>
                    <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} required className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                </div>
            </div>

            <div className="border-t pt-4 dark:border-gray-700">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-2">
                     <div className="relative flex-grow w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search to add products..." className="w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                        {filteredProducts.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-lg">
                                {filteredProducts.map(p => <div key={p.id} onClick={() => handleAddItem(p)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">{p.name}</div>)}
                            </div>
                        )}
                    </div>
                    <button type="button" onClick={handleAutoFill} className="w-full sm:w-auto px-4 py-2 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800">Auto-fill low stock</button>
                 </div>
                 <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-600">
                    <table className="w-full text-sm text-gray-900 dark:text-white">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 uppercase">
                            <tr>
                                <th className="p-2 text-left">Product</th>
                                <th className="p-2">Qty</th>
                                <th className="p-2 text-right">Cost</th>
                                <th className="p-2 text-right">Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.productId} className="border-t dark:border-gray-600 bg-white dark:bg-gray-800">
                                    <td className="p-2">{item.name}</td>
                                    <td className="p-2"><input type="number" value={item.quantityOrdered} onChange={e => handleQtyChange(item.productId, e.target.value)} className="w-16 text-center rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"/></td>
                                    <td className="p-2 text-right">{formatCurrency(item.costPrice)}</td>
                                    <td className="p-2 text-right">{formatCurrency(item.costPrice * item.quantityOrdered)}</td>
                                    <td className="p-2 text-center"><button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700"><TrashIcon /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {items.length === 0 && <div className="p-4 text-center text-gray-500 dark:text-gray-400">No items in this order.</div>}
                 </div>
                 <div className="text-right font-bold text-lg mt-2 text-gray-800 dark:text-white">Total: {formatCurrency(totalCost)}</div>
            </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create PO</button>
            </div>
        </form>
    );
};

export const PurchaseOrdersView: React.FC = () => {
    // FIX: Replaced useAppContext with specific context hooks.
    const { purchaseOrders, deletePurchaseOrder } = useSales();
    const { poViewState, onPOViewUpdate, showToast } = useUIState();
    const { formatCurrency, formatDateTime } = useSettings();
    
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
    const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
    const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
    const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
    const printableAreaRef = useRef<HTMLDivElement>(null);

    const handleSaveAsImage = () => {
        if (printableAreaRef.current && viewingPO) {
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
                link.download = `po-${viewingPO.id}.png`;
                link.href = newCanvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    const handleDelete = (po: PurchaseOrder) => {
        const result = deletePurchaseOrder(po.id);
        showToast(result.message || `PO #${po.id} deleted.`, result.success ? 'success' : 'error');
        if(result.success) {
            setPoToDelete(null);
        }
    }

    const { searchTerm, statusFilter, sortConfig, currentPage, itemsPerPage } = poViewState;
    type SortablePOKeys = 'id' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
    
    const statusOptions = [{value: 'All', label: 'All Statuses'}, {value: 'Pending', label: 'Pending'}, {value: 'Partial', label: 'Partial'}, {value: 'Received', label: 'Received'}];

    const requestSort = (key: SortablePOKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onPOViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSorted = useMemo(() => {
        return purchaseOrders
            .filter(po => 
                (statusFilter === 'All' || po.status === statusFilter) &&
                (po.id.toLowerCase().includes(searchTerm.toLowerCase()) || po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a,b) => {
                const key = sortConfig.key;
                const valA = a[key];
                const valB = b[key];
                let comparison = 0;

                if (key === 'dateCreated') {
                    comparison = new Date(valB).getTime() - new Date(valA).getTime();
                } else if (typeof valA === 'string' && typeof valB === 'string') {
                    comparison = valA.localeCompare(valB);
                } else if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                }
                
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
    
    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortablePOKeys }> = ({ children, sortKey }) => {
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
                        <input type="text" value={searchTerm} onChange={e => onPOViewUpdate({searchTerm: e.target.value})} placeholder="Search POs..." className="w-full pl-10 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                     <div className="flex items-center gap-4 w-full sm:w-auto">
                         <button onClick={() => setIsCreatePOModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center">
                            <PlusIcon /> Create Purchase Order
                        </button>
                        <FilterMenu activeFilterCount={statusFilter !== 'All' ? 1 : 0}>
                            <FilterSelectItem label="Status" value={statusFilter} onChange={v => onPOViewUpdate({statusFilter: v})} options={statusOptions} />
                        </FilterMenu>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                        <tr>
                            <SortableHeader sortKey="id">PO ID</SortableHeader>
                            <SortableHeader sortKey="supplierName">Supplier</SortableHeader>
                            <SortableHeader sortKey="dateCreated">Date</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            <SortableHeader sortKey="totalCost">Total</SortableHeader>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginated.map(po => (
                            <tr key={po.id}>
                                <td data-label="PO ID" className="px-6 py-4 font-mono text-gray-900 dark:text-white">
                                    <button onClick={() => setViewingPO(po)} className="text-blue-600 dark:text-blue-400 hover:underline">
                                        {po.id}
                                    </button>
                                </td>
                                <td data-label="Supplier" className="px-6 py-4 text-gray-900 dark:text-white">{po.supplierName}</td>
                                <td data-label="Date" className="px-6 py-4 text-gray-900 dark:text-white">{formatDateTime(po.dateCreated, { year: 'numeric', month: 'numeric', day: 'numeric' })}</td>
                                <td data-label="Status" className="px-6 py-4">{getStatusChip(po.status)}</td>
                                <td data-label="Total" className="px-6 py-4 text-gray-900 dark:text-white">{formatCurrency(po.totalCost)}</td>
                                <td data-label="Actions" className="px-6 py-4 text-right flex items-center justify-end gap-1">
                                    {po.status !== 'Received' && <button onClick={() => setReceivingPO(po)} title="Receive Items" className="p-2 text-green-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ReceiveIcon /></button>}
                                    {po.status === 'Pending' && (
                                        <button
                                            onClick={() => setPoToDelete(po)}
                                            title="Delete PO"
                                            className="p-2 rounded-full text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <TrashIcon />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSorted.length / itemsPerPage)} onPageChange={page => onPOViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
             
             <Modal isOpen={isCreatePOModalOpen} onClose={() => setIsCreatePOModalOpen(false)} title="Create Purchase Order" size="lg">
                <CreatePOModal onClose={() => setIsCreatePOModalOpen(false)} />
            </Modal>

             {viewingPO &&
                <Modal isOpen={!!viewingPO} onClose={() => setViewingPO(null)} title={`Purchase Order - ${viewingPO.id}`}>
                    <PrintablePO ref={printableAreaRef} po={viewingPO} />
                    <div className="flex justify-end items-center gap-2 pt-4 no-print">
                         <button onClick={handleSaveAsImage} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <PhotoIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Print</button>
                        <button onClick={() => setViewingPO(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
                    </div>
                </Modal>
             }
             {receivingPO &&
                <Modal isOpen={!!receivingPO} onClose={() => setReceivingPO(null)} title={`Receive Items for PO #${receivingPO.id}`}>
                    <ReceivePOModal po={receivingPO} onClose={() => setReceivingPO(null)} />
                </Modal>
             }
              {poToDelete && (
                <Modal isOpen={!!poToDelete} onClose={() => setPoToDelete(null)} title="Confirm Deletion">
                    <div>
                        <p className="mb-4">Are you sure you want to delete PO #{poToDelete.id}? This action cannot be undone.</p>
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setPoToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                            <button onClick={() => handleDelete(poToDelete)} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                        </div>
                    </div>
                </Modal>
             )}
        </div>
    );
};