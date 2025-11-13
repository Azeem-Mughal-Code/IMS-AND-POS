import React, { useMemo, useState, useEffect } from 'react';
import { Product, Sale, User, UserRole } from '../types';
import { Modal } from './common/Modal';
import { FilterDropdown } from './common/FilterDropdown';
import { Pagination } from './common/Pagination';
import { TAX_RATE } from '../constants';
import { SearchIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  currentUser: User;
  processSale: (sale: Omit<Sale, 'id' | 'date'>) => void;
}

const formatCurrency = (amount: number) => {
    const value = Math.abs(amount).toFixed(2);
    return amount < 0 ? `-$${value}`: `$${value}`;
}

type SortableSaleKeys = 'id' | 'date' | 'type' | 'total' | 'profit';
type SortableProductKeys = 'sku' | 'name' | 'stock';


export const Reports: React.FC<ReportsProps> = ({ sales, products, currentUser, processSale }) => {
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Filters for Transaction History
  const [saleSearch, setSaleSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [saleSortConfig, setSaleSortConfig] = useState<{ key: SortableSaleKeys, direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const [saleCurrentPage, setSaleCurrentPage] = useState(1);
  const [saleItemsPerPage, setSaleItemsPerPage] = useState(10);

  // Filters for Stock Levels
  const [productSearch, setProductSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('All');
  const [productSortConfig, setProductSortConfig] = useState<{ key: SortableProductKeys, direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
  const [productCurrentPage, setProductCurrentPage] = useState(1);
  const [productItemsPerPage, setProductItemsPerPage] = useState(10);


  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    setSaleCurrentPage(1);
  }, [saleSearch, typeFilter, statusFilter, saleItemsPerPage]);

  useEffect(() => {
    setProductCurrentPage(1);
  }, [productSearch, stockFilter, productItemsPerPage]);


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
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const cogs = itemsToRefund.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

    const refundTransaction: Omit<Sale, 'id' | 'date'> = {
        items: itemsToRefund,
        subtotal: -subtotal,
        tax: -tax,
        total: -total,
        cogs: -cogs,
        profit: (-total) - (-cogs),
        paymentType: viewingSale.paymentType,
        type: 'Return',
        originalSaleId: viewingSale.id,
    };

    try {
        processSale(refundTransaction);
        setStatusMessage({ type: 'success', text: `Successfully refunded remaining items for sale ${viewingSale.id.slice(-8)}.` });
    } catch (e) {
        setStatusMessage({ type: 'error', text: 'An error occurred while processing the refund.' });
    } finally {
        setViewingSale(null);
    }
  };

  const totalSales = useMemo(() => sales.reduce((sum, sale) => sum + sale.total, 0), [sales]);
  const totalProfit = useMemo(() => sales.reduce((sum, sale) => sum + sale.profit, 0), [sales]);

  const requestSaleSort = (key: SortableSaleKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (saleSortConfig.key === key && saleSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSaleSortConfig({ key, direction });
  };

  const requestProductSort = (key: SortableProductKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (productSortConfig.key === key && productSortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setProductSortConfig({ key, direction });
  };

  const filteredAndSortedSales = useMemo(() => {
    const filtered = sales
      .filter(s => {
        if(typeFilter !== 'All' && s.type !== typeFilter) return false;
        if(statusFilter !== 'All' && s.type === 'Sale' && s.status !== statusFilter) return false;
        if(saleSearch && !s.id.toLowerCase().includes(saleSearch.toLowerCase())) return false;
        return true;
      });
      
    return filtered.sort((a, b) => {
        const valA = a[saleSortConfig.key as keyof Sale];
        const valB = b[saleSortConfig.key as keyof Sale];
        let comparison = 0;
        if (saleSortConfig.key === 'date') {
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }
        return saleSortConfig.direction === 'ascending' ? comparison : -comparison;
    });

  }, [sales, saleSearch, typeFilter, statusFilter, saleSortConfig]);

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

      {currentUser.role === UserRole.Admin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">Total Sales</h2>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalSales)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-200">Total Profit</h2>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalProfit)}</p>
            </div>
        </div>
      )}


      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Transaction History</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input
                        type="text"
                        placeholder="Search by Receipt ID..."
                        value={saleSearch}
                        onChange={e => setSaleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                 <FilterDropdown
                    label="Transaction Type"
                    options={[ { value: 'All', label: 'All Types' }, { value: 'Sale', label: 'Sale' }, { value: 'Return', label: 'Return' } ]}
                    value={typeFilter}
                    onChange={(v) => setTypeFilter(v)}
                    className="w-full md:w-auto"
                />
                 <FilterDropdown
                    label="Transaction Status"
                    options={[ { value: 'All', label: 'All Statuses' }, { value: 'Completed', label: 'Completed' }, { value: 'Partially Refunded', label: 'Partially Refunded' }, { value: 'Refunded', label: 'Refunded' } ]}
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v)}
                    className="w-full md:w-auto"
                />
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
              <tr>
                <SortableSaleHeader sortKey="id">ID</SortableSaleHeader>
                <SortableSaleHeader sortKey="date">Date</SortableSaleHeader>
                <SortableSaleHeader sortKey="type">Type / Status</SortableSaleHeader>
                <th scope="col" className="px-6 py-3">Items</th>
                <SortableSaleHeader sortKey="total">Total</SortableSaleHeader>
                {currentUser.role === UserRole.Admin && <SortableSaleHeader sortKey="profit">Profit</SortableSaleHeader>}
              </tr>
            </thead>
            <tbody>
              {paginatedSales.map(s => (
                <tr key={s.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <button onClick={() => setViewingSale(s)} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      ...{s.id.slice(-8)}
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
            onPageChange={setSaleCurrentPage}
            itemsPerPage={saleItemsPerPage}
            setItemsPerPage={setSaleItemsPerPage}
            totalItems={saleTotalItems}
        />
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="p-4">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Stock Levels</h2>
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={productSearch}
                        onChange={e => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                 <FilterDropdown
                    label="Stock Status"
                    options={[
                        { value: 'All', label: 'All Stock Status' },
                        { value: 'In Stock', label: 'In Stock' },
                        { value: 'Low Stock', label: 'Low Stock' },
                        { value: 'Out of Stock', label: 'Out of Stock' },
                    ]}
                    value={stockFilter}
                    onChange={(v) => setStockFilter(v)}
                    className="w-full md:w-auto"
                />
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
            onPageChange={setProductCurrentPage}
            itemsPerPage={productItemsPerPage}
            setItemsPerPage={setProductItemsPerPage}
            totalItems={productTotalItems}
        />
      </div>

      <Modal isOpen={!!viewingSale} onClose={() => setViewingSale(null)} title={`${viewingSale?.type} Details - ...${viewingSale?.id.slice(-8)}`} size="md">
        {viewingSale && (
            <div className="printable-area">
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="font-semibold text-gray-800 dark:text-gray-200">Date:</span> {new Date(viewingSale.date).toLocaleString()}</p>
                     {viewingSale.type === 'Return' && viewingSale.originalSaleId && <p><span className="font-semibold text-gray-800 dark:text-gray-200">Original Sale ID:</span> ...{viewingSale.originalSaleId.slice(-8)}</p>}
                    <div className="border-t border-b py-2 my-2 border-gray-200 dark:border-gray-600">
                        <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Items</h4>
                        {viewingSale.items.map(item => (
                            <div key={item.id} className={`flex justify-between items-center mb-1 ${item.returnedQuantity && item.returnedQuantity >= item.quantity ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                                    <p className="text-sm">
                                      {item.quantity} &times; {formatCurrency(item.retailPrice)}
                                      {item.returnedQuantity && item.returnedQuantity > 0 && <span className="ml-2 font-semibold not-line-through text-orange-600 dark:text-orange-400">(Returned: {item.returnedQuantity})</span>}
                                    </p>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.retailPrice * item.quantity)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-1 font-medium text-gray-800 dark:text-gray-200">
                        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(viewingSale.subtotal)}</span></div>
                        <div className="flex justify-between"><span>Tax:</span> <span>{formatCurrency(viewingSale.tax)}</span></div>
                        <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white"><span>Total:</span> <span>{formatCurrency(viewingSale.total)}</span></div>
                    </div>
                    <p><span className="font-semibold text-gray-800 dark:text-gray-200">Payment:</span> {viewingSale.paymentType}</p>
                </div>
                 <div className="flex justify-end gap-2 pt-4 no-print">
                    {viewingSale.type === 'Sale' && (viewingSale.status === 'Completed' || viewingSale.status === 'Partially Refunded') ? (
                        <button onClick={handleRefund} className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600">
                            {viewingSale.status === 'Completed' ? 'Full Refund' : 'Refund Remaining'}
                        </button>
                      ) : viewingSale.type === 'Sale' ? (
                        <span className="px-4 py-2 bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-md cursor-not-allowed">{viewingSale.status}</span>
                      ) : null
                    }
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Print</button>
                    <button onClick={() => setViewingSale(null)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Close</button>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
};