import React, { useMemo, useState } from 'react';
import { Product } from '../../types';
// FIX: Replaced useAppContext with specific context hooks to resolve import error.
import { useProducts } from '../context/ProductContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';
import { Pagination } from '../common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';

type ValuationData = {
    id: string; // productId for parent, variantId for variant
    productId: string;
    variantId?: string;
    isParent: boolean;
    sku: string;
    name: string;
    stock: number;
    totalCostValue: number;
    totalRetailValue: number;
    potentialProfit: number;
};

type SortableValuationKeys = 'sku' | 'name' | 'stock' | 'totalCostValue' | 'totalRetailValue' | 'potentialProfit';

export const InventoryValuationView: React.FC = () => {
    // FIX: Replaced useAppContext with specific context hooks.
    const { products } = useProducts();
    const { reportsViewState, onReportsInventoryValuationViewUpdate } = useUIState();
    const { formatCurrency } = useSettings();
    const { searchTerm, sortConfig, currentPage, itemsPerPage } = reportsViewState.inventoryValuation;
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

    const toggleProductExpansion = (productId: string) => {
        setExpandedProducts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    const requestSort = (key: SortableValuationKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onReportsInventoryValuationViewUpdate({ sortConfig: { key, direction } });
    };

    const valuationData = useMemo<ValuationData[]>(() => {
        const flatList: ValuationData[] = [];
        products.forEach(p => {
            if (p.variants && p.variants.length > 0) {
                 const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
                 const totalCostValue = p.variants.reduce((sum, v) => sum + v.costPrice * v.stock, 0);
                 const totalRetailValue = p.variants.reduce((sum, v) => sum + v.retailPrice * v.stock, 0);

                flatList.push({
                    id: p.id,
                    productId: p.id,
                    isParent: true,
                    sku: p.sku,
                    name: p.name,
                    stock: totalStock,
                    totalCostValue,
                    totalRetailValue,
                    potentialProfit: totalRetailValue - totalCostValue,
                });

                p.variants.forEach(v => {
                    const totalCostValue = v.costPrice * v.stock;
                    const totalRetailValue = v.retailPrice * v.stock;
                    flatList.push({
                        id: v.id,
                        productId: p.id,
                        variantId: v.id,
                        isParent: false,
                        sku: `${p.sku}-${v.skuSuffix}`,
                        name: Object.values(v.options).join(' / '),
                        stock: v.stock,
                        totalCostValue,
                        totalRetailValue,
                        potentialProfit: totalRetailValue - totalCostValue
                    });
                });
            } else {
                const totalCostValue = p.costPrice * p.stock;
                const totalRetailValue = p.retailPrice * p.stock;
                flatList.push({
                    id: p.id,
                    productId: p.id,
                    isParent: true,
                    sku: p.sku,
                    name: p.name,
                    stock: p.stock,
                    totalCostValue,
                    totalRetailValue,
                    potentialProfit: totalRetailValue - totalCostValue
                });
            }
        });
        return flatList;
    }, [products]);

    const filteredAndSorted = useMemo(() => {
        const matchingProductIds = new Set<string>();
        if (searchTerm) {
            valuationData.forEach(item => {
                if (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sku.toLowerCase().includes(searchTerm.toLowerCase())) {
                    matchingProductIds.add(item.productId);
                }
            });
        }

        const filtered = searchTerm ? valuationData.filter(v => matchingProductIds.has(v.productId)) : valuationData;
        
        return filtered.sort((a, b) => {
            const parentA = a.isParent ? a : valuationData.find(p => p.id === a.productId && p.isParent)!;
            const parentB = b.isParent ? b : valuationData.find(p => p.id === b.productId && p.isParent)!;

            if (parentA.id !== parentB.id) {
                const key = sortConfig.key;
                const valA = parentA[key];
                const valB = parentB[key];
                
                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
                else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            }
            // If same parent, parent comes first, then variants
            if (a.isParent) return -1;
            if (b.isParent) return 1;
            return 0; // Variant order doesn't matter much
        });
    }, [valuationData, searchTerm, sortConfig]);
    
    const displayItems = useMemo(() => {
        return filteredAndSorted.filter(item => item.isParent || expandedProducts.has(item.productId));
    }, [filteredAndSorted, expandedProducts]);

    const paginated = useMemo(() => displayItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [displayItems, currentPage, itemsPerPage]);
    
    const totals = useMemo(() => {
        return valuationData.filter(item => !item.isParent || !products.find(p => p.id === item.id)?.variants.length).reduce((acc, item) => ({
            totalCost: acc.totalCost + item.totalCostValue,
            totalRetail: acc.totalRetail + item.totalRetailValue,
            totalProfit: acc.totalProfit + item.potentialProfit
        }), { totalCost: 0, totalRetail: 0, totalProfit: 0 });
    }, [valuationData, products]);
    
    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableValuationKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3">
                <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1.5 group">
                    <span>{children}</span>
                    {isSorted ? (sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />) : <ChevronDownIcon className="h-4 w-4 invisible" />}
                </button>
            </th>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="p-4">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input type="text" value={searchTerm} onChange={e => onReportsInventoryValuationViewUpdate({ searchTerm: e.target.value })} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                    <thead className="text-xs text-gray-700 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <SortableHeader sortKey="sku">SKU</SortableHeader>
                            <SortableHeader sortKey="name">Name</SortableHeader>
                            <SortableHeader sortKey="stock">Stock</SortableHeader>
                            <SortableHeader sortKey="totalCostValue">Total Cost</SortableHeader>
                            <SortableHeader sortKey="totalRetailValue">Total Retail</SortableHeader>
                            <SortableHeader sortKey="potentialProfit">Potential Profit</SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginated.map(v => {
                            const hasVariants = products.find(p => p.id === v.productId)?.variants.length > 0;
                            return (
                                <tr key={v.id} className={!v.isParent ? 'bg-gray-50 dark:bg-gray-800/50' : ''}>
                                    <td data-label="SKU" className="px-6 py-4 font-mono">
                                         <div className="flex items-center" style={{ paddingLeft: v.isParent ? 0 : '1rem' }}>
                                            {v.isParent && hasVariants && (
                                                <button onClick={() => toggleProductExpansion(v.id)} className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                                                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${expandedProducts.has(v.id) ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                            <span className={!v.isParent ? 'pl-5' : ''}>{v.sku}</span>
                                        </div>
                                    </td>
                                    <td data-label="Name" className="px-6 py-4 font-medium text-gray-900 dark:text-white">{v.name}</td>
                                    <td data-label="Stock" className={`px-6 py-4 ${v.isParent && hasVariants ? 'font-bold' : ''}`}>{v.stock}</td>
                                    <td data-label="Total Cost" className={`px-6 py-4 ${v.isParent && hasVariants ? 'font-bold' : ''}`}>{formatCurrency(v.totalCostValue)}</td>
                                    <td data-label="Total Retail" className={`px-6 py-4 ${v.isParent && hasVariants ? 'font-bold' : ''}`}>{formatCurrency(v.totalRetailValue)}</td>
                                    <td data-label="Potential Profit" className={`px-6 py-4 ${v.isParent && hasVariants ? 'font-bold' : ''}`}>{formatCurrency(v.potentialProfit)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                     <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold text-gray-600 dark:text-gray-300">
                        <tr>
                            <td colSpan={3} className="px-6 py-3 text-right">Totals:</td>
                            <td data-label="Total Cost Value" className="px-6 py-3">{formatCurrency(totals.totalCost)}</td>
                            <td data-label="Total Retail Value" className="px-6 py-3">{formatCurrency(totals.totalRetail)}</td>
                            <td data-label="Total Potential Profit" className="px-6 py-3">{formatCurrency(totals.totalProfit)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={Math.ceil(displayItems.length / itemsPerPage)} onPageChange={page => onReportsInventoryValuationViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={displayItems.length} />
        </div>
    );
};