
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, InventoryAdjustment, PriceHistoryEntry, Category, ProductVariationType, ProductVariant, ProductVariationOption } from '../../types';
import { useProducts } from '../context/ProductContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';
import { Modal } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { SearchIcon, PlusIcon, PencilIcon, TrashIcon, AdjustIcon, HistoryIcon, ChevronUpIcon, ChevronDownIcon, ReceiveIcon, TagIcon, DangerIcon } from '../Icons';
import { FilterMenu, FilterSelectItem } from '../common/FilterMenu';
import { generateUUIDv7 } from '../../utils/idGenerator';

const VariationManager: React.FC<{
    baseProduct: Omit<Product, 'id' | 'stock' | 'priceHistory'>;
    variationTypes: ProductVariationType[];
    variants: ProductVariant[];
    onVariationTypesChange: (types: ProductVariationType[]) => void;
    onVariantsChange: (variants: ProductVariant[]) => void;
}> = ({ baseProduct, variationTypes, variants, onVariationTypesChange, onVariantsChange }) => {

    const addVariationType = () => {
        const newType: ProductVariationType = {
            id: `vt_${generateUUIDv7()}`,
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
            .map((name) => ({ id: `opt_${generateUUIDv7()}`, name }));
        
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

        const newVariants = newVariantCombinations.map((combo) => {
            const options: Record<string, string> = {};
            combo.forEach((c: { typeName: string; optionName: string }) => options[c.typeName] = c.optionName);
            
            // Try to find an existing variant to preserve its data
            const existingVariant = variants.find(v => {
                 if (Object.keys(v.options).length !== Object.keys(options).length) return false;
                 return Object.entries(v.options).every(([key, value]) => options[key] === value);
            });
            
            return {
                id: existingVariant?.id || `var_${generateUUIDv7()}`,
                options,
                skuSuffix: existingVariant?.skuSuffix || Object.values(options).map(o => o.replace(/\s+/g, '-')).join('-').toUpperCase(),
                retailPrice: existingVariant?.retailPrice ?? baseProduct.retailPrice,
                costPrice: existingVariant?.costPrice ?? baseProduct.costPrice,
                stock: existingVariant?.stock ?? 0,
                priceHistory: existingVariant?.priceHistory || [], // Preserve history
            };
        });

        onVariantsChange(newVariants);
    }, [variationTypes]); // Intentionally omit 'variants' to prevent regeneration loop, relying on closure scope or re-render from parent

    const updateVariant = (variantId: string, field: keyof ProductVariant, value: string | number) => {
        onVariantsChange(variants.map(v => v.id === variantId ? { ...v, [field]: value } : v));
    };

    const removeVariant = (variantId: string) => {
        onVariantsChange(variants.filter(v => v.id !== variantId));
    };
    
    return (
        <div className="space-y-4 p-4 border rounded-lg dark:border-gray-600">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Variations</h3>
            {variationTypes.map(vt => (
                <div key={vt.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md space-y-2">
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder="Variation Name (e.g. Color)" value={vt.name} onChange={e => updateVariationType(vt.id, e.target.value)} className="flex-grow rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                        <button type="button" onClick={() => removeVariationType(vt.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon /></button>
                    </div>
                    <input type="text" placeholder="Options, separated by comma (e.g. Red, Blue, Green)" value={vt.options.map(o => o.name).join(', ')} onChange={e => handleOptionsChange(vt.id, e.target.value)} className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
                </div>
            ))}
            <button type="button" onClick={addVariationType} className="text-sm font-medium text-blue-600 hover:underline">+ Add Variation</button>
            
            {variants.length > 0 && (
                <div className="mt-4 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-2 text-left text-gray-900 dark:text-white">Variant</th>
                                <th className="p-2 text-left text-gray-900 dark:text-white">SKU Suffix</th>
                                <th className="p-2 text-right text-gray-900 dark:text-white">Retail Price</th>
                                <th className="p-2 text-right text-gray-900 dark:text-white">Cost Price</th>
                                <th className="p-2 text-right text-gray-900 dark:text-white">Stock</th>
                                <th className="p-2 text-center text-gray-900 dark:text-white">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map(v => (
                                <tr key={v.id} className="border-b dark:border-gray-600">
                                    <td className="p-2 font-medium text-gray-900 dark:text-white">{Object.values(v.options).join(' / ')}</td>
                                    <td className="p-1"><input type="text" value={v.skuSuffix} onChange={e => updateVariant(v.id, 'skuSuffix', e.target.value)} className="w-full rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></td>
                                    <td className="p-1"><input type="number" value={v.retailPrice} onChange={e => updateVariant(v.id, 'retailPrice', parseFloat(e.target.value))} className="w-24 text-right rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></td>
                                    <td className="p-1"><input type="number" value={v.costPrice} onChange={e => updateVariant(v.id, 'costPrice', parseFloat(e.target.value))} className="w-24 text-right rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></td>
                                    <td className="p-1"><input type="number" value={v.stock} onChange={e => updateVariant(v.id, 'stock', parseInt(e.target.value, 10))} className="w-20 text-right rounded-md border-gray-300 dark:border-gray-600 text-sm p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" /></td>
                                    <td className="p-1 text-center"><button type="button" onClick={() => removeVariant(v.id)} className="text-red-500 hover:text-red-700 p-1"><TrashIcon /></button></td>
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

    const CategoryTree: React.FC<{ parentId?: string | null; level: number; selectedIds: string[]; onToggle: (id: string, checked: boolean) => void }> = ({ parentId = null, level, selectedIds, onToggle }) => {
        const childCategories = categories.filter(c => c.parentId === parentId);
        if (childCategories.length === 0) return null;

        return (
            <ul className={level > 0 ? "pl-4" : ""}>
                {childCategories.map(cat => (
                    <li key={cat.id}>
                        <label className="flex items-center space-x-2 py-1">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(cat.id)}
                                onChange={e => onToggle(cat.id, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-900 dark:text-white">{cat.name}</span>
                        </label>
                        <CategoryTree parentId={cat.id} level={level + 1} selectedIds={selectedIds} onToggle={onToggle} />
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label><input type="text" name="sku" value={formData.sku} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg dark:border-gray-600">
                 <p className="text-sm text-gray-500 dark:text-gray-400 md:col-span-2">
                    {hasVariations ? 'Prices for variants are managed below. These values act as defaults.' : 'Enter default prices. You can specify different prices for variants later.'}
                </p>
                 <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Retail Price</label><input type="number" name="retailPrice" value={formData.retailPrice} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default Cost Price</label><input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} required step="0.01" min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Threshold</label><input type="number" name="lowStockThreshold" value={formData.lowStockThreshold} onChange={handleChange} required min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" /></div>
            </div>

            <VariationManager
                baseProduct={formData}
                variationTypes={formData.variationTypes}
                variants={formData.variants}
                onVariationTypesChange={types => setFormData(p => ({ ...p, variationTypes: types }))}
                onVariantsChange={vars => setFormData(p => ({ ...p, variants: vars }))}
            />

             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categories</label>
                <div className="max-h-48 overflow-y-auto p-3 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    {categories.length > 0 ? (
                        <CategoryTree 
                            level={0} 
                            selectedIds={formData.categoryIds} 
                            onToggle={handleCategoryChange} 
                        />
                    ) : <p className="text-sm text-gray-500">No categories created yet.</p>}
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{product ? 'Save Changes' : 'Add Product'}</button>
            </div>
        </form>
    );
};

const BulkCategoryEditor: React.FC<{ 
    selectedCount: number; 
    onSubmit: (categoryIds: string[], action: 'add' | 'replace' | 'remove') => void; 
    onCancel: () => void; 
}> = ({ selectedCount, onSubmit, onCancel }) => {
    const { categories } = useProducts();
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [action, setAction] = useState<'add' | 'replace' | 'remove'>('add');

    const handleToggle = (categoryId: string, checked: boolean) => {
        setSelectedCategoryIds(prev => checked ? [...prev, categoryId] : prev.filter(id => id !== categoryId));
    };

    const CategoryTree: React.FC<{ parentId?: string | null; level: number }> = ({ parentId = null, level }) => {
        const childCategories = categories.filter(c => c.parentId === parentId);
        if (childCategories.length === 0) return null;

        return (
            <ul className={level > 0 ? "pl-4" : ""}>
                {childCategories.map(cat => (
                    <li key={cat.id}>
                        <label className="flex items-center space-x-2 py-1 text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={selectedCategoryIds.includes(cat.id)}
                                onChange={e => handleToggle(cat.id, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-900 dark:text-white">{cat.name}</span>
                        </label>
                        <CategoryTree parentId={cat.id} level={level + 1} />
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="space-y-4 text-gray-900 dark:text-gray-100">
            <p className="text-gray-800 dark:text-gray-200">Applying changes to <strong>{selectedCount}</strong> selected products.</p>
            
            <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Action</label>
                <div className="flex gap-4 text-gray-800 dark:text-gray-200">
                    <label className="flex items-center gap-2">
                        <input type="radio" name="action" checked={action === 'add'} onChange={() => setAction('add')} />
                        Add to existing
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="action" checked={action === 'replace'} onChange={() => setAction('replace')} />
                        Replace existing
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="radio" name="action" checked={action === 'remove'} onChange={() => setAction('remove')} />
                        Remove these
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Select Categories</label>
                <div className="max-h-48 overflow-y-auto p-3 border rounded-md dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                    {categories.length > 0 ? <CategoryTree level={0} /> : <p className="text-sm text-gray-500">No categories created yet.</p>}
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                <button onClick={() => onSubmit(selectedCategoryIds, action)} className="px-4 py-2 bg-blue-600 text-white rounded-md">Apply Changes</button>
            </div>
        </div>
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
            <p className="text-gray-800 dark:text-gray-200">Current stock for <strong>{itemName}</strong> is {currentStock}.</p>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity to Receive</label>
                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} min="1" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
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

    const isValid = reason.trim().length > 0;

    const handleSubmit = () => {
        if (newStock !== currentStock && isValid) {
            adjustStock(product.id, newStock, reason, variant?.id);
        }
        onClose();
    };
    return (
        <div className="space-y-4">
             <p className="text-gray-800 dark:text-gray-200">Current stock for <strong>{itemName}</strong> is {currentStock}.</p>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Stock Level</label>
                <input type="number" value={newStock} onChange={e => setNewStock(parseInt(e.target.value))} min="0" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Adjustment <span className="text-red-500">*</span></label>
                <input 
                    type="text" 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    placeholder="e.g., Cycle Count, Damage, Theft" 
                    className={`mt-1 block w-full rounded-md border shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${!isValid && reason !== '' ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    required
                />
                <p className="text-xs text-gray-500 mt-1">Reason is required.</p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                <button 
                    onClick={handleSubmit} 
                    disabled={!isValid}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
                >
                    Adjust Stock
                </button>
            </div>
        </div>
    );
};

const ProductHistoryModal: React.FC<{ product: Product, variantId?: string, onClose: () => void }> = ({ product, variantId, onClose }) => {
    const { inventoryAdjustments } = useProducts();
    const { formatCurrency, formatDateTime, paginationConfig } = useSettings();
    const [activeTab, setActiveTab] = useState<'stock' | 'price'>('stock');
    const [stockPage, setStockPage] = useState(1);
    const [pricePage, setPricePage] = useState(1);

    const stockItemsPerPage = paginationConfig.inventoryStockHistory || 10;
    const priceItemsPerPage = paginationConfig.inventoryPriceHistory || 10;

    const getVariantName = (id?: string): string => {
        if (!id) return '';
        const variant = product.variants.find(v => v.id === id);
        return variant ? `(${Object.values(variant.options).join(' / ')})` : '';
    };

    const displayTitle = variantId ? `${product.name} ${getVariantName(variantId)}` : product.name;

    const filteredStockHistory = useMemo(() => {
        return inventoryAdjustments
            .filter(adj => adj.productId === product.id && (!variantId || adj.variantId === variantId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [inventoryAdjustments, product.id, variantId]);

    const paginatedStockHistory = useMemo(() => {
        const start = (stockPage - 1) * stockItemsPerPage;
        return filteredStockHistory.slice(start, start + stockItemsPerPage);
    }, [filteredStockHistory, stockPage, stockItemsPerPage]);

    // Aggregating logic for price history including variants
    type DisplayPriceEntry = PriceHistoryEntry & { variantName?: string };

    const filteredPriceHistory = useMemo(() => {
        let history: DisplayPriceEntry[] = [];
        if (variantId) {
            const variant = product.variants.find(v => v.id === variantId);
            history = (variant?.priceHistory || []).map(h => ({...h}));
        } else {
            // Include Base Product history
            history = (product.priceHistory || []).map(h => ({...h, variantName: 'Base Product'}));
            
            // Include all Variants history
            if (product.variants) {
                product.variants.forEach(v => {
                    const vName = Object.values(v.options).join(' / ');
                    const vHistory = (v.priceHistory || []).map(h => ({...h, variantName: vName}));
                    history = [...history, ...vHistory];
                });
            }
        }
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [product.priceHistory, product.variants, variantId]);

    const paginatedPriceHistory = useMemo(() => {
        const start = (pricePage - 1) * priceItemsPerPage;
        return filteredPriceHistory.slice(start, start + priceItemsPerPage);
    }, [filteredPriceHistory, pricePage, priceItemsPerPage]);

    return (
        <div className="flex flex-col h-[70vh] md:h-auto md:max-h-[80vh]">
            <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{displayTitle}</h3>
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'stock' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        Stock History
                    </button>
                    <button
                        onClick={() => setActiveTab('price')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'price' ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                    >
                        Price History
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto border rounded-lg dark:border-gray-700">
                {activeTab === 'stock' ? (
                    <>
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="p-3">Date</th>
                                {!variantId && <th className="p-3">Variant</th>}
                                <th className="p-3 text-right">Change</th>
                                <th className="p-3">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedStockHistory.map((adj, i) => (
                                <tr key={i} className="border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <td className="p-3 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateTime(adj.date)}</td>
                                    {!variantId && <td className="p-3 text-xs text-gray-500">{getVariantName(adj.variantId) || '-'}</td>}
                                    <td className={`p-3 text-right font-semibold ${adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                                    </td>
                                    <td className="p-3 text-gray-800 dark:text-gray-200">{adj.reason}</td>
                                </tr>
                            ))}
                            {paginatedStockHistory.length === 0 && (
                                <tr><td colSpan={variantId ? 3 : 4} className="p-4 text-center text-gray-500">No stock adjustments found.</td></tr>
                            )}
                        </tbody>
                    </table>
                    </>
                ) : (
                    <>
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="p-3">Date</th>
                                    {!variantId && <th className="p-3">Variant</th>}
                                    <th className="p-3">Type</th>
                                    <th className="p-3 text-right">Old</th>
                                    <th className="p-3 text-right">New</th>
                                    <th className="p-3">User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedPriceHistory.map((entry, i) => (
                                    <tr key={i} className="border-b dark:border-gray-700 bg-white dark:bg-gray-800">
                                        <td className="p-3 whitespace-nowrap text-gray-800 dark:text-gray-200">{formatDateTime(entry.date)}</td>
                                        {!variantId && <td className="p-3 text-xs text-gray-500">{(entry as any).variantName || '-'}</td>}
                                        <td className={`p-3 font-semibold capitalize ${entry.priceType === 'retail' ? 'text-blue-600' : 'text-green-600'}`}>{entry.priceType}</td>
                                        <td className="p-3 text-right text-gray-500">{formatCurrency(entry.oldValue)}</td>
                                        <td className="p-3 text-right font-medium text-gray-900 dark:text-white">{formatCurrency(entry.newValue)}</td>
                                        <td className="p-3 text-gray-800 dark:text-gray-200">{entry.userName}</td>
                                    </tr>
                                ))}
                                {paginatedPriceHistory.length === 0 && (
                                    <tr><td colSpan={variantId ? 5 : 6} className="p-4 text-center text-gray-500">No price history found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}
            </div>
            
            {activeTab === 'stock' && filteredStockHistory.length > stockItemsPerPage && (
                <Pagination
                    currentPage={stockPage}
                    totalPages={Math.ceil(filteredStockHistory.length / stockItemsPerPage)}
                    onPageChange={setStockPage}
                    itemsPerPage={stockItemsPerPage}
                    totalItems={filteredStockHistory.length}
                />
            )}
            {activeTab === 'price' && filteredPriceHistory.length > priceItemsPerPage && (
                <Pagination
                    currentPage={pricePage}
                    totalPages={Math.ceil(filteredPriceHistory.length / priceItemsPerPage)}
                    onPageChange={setPricePage}
                    itemsPerPage={priceItemsPerPage}
                    totalItems={filteredPriceHistory.length}
                />
            )}

            <div className="flex justify-end pt-4 mt-2 border-t dark:border-gray-700">
                 <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
            </div>
        </div>
    );
};

export const ProductsView: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct, categories, bulkDeleteProducts, bulkUpdateProductCategories, deleteVariant } = useProducts();
    const { inventoryViewState, onInventoryViewUpdate, showToast } = useUIState();
    const { formatCurrency, paginationConfig } = useSettings();

    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [variantToDelete, setVariantToDelete] = useState<{product: Product, variant: ProductVariant} | null>(null);
    const [receivingProduct, setReceivingProduct] = useState<{product: Product, variant?: ProductVariant} | null>(null);
    const [adjustingProduct, setAdjustingProduct] = useState<{product: Product, variant?: ProductVariant} | null>(null);
    const [historyModalData, setHistoryModalData] = useState<{product: Product, variantId?: string} | null>(null);

    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [forceDelete, setForceDelete] = useState(false);

    const { searchTerm, stockFilter, categoryFilter, sortConfig, currentPage } = inventoryViewState;
    const itemsPerPage = paginationConfig.inventory || 10;
    
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

    const confirmDelete = async () => {
        if (productToDelete) {
            const result = await deleteProduct(productToDelete.id, forceDelete);
            showToast(result.message || 'An error occurred.', result.success ? 'success' : 'error');
            setProductToDelete(null);
            setForceDelete(false);
        }
    };

    const confirmVariantDelete = async () => {
        if (variantToDelete) {
            const result = await deleteVariant(variantToDelete.product.id, variantToDelete.variant.id, forceDelete);
            showToast(result.message, result.success ? 'success' : 'error');
            setVariantToDelete(null);
            setForceDelete(false);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all on current page
            const newSet = new Set(selectedProductIds);
            paginatedProducts.forEach(p => newSet.add(p.id));
            setSelectedProductIds(newSet);
        } else {
            // Deselect all on current page
            const newSet = new Set(selectedProductIds);
            paginatedProducts.forEach(p => newSet.delete(p.id));
            setSelectedProductIds(newSet);
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSet = new Set(selectedProductIds);
        if (checked) newSet.add(id); else newSet.delete(id);
        setSelectedProductIds(newSet);
    };

    const allOnPageSelected = paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProductIds.has(p.id));
    const someOnPageSelected = paginatedProducts.some(p => selectedProductIds.has(p.id)) && !allOnPageSelected;

    const handleBulkDelete = () => {
        const result = bulkDeleteProducts(Array.from(selectedProductIds));
        showToast(result.message, result.success && result.message.includes('skipped') ? 'error' : 'success');
        setIsBulkDeleteModalOpen(false);
        setSelectedProductIds(new Set());
    };

    const handleBulkCategoryUpdate = (categoryIds: string[], action: 'add' | 'replace' | 'remove') => {
        const result = bulkUpdateProductCategories(Array.from(selectedProductIds), categoryIds, action);
        showToast(result.message, 'success');
        setIsBulkCategoryModalOpen(false);
        setSelectedProductIds(new Set());
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

    const calculateMargin = (retail: number, cost: number) => {
        if (retail <= 0) return 0;
        return ((retail - cost) / retail) * 100;
    };

    const MarginBadge: React.FC<{ margin: number }> = ({ margin }) => {
        let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        if (margin >= 50) colorClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        else if (margin >= 20) colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        else if (margin < 20) colorClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';

        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                {margin.toFixed(1)}%
            </span>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="relative flex-grow w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                            <input type="text" value={searchTerm} onChange={e => onInventoryViewUpdate({ searchTerm: e.target.value })} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center"><PlusIcon /> Add Product</button>
                            <FilterMenu activeFilterCount={(stockFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0)}>
                                <FilterSelectItem label="Stock Status" value={stockFilter} onChange={v => onInventoryViewUpdate({ stockFilter: v })} options={[{ value: 'All', label: 'All' }, { value: 'In Stock', label: 'In Stock' }, { value: 'Low Stock', label: 'Low Stock' }, { value: 'Out of Stock', label: 'Out of Stock' }]} />
                                <FilterSelectItem label="Category" value={categoryFilter} onChange={v => onInventoryViewUpdate({ categoryFilter: v })} options={[{ value: 'All', label: 'All Categories' }, ...categoryOptions]} />
                            </FilterMenu>
                        </div>
                    </div>
                    
                    {selectedProductIds.size > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-md flex flex-wrap items-center justify-between gap-4 border border-blue-200 dark:border-blue-800 animate-fadeIn">
                            <span className="font-medium text-blue-900 dark:text-blue-200">{selectedProductIds.size} item{selectedProductIds.size !== 1 ? 's' : ''} selected</span>
                            <div className="flex gap-2">
                                <button onClick={() => setIsBulkCategoryModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium shadow-sm transition-colors">
                                    <TagIcon className="h-4 w-4"/> Categories
                                </button>
                                <button onClick={() => setIsBulkDeleteModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium shadow-sm transition-colors">
                                    <TrashIcon className="h-4 w-4"/> Delete
                                </button>
                                <button onClick={() => setSelectedProductIds(new Set())} className="px-3 py-1.5 text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 text-sm transition-colors">
                                    Clear Selection
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                    <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 w-10">
                                <input 
                                    type="checkbox" 
                                    checked={allOnPageSelected} 
                                    ref={input => { if (input) input.indeterminate = someOnPageSelected; }}
                                    onChange={handleSelectAll} 
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 h-4 w-4"
                                />
                            </th>
                            <SortableHeader sortKey="sku">SKU</SortableHeader>
                            <SortableHeader sortKey="name">Name</SortableHeader>
                            <th className="px-6 py-3">Categories</th>
                            <SortableHeader sortKey="stock">Stock</SortableHeader>
                            <SortableHeader sortKey="retailPrice">Retail Price</SortableHeader>
                            <SortableHeader sortKey="costPrice">Cost Price</SortableHeader>
                            <th className="px-6 py-3">Margin</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedProducts.map(p => (
                            <React.Fragment key={p.id}>
                            <tr className={selectedProductIds.has(p.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                <td className="px-4 py-4">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedProductIds.has(p.id)} 
                                        onChange={e => handleSelectRow(p.id, e.target.checked)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 h-4 w-4"
                                    />
                                </td>
                                <td data-label="SKU" className="px-6 py-4 font-mono">{p.sku}</td>
                                <td data-label="Name" className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {p.name}
                                    {p.variants.length > 0 && <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-normal px-1.5 py-0.5 rounded-full">{p.variants.length} variants</span>}
                                </td>
                                <td data-label="Categories" className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">{getCategoryNames(p.categoryIds)}</td>
                                <td data-label="Stock" className="px-6 py-4">{p.stock}</td>
                                <td data-label="Retail Price" className="px-6 py-4">{formatCurrency(p.retailPrice)}</td>
                                <td data-label="Cost Price" className="px-6 py-4">{formatCurrency(p.costPrice)}</td>
                                <td data-label="Margin" className="px-6 py-4">
                                    {p.variants.length === 0 && <MarginBadge margin={calculateMargin(p.retailPrice, p.costPrice)} />}
                                </td>
                                <td data-label="Actions" className="px-6 py-4 flex items-center gap-1 justify-end flex-nowrap">
                                    <button onClick={() => setHistoryModalData({product: p})} title="History" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><HistoryIcon /></button>
                                    {p.variants.length === 0 && (
                                        <>
                                            <button onClick={() => setReceivingProduct({product: p})} title="Receive Stock" className="p-2 text-green-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ReceiveIcon /></button>
                                            <button onClick={() => setAdjustingProduct({product: p})} title="Adjust Stock" className="p-2 text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><AdjustIcon /></button>
                                        </>
                                    )}
                                    <button onClick={() => { setEditingProduct(p); setIsProductModalOpen(true); }} title="Edit Product" className="p-2 text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><PencilIcon /></button>
                                    <button onClick={() => { setProductToDelete(p); setForceDelete(false); }} title="Delete Product" className="p-2 text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><TrashIcon /></button>
                                </td>
                            </tr>
                            {p.variants.length > 0 && p.variants.map(v => (
                                <tr key={v.id} className="bg-gray-50 dark:bg-gray-800/50">
                                    <td></td>
                                    <td className="pl-12 pr-6 py-2 font-mono text-sm">{p.sku}-{v.skuSuffix}</td>
                                    <td className="px-6 py-2 text-sm text-gray-600 dark:text-gray-300">
                                        - {Object.values(v.options).join(' / ')}
                                    </td>
                                    <td className="px-6 py-2"></td>
                                    <td className="px-6 py-2 text-sm">{v.stock}</td>
                                    <td className="px-6 py-2 text-sm">{formatCurrency(v.retailPrice)}</td>
                                    <td className="px-6 py-2 text-sm">{formatCurrency(v.costPrice)}</td>
                                    <td className="px-6 py-2 text-sm">
                                        <MarginBadge margin={calculateMargin(v.retailPrice, v.costPrice)} />
                                    </td>
                                    <td className="px-6 py-2 flex items-center gap-1 justify-end flex-nowrap">
                                        <button onClick={() => setHistoryModalData({product: p, variantId: v.id})} title="History" className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full scale-90"><HistoryIcon /></button>
                                        <button onClick={() => setReceivingProduct({product: p, variant: v})} title="Receive Stock" className="p-2 text-green-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><ReceiveIcon /></button>
                                        <button onClick={() => setAdjustingProduct({product: p, variant: v})} title="Adjust Stock" className="p-2 text-yellow-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><AdjustIcon /></button>
                                        <button onClick={() => { setVariantToDelete({product: p, variant: v}); setForceDelete(false); }} title="Delete Variant" className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full scale-90"><TrashIcon /></button>
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
            
            <Modal isOpen={!!productToDelete} onClose={() => { setProductToDelete(null); setForceDelete(false); }} title="Confirm Deletion">
                {productToDelete && (
                    <div>
                        <p className="text-gray-900 dark:text-white mb-2">
                            Are you sure you want to delete <strong>{productToDelete.name}</strong>? This cannot be undone.
                        </p>
                        {(productToDelete.stock > 0 || (productToDelete.variants && productToDelete.variants.some(v => v.stock > 0))) && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4 flex items-start gap-3">
                                <DangerIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <div className="text-sm text-red-800 dark:text-red-200">
                                    <p className="font-bold">Warning: Active Stock</p>
                                    <p>This product has a total stock of <strong>{productToDelete.stock}</strong>.</p>
                                    <p className="mt-1">Standard deletion is disabled for items with active stock to prevent inventory mismatch.</p>
                                </div>
                            </div>
                        )}
                        {productToDelete.variants && productToDelete.variants.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md mb-4 flex items-start gap-3">
                                <DangerIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                    <p className="font-bold">Warning: Variants Exist</p>
                                    <p>This product has <strong>{productToDelete.variants.length} variants</strong>. Deleting the parent product will delete all variants and their history.</p>
                                </div>
                            </div>
                        )}
                        
                        <div className="mb-4">
                            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={forceDelete} 
                                    onChange={(e) => setForceDelete(e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500 bg-white dark:bg-gray-700"
                                />
                                <span className="font-medium text-red-600 dark:text-red-400">Force Delete (Bypass checks and delete all associated data)</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                            <button onClick={() => { setProductToDelete(null); setForceDelete(false); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={!forceDelete && (productToDelete.stock > 0 || (productToDelete.variants && productToDelete.variants.length > 0))}
                                className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
                            >
                                Delete Product
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={!!variantToDelete} onClose={() => { setVariantToDelete(null); setForceDelete(false); }} title="Confirm Variant Deletion">
                {variantToDelete && (
                    <div>
                        <p className="text-gray-900 dark:text-white mb-2">
                            Are you sure you want to delete variant <strong>{Object.values(variantToDelete.variant.options).join(' / ')}</strong> of {variantToDelete.product.name}?
                        </p>
                        
                        {variantToDelete.variant.stock > 0 && (
                             <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4 flex items-start gap-3">
                                <DangerIcon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                                <div className="text-sm text-red-800 dark:text-red-200">
                                    <p className="font-bold">Warning: Active Stock</p>
                                    <p>This variant has a stock of <strong>{variantToDelete.variant.stock}</strong>.</p>
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={forceDelete} 
                                    onChange={(e) => setForceDelete(e.target.checked)}
                                    className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500 bg-white dark:bg-gray-700"
                                />
                                <span className="font-medium text-red-600 dark:text-red-400">Force Delete (Bypass stock check)</span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                            <button onClick={() => { setVariantToDelete(null); setForceDelete(false); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                            <button 
                                onClick={confirmVariantDelete} 
                                disabled={!forceDelete && variantToDelete.variant.stock > 0}
                                className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
                            >
                                Delete Variant
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
             {receivingProduct && <Modal isOpen={!!receivingProduct} onClose={() => setReceivingProduct(null)} title={`Receive Stock`}><ReceiveStockModal product={receivingProduct.product} variant={receivingProduct.variant} onClose={() => setReceivingProduct(null)} /></Modal>}
             {adjustingProduct && <Modal isOpen={!!adjustingProduct} onClose={() => setAdjustingProduct(null)} title={`Adjust Stock`}><AdjustStockModal product={adjustingProduct.product} variant={adjustingProduct.variant} onClose={() => setAdjustingProduct(null)} /></Modal>}
             {historyModalData && <Modal isOpen={!!historyModalData} onClose={() => setHistoryModalData(null)} title="History" size="lg">
                 {/* 
                    Pass the current product from the list to ensure fresh data in the modal 
                    (avoid stale closures from old render cycle click handlers)
                 */}
                 <ProductHistoryModal 
                    product={products.find(p => p.id === historyModalData.product.id) || historyModalData.product} 
                    variantId={historyModalData.variantId} 
                    onClose={() => setHistoryModalData(null)} 
                 />
             </Modal>}
             
             <Modal isOpen={isBulkCategoryModalOpen} onClose={() => setIsBulkCategoryModalOpen(false)} title="Bulk Edit Categories">
                <BulkCategoryEditor 
                    selectedCount={selectedProductIds.size} 
                    onSubmit={handleBulkCategoryUpdate} 
                    onCancel={() => setIsBulkCategoryModalOpen(false)} 
                />
             </Modal>

             <Modal isOpen={isBulkDeleteModalOpen} onClose={() => setIsBulkDeleteModalOpen(false)} title="Confirm Bulk Deletion">
                <div className="text-gray-900 dark:text-gray-100">
                    <p className="mb-2 text-gray-900 dark:text-white">Are you sure you want to delete <strong>{selectedProductIds.size}</strong> selected products?</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">Products with active stock will be skipped and not deleted.</p>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsBulkDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md text-gray-900 dark:text-white">Cancel</button>
                        <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete Products</button>
                    </div>
                </div>
             </Modal>
        </div>
    );
};
