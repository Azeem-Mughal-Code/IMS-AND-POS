
import React, { useMemo, useState } from 'react';
import { AnalysisViewState } from '../types';
import { SearchIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';
import { Pagination } from './common/Pagination';
import { useProducts } from './context/ProductContext';
import { useSales } from './context/SalesContext';
import { useUIState } from './context/UIStateContext';
import { useSettings } from './context/SettingsContext';

type SellableItem = {
    id: string; // productId or variantId
    productId: string;
    sku: string;
    name: string;
    stock: number;
}

type PerformanceMetric = {
    item: SellableItem;
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

type TimeRange = 'today' | 'weekly' | 'monthly' | 'yearly' | 'all';

const TimeRangeButton: React.FC<{
    label: string;
    range: TimeRange;
    currentTimeRange: TimeRange;
    setTimeRange: (range: TimeRange) => void;
}> = ({ label, range, currentTimeRange, setTimeRange }) => (
    <button
        onClick={() => setTimeRange(range)}
        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            currentTimeRange === range
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
    >
        {label}
    </button>
);

const getOrdinal = (n: number) => {
    if (n <= 0) return String(n);
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const KPICard: React.FC<{
    title: string;
    rank: number;
    total: number;
    productName: string;
    value: string;
    onPrev: () => void;
    onNext: () => void;
}> = ({ title, rank, total, productName, value, onPrev, onNext }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{getOrdinal(rank)} {title}</h3>
            <div className="flex items-center gap-1">
                <button onClick={onPrev} disabled={rank <= 1} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronUpIcon className="h-5 w-5" />
                </button>
                <button onClick={onNext} disabled={rank >= total} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronDownIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
        <p className="text-xl font-bold text-gray-800 dark:text-white truncate" title={productName}>{productName}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{value}</p>
    </div>
);

export const Analysis: React.FC = () => {
    const { products } = useProducts();
    const { sales } = useSales();
    const { analysisViewState, onAnalysisViewUpdate } = useUIState();
    const { formatCurrency, paginationConfig } = useSettings();
    const { timeRange, searchTerm, sortConfig, currentPage } = analysisViewState;
    const itemsPerPage = paginationConfig.analysis || 10;

    const [topPerformerIndices, setTopPerformerIndices] = useState({ revenue: 0, profit: 0, quantity: 0 });

    const requestSort = (key: SortableAnalysisKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        onAnalysisViewUpdate({ sortConfig: { key, direction } });
    };

    const filteredData = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const getStartOfWeek = (date: Date) => {
            const d = new Date(date);
            d.setDate(d.getDate() - d.getDay());
            d.setHours(0, 0, 0, 0);
            return d;
        };

        const filteredSales = sales.filter(s => {
            const saleDate = new Date(s.date);
            switch (timeRange) {
                case 'today': return saleDate >= today;
                case 'weekly': return saleDate >= getStartOfWeek(now);
                case 'monthly': return saleDate >= new Date(now.getFullYear(), now.getMonth(), 1);
                case 'yearly': return saleDate >= new Date(now.getFullYear(), 0, 1);
                case 'all': default: return true;
            }
        });

        const metricsMap = new Map<string, PerformanceMetric>();

        // Initialize with all products/variants to show items with 0 sales
        products.forEach(p => {
            if (p.variants && p.variants.length > 0) {
                p.variants.forEach(v => {
                    const id = v.id;
                    metricsMap.set(id, {
                        item: { id: v.id, productId: p.id, sku: `${p.sku}-${v.skuSuffix}`, name: `${p.name} (${Object.values(v.options).join(' / ')})`, stock: v.stock },
                        unitsSold: 0, revenue: 0, cogs: 0, profit: 0
                    });
                });
            } else {
                metricsMap.set(p.id, {
                    item: { id: p.id, productId: p.id, sku: p.sku, name: p.name, stock: p.stock },
                    unitsSold: 0, revenue: 0, cogs: 0, profit: 0
                });
            }
        });

        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const id = item.variantId || item.productId;
                if (!metricsMap.has(id)) return; // Should exist if products loaded, unless deleted product

                const metric = metricsMap.get(id)!;
                if (sale.type === 'Sale') {
                    const qty = item.quantity - (item.returnedQuantity || 0);
                    if (qty > 0) {
                        metric.unitsSold += qty;
                        metric.revenue += qty * item.retailPrice;
                        metric.cogs += qty * item.costPrice;
                        metric.profit += qty * (item.retailPrice - item.costPrice); // Simplified profit calc per item
                    }
                }
            });
        });

        const data: PerformanceData[] = Array.from(metricsMap.values()).map(m => ({
            ...m,
            profitMargin: m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0,
            sellThrough: (m.unitsSold + m.item.stock) > 0 ? (m.unitsSold / (m.unitsSold + m.item.stock)) * 100 : 0
        }));

        return data
            .filter(d => d.item.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const key = sortConfig.key;
                let valA: number | string = 0;
                let valB: number | string = 0;

                if (key === 'product') {
                    valA = a.item.name;
                    valB = b.item.name;
                } else {
                    valA = a[key];
                    valB = b[key];
                }

                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
                else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
                
                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });

    }, [products, sales, timeRange, searchTerm, sortConfig]);

    const sortedByRevenue = useMemo(() => [...filteredData].sort((a, b) => b.revenue - a.revenue), [filteredData]);
    const sortedByProfit = useMemo(() => [...filteredData].sort((a, b) => b.profit - a.profit), [filteredData]);
    const sortedByQty = useMemo(() => [...filteredData].sort((a, b) => b.unitsSold - a.unitsSold), [filteredData]);

    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableAnalysisKeys }> = ({ children, sortKey }) => {
        const isSorted = sortConfig.key === sortKey;
        return (
            <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700" onClick={() => requestSort(sortKey)}>
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
        <div className="p-6 space-y-6">
            <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Analysis</h1>
                <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
                    <div className="flex items-center space-x-1">
                        <TimeRangeButton label="Today" range="today" currentTimeRange={timeRange} setTimeRange={(r) => onAnalysisViewUpdate({ timeRange: r })} />
                        <TimeRangeButton label="Week" range="weekly" currentTimeRange={timeRange} setTimeRange={(r) => onAnalysisViewUpdate({ timeRange: r })} />
                        <TimeRangeButton label="Month" range="monthly" currentTimeRange={timeRange} setTimeRange={(r) => onAnalysisViewUpdate({ timeRange: r })} />
                        <TimeRangeButton label="Year" range="yearly" currentTimeRange={timeRange} setTimeRange={(r) => onAnalysisViewUpdate({ timeRange: r })} />
                        <TimeRangeButton label="All Time" range="all" currentTimeRange={timeRange} setTimeRange={(r) => onAnalysisViewUpdate({ timeRange: r })} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KPICard
                    title="Most Revenue"
                    rank={topPerformerIndices.revenue + 1}
                    total={sortedByRevenue.length}
                    productName={sortedByRevenue[topPerformerIndices.revenue]?.item.name || 'N/A'}
                    value={formatCurrency(sortedByRevenue[topPerformerIndices.revenue]?.revenue || 0)}
                    onPrev={() => setTopPerformerIndices(p => ({ ...p, revenue: Math.max(0, p.revenue - 1) }))}
                    onNext={() => setTopPerformerIndices(p => ({ ...p, revenue: Math.min(sortedByRevenue.length - 1, p.revenue + 1) }))}
                />
                <KPICard
                    title="Highest Profit"
                    rank={topPerformerIndices.profit + 1}
                    total={sortedByProfit.length}
                    productName={sortedByProfit[topPerformerIndices.profit]?.item.name || 'N/A'}
                    value={formatCurrency(sortedByProfit[topPerformerIndices.profit]?.profit || 0)}
                    onPrev={() => setTopPerformerIndices(p => ({ ...p, profit: Math.max(0, p.profit - 1) }))}
                    onNext={() => setTopPerformerIndices(p => ({ ...p, profit: Math.min(sortedByProfit.length - 1, p.profit + 1) }))}
                />
                <KPICard
                    title="Most Sold"
                    rank={topPerformerIndices.quantity + 1}
                    total={sortedByQty.length}
                    productName={sortedByQty[topPerformerIndices.quantity]?.item.name || 'N/A'}
                    value={`${sortedByQty[topPerformerIndices.quantity]?.unitsSold || 0} units`}
                    onPrev={() => setTopPerformerIndices(p => ({ ...p, quantity: Math.max(0, p.quantity - 1) }))}
                    onNext={() => setTopPerformerIndices(p => ({ ...p, quantity: Math.min(sortedByQty.length - 1, p.quantity + 1) }))}
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="p-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={e => onAnalysisViewUpdate({ searchTerm: e.target.value, currentPage: 1 })}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                            <tr>
                                <SortableHeader sortKey="product">Product</SortableHeader>
                                <SortableHeader sortKey="unitsSold">Units Sold</SortableHeader>
                                <SortableHeader sortKey="revenue">Revenue</SortableHeader>
                                <SortableHeader sortKey="profit">Profit</SortableHeader>
                                <SortableHeader sortKey="profitMargin">Margin</SortableHeader>
                                <SortableHeader sortKey="sellThrough">Sell Through</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedData.map(d => (
                                <tr key={d.item.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td data-label="Product" className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        <div>{d.item.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{d.item.sku}</div>
                                    </td>
                                    <td data-label="Units Sold" className="px-6 py-4">{d.unitsSold}</td>
                                    <td data-label="Revenue" className="px-6 py-4">{formatCurrency(d.revenue)}</td>
                                    <td data-label="Profit" className="px-6 py-4 text-green-600 dark:text-green-400">{formatCurrency(d.profit)}</td>
                                    <td data-label="Margin" className="px-6 py-4">{d.profitMargin.toFixed(1)}%</td>
                                    <td data-label="Sell Through" className="px-6 py-4">{d.sellThrough.toFixed(1)}%</td>
                                </tr>
                            ))}
                            {paginatedData.length === 0 && (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No data available.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(page) => onAnalysisViewUpdate({ currentPage: page })} itemsPerPage={itemsPerPage} totalItems={filteredData.length} />
            </div>
        </div>
    );
};
