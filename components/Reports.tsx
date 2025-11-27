
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Sale, UserRole, ReportsViewState, PaymentType, Product } from '../types';
import { Modal } from './common/Modal';
import { FilterMenu, FilterSelectItem } from './common/FilterMenu';
import { Pagination } from './common/Pagination';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon, PhotoIcon, DangerIcon, TrashIcon } from './Icons';
import { PrintableReceipt } from './common/PrintableReceipt';
import { useSales } from './context/SalesContext';
import { useProducts } from './context/ProductContext';
import { useAuth } from './context/AuthContext';
import { useUIState } from './context/UIStateContext';
import { useSettings } from './context/SettingsContext';

declare var html2canvas: any;

// FIX: SortableSaleKeys now includes publicId
type SortableSaleKeys = 'id' | 'publicId' | 'date' | 'type' | 'salespersonName' | 'total' | 'profit';
type SortableProductKeys = 'sku' | 'name' | 'stock' | 'lowStockThreshold';

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

type DisplayableStockItem = {
    id: string; // productId or variantId
    productId: string;
    sku: string;
    name: string;
    stock: number;
    lowStockThreshold: number;
    isVariant: boolean;
};


export const Reports: React.FC = () => {
  const { sales, processSale, deleteSale } = useSales();
  const { products } = useProducts();
  const { currentUser, users } = useAuth();
  const { reportsViewState, onReportsSalesViewUpdate, onReportsProductsViewUpdate, showToast } = useUIState();
  const { formatCurrency, formatDateTime, paginationConfig } = useSettings();
    
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
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
            link.download = `receipt-${viewingSale.publicId || viewingSale.id}.png`;
            link.href = newCanvas.toDataURL('image/png');
            link.click();
        });
    }
  };

  const { searchTerm: saleSearch, typeFilter, statusFilter, salespersonFilter, timeRange: saleTimeRange, sortConfig: saleSortConfig, currentPage: saleCurrentPage } = reportsViewState.sales;
  const { searchTerm: productSearch, stockFilter, sortConfig: productSortConfig, currentPage: productCurrentPage } = reportsViewState.products;
  const saleItemsPerPage = paginationConfig.salesReports || 10;
  const productItemsPerPage = paginationConfig.productReports || 10;

  const salesActiveFilterCount = (typeFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0) + (salespersonFilter !== 'All' ? 1 : 0) + (saleTimeRange !== 'all' ? 1 : 0);
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

  const salespersonOptions = useMemo(() => {
    const salespeople = users.map(u => ({ value: u.id, label: u.username }));
    return [{ value: 'All', label: 'All Salespeople' }, ...salespeople];
  }, [users]);

  const productStockFilterOptions = [
    { value: 'All', label: 'All Stock Status' },
    { value: 'In Stock', label: 'In Stock' },
    { value: 'Low Stock', label: 'Low Stock' },
    { value: 'Out of Stock', label: 'Out of Stock' },
  ];


  const handleRefund = () => {
    if (!viewingSale || viewingSale.type !== 'Sale' || (viewingSale.status !== 'Completed' && viewingSale.status !== 'Partially Refunded')) return;
    
    // Calculate items to refund and flip quantity to negative
    const itemsToRefund = viewingSale.items
        .map(item => {
            const remainingQty = item.quantity - (item.returnedQuantity || 0);
            return {
                ...item,
                quantity: -remainingQty, // Negative quantity for return
                originalSaleId: viewingSale.id // IMPORTANT: Link to original sale so status updates
            };
        })
        .filter(item => Math.abs(item.quantity) > 0);
    
    if (itemsToRefund.length === 0) {
        showToast('No items remaining to refund.', 'error');
        setViewingSale(null);
        return;
    }

    // For calculations, work with absolute values of the return items
    const subtotal = itemsToRefund.reduce((sum, item) => sum + item.retailPrice * Math.abs(item.quantity), 0);

    let discount = 0;
    if (viewingSale.discount && viewingSale.subtotal > 0) {
        const originalDiscountRate = viewingSale.discount / viewingSale.subtotal;
        discount = subtotal * originalDiscountRate;
    }
    
    const taxableAmount = subtotal - discount;

    let tax = 0;
    if (viewingSale.tax > 0) {
        const originalTaxableAmount = viewingSale.subtotal - (viewingSale.discount || 0);
        if (originalTaxableAmount > 0) {
            const originalTaxRate = viewingSale.tax / originalTaxableAmount;
            tax = taxableAmount * originalTaxRate;
        }
    }
    
    const total = taxableAmount + tax;
    const cogs = itemsToRefund.reduce((sum, item) => sum + item.costPrice * Math.abs(item.quantity), 0);

    const refundTransaction: Omit<Sale, 'id' | 'date' | 'workspaceId'> = {
        items: itemsToRefund, // Items now have negative quantities and originalSaleId
        subtotal: -subtotal,
        discount: discount,
        tax: -tax,
        total: -total,
        cogs: -cogs,
        profit: (-total) - (-cogs),
        payments: [{ type: viewingSale.payments[0]?.type || PaymentType.Cash, amount: -total }],
        type: 'Return',
        originalSaleId: viewingSale.id,
        salespersonId: currentUser.id,
        salespersonName: currentUser.username,
        customerId: viewingSale.customerId,
        customerName: viewingSale.customerName,
    };

    try {
        processSale(refundTransaction);
        showToast(`Successfully refunded remaining items for sale ${viewingSale.publicId || viewingSale.id}.`, 'success');
    } catch (e) {
        if (e instanceof Error) {
            showToast(e.message, 'error');
        } else {
            showToast('An error occurred while processing the refund.', 'error');
        }
    } finally {
        setViewingSale(null);
    }
  };
  
  const handleDeleteSale = async () => {
    if (!viewingSale) return;
    const result = await deleteSale(viewingSale.id);
    showToast(result.message || 'An error occurred.', result.success ? 'success' : 'error');
    setIsDeleteConfirmOpen(false);
    setViewingSale(null);
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
        if(salespersonFilter !== 'All' && s.salespersonId !== salespersonFilter) return false;
        if(saleSearch) {
            const searchLower = saleSearch.toLowerCase();
            if (!s.id.toLowerCase().includes(searchLower) && 
                !s.salespersonName.toLowerCase().includes(searchLower) &&
                (!s.publicId || !s.publicId.toLowerCase().includes(searchLower)) // Search by publicId
            ) return false;
        }
        return true;
      });
      
    return filtered.sort((a, b) => {
        const valA = a[saleSortConfig.key as keyof Sale];
        const valB = b[saleSortConfig.key as keyof Sale];
        let comparison = 0;
        if (saleSortConfig.key === 'date') {
            // Standard comparison: a - b
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }
        return saleSortConfig.direction === 'ascending' ? comparison : -comparison;
    });

  }, [sales, saleSearch, typeFilter, statusFilter, salespersonFilter, saleSortConfig, saleTimeRange]);

  const saleTotalItems = filteredAndSortedSales.length;
  const saleTotalPages = Math.ceil(saleTotalItems / saleItemsPerPage);
  const paginatedSales = useMemo(() => {
    return filteredAndSortedSales.slice(
        (saleCurrentPage - 1) * saleItemsPerPage,
        saleCurrentPage * saleItemsPerPage
    );
  }, [filteredAndSortedSales, saleCurrentPage, saleItemsPerPage]);

  const filteredAndSortedProducts = useMemo(() => {
    const flatProductList: DisplayableStockItem[] = [];
    products.forEach(p => {
        if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
                flatProductList.push({
                    id: v.id,
                    productId: p.id,
                    sku: `${p.sku}-${v.skuSuffix}`,
                    name: `${p.name} (${Object.values(v.options).join(' / ')})`,
                    stock: v.stock,
                    lowStockThreshold: p.lowStockThreshold,
                    isVariant: true,
                });
            });
        } else {
            flatProductList.push({
                id: p.id,
                productId: p.id,
                sku: p.sku,
                name: p.name,
                stock: p.stock,
                lowStockThreshold: p.lowStockThreshold,
                isVariant: false,
            });
        }
    });

    const filtered = flatProductList
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
        const valA = a[productSortConfig.key as keyof typeof a];
        const valB = b[productSortConfig.key as keyof typeof b];
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
                ) : <ChevronDownIcon className="h-4 w-4 invisible" />}
            </button>
        </th>
    );
  };

  const SortableProductHeader: React.FC<{ children: React.ReactNode, sortKey: SortableProductKeys }> = ({ children, sortKey }) => {
    // FIX: Changed `key` to `sortKey` to fix "Cannot find name 'key'" error.
    const isSorted = productSortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3">
            <button onClick={() => requestProductSort(sortKey)} className="flex items-center gap-1.5 group">
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                {isSorted ? (
                    productSortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                ) : <ChevronDownIcon className="h-4 w-4 invisible" />}
            </button>
        </th>
    );
  };
  
  const getAdjustedProfit = (sale: Sale) => {
      const safeNumber = (n: any) => {
          const num = Number(n);
          return isNaN(num) ? 0 : num;
      };

      // Check if profit is NaN or zero while total is significant (suspicious)
      const isSuspicious = isNaN(sale.profit) || ((Math.abs(sale.profit) < 0.01) && Math.abs(sale.total) > 0.01);
      
      if (isSuspicious) {
          const calculatedCogs = sale.items.reduce((sum, item) => sum + (safeNumber(item.costPrice) || 0) * item.quantity, 0);
          
          // Recalculate: (Total - Tax) - COGS
          const revenue = safeNumber(sale.total) - safeNumber(sale.tax);
          return revenue - calculatedCogs;
      }
      return sale.profit;
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reports</h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4 space-y-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Transaction History</h2>
            <div className="bg-gray-200 dark:bg-gray-700 p-1 rounded-lg self-start">
                <div className="flex items-center space-x-1 overflow-x-auto">
                    <TimeRangeButton label="Today" range="today" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                    <TimeRangeButton label="Week" range="weekly" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                    <TimeRangeButton label="Month" range="monthly" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                    <TimeRangeButton label="Year" range="yearly" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
                    <TimeRangeButton label="All Time" range="all" currentTimeRange={saleTimeRange} setTimeRange={(range) => onReportsSalesViewUpdate({ timeRange: range })} />
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
                    <FilterSelectItem
                        label="Salesperson"
                        value={salespersonFilter}
                        onChange={(value) => onReportsSalesViewUpdate({ salespersonFilter: value })}
                        options={salespersonOptions}
                    />
                </FilterMenu>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
              <tr>
                <SortableSaleHeader sortKey="publicId">Receipt #</SortableSaleHeader>
                <SortableSaleHeader sortKey="date">Date</SortableSaleHeader>
                <SortableSaleHeader sortKey="type">Type / Status</SortableSaleHeader>
                <SortableSaleHeader sortKey="salespersonName">Salesperson</SortableSaleHeader>
                <th scope="col" className="px-6 py-3">Items</th>
                <SortableSaleHeader sortKey="total">Total</SortableSaleHeader>
                {currentUser.role === UserRole.Admin && <SortableSaleHeader sortKey="profit">Profit</SortableSaleHeader>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedSales.map(s => (
                <tr key={s.id}>
                  <td data-label="ID" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <button onClick={() => setViewingSale(s)} className="text-blue-600 dark:text-blue-400 hover:underline font-mono">
                      {s.publicId || s.id}
                    </button>
                  </td>
                  <td data-label="Date" className="px-6 py-4">{formatDateTime(s.date)}</td>
                  <td data-label="Status" className="px-6 py-4">
                     <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        s.type === 'Return' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        s.status === 'Refunded' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        s.status === 'Partially Refunded' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                     }`}>
                        {s.type === 'Sale' ? s.status : s.type}
                    </span>
                  </td>
                  <td data-label="Salesperson" className="px-6 py-4">{s.salespersonName}</td>
                  <td data-label="Items" className="px-6 py-4">
                    {s.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td data-label="Total" className="px-6 py-4">{formatCurrency(s.total)}</td>
                  {currentUser.role === UserRole.Admin && <td data-label="Profit" className="px-6 py-4">{formatCurrency(getAdjustedProfit(s))}</td>}
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
           <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
              <tr>
                <SortableProductHeader sortKey="sku">SKU</SortableProductHeader>
                <SortableProductHeader sortKey="name">Name</SortableProductHeader>
                <SortableProductHeader sortKey="stock">Stock</SortableProductHeader>
                <SortableProductHeader sortKey="lowStockThreshold">Low Stock Threshold</SortableProductHeader>
                <th scope="col" className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedProducts.map(p => (
                <tr key={p.id} className={p.isVariant ? 'bg-gray-50 dark:bg-gray-800/50' : ''}>
                  <td data-label="SKU" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{p.sku}</td>
                  <td data-label="Name" className="px-6 py-4" style={{ paddingLeft: p.isVariant ? '2rem' : undefined }}>{p.name}</td>
                  <td data-label="Stock" className="px-6 py-4">{p.stock}</td>
                  <td data-label="Low Stock Threshold" className="px-6 py-4">{p.lowStockThreshold}</td>
                  <td data-label="Status" className="px-6 py-4">
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

      <Modal isOpen={!!viewingSale} onClose={() => setViewingSale(null)} title={`${viewingSale?.type} Details - ${viewingSale?.publicId || viewingSale?.id}`} size="md">
        {viewingSale && (
            <div>
                <PrintableReceipt ref={printableAreaRef} sale={viewingSale} />
                 <div className="flex justify-end items-center gap-2 pt-4 no-print">
                    {currentUser.role === UserRole.Admin && viewingSale.type === 'Sale' && (
                         <button
                            onClick={() => setIsDeleteConfirmOpen(true)}
                            title="Delete Sale"
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-700 rounded-full transition-colors mr-auto"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
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

        <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirm Sale Deletion" size="md">
            {viewingSale && (
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <DangerIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-2 sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                Delete Sale Transaction
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Are you sure you want to permanently delete this sale (ID: <span className="font-mono">{viewingSale.publicId || viewingSale.id}</span>)?
                                </p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    This will also delete any associated return transactions and all related stock history. <strong className="text-gray-800 dark:text-gray-200">Product stock levels will NOT be changed.</strong>
                                </p>
                                <p className="mt-2 font-semibold text-red-600 dark:text-red-400">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>
                     <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={() => setIsDeleteConfirmOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                            Cancel
                        </button>
                        <button type="button" onClick={handleDeleteSale} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                            Confirm Delete
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    </div>
  );
};