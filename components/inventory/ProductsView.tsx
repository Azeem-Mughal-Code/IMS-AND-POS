import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, InventoryAdjustment, PriceHistoryEntry, Category, ProductVariationType, ProductVariant, ProductVariationOption } from '../../types';
import { useProducts } from '../context/ProductContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, AdjustIcon, HistoryIcon, ChevronUpIcon, ChevronDownIcon, ReceiveIcon, ChevronRightIcon } from '../Icons';
import { FilterMenu, FilterSelectItem } from '../common/FilterMenu';

const VariationManager: React.FC<{
    baseProduct: Omit<Product, 'id' | 'stock' | 'priceHistory'>;
    variationTypes: ProductVariationType[];
    variants: ProductVariant[];
    onVariationTypesChange: (types: ProductVariationType[]) => void;
    onVariantsChange: (variants: ProductVariant[]) => void;
}> = ({ baseProduct, variationTypes, variants, onVariationTypesChange, onVariantsChange }) => {

    const addVariationType = () => {
        const newType: ProductVariationType = {
            id: `vt_${Date.now()}`,
            name: '',
            options: [],
        };
        onVariationTypesChange([...variationTypes, newType]);
    };
    
    const updateVariationType = (typeId: string, newName: string) => {
        onVariationTypesChange(variationTypes.map(vt => vt.id === typeId ? { ...vt, name: newName } : vt));
    };

    const removeVariationType = (typeId: string) => {
        onVariationTypesChange(variationTypes.filter(vt => vt.id !== typeId));
    };

    const handleOptionsChange = (typeId: string, optionsStr: string) => {
        const options: ProductVariationOption[] = optionsStr.split(',')
            .map(s => s.trim())
            .map((name, index) => ({ id: `opt_${name.toLowerCase()}_${Date.now()}_${index}`, name }));
        
        onVariationTypesChange(variationTypes.map(vt => vt.id === typeId ? { ...vt, options } : vt));
    };
    
    useEffect(() => {
        // Auto-generate variants when variation types/options change
        if (variationTypes.length === 0) {
            onVariantsChange([]);
            return;
        }

        const optionArrays = variationTypes.map(vt => vt.options
            .filter(opt => opt.name.trim() !== '')
            .map(opt => ({ typeId: vt.id, typeName: vt.name, optionName: opt.name }))
        );
        
        if (optionArrays.some(arr => arr.length === 0)) {
            onVariantsChange([]);
            return;
        }

        const cartesian = <T,>(...a: T[][]): T[][] => a.reduce((acc, c) => acc.flatMap(d => c.map(e => [...d, e])), [[]] as T[][]);
        
        const newVariantCombinations = cartesian(...optionArrays);

        const newVariants = newVariantCombinations.map((combo, index) => {
            const options: Record<string, string> = {};
            combo.forEach((c: { typeName: string; optionName: string }) => options[c.typeName] = c.optionName);
            
            // Try to find an existing variant to preserve its data
            const existingVariant = variants.find(v => {
                 if (Object.keys(v.options).length !== Object.keys(options).length) return false;
                 return Object.entries(v.options).every(([key, value]) => options[key] === value);
            });
            
            return {
                id: existingVariant?.id || `var_${Date.now()}_${index}`,
                options,
                skuSuffix: existingVariant?.skuSuffix || Object.values(options).map(o => o.replace(/\s+/g, '-')).join('-').toUpperCase(),
                retailPrice: existingVariant?.retailPrice ?? baseProduct.retailPrice,
                costPrice: existingVariant?.costPrice ?? baseProduct.costPrice,
                stock: existingVariant?.stock ?? 0,
            };
        });

        onVariantsChange(newVariants);
    }, [variationTypes]);

    const updateVariant = (variantId: string, field: keyof ProductVariant, value: string | number) => {
        onVariantsChange(variants.map(v => v.id === variantId ? { ...v, [field]: value } : v));
    };
    
    return (
        <div className="space-y-4 p-4 border rounded-lg dark:border-gray-600">
            <h3 className="font-semibold text-lg">Variations</h3>
            {variationTypes.map(vt => (
                <div key={vt.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Variation Name (e.g. Color)" value={vt.name} onChange={e => updateVariationType(vt.id, e.target.value)} className="flex-grow rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800" />
                        <button type="button" onClick={() => removeVariationType(vt.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon /></button>
                    </div>
                    <input type="text" placeholder="Options, separated by comma (e.g. Red, Blue, Green)" value={vt.options.map(o => o.name).join(', ')} onChange={e => handleOptionsChange(vt.id, e.target.value)} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800" />
                </div>
            ))}
            <button type="button" onClick={addVariationType} className="text-sm font-medium text-blue-600 hover:underline">+ Add Variation</button>
            
            {variants.length > 0 && (
                <div className="mt-4 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-2 text-left">Variant</th>
                                <th className="p-2 text-left">SKU Suffix</th>
                                <th className="p-2 text-right">Retail Price</th>
                                <th className="p-2 text-right">Cost Price</th>
                                <th className="p-2 text-right">Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map(v => (
                                <tr key={v.id} className="border-b dark:border-gray-600">
                                    <td className="p-2 font-medium">{Object.values(v.options).join(' / ')}</td>
                                    <td className="p-1"><input type="text" value={v.skuSuffix} onChange={e => updateVariant(v.id, 'skuSuffix', e.target.value)} className="w-full rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800" /></td>
                                    <td className="p-1"><input type="number" value={v.retailPrice} onChange={e => updateVariant(v.id, 'retailPrice', parseFloat(e.target.value))} className="w-24 text-right rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800" /></td>
                                    <td className="p-1"><input type="number" value={v.costPrice} onChange={e => updateVariant(v.id, 'costPrice', parseFloat(e.target.value))} className="w-24 text-right rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800" /></td>
                                    <td className="p-1"><input type="number" value={v.stock} onChange={e => updateVariant(v.id, 'stock', parseInt(e.target.value, 10))} className="w-20 text-right rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ProductForm: React.FC<{ product?: Product | null; onSubmit: (data: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => void; onCancel: () => void; }> = ({ product, onSubmit, onCancel }) => {
    const { categories } = useProducts();
    const [formData, setFormData] = useState({
        sku: product?.sku || '',
        name: product?.name || '',
        retailPrice: product?.retailPrice || 0,
        costPrice: product?.costPrice || 0,
        lowStockThreshold: product?.lowStockThreshold || 0,
        categoryIds: product?.categoryIds || [],
        variationTypes: product?.variationTypes || [],
        variants: product?.variants || [],
    });

    const hasVariations = formData.variationTypes.length > 0;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleCategoryChange = (categoryId: string, checked: boolean) => {
        setFormData(prev => {
            const newCategoryIds = checked
                ? [...prev.categoryIds, categoryId]
                : prev.categoryIds.filter(id => id !== categoryId);
            return { ...prev, categoryIds: newCategoryIds };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    const CategoryTree: React.FC<{ parentId?: string | null; level: number }> = ({ parentId = null, level }) => {
        const childCategories = categories.filter(c => c.parentId === parentId);
        if (childCategories.length === 0) return null;

        return (
            <ul className={level > 0 ? "pl-4" : ""}>
                {childCategories.map(cat => (
                    <li key={cat.id}>
                        <label className="flex items-center space-x-2 py-1">
                            <input
                                type="checkbox"
                                checked={formData.categoryIds.includes(cat.id)}
                                onChange={e => handleCategoryChange(cat.id, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{cat.name}</span>
                        </label>
                        <CategoryTree parentId={cat.id} level={level + 1} />
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium">SKU</label><input type="text" name="sku" value={formData.sku} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg dark:border-gray-600">
                 <p className="text-sm text-gray-500 dark:text-gray-400 md:col-span-2">
                    {hasVariations ? 'Prices for variants are managed below. These values act as defaults.' : 'Enter default prices. You can specify different prices for variants later.'}
                </p>
                 <div><label className="block text-sm font-medium">Default Retail Price</label><input type="number" name="retailPrice" value={formData.retailPrice} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Default Cost Price</label><input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                <div><label className="block text-sm font-medium">Low Stock Threshold</label><input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
            </div>

            <VariationManager
                baseProduct={formData}
                variationTypes={formData.variationTypes}
                variants={formData.variants}
                onVariationTypesChange={types => setFormData(p => ({ ...p, variationTypes: types }))}
                onVariantsChange={vars => setFormData(p => ({ ...p, variants: vars }))}
            />

             <div>
                <label className="block text-sm font-medium mb-1">Categories</label>
                <div className="max-h-48 overflow-y-auto p-3 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    {categories.length > 0 ? <CategoryTree level={0} /> : <p className="text-sm text-gray-500">No categories created yet.</p>}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{product ? 'Save Changes' : 'Add Product'}</button>
            </div>
        </form>
    );
};

const ReceiveStockModal: React.FC<{ product: Product, variant?: ProductVariant, onClose: () => void }> = ({ product, variant, onClose }) => {
    const { receiveStock } = useProducts();
    const [quantity, setQuantity] = useState(1);
    const handleSubmit = () => {
        if (quantity > 0) {
            receiveStock(product.id, quantity, variant?.id);
        }
        onClose();
    };
    const currentStock = variant ? variant.stock : product.stock;
    const itemName = variant ? `${product.name} (${Object.values(variant.options).join(' / ')})` : product.name;

    return (
        <div className="space-y-4">
            <p>Current stock for <strong>{itemName}</strong> is {currentStock}.</p>
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

const AdjustStockModal: React.FC<{ product: Product, variant?: ProductVariant, onClose: () => void }> = ({ product, variant, onClose }) => {
    const { adjustStock } = useProducts();
    const currentStock = variant ? variant.stock : product.stock;
    const itemName = variant ? `${product.name} (${Object.values(variant.options).join(' / ')})` : product.name;
    const [newStock, setNewStock] = useState(currentStock);
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (newStock !== currentStock) {
            adjustStock(product.id, newStock, reason || 'Manual Adjustment', variant?.id);
        }
        onClose();
    };
    return (
        <div className="space-y-4">
             <p>Current stock for <strong>{itemName}</strong> is {currentStock}.</p>
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

const StockHistoryModal: React.FC<{ product: Product, onClose: () => void }> = ({ product, onClose }) => {
    const { inventoryAdjustments } = useProducts();
    const { formatDateTime } = useSettings();
    const productHistory = inventoryAdjustments.filter(adj => adj.productId === product.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const getVariantName = (variantId?: string): string => {
        if (!variantId) return '';
        const variant = product.variants.find(v => v.id === variantId);
        return variant ? `(${Object.values(variant.options).join(' / ')})` : '';
    };

    return (
        <div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs uppercase dark:text-gray-400">
                        <tr><th className="p-2">Date</th><th className="p-2">Variant</th><th className="p-2">Change</th><th className="p-2">Reason</th></tr>
                    </thead>
                    <tbody>
                        {productHistory.map((adj, i) => (
                             <tr key={i} className="border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                                <td className="p-2 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateTime(adj.date)}</td>
                                <td className="p-2 text-xs text-gray-500">{getVariantName(adj.variantId)}</td>
                                <td className={`p-2 font-semibold ${adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>{adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}</td>
                                <td className="p-2 text-gray-800 dark:text-gray-200">{adj.reason}</td>
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

const PriceHistoryModal: React.FC<{ product: Product, onClose: () => void }> = ({ product, onClose }) => {
    const { formatCurrency, formatDateTime } = useSettings();
    const priceHistory = product.priceHistory || [];

    return (
        <div>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs uppercase dark:text-gray-400">
                        <tr>
                            <th className="p-2">Date</th>
                            <th className="p-2">Type</th>
                            <th className="p-2 text-right">Old Value</th>
                            <th className="p-2 text-right">New Value</th>
                            <th className="p-2">Changed By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {priceHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry, i) => (
                             <tr key={i} className="border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                                <td className="p-2 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateTime(entry.date)}</td>
                                <td className={`p-2 font-semibold capitalize ${entry.priceType === 'retail' ? 'text-blue-600' : 'text-green-600'}`}>{entry.priceType}</td>
                                <td className="p-2 text-right text-red-600">{formatCurrency(entry.oldValue)}</td>
                                <td className="p-2 text-right text-green-600">{formatCurrency(entry.newValue)}</td>
                                <td className="p-2 text-gray-800 dark:text-gray-200">{entry.userName}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {priceHistory.length === 0 && <p className="p-4 text-center text-gray-500">No price history found.</p>}
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700">
                 <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md">Close</button>
            </div>
        </div>
    );
};

export const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, categories } = useProducts();
    const { inventoryViewState, onInventoryViewUpdate, showToast } = useUIState();
    const { formatCurrency } = useSettings();

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [receivingProduct, setReceivingProduct] = useState<{product: Product, variant?: ProductVariant} | null>(null);
    const [adjustingProduct, setAdjustingProduct] = useState<{product: Product, variant?: ProductVariant} | null>(null);
    const [stockHistoryProduct, setStockHistoryProduct] = useState<Product | null>(null);
    const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null);

    const { searchTerm, stockFilter, categoryFilter, sortConfig, currentPage, itemsPerPage } = inventoryViewState;
    
    type SortableProductKeys = 'sku' | 'name' | 'stock' | 'retailPrice' | 'costPrice';

    const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

    const getCategoryNames = useCallback((ids: string[]) => {
        return ids.map(id => categoryMap.get(id)?.name).filter(Boolean).join(', ');
    }, [categoryMap]);

    const getDescendantIds = useCallback((categoryId: string): string[] => {
        const children = categories.filter(c => c.parentId === categoryId);
        let descendantIds: string[] = children.map(c => c.id);
        children.forEach(child => {
            descendantIds = [...descendantIds, ...getDescendantIds(child.id)];
        });
        return descendantIds;
    }, [categories]);
    
    const categoryOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const buildOptions = (parentId: string | null = null, prefix = '') => {
            categories
                .filter(c => c.parentId === parentId)
                .forEach(c => {
                    options.push({ value: c.id, label: `${prefix}${c.name}` });
                    buildOptions(c.id, `${prefix}${c.name} > `);
                });
        };
        buildOptions();
        return options;
    }, [categories]);


    const requestSort = (key: SortableProductKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onInventoryViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredAndSortedProducts = useMemo(() => {
        const filterIds = categoryFilter === 'All' ? [] : [categoryFilter, ...getDescendantIds(categoryFilter)];
        
        return products
            .filter(p => (stockFilter === 'All' || (stockFilter === 'In Stock' && p.stock > p.lowStockThreshold) || (stockFilter === 'Low Stock' && p.stock <= p.lowStockThreshold && p.stock > 0) || (stockFilter === 'Out of Stock' && p.stock <= 0)))
            .filter(p => categoryFilter === 'All' || p.categoryIds.some(id => filterIds.includes(id)))
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const valA = a[sortConfig.key as keyof Product];
                const valB = b[sortConfig.key as keyof Product];
                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
                else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [products, searchTerm, stockFilter, categoryFilter, sortConfig, getDescendantIds]);

    const paginatedProducts = useMemo(() => filteredAndSortedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredAndSortedProducts, currentPage, itemsPerPage]);

    const handleFormSubmit = (data: Omit<Product, 'id' | 'stock' | 'priceHistory'>) => {
        if (editingProduct) {
            updateProduct({ ...editingProduct, ...data });
            showToast('Product updated successfully.', 'success');
        } else {
            addProduct(data);
            showToast('Product added successfully.', 'success');
        }
        setIsProductModalOpen(false);
    };

    const confirmDelete = () => {
        if (productToDelete) {
            const result = deleteProduct(productToDelete.id);
            showToast(result.message || 'An error occurred.', result.success ? 'success' : 'error');
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
                        <FilterMenu activeFilterCount={(stockFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0)}>
                            <FilterSelectItem label="Stock Status" value={stockFilter} onChange={v => onInventoryViewUpdate({ stockFilter: v })} options={[{ value: 'All', label: 'All' }, { value: 'In Stock', label: 'In Stock' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Out of Stock', label: 'Out of Stock' }]} />
                             <FilterSelectItem label="Category" value={categoryFilter} onChange={v => onInventoryViewUpdate({ categoryFilter: v })} options={[{ value: 'All', label: 'All Categories' }, ...categoryOptions]} />
                        </FilterMenu>
                    </div>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                    <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <SortableHeader sortKey="sku">SKU</SortableHeader>
                            <SortableHeader sortKey="name">Name</SortableHeader>
                            <th className="px-6 py-3">Categories</th>
                            <SortableHeader sortKey="stock">Stock</SortableHeader>
                            <SortableHeader sortKey="retailPrice">Retail Price</SortableHeader>
                            <SortableHeader sortKey="costPrice">Cost Price</SortableHeader>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedProducts.map(p => (
                            <React.Fragment key={p.id}>
                            <tr>
                                <td data-label="SKU" className="px-6 py-4 font-mono">{p.sku}</td>
                                <td data-label="Name" className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {p.name}
                                    {p.variants.length > 0 && <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-normal px-1.5 py-0.5 rounded-full">{p.variants.length} variants</span>}
                                </td>
                                <td data-label="Categories" className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{getCategoryNames(p.categoryIds)}</td>
                                <td data-label="Stock" className="px-6 py-4">{p.stock}</td>
                                <td data-label="Retail Price" className="px-6 py-4">{formatCurrency(p.retailPrice)}</td>
                                <td data-label="Cost Price" className="px-6 py-4">{formatCurrency(p.costPrice)}</td>
                                <td data-label="Actions" className="px-6 py-4 flex items-center gap-1 justify-end flex-nowrap">
                                    <button onClick={() => setStockHistoryProduct(p)} title="View Stock History" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><HistoryIcon /></button>
                                    <button onClick={() => setPriceHistoryProduct(p)} title="View Price History" className="p-2 text-purple-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><HistoryIcon /></button>
                                    <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} title="Edit Product" className="p-2 text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><PencilIcon /></button>
                                    <button onClick={() => setProductToDelete(p)} title="Delete Product" className="p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><TrashIcon /></button>
                                </td>
                            </tr>
                            {p.variants.length > 0 && p.variants.map(v => (
                                <tr key={v.id} className="bg-gray-50 dark:bg-gray-800/50">
                                    <td className="pl-12 pr-6 py-2 font-mono text-sm">{p.sku}-{v.skuSuffix}</td>
                                    <td className="px-6 py-2 text-sm text-gray-600 dark:text-gray-300">
                                        - {Object.values(v.options).join(' / ')}
                                    </td>
                                    <td className="px-6 py-2"></td>
                                    <td className="px-6 py-2 text-sm">{v.stock}</td>
                                    <td className="px-6 py-2 text-sm">{formatCurrency(v.retailPrice)}</td>
                                    <td className="px-6 py-2 text-sm">{formatCurrency(v.costPrice)}</td>
                                    <td className="px-6 py-2 flex items-center gap-1 justify-end flex-nowrap">
                                        <button onClick={() => setReceivingProduct({product: p, variant: v})} title="Receive Stock" className="p-2 text-green-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ReceiveIcon /></button>
                                        <button onClick={() => setAdjustingProduct({product: p, variant: v})} title="Adjust Stock" className="p-2 text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><AdjustIcon /></button>
                                    </td>
                                </tr>
                            ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSortedProducts.length / itemsPerPage)} onPageChange={page => onInventoryViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSortedProducts.length} />
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title={editingProduct ? 'Edit Product' : 'Add Product'} size="xl"><ProductForm product={editingProduct} onSubmit={handleFormSubmit} onCancel={() => setIsProductModalOpen(false)} /></Modal>
            <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirm Deletion">
                {productToDelete && <div><p>Are you sure you want to delete {productToDelete.name}? This cannot be undone.</p><div className="flex justify-end gap-2 pt-4"><button onClick={() => setProductToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button><button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button></div></div>}
            </Modal>
             {receivingProduct && <Modal isOpen={!!receivingProduct} onClose={() => setReceivingProduct(null)} title={`Receive Stock`}><ReceiveStockModal product={receivingProduct.product} variant={receivingProduct.variant} onClose={() => setReceivingProduct(null)} /></Modal>}
             {adjustingProduct && <Modal isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} title={`Adjust Stock`}><AdjustStockModal product={adjustingProduct.product} variant={adjustingProduct.variant} onClose={() => setAdjustingProduct(null)} /></Modal>}
             {stockHistoryProduct && <Modal isOpen={!!stockHistoryProduct} onClose={() => setStockHistoryProduct(null)} title={`Stock History: ${stockHistoryProduct.name}`}><StockHistoryModal product={stockHistoryProduct} onClose={() => setStockHistoryProduct(null)} /></Modal>}
             {priceHistoryProduct && <Modal isOpen={!!priceHistoryProduct} onClose={() => setPriceHistoryProduct(null)} title={`Price History: ${priceHistoryProduct.name}`}><PriceHistoryModal product={priceHistoryProduct} onClose={() => setPriceHistoryProduct(null)} /></Modal>}
        </div>
    );
};
