import React, { useMemo } from 'react';
import { Product } from '../../types';
// FIX: Replaced useAppContext with specific context hooks to resolve import error.
import { useProducts } from '../context/ProductContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';
import { Pagination } from '../common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon } from '../Icons';

type ValuationData = {
    product: Product;
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

    const requestSort = (key: SortableValuationKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
        onReportsInventoryValuationViewUpdate({ sortConfig: { key, direction } });
    };

    const valuationData = useMemo<ValuationData[]>(() => {
        return products.map(p => {
            const totalCostValue = p.costPrice * p.stock;
            const totalRetailValue = p.retailPrice * p.stock;
            const potentialProfit = totalRetailValue - totalCostValue;
            return { product: p, totalCostValue, totalRetailValue, potentialProfit };
        });
    }, [products]);

    const filteredAndSorted = useMemo(() => {
        return valuationData
            .filter(v => v.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const key = sortConfig.key;
                let valA: string | number, valB: string | number;

                if (key === 'sku' || key === 'name' || key === 'stock') {
                    valA = a.product[key];
                    valB = b.product[key];
                } else {
                    valA = a[key];
                    valB = b[key];
                }
                
                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
                else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
    }, [valuationData, searchTerm, sortConfig]);

    const paginated = useMemo(() => filteredAndSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [filteredAndSorted, currentPage, itemsPerPage]);
    
    const totals = useMemo(() => {
        return valuationData.reduce((acc, item) => ({
            totalCost: acc.totalCost + item.totalCostValue,
            totalRetail: acc.totalRetail + item.totalRetailValue,
            totalProfit: acc.totalProfit + item.potentialProfit
        }), { totalCost: 0, totalRetail: 0, totalProfit: 0 });
    }, [valuationData]);
    
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
                        {paginated.map(v => (
                            <tr key={v.product.id}>
                                <td data-label="SKU" className="px-6 py-4 font-mono">{v.product.sku}</td>
                                <td data-label="Name" className="px-6 py-4 font-medium text-gray-900 dark:text-white">{v.product.name}</td>
                                <td data-label="Stock" className="px-6 py-4">{v.product.stock}</td>
                                <td data-label="Total Cost" className="px-6 py-4">{formatCurrency(v.totalCostValue)}</td>
                                <td data-label="Total Retail" className="px-6 py-4">{formatCurrency(v.totalRetailValue)}</td>
                                <td data-label="Potential Profit" className="px-6 py-4">{formatCurrency(v.potentialProfit)}</td>
                            </tr>
                        ))}
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
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredAndSorted.length / itemsPerPage)} onPageChange={page => onReportsInventoryValuationViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredAndSorted.length} />
        </div>
    );
};