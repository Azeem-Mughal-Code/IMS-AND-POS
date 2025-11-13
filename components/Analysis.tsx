import React, { useMemo } from 'react';
import { Product, Sale, AnalysisViewState } from '../types';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import { Pagination } from './common/Pagination';

const formatCurrencyDefault = (amount: number) => `$${amount.toFixed(2)}`;

type PerformanceMetric = {
    product: Product;
    unitsSold: number;
    revenue: number;
    cogs: number;
    profit: number;
};

type PerformanceData = PerformanceMetric & {
    profitMargin: number;
    sellThrough: number;
};

type SortableAnalysisKeys = 'product' | 'unitsSold' | 'revenue' | 'profit' | 'profitMargin' | 'sellThrough';

const KPICard: React.FC<{ title: string; productName: string; value: string; }> = ({ title, productName, value }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className="text-lg font-semibold text-gray-800 dark:text-white truncate">{productName}</p>
        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{value}</p>
    </div>
);

interface AnalysisProps {
    products: Product[];
    sales: Sale[];
    viewState: AnalysisViewState;
    onViewStateUpdate: (updates: Partial<AnalysisViewState>) => void;
    currency: string;
}

export const Analysis: React.FC<AnalysisProps> = ({ products, sales, viewState, onViewStateUpdate, currency }) => {
    const { searchTerm, sortConfig, currentPage, itemsPerPage } = viewState;

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
    }).format(amount);

    const productPerformance = useMemo<PerformanceMetric[]>(() => {
        const metrics: { [key: string]: Omit<PerformanceMetric, 'product'> } = {};

        sales.forEach(sale => {
            if (sale.type === 'Sale') {
                sale.items.forEach(item => {
                    if (!metrics[item.id]) {
                        metrics[item.id] = { unitsSold: 0, revenue: 0, cogs: 0, profit: 0 };
                    }
                    metrics[item.id].unitsSold += item.quantity;
                    metrics[item.id].revenue += item.retailPrice * item.quantity;
                    metrics[item.id].cogs += item.costPrice * item.quantity;
                    metrics[item.id].profit += (item.retailPrice - item.costPrice) * item.quantity;
                });
            }
        });

        return products.map(p => ({
            product: p,
            ... (metrics[p.id] || { unitsSold: 0, revenue: 0, cogs: 0, profit: 0 })
        }));
    }, [products, sales]);
    
    const requestSort = (key: SortableAnalysisKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onViewStateUpdate({ sortConfig: { key, direction } });
    };
    
    const filteredAndSortedPerformance = useMemo(() => {
        const withCalculatedMetrics: PerformanceData[] = productPerformance.map(p => {
            const profitMargin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
            const sellThrough = p.unitsSold + p.product.stock > 0 ? (p.unitsSold / (p.unitsSold + p.product.stock)) * 100 : 0;
            return { ...p, profitMargin, sellThrough };
        });

        const filtered = withCalculatedMetrics.filter(p =>
            p.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const key = sortConfig.key;
            let valA: string | number;
            let valB: string | number;

            if (key === 'product') {
                valA = a.product.name;
                valB = b.product.name;
            } else {
                valA = a[key];
                valB = b[key];
            }
            
            let comparison = 0;
            if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });
    }, [productPerformance, searchTerm, sortConfig]);

    const totalItems = filteredAndSortedPerformance.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedPerformance = useMemo(() => {
        return filteredAndSortedPerformance.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [filteredAndSortedPerformance, currentPage, itemsPerPage]);

    const kpis = useMemo(() => {
        if (productPerformance.length === 0) return { bestSellerByUnits: null, bestSellerByProfit: null, slowestMover: null };
        
        const sortedByUnits = [...productPerformance].sort((a, b) => b.unitsSold - a.unitsSold);
        const sortedByProfit = [...productPerformance].sort((a, b) => b.profit - a.profit);
        const slowestMovers = [...productPerformance]
            .filter(p => p.product.stock > 0)
            .sort((a, b) => {
                const aSellThrough = a.unitsSold / (a.unitsSold + a.product.stock);
                const bSellThrough = b.unitsSold / (b.unitsSold + b.product.stock);
                return aSellThrough - bSellThrough;
            });

        return {
            bestSellerByUnits: sortedByUnits[0],
            bestSellerByProfit: sortedByProfit[0],
            slowestMover: slowestMovers[0]
        };
    }, [productPerformance]);

    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableAnalysisKeys }> = ({ children, sortKey }) => {
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
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Business Analysis</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard title="Best Seller (Units)" productName={kpis.bestSellerByUnits?.product.name || 'N/A'} value={`${kpis.bestSellerByUnits?.unitsSold || 0} Units`} />
                <KPICard title="Most Profitable" productName={kpis.bestSellerByProfit?.product.name || 'N/A'} value={formatCurrency(kpis.bestSellerByProfit?.profit || 0)} />
                <KPICard title="Slowest Mover" productName={kpis.slowestMover?.product.name || 'N/A'} value={`${kpis.slowestMover?.product.stock || 0} in Stock`} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                 <div className="p-4">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Product Performance</h2>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by product name or SKU..."
                            value={searchTerm}
                            onChange={(e) => onViewStateUpdate({ searchTerm: e.target.value })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                 </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <SortableHeader sortKey="product">Product</SortableHeader>
                                <SortableHeader sortKey="unitsSold">Units Sold</SortableHeader>
                                <SortableHeader sortKey="revenue">Revenue</SortableHeader>
                                <SortableHeader sortKey="profit">Profit</SortableHeader>
                                <SortableHeader sortKey="profitMargin">Profit Margin</SortableHeader>
                                <SortableHeader sortKey="sellThrough">Sell-through</SortableHeader>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPerformance.map(p => {
                                return (
                                    <tr key={p.product.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.product.name}</td>
                                        <td className="px-6 py-4">{p.unitsSold}</td>
                                        <td className="px-6 py-4">{formatCurrency(p.revenue)}</td>
                                        <td className="px-6 py-4">{formatCurrency(p.profit)}</td>
                                        <td className={`px-6 py-4 font-semibold ${p.profitMargin < 10 ? 'text-red-500' : p.profitMargin < 30 ? 'text-yellow-500' : 'text-green-500'}`}>{p.profitMargin.toFixed(1)}%</td>
                                        <td className="px-6 py-4">{p.sellThrough.toFixed(1)}%</td>
                                    </tr>
                                );
                            })}
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
        </div>
    );
};