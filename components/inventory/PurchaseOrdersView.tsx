import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PurchaseOrder, POItem, Product, Supplier, ProductVariant } from '../../types';
import { useProducts } from '../context/ProductContext';
import { useSales } from '../context/SalesContext';
import { useSettings } from '../context/SettingsContext';
import { useUIState } from '../context/UIStateContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { PlusIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, ReceiveIcon, TrashIcon, EyeIcon, PhotoIcon } from '../Icons';
import { FilterMenu, FilterSelectItem } from '../common/FilterMenu';
import { Dropdown } from '../common/Dropdown';
import usePersistedState from '../../hooks/usePersistedState';
import { INITIAL_SUPPLIERS } from '../../constants';
import { VariantSelectionModal } from '../common/ProductVariantSelector';

declare var html2canvas: any;

// Helper to get suppliers
const useSuppliers = (workspaceId: string) => {
    const [suppliers] = usePersistedState<Supplier[]>(`ims-${workspaceId}-suppliers`, INITIAL_SUPPLIERS);
    return suppliers;
};

const POForm: React.FC<{
    onSubmit: (data: Omit<PurchaseOrder, 'id'>) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const { workspaceId, formatCurrency } = useSettings();
    const suppliers = useSuppliers(workspaceId);
    const { products } = useProducts();
    
    const [supplierId, setSupplierId] = useState('');
    const [customSupplierName, setCustomSupplierName] = useState('');
    const [dateExpected, setDateExpected] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<{productId: string, variantId?: string, quantityOrdered: number, costPrice: number}[]>([]);
    
    // Item selection state
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
    const [variantSelectionProduct, setVariantSelectionProduct] = useState<Product | null>(null);
    
    const productSearchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
                setIsProductDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredProducts = useMemo(() => {
        if (!productSearchTerm) return [];
        const lower = productSearchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower));
    }, [products, productSearchTerm]);

    const handleAddItemToTable = (product: Product, variant?: ProductVariant) => {
        const cost = variant ? variant.costPrice : product.costPrice;
        
        setItems(prev => {
            // Check if item already exists to update quantity? 
            // For POs, sometimes distinct lines are preferred, but usually aggregation is better.
            const existingIndex = prev.findIndex(i => i.productId === product.id && i.variantId === variant?.id);
            
            if (existingIndex >= 0) {
                const newItems = [...prev];
                newItems[existingIndex].quantityOrdered += 1;
                return newItems;
            }

            return [
                ...prev, 
                { 
                    productId: product.id, 
                    variantId: variant?.id, 
                    quantityOrdered: 1, 
                    costPrice: cost 
                }
            ];
        });
    };

    const handleProductSelect = (product: Product) => {
        setProductSearchTerm('');
        setIsProductDropdownOpen(false);

        if (product.variants.length > 0) {
            setVariantSelectionProduct(product);
        } else {
            handleAddItemToTable(product);
        }
    };

    const handleAutoFillLowStock = () => {
        const newItems: {productId: string, variantId?: string, quantityOrdered: number, costPrice: number}[] = [];
        products.forEach(p => {
            if (p.variants.length > 0) {
                p.variants.forEach(v => {
                    if (v.stock <= p.lowStockThreshold) {
                        newItems.push({
                            productId: p.id,
                            variantId: v.id,
                            quantityOrdered: Math.max(1, p.lowStockThreshold - v.stock + 5), // Refill to threshold + 5 buffer
                            costPrice: v.costPrice
                        });
                    }
                });
            } else {
                if (p.stock <= p.lowStockThreshold) {
                    newItems.push({
                        productId: p.id,
                        quantityOrdered: Math.max(1, p.lowStockThreshold - p.stock + 5), // Refill to threshold + 5 buffer
                        costPrice: p.costPrice
                    });
                }
            }
        });
        // Merge with existing items to avoid duplicates logic
        const existingKeys = new Set(items.map(i => `${i.productId}_${i.variantId || ''}`));
        const filteredNewItems = newItems.filter(i => !existingKeys.has(`${i.productId}_${i.variantId || ''}`));
        
        setItems(prev => [...prev, ...filteredNewItems]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: 'quantityOrdered' | 'costPrice', value: number) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!supplierId && !customSupplierName) || items.length === 0) return;
        
        let finalSupplierName = 'Unknown';
        if (supplierId === 'sup_0') {
            finalSupplierName = customSupplierName || 'Custom Supplier';
        } else {
            const supplier = suppliers.find(s => s.id === supplierId);
            if (supplier) finalSupplierName = supplier.name;
        }

        const poItems: POItem[] = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const variant = product?.variants.find(v => v.id === item.variantId);
            return {
                productId: item.productId,
                variantId: item.variantId,
                name: variant 
                    ? `${product?.name} (${Object.values(variant.options).join('/')})` 
                    : product?.name || 'Unknown Product',
                sku: variant ? `${product?.sku}-${variant.skuSuffix}` : product?.sku || 'UNKNOWN',
                quantityOrdered: item.quantityOrdered,
                quantityReceived: 0,
                costPrice: item.costPrice
            };
        });

        const totalCost = poItems.reduce((sum, item) => sum + (item.costPrice * item.quantityOrdered), 0);

        onSubmit({
            supplierId,
            supplierName: finalSupplierName,
            dateCreated: new Date().toISOString(),
            dateExpected: dateExpected ? new Date(dateExpected).toISOString() : '',
            status: 'Pending',
            items: poItems,
            notes,
            totalCost
        });
    };

    const supplierOptions = useMemo(() => [
        { value: '', label: 'Select Supplier' },
        { value: 'sup_0', label: 'Custom Supplier' },
        ...suppliers.map(s => ({ value: s.id, label: s.name }))
    ], [suppliers]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-gray-900 dark:text-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                    <Dropdown
                        options={supplierOptions}
                        value={supplierId}
                        onChange={(val) => setSupplierId(String(val))}
                    />
                    {supplierId === 'sup_0' && (
                        <input
                            type="text"
                            value={customSupplierName}
                            onChange={e => setCustomSupplierName(e.target.value)}
                            placeholder="Enter Custom Supplier Name"
                            className="mt-2 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                            autoFocus
                        />
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Date</label>
                    <input type="date" value={dateExpected} onChange={e => setDateExpected(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm py-2 px-3" />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" rows={2} />
            </div>
            
            <div className="border-t pt-4 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200">Items</h4>
                    <button type="button" onClick={handleAutoFillLowStock} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50">
                        Auto Fill Low-Stock
                    </button>
                </div>
                
                <div className="mb-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md border border-gray-200 dark:border-gray-700">
                    <div className="relative" ref={productSearchRef}>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Add Product</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={productSearchTerm}
                                onChange={e => { setProductSearchTerm(e.target.value); setIsProductDropdownOpen(true); }}
                                onFocus={() => setIsProductDropdownOpen(true)}
                                placeholder="Search product to add..."
                                className="w-full pl-8 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            />
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-400">
                                <SearchIcon />
                            </div>
                        </div>
                        {isProductDropdownOpen && productSearchTerm && filteredProducts.length > 0 && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {filteredProducts.map(p => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => handleProductSelect(p)} 
                                        className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-200"
                                    >
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-xs text-gray-500">{p.sku}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-600">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="p-2">Product</th>
                                <th className="p-2 w-24 text-center">Qty</th>
                                <th className="p-2 w-32 text-center">Cost</th>
                                <th className="p-2 text-right">Total</th>
                                <th className="p-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {items.map((item, idx) => {
                                const p = products.find(prod => prod.id === item.productId);
                                const v = p?.variants.find(vary => vary.id === item.variantId);
                                const name = v ? `${p?.name} (${Object.values(v.options).join('/')})` : p?.name;
                                return (
                                    <tr key={idx} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                        <td className="p-2">{name}</td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="number" 
                                                min="1" 
                                                value={item.quantityOrdered} 
                                                onChange={e => handleItemChange(idx, 'quantityOrdered', parseInt(e.target.value) || 0)} 
                                                className="w-full px-1 py-1 text-center border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                step="0.01" 
                                                value={item.costPrice} 
                                                onChange={e => handleItemChange(idx, 'costPrice', parseFloat(e.target.value) || 0)} 
                                                className="w-full px-1 py-1 text-center border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </td>
                                        <td className="p-2 text-right">{formatCurrency(item.quantityOrdered * item.costPrice)}</td>
                                        <td className="p-2 text-center">
                                            <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-4 text-center text-gray-500">No items added yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create PO</button>
            </div>

            {variantSelectionProduct && (
                <VariantSelectionModal 
                    product={variantSelectionProduct} 
                    onConfirm={(prod, variant) => {
                        handleAddItemToTable(prod, variant);
                        setVariantSelectionProduct(null);
                    }} 
                    onClose={() => setVariantSelectionProduct(null)} 
                    confirmLabel="Add to Order"
                    priceType="cost"
                    showStock={true}
                />
            )}
        </form>
    );
};

const ReceivePOModal: React.FC<{ po: PurchaseOrder; onClose: () => void }> = ({ po, onClose }) => {
    const { receivePOItems } = useSales();
    const [receivedQuantities, setReceivedQuantities] = useState<{[key: string]: number}>({});

    useEffect(() => {
        const initial: {[key: string]: number} = {};
        po.items.forEach((item, idx) => {
            // Use index as key since item doesn't have a unique ID inside POItem currently
            initial[idx] = Math.max(0, item.quantityOrdered - item.quantityReceived);
        });
        setReceivedQuantities(initial);
    }, [po]);

    const handleSubmit = () => {
        const itemsToReceive: { productId: string; variantId?: string; quantity: number }[] = [];
        
        po.items.forEach((item, idx) => {
            const qty = receivedQuantities[idx];
            if (qty > 0) {
                itemsToReceive.push({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: qty
                });
            }
        });

        if (itemsToReceive.length > 0) {
            receivePOItems(po.id, itemsToReceive);
        }
        onClose();
    };

    return (
        <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-600">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="p-2">Item</th>
                            <th className="p-2 text-center">Ordered</th>
                            <th className="p-2 text-center">Received</th>
                            <th className="p-2 text-center">Receive Now</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {po.items.map((item, idx) => (
                            <tr key={idx} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                <td className="p-2">{item.name}</td>
                                <td className="p-2 text-center">{item.quantityOrdered}</td>
                                <td className="p-2 text-center">{item.quantityReceived}</td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max={item.quantityOrdered - item.quantityReceived}
                                        value={receivedQuantities[idx] || 0}
                                        onChange={(e) => setReceivedQuantities(prev => ({ ...prev, [idx]: parseInt(e.target.value) || 0 }))}
                                        className="w-20 text-center rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Receive Items</button>
            </div>
        </div>
    );
};

export const PurchaseOrdersView: React.FC = () => {
    const { purchaseOrders, addPurchaseOrder, deletePurchaseOrder } = useSales();
    const { workspaceId, formatCurrency, formatDateTime, paginationConfig, workspaceName } = useSettings();
    const { poViewState, onPOViewUpdate, showToast } = useUIState();
    const suppliers = useSuppliers(workspaceId);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
    const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
    const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
    const printablePORef = useRef<HTMLDivElement>(null);

    const { searchTerm, statusFilter, supplierFilter, sortConfig, currentPage } = poViewState;
    const itemsPerPage = paginationConfig.purchaseOrders || 10;

    const filteredPOs = useMemo(() => {
        return purchaseOrders
            .filter(po => 
                (statusFilter === 'All' || po.status === statusFilter) &&
                (supplierFilter === 'All' || po.supplierId === supplierFilter) &&
                (po.id.toLowerCase().includes(searchTerm.toLowerCase()) || po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => {
                const key = sortConfig.key;
                let valA = a[key] as string | number;
                let valB = b[key] as string | number;
                
                if (key === 'dateCreated') {
                    valA = new Date(a.dateCreated).getTime();
                    valB = new Date(b.dateCreated).getTime();
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
    }, [purchaseOrders, searchTerm, statusFilter, supplierFilter, sortConfig]);

    const paginatedPOs = filteredPOs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);

    const handleCreatePO = (data: Omit<PurchaseOrder, 'id'>) => {
        addPurchaseOrder(data);
        setIsFormOpen(false);
        showToast('Purchase Order created.', 'success');
    };

    const handleDeletePO = () => {
        if (poToDelete) {
            const result = deletePurchaseOrder(poToDelete.id);
            showToast(result.message || 'Deleted', result.success ? 'success' : 'error');
            setPoToDelete(null);
        }
    };

    const handleSavePOImage = () => {
        if (printablePORef.current && viewingPO) {
            html2canvas(printablePORef.current, { 
                backgroundColor: '#ffffff',
                onclone: (clonedDoc: Document) => {
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
                link.download = `PO-${viewingPO.id}.png`;
                link.href = newCanvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    const supplierOptions = useMemo(() => [{value: 'All', label: 'All Suppliers'}, ...suppliers.map(s => ({value: s.id, label: s.name}))], [suppliers]);
    const statusOptions = [{value: 'All', label: 'All Statuses'}, {value: 'Pending', label: 'Pending'}, {value: 'Partial', label: 'Partial'}, {value: 'Received', label: 'Received'}];

    type SortablePOKeys = 'id' | 'supplierName' | 'dateCreated' | 'status' | 'totalCost';
    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortablePOKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => {
                let direction: 'ascending' | 'descending' = 'ascending';
                if (sortConfig.key === sortKey && sortConfig.direction === 'ascending') direction = 'descending';
                onPOViewUpdate({ sortConfig: { key: sortKey, direction } });
            }}>
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
            <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative flex-grow w-full sm:w-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input type="text" value={searchTerm} onChange={e => onPOViewUpdate({ searchTerm: e.target.value })} placeholder="Search POs..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button onClick={() => setIsFormOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"><PlusIcon /> Create PO</button>
                        <FilterMenu activeFilterCount={(statusFilter !== 'All' ? 1 : 0) + (supplierFilter !== 'All' ? 1 : 0)}>
                            <FilterSelectItem label="Status" value={statusFilter} onChange={v => onPOViewUpdate({ statusFilter: v })} options={statusOptions} />
                            <FilterSelectItem label="Supplier" value={supplierFilter} onChange={v => onPOViewUpdate({ supplierFilter: v })} options={supplierOptions} />
                        </FilterMenu>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                    <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <SortableHeader sortKey="id">PO #</SortableHeader>
                            <SortableHeader sortKey="supplierName">Supplier</SortableHeader>
                            <SortableHeader sortKey="dateCreated">Date</SortableHeader>
                            <SortableHeader sortKey="totalCost">Total Cost</SortableHeader>
                            <SortableHeader sortKey="status">Status</SortableHeader>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedPOs.map(po => (
                            <tr key={po.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td data-label="PO #" className="px-6 py-4 font-mono text-xs">{po.id}</td>
                                <td data-label="Supplier" className="px-6 py-4 font-medium text-gray-900 dark:text-white">{po.supplierName}</td>
                                <td data-label="Date" className="px-6 py-4">{formatDateTime(po.dateCreated)}</td>
                                <td data-label="Total Cost" className="px-6 py-4">{formatCurrency(po.totalCost)}</td>
                                <td data-label="Status" className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        po.status === 'Received' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        po.status === 'Partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                    }`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td data-label="Actions" className="px-6 py-4 flex items-center gap-2 justify-end">
                                    <button onClick={() => setViewingPO(po)} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="View Details"><EyeIcon /></button>
                                    {po.status !== 'Received' && (
                                        <button onClick={() => setReceivingPO(po)} className="p-1 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300" title="Receive Items"><ReceiveIcon /></button>
                                    )}
                                    {po.status === 'Pending' && (
                                        <button onClick={() => setPoToDelete(po)} className="p-1 text-red-500 hover:text-red-700" title="Delete PO"><TrashIcon /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={page => onPOViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredPOs.length} />

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Create Purchase Order" size="lg">
                <POForm onSubmit={handleCreatePO} onCancel={() => setIsFormOpen(false)} />
            </Modal>

            <Modal isOpen={!!receivingPO} onClose={() => setReceivingPO(null)} title={`Receive Items: PO #${receivingPO?.id}`} size="lg">
                {receivingPO && <ReceivePOModal po={receivingPO} onClose={() => setReceivingPO(null)} />}
            </Modal>

            <Modal isOpen={!!viewingPO} onClose={() => setViewingPO(null)} title={`PO Details: #${viewingPO?.id}`} size="lg">
                {viewingPO && (
                    <div className="flex flex-col h-full">
                        <div className="printable-area flex-grow" ref={printablePORef}>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{workspaceName} - Purchase Order</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">PO #: {viewingPO.id}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4 text-gray-800 dark:text-gray-200">
                                <div><span className="font-bold">Supplier:</span> {viewingPO.supplierName}</div>
                                <div><span className="font-bold">Date:</span> {formatDateTime(viewingPO.dateCreated)}</div>
                                <div><span className="font-bold">Status:</span> {viewingPO.status}</div>
                                <div><span className="font-bold">Expected:</span> {viewingPO.dateExpected ? formatDateTime(viewingPO.dateExpected) : 'N/A'}</div>
                            </div>
                            {viewingPO.notes && <div className="text-sm bg-gray-50 dark:bg-gray-700 p-2 rounded mb-4 text-gray-800 dark:text-gray-200"><strong>Notes:</strong> {viewingPO.notes}</div>}
                            
                            <div className="border rounded-md overflow-hidden dark:border-gray-600">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                        <tr>
                                            <th className="p-1 pl-2">Item</th>
                                            <th className="p-1 text-right">Ordered</th>
                                            <th className="p-1 text-right">Received</th>
                                            <th className="p-1 text-right">Cost</th>
                                            <th className="p-1 pr-2 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {viewingPO.items.map((item, idx) => (
                                            <tr key={idx} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                                <td className="p-1 pl-2">{item.name}</td>
                                                <td className="p-1 text-right">{item.quantityOrdered}</td>
                                                <td className="p-1 text-right">{item.quantityReceived}</td>
                                                <td className="p-1 text-right">{formatCurrency(item.costPrice)}</td>
                                                <td className="p-1 pr-2 text-right">{formatCurrency(item.quantityOrdered * item.costPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-700 font-bold text-gray-900 dark:text-white">
                                        <tr>
                                            <td colSpan={4} className="p-1 pl-2 text-right">Total Cost:</td>
                                            <td className="p-1 pr-2 text-right">{formatCurrency(viewingPO.totalCost)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4 mt-2 border-t dark:border-gray-700 no-print">
                            <button onClick={handleSavePOImage} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Save Image">
                                <PhotoIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Print</button>
                            <button onClick={() => setViewingPO(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!poToDelete} onClose={() => setPoToDelete(null)} title="Confirm Delete PO">
                {poToDelete && (
                    <div>
                        <p className="text-gray-800 dark:text-gray-200">Are you sure you want to delete PO #{poToDelete.id}?</p>
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setPoToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-800 dark:text-white">Cancel</button>
                            <button onClick={handleDeletePO} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};