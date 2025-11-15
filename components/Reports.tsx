import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Sale, UserRole, ReportsViewState, PaymentType } from '../types';
import { Modal } from './common/Modal';
import { FilterMenu, FilterSelectItem } from './common/FilterMenu';
import { Pagination } from './common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, PhotoIcon } from './Icons';
import { useAppContext } from './context/AppContext';
import { PrintableReceipt } from './common/PrintableReceipt';

declare var html2canvas: any;

type SortableSaleKeys = 'id' | 'date' | 'type' | 'salespersonName' | 'total' | 'profit';
type SortableProductKeys = 'sku' | 'name' | 'stock';

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

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};


export const Reports: React.FC = () => {
  const { 
    sales, products, currentUser, processSale, reportsViewState, 
    onReportsSalesViewUpdate, onReportsProductsViewUpdate, 
    currency, isIntegerCurrency, isTaxEnabled, taxRate 
  } = useAppContext();
    
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const handleSaveAsImage = () => {
    if (printableAreaRef.current && viewingSale) {
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
            link.download = `receipt-${viewingSale.id}.png`;
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

  const { searchTerm: saleSearch, typeFilter, statusFilter, timeRange: saleTimeRange, sortConfig: saleSortConfig, currentPage: saleCurrentPage, itemsPerPage: saleItemsPerPage } = reportsViewState.sales;
  const { searchTerm: productSearch, stockFilter, sortConfig: productSortConfig, currentPage: productCurrentPage, itemsPerPage: productItemsPerPage } = reportsViewState.products;

  const salesActiveFilterCount = (typeFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0) + (saleTimeRange !== 'all' ? 1 : 0);
  const productsActiveFilterCount = stockFilter !== 'All' ? 1 : 0;
  
  const transactionTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Sale', label: 'Sale' },
    { value: 'Return', label: 'Return' },
  ];
  const transactionStatusOptions = [
    { value: 'All', label: 'All Statuses' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Partially Refunded', label: 'Partially Refunded' },
    { value: 'Refunded', label: 'Refunded' },
  ];
  const productStockFilterOptions = [
    { value: 'All', label: 'All Stock Status' },
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
  ];


  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const handleRefund = () => {
    if (!viewingSale || viewingSale.type !== 'Sale' || (viewingSale.status !== 'Completed' && viewingSale.status !== 'Partially Refunded')) return;
    
    const itemsToRefund = viewingSale.items
        .map(item => ({
            ...item,
            quantity: item.quantity - (item.returnedQuantity || 0),
        }))
        .filter(item => item.quantity > 0);
    
    if (itemsToRefund.length === 0) {
        setStatusMessage({ type: 'error', text: 'No items remaining to refund.' });
        setViewingSale(null);
        return;
    }

    const subtotal = itemsToRefund.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0);
    const tax = isTaxEnabled ? subtotal * taxRate : 0;
    const total = subtotal + tax;
    const cogs = itemsToRefund.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

    const refundTransaction: Omit<Sale, 'id' | 'date'> = {
        items: itemsToRefund,
        subtotal: -subtotal,
        tax: -tax,
        total: -total,
        cogs: -cogs,
        profit: (-total) - (-cogs),
        payments: [{ type: viewingSale.payments[0]?.type || PaymentType.Cash, amount: -total }],
        type: 'Return',
        originalSaleId: viewingSale.id,
        salespersonId: currentUser.id,
        salespersonName: currentUser.username,
    };

    try {
        processSale(refundTransaction);
        setStatusMessage({ type: 'success', text: `Successfully refunded remaining items for sale ${viewingSale.id}.` });
    } catch (e) {
        if (e instanceof Error) {
            setStatusMessage({ type: 'error', text: e.message });
        } else {
            setStatusMessage({ type: 'error', text: 'An error occurred while processing the refund.' });
        }
    } finally {
        setViewingSale(null);
    }
  };

  const requestSaleSort = (key: SortableSaleKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (saleSortConfig.key === key && saleSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    onReportsSalesViewUpdate({ sortConfig: { key, direction } });
  };

  const requestProductSort = (key: SortableProductKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (productSortConfig.key === key && productSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    onReportsProductsViewUpdate({ sortConfig: { key, direction } });
  };
  

  const filteredAndSortedSales = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const filtered = sales
      .filter(s => {
        const saleDate = new Date(s.date);
        switch (saleTimeRange) {
            case 'today':
                if (saleDate < today) return false;
                break;
            case 'weekly': {
                const startOfWeek = getStartOfWeek(now);
                if (saleDate < startOfWeek) return false;
                break;
            }
            case 'monthly': {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                if (saleDate < startOfMonth) return false;
                break;
            }
            case 'yearly': {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                if (saleDate < startOfYear) return false;
                break;
            }
            case 'all':
            default:
                break;
        }

        if(typeFilter !== 'All' && s.type !== typeFilter) return false;
        if(statusFilter !== 'All' && s.type === 'Sale' && s.status !== statusFilter) return false;
        if(saleSearch && !s.id.toLowerCase().includes(saleSearch.toLowerCase()) && !s.salespersonName.toLowerCase().includes(saleSearch.toLowerCase())) return false;
        return true;
      });
      
    return filtered.sort((a, b) => {
        const valA = a[saleSortConfig.key as keyof Sale];
        const valB = b[saleSortConfig.key as keyof Sale];
        let comparison = 0;
        if (saleSortConfig.key === 'date') {
            comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }
        return saleSortConfig.direction === 'ascending' ? comparison : -comparison;
    });

  }, [sales, saleSearch, typeFilter, statusFilter, saleSortConfig, saleTimeRange]);

  const saleTotalItems = filteredAndSortedSales.length;
  const saleTotalPages = Math.ceil(saleTotalItems / saleItemsPerPage);
  const paginatedSales = useMemo(() => {
    return filteredAndSortedSales.slice(
        (saleCurrentPage - 1) * saleItemsPerPage,
        saleCurrentPage * saleItemsPerPage
    );
  }, [filteredAndSortedSales, saleCurrentPage, saleItemsPerPage]);

  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products
        .filter(p => {
            if (stockFilter === 'In Stock') return p.stock > p.lowStockThreshold;
            if (stockFilter === 'Low Stock') return p.stock > 0 && p.stock <= p.lowStockThreshold;
            if (stockFilter === 'Out of Stock') return p.stock <= 0;
            return true;
        })
        .filter(p => 
            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
            p.sku.toLowerCase().includes(productSearch.toLowerCase())
        );

    return filtered.sort((a, b) => {
        const valA = a[productSortConfig.key];
        const valB = b[productSortConfig.key];
        let comparison = 0;

        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }

        return productSortConfig.direction === 'ascending' ? comparison : -comparison;
    });
  }, [products, productSearch, stockFilter, productSortConfig]);

  const productTotalItems = filteredAndSortedProducts.length;
  const productTotalPages = Math.ceil(productTotalItems / productItemsPerPage);
  const paginatedProducts = useMemo(() => {
    return filteredAndSortedProducts.slice(
        (productCurrentPage - 1) * productItemsPerPage,
        productCurrentPage * productItemsPerPage
    );
  }, [filteredAndSortedProducts, productCurrentPage, productItemsPerPage]);
  
  const SortableSaleHeader: React.FC<{ children: React.ReactNode, sortKey: SortableSaleKeys }> = ({ children, sortKey }) => {
    const isSorted = saleSortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3">
            <button onClick={() => requestSaleSort(sortKey)} className="flex items-center gap-1.5 group">
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                {isSorted ? (
                    saleSortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                ) : <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-500 transition-colors" />}
            </button>
        </th>
    );
  };

  const SortableProductHeader: React.FC<{ children: React.ReactNode, sortKey: SortableProductKeys }> = ({ children, sortKey }) => {
    const isSorted = productSortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3">
            <button onClick={() => requestProductSort(sortKey)} className="flex items-center gap-1.5 group">
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                {isSorted ? (
                    productSortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                ) : <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-500 transition-colors" />}
            </button>
        </th>
    );
  };
  

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reports</h1>

      {statusMessage && (
        <div className={`border px-4 py-3 rounded relative mb-4 ${statusMessage.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`} role="alert">
          <span className="block sm:inline">{statusMessage.text}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setStatusMessage(null)}>
            <svg className="fill-current h-6 w-6" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                 <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Transaction History</h2>
                 <div className="flex-shrink-0 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
                    <div className="flex items-center space-x-1">
                        <TimeRangeButton label="Today" range="today" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                        <TimeRangeButton label="Week" range="weekly" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                        <TimeRangeButton label="Month" range="monthly" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                        <TimeRangeButton label="Year" range="yearly" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                        <TimeRangeButton label="All Time" range="all" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative flex-grow">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input
                        type="text"
                        placeholder="Search by Receipt ID or Salesperson..."
                        value={saleSearch}
                        onChange={e => onReportsSalesViewUpdate({ searchTerm: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                 <FilterMenu activeFilterCount={salesActiveFilterCount}>
                    <FilterSelectItem
                        label="Transaction Type"
                        value={typeFilter}
                        onChange={(value) => onReportsSalesViewUpdate({ typeFilter: value })}
                        options={transactionTypeOptions}
                    />
                    <FilterSelectItem
                        label="Transaction Status"
                        value={statusFilter}
                        onChange={(value) => onReportsSalesViewUpdate({ statusFilter: value })}
                        options={transactionStatusOptions}
                    />
                </FilterMenu>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
              <tr>
                <SortableSaleHeader sortKey="id">ID</SortableSaleHeader>
                <SortableSaleHeader sortKey="date">Date</SortableSaleHeader>
                <SortableSaleHeader sortKey="type">Type / Status</SortableSaleHeader>
                <SortableSaleHeader sortKey="salespersonName">Salesperson</SortableSaleHeader>
                <th scope="col" className="px-6 py-3">Items</th>
                <SortableSaleHeader sortKey="total">Total</SortableSaleHeader>
                {currentUser.role === UserRole.Admin && <SortableSaleHeader sortKey="profit">Profit</SortableSaleHeader>}
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <button onClick={() => setViewingSale(s)} className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
                      {s.id}
                    </button>
                  </td>
                  <td className="px-6 py-4">{new Date(s.date).toLocaleString()}</td>
                  <td className="px-6 py-4">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        s.type === 'Return' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        s.status === 'Refunded' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        s.status === 'Partially Refunded' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                     }`}>
                        {s.type === 'Sale' ? s.status : s.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">{s.salespersonName}</td>
                  <td className="px-6 py-4">
                    {s.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-6 py-4">{formatCurrency(s.total)}</td>
                  {currentUser.role === UserRole.Admin && <td className="px-6 py-4">{formatCurrency(s.profit)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
            currentPage={saleCurrentPage}
            totalPages={saleTotalPages}
            onPageChange={(page) => onReportsSalesViewUpdate({ currentPage: page })}
            itemsPerPage={saleItemsPerPage}
            totalItems={saleTotalItems}
        />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Stock Levels</h2>
            <div className="flex items-center gap-4">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={productSearch}
                        onChange={e => onReportsProductsViewUpdate({ searchTerm: e.target.value })}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <FilterMenu activeFilterCount={productsActiveFilterCount}>
                    <FilterSelectItem
                        label="Stock Status"
                        value={stockFilter}
                        onChange={(value) => onReportsProductsViewUpdate({ stockFilter: value })}
                        options={productStockFilterOptions}
                    />
                </FilterMenu>
            </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
              <tr>
                <SortableProductHeader sortKey="sku">SKU</SortableProductHeader>
                <SortableProductHeader sortKey="name">Name</SortableProductHeader>
                <SortableProductHeader sortKey="stock">Stock</SortableProductHeader>
                <th scope="col" className="px-6 py-3">Low Stock Threshold</th>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map(p => (
                <tr key={p.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.sku}</td>
                  <td className="px-6 py-4">{p.name}</td>
                  <td className="px-6 py-4">{p.stock}</td>
                  <td className="px-6 py-4">{p.lowStockThreshold}</td>
                  <td className="px-6 py-4">
                    {p.stock <= 0 ? 
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Out of Stock</span> :
                    p.stock <= p.lowStockThreshold ?
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Low Stock</span> :
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">In Stock</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
            currentPage={productCurrentPage}
            totalPages={productTotalPages}
            onPageChange={(page) => onReportsProductsViewUpdate({ currentPage: page })}
            itemsPerPage={productItemsPerPage}
            totalItems={productTotalItems}
        />
      </div>

      <Modal isOpen={!!viewingSale} onClose={() => setViewingSale(null)} title={`${viewingSale?.type} Details - ${viewingSale?.id}`} size="md">
        {viewingSale && (
            <div>
                <PrintableReceipt ref={printableAreaRef} sale={viewingSale} />
                 <div className="flex justify-end items-center gap-2 pt-4 no-print">
                    {viewingSale.type === 'Sale' && (viewingSale.status === 'Completed' || viewingSale.status === 'Partially Refunded') ? (
                        <button onClick={handleRefund} className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600">
                            {viewingSale.status === 'Completed' ? 'Full Refund' : 'Refund Remaining'}
                        </button>
                      ) : viewingSale.type === 'Sale' ? (
                        <span className="px-4 py-2 bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md cursor-not-allowed">{viewingSale.status}</span>
                      ) : null
                    }
                    <button onClick={handleSaveAsImage} title="Save as Image" className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <PhotoIcon className="h-5 w-5" />
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                    <button onClick={() => setViewingSale(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};