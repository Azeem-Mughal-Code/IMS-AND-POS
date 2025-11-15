import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { ExportIcon, ImportIcon, DangerIcon } from '../Icons';
import { Product, Sale } from '../../types';
import { useAppContext } from '../context/AppContext';

export const DataManagement: React.FC = () => {
    const { currentUser, businessName, products, sales, importProducts, clearSales, factoryReset } = useAppContext();
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isDangerModalOpen, setDangerModalOpen] = useState(false);
    const [dangerAction, setDangerAction] = useState<'clearSales' | 'factoryReset' | null>(null);
    const [confirmationPassword, setConfirmationPassword] = useState('');

    const convertToCSV = (data: any[], type: 'products' | 'sales') => {
        if (!data || data.length === 0) return '';
        
        let headers: string[];
        let rows: string[];

        if (type === 'sales') {
            headers = ['sale_id', 'sale_date', 'sale_type', 'payment_type', 'sale_status', 'original_sale_id', 'sale_subtotal', 'sale_tax', 'sale_total', 'item_sku', 'item_name', 'item_quantity', 'item_retail_price', 'item_returned_quantity'];
            const flattenedData = data.flatMap((sale: Sale) => 
                sale.items.map((item) => ({
                    sale_id: sale.id,
                    sale_date: sale.date,
                    sale_type: sale.type,
                    payment_type: sale.payments.map(p => p.type).join('/'),
                    sale_status: sale.status || '',
                    original_sale_id: sale.originalSaleId || '',
                    sale_subtotal: sale.subtotal,
                    sale_tax: sale.tax,
                    sale_total: sale.total,
                    item_sku: item.sku,
                    item_name: item.name,
                    item_quantity: item.quantity,
                    item_retail_price: item.retailPrice,
                    item_returned_quantity: item.returnedQuantity || 0,
                }))
            );
             rows = flattenedData.map(row => 
                headers.map(header => {
                    let value = (row as any)[header];
                    if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                    return value;
                }).join(',')
            );
        } else { // products
            headers = Object.keys(data[0]);
             rows = data.map(row =>
                headers.map(header => {
                    let value = (row as any)[header];
                    if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                    return value;
                }).join(',')
            );
        }

        return [headers.join(','), ...rows].join('\n');
    };

    const downloadCSV = (csvString: string, filename: string) => {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = (type: 'products' | 'sales') => {
        const data = type === 'products' ? products : sales;
        const csv = convertToCSV(data, type);
        const date = new Date().toISOString().split('T')[0];
        downloadCSV(csv, `${businessName}-${type}-export-${date}.csv`);
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setImportFile(event.target.files[0]);
            setImportFeedback(null);
        }
    };
    
    const handleImport = () => {
        if (!importFile) {
            setImportFeedback({ type: 'error', message: 'Please select a file to import.' });
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            if (rows.length < 2) {
                setImportFeedback({ type: 'error', message: 'CSV file is empty or contains only a header.' });
                return;
            }

            const header = rows[0].trim().split(',');
            const requiredHeaders = ['sku', 'name', 'retailPrice', 'costPrice', 'stock', 'lowStockThreshold'];
            if (!requiredHeaders.every(h => header.includes(h))) {
                 setImportFeedback({ type: 'error', message: `Invalid CSV header. Must include: ${requiredHeaders.join(', ')}` });
                 return;
            }

            const newProducts: Omit<Product, 'id'>[] = [];
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].trim().split(',');
                const productData: any = {};
                header.forEach((h, index) => productData[h] = values[index]);
                
                newProducts.push({
                    sku: productData.sku,
                    name: productData.name,
                    retailPrice: parseFloat(productData.retailPrice),
                    costPrice: parseFloat(productData.costPrice),
                    stock: parseInt(productData.stock, 10),
                    lowStockThreshold: parseInt(productData.lowStockThreshold, 10),
                });
            }
            const result = importProducts(newProducts);
            setImportFeedback(result);
        };
        reader.readAsText(importFile);
    };
    
    const openDangerModal = (action: 'clearSales' | 'factoryReset') => {
        setDangerAction(action);
        setDangerModalOpen(true);
    };

    const closeDangerModal = () => {
        setDangerModalOpen(false);
        setDangerAction(null);
        setConfirmationPassword('');
    };
    
    const handleDangerAction = () => {
        if(confirmationPassword !== currentUser.password) return;

        if(dangerAction === 'clearSales') clearSales();
        if(dangerAction === 'factoryReset') factoryReset();

        closeDangerModal();
    };

    return (
        <>
            <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export */}
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Export Data</h3>
                        <div className="flex flex-col sm:flex-row gap-2">
                             <button onClick={() => handleExport('products')} className="flex-1 text-sm font-medium px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center justify-center gap-2">
                                <ExportIcon /> Export Products
                            </button>
                             <button onClick={() => handleExport('sales')} className="flex-1 text-sm font-medium px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center justify-center gap-2">
                                <ExportIcon /> Export Sales
                            </button>
                        </div>
                    </div>
                    {/* Import */}
                     <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Import Data</h3>
                        <button onClick={() => setImportModalOpen(true)} className="w-full text-sm font-medium px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md flex items-center justify-center gap-2">
                            <ImportIcon /> Import Products from CSV
                        </button>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="mt-6 pt-4 border-t border-red-300 dark:border-red-800">
                    <h3 className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2"><DangerIcon className="h-5 w-5" /> Danger Zone</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">These actions are irreversible. Please proceed with caution.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                         <button onClick={() => openDangerModal('clearSales')} className="flex-1 text-sm font-medium px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md">Clear Sales Data</button>
                         <button onClick={() => openDangerModal('factoryReset')} className="flex-1 text-sm font-medium px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md">Factory Reset</button>
                    </div>
                </div>
            </div>

            <Modal isOpen={isImportModalOpen} onClose={() => setImportModalOpen(false)} title="Import Products from CSV">
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">CSV File Format</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Your CSV file must contain the following columns in any order:</p>
                        <code className="mt-2 block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md">sku,name,retailPrice,costPrice,stock,lowStockThreshold</code>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Products with SKUs that already exist will be skipped.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select CSV File</label>
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
                        />
                    </div>
                     {importFeedback && (
                        <div className={`text-sm p-3 rounded-md ${importFeedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {importFeedback.message}
                        </div>
                     )}
                </div>
                <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={() => setImportModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleImport} disabled={!importFile} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">Import</button>
                </div>
            </Modal>
            
            <Modal isOpen={isDangerModalOpen} onClose={closeDangerModal} title="Are you absolutely sure?">
                <div className="space-y-4">
                    {dangerAction === 'clearSales' && (
                        <p className="text-gray-700 dark:text-gray-300">This will permanently delete all sales and return history. This action cannot be undone.</p>
                    )}
                    {dangerAction === 'factoryReset' && (
                        <p className="text-gray-700 dark:text-gray-300">This will permanently delete all products, sales, and cashier accounts. Your admin account will be preserved. This action cannot be undone.</p>
                    )}
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            To confirm, please enter your admin password.
                        </label>
                        <input 
                            type="password" 
                            value={confirmationPassword}
                            onChange={e => setConfirmationPassword(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                        />
                    </div>
                </div>
                 <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                    <button onClick={closeDangerModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button 
                        onClick={handleDangerAction}
                        disabled={confirmationPassword !== currentUser.password}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        I understand, proceed
                    </button>
                </div>
            </Modal>
        </>
    );
};
