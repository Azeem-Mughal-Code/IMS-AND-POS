import React, { useState, useRef, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { ExportIcon, ImportIcon, DangerIcon, ShieldCheckIcon } from '../Icons';
import { Product, Sale, PruneTarget } from '../../types';
import { Dropdown } from '../common/Dropdown';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductContext';
import { useSales } from '../context/SalesContext';
import { useSettings } from '../context/SettingsContext';
import { useUIState } from '../context/UIStateContext';

const StatusCheckbox: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
        />
        <span>{label}</span>
    </label>
);

export const DataManagement: React.FC = () => {
    const { currentUser, users } = useAuth();
    const { products, importProducts, factoryReset: productReset } = useProducts();
    const { sales, purchaseOrders, clearSales, factoryReset: salesReset, pruneData: pruneSalesData } = useSales();
    const { 
        businessName, theme, itemsPerPage, currency, currencies, currencyDisplay, isSplitPaymentEnabled,
        isChangeDueEnabled, isIntegerCurrency, isTaxEnabled, taxRate, isDiscountEnabled,
        discountRate, discountThreshold, cashierPermissions, restoreBackup
    } = useSettings();
    const { notifications, factoryReset: uiReset, pruneData: pruneUiData, showToast } = useUIState();
    
    const [isImportExportOpen, setIsImportExportOpen] = useState(false);
    const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState(false);
    const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
    
    // State for Import/Export Modal
    const [activeImpExpTab, setActiveImpExpTab] = useState<'export' | 'import'>('export');
    const [importFile, setImportFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Backup/Restore Modal
    const [backupFile, setBackupFile] = useState<File | null>(null);
    const [restorePassword, setRestorePassword] = useState('');
    const backupFileInputRef = useRef<HTMLInputElement>(null);

    // State for Danger Zone
    const [dangerAction, setDangerAction] = useState<'clearSales' | 'factoryReset' | 'pruneData' | null>(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [confirmationPassword, setConfirmationPassword] = useState('');
    const [dangerError, setDangerError] = useState('');
    
    // State for Clear Sales
    const saleStatuses: NonNullable<Sale['status']>[] = ['Completed', 'Partially Refunded', 'Refunded'];
    const [clearSaleStatuses, setClearSaleStatuses] = useState<NonNullable<Sale['status']>[]>([]);
    
    // State for Data Pruning
    const [pruneTarget, setPruneTarget] = useState<PruneTarget>('sales');
    const [pruneDays, setPruneDays] = useState<number>(90);
    const [pruneStatuses, setPruneStatuses] = useState<NonNullable<Sale['status']>[]>([]);

    const handleClearStatusChange = (status: NonNullable<Sale['status']>, checked: boolean) => {
        setClearSaleStatuses(prev => checked ? [...prev, status] : prev.filter(s => s !== status));
    };
    const handleClearSelectAll = (checked: boolean) => setClearSaleStatuses(checked ? saleStatuses : []);
    const allClearStatusesSelected = clearSaleStatuses.length === saleStatuses.length;
    const noClearStatusesSelected = clearSaleStatuses.length === 0;

    const handlePruneStatusChange = (status: NonNullable<Sale['status']>, checked: boolean) => {
        setPruneStatuses(prev => checked ? [...prev, status] : prev.filter(s => s !== status));
    };
    const handlePruneSelectAll = (checked: boolean) => setPruneStatuses(checked ? saleStatuses : []);
    const allPruneStatusesSelected = pruneStatuses.length === saleStatuses.length;
    
    const factoryReset = () => {
        // This needs to call the reset function from each context
        productReset(currentUser);
        salesReset();
        uiReset();
    };

    const pruneData = (target: PruneTarget, options: { days: number; statuses?: (Sale['status'])[] }): { success: boolean; message: string } => {
        if(target === 'sales' || target === 'purchaseOrders') {
            return pruneSalesData(target, options);
        } else {
            return pruneUiData(target, options);
        }
    };


    const convertToCSV = (data: any[], type: 'products' | 'sales') => {
        if (!data || data.length === 0) return '';
        let headers: string[], rows: string[];
        if (type === 'sales') {
            headers = ['sale_id', 'sale_date', 'sale_type', 'payment_type', 'sale_status', 'original_sale_id', 'sale_subtotal', 'sale_tax', 'sale_total', 'item_sku', 'item_name', 'item_quantity', 'item_retail_price', 'item_returned_quantity'];
            const flattenedData = data.flatMap((sale: Sale) => sale.items.map(item => ({ sale_id: sale.id, sale_date: sale.date, sale_type: sale.type, payment_type: sale.payments.map(p => p.type).join('/'), sale_status: sale.status || '', original_sale_id: sale.originalSaleId || '', sale_subtotal: sale.subtotal, sale_tax: sale.tax, sale_total: sale.total, item_sku: item.sku, item_name: item.name, item_quantity: item.quantity, item_retail_price: item.retailPrice, item_returned_quantity: item.returnedQuantity || 0 })));
            rows = flattenedData.map(row => headers.map(header => { let value = (row as any)[header]; return (typeof value === 'string' && value.includes(',')) ? `"${value}"` : value; }).join(','));
        } else {
            headers = Object.keys(data[0]);
            rows = data.map(row => headers.map(header => { let value = (row as any)[header]; return (typeof value === 'string' && value.includes(',')) ? `"${value}"` : value; }).join(','));
        }
        return [headers.join(','), ...rows].join('\n');
    };

    const downloadFile = (content: string, filename: string, contentType: string) => {
        const blob = new Blob([content], { type: contentType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExport = (type: 'products' | 'sales') => {
        const data = type === 'products' ? products : sales;
        const csv = convertToCSV(data, type);
        const date = new Date().toISOString().split('T')[0];
        downloadFile(csv, `${businessName}-${type}-export-${date}.csv`, 'text/csv;charset=utf-8;');
    };

    const handleImport = () => {
        if (!importFile) { showToast('Please select a file to import.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            if (rows.length < 2) { showToast('CSV file is empty or contains only a header.', 'error'); return; }
            const header = rows[0].trim().split(',');
            const requiredHeaders = ['sku', 'name', 'retailPrice', 'costPrice', 'stock', 'lowStockThreshold'];
            if (!requiredHeaders.every(h => header.includes(h))) { showToast(`Invalid CSV header. Must include: ${requiredHeaders.join(', ')}`, 'error'); return; }
            const newProducts: Omit<Product, 'id'>[] = [];
            for (let i = 1; i < rows.length; i++) {
                const values = rows[i].trim().split(',');
                const productData: any = {};
                header.forEach((h, index) => productData[h] = values[index]);
                // FIX: Added missing 'variationTypes' and 'variants' properties to align with the Product type.
                newProducts.push({ sku: productData.sku, name: productData.name, retailPrice: parseFloat(productData.retailPrice), costPrice: parseFloat(productData.costPrice), stock: parseInt(productData.stock, 10), lowStockThreshold: parseInt(productData.lowStockThreshold, 10), priceHistory: [], categoryIds: [], variationTypes: [], variants: [] });
            }
            const result = importProducts(newProducts);
            showToast(result.message, result.success ? 'success' : 'error');
        };
        reader.readAsText(importFile);
    };

    const handleCreateBackup = () => {
        const backupData = { businessName, products, sales, inventoryAdjustments: [], purchaseOrders, notifications, itemsPerPage, currency, currencies, currencyDisplay, isSplitPaymentEnabled, isChangeDueEnabled, isIntegerCurrency, isTaxEnabled, taxRate, isDiscountEnabled, discountRate, discountThreshold, cashierPermissions, theme, users };
        const date = new Date().toISOString().split('T')[0];
        downloadFile(JSON.stringify(backupData, null, 2), `ims-backup-${businessName}-${date}.json`, 'application/json');
    };

    const handleRestoreBackup = async () => {
        if (!backupFile) { showToast('Please select a backup file.', 'error'); return; }
        if (restorePassword !== currentUser.password) { showToast('Incorrect admin password.', 'error'); return; }
        try {
            const fileContent = await backupFile.text();
            const backupData = JSON.parse(fileContent);
            const result = restoreBackup(backupData);
            showToast(result.message, result.success ? 'success' : 'error');
            if (result.success) { setTimeout(() => window.location.reload(), 2000); }
        } catch (error) { showToast('Failed to read or parse backup file. Is it a valid JSON backup?', 'error'); }
    };

    const dangerDetails = useMemo(() => {
        switch (dangerAction) {
            case 'pruneData': return { title: 'Prune Old Data', confirmWord: 'PRUNE DATA' };
            case 'clearSales': return { title: 'Clear Sales Data', confirmWord: 'CLEAR SALES' };
            case 'factoryReset': return { title: 'Factory Reset', confirmWord: 'RESET' };
            default: return { title: 'Are you absolutely sure?', confirmWord: '' };
        }
    }, [dangerAction]);
    
    const handleDangerAction = () => {
        setDangerError('');
        if (confirmationText.toUpperCase() !== dangerDetails.confirmWord) { setDangerError('Confirmation text does not match.'); return; }
        if (confirmationPassword !== currentUser.password) { setDangerError('Incorrect admin password.'); return; }
        
        if (dangerAction === 'clearSales') { 
            clearSales(allClearStatusesSelected ? undefined : { statuses: clearSaleStatuses });
            showToast(`Successfully cleared sales data${allClearStatusesSelected ? '' : ' for selected statuses'}.`, 'success');
        }
        if (dangerAction === 'factoryReset') { 
            factoryReset();
            showToast('Factory reset completed successfully.', 'success');
        }
        if (dangerAction === 'pruneData') {
            const result = pruneData(pruneTarget, { days: pruneDays, statuses: pruneTarget === 'sales' ? pruneStatuses : undefined });
            showToast(result.message, result.success ? 'success' : 'error');
        }

        closeDangerModal();
    };

    const closeDangerModal = () => { setDangerAction(null); setConfirmationText(''); setConfirmationPassword(''); setDangerError(''); setClearSaleStatuses([]); };
    const isDangerConfirmValid = useMemo(() => dangerAction ? confirmationText.toUpperCase() === dangerDetails.confirmWord : false, [dangerAction, confirmationText, dangerDetails]);
    
    const buttonStyle = "w-full text-left p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800";

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setIsImportExportOpen(true)} className={buttonStyle}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex -space-x-2">
                            <ExportIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            <ImportIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Import / Export Data</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your data using CSV files.</p>
                        </div>
                    </div>
                </button>
                <button onClick={() => setIsBackupRestoreOpen(true)} className={buttonStyle}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">Backup & Restore</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Create backups or restore your entire business.</p>
                        </div>
                    </div>
                </button>
            </div>

            <div className="mt-4 p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div className="flex items-start gap-4">
                <DangerIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-lg text-red-800 dark:text-red-200">Danger Zone</h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    These actions are destructive and cannot be undone. Proceed with caution.
                  </p>
                  <button onClick={() => setIsDangerZoneOpen(true)} className="mt-3 text-sm font-medium px-4 py-2 bg-red-600 hover:bg-red-700 text-white border border-red-700 rounded-md">
                    Open Danger Zone
                  </button>
                </div>
              </div>
            </div>

            <Modal isOpen={isImportExportOpen} onClose={() => setIsImportExportOpen(false)} title="Import / Export Data" size="md">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <button onClick={() => setActiveImpExpTab('export')} className={`${activeImpExpTab === 'export' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Export</button>
                        <button onClick={() => setActiveImpExpTab('import')} className={`${activeImpExpTab === 'import' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}>Import</button>
                    </nav>
                </div>
                {activeImpExpTab === 'export' ? (
                    <div className="py-6 space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300">Download your business data as CSV files. Sales data is flattened, with each row representing one item within a sale.</p>
                        <button onClick={() => handleExport('products')} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"><ExportIcon /> Export Products</button>
                        <button onClick={() => handleExport('sales')} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"><ExportIcon /> Export Sales</button>
                    </div>
                ) : (
                    <div className="py-6 space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-800 dark:text-white">CSV File Format</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Your CSV file must contain the following columns: <code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded-md">sku,name,retailPrice,costPrice,stock,lowStockThreshold</code>. Products with existing SKUs will be skipped.</p>
                        </div>
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={e => { if (e.target.files) setImportFile(e.target.files[0]); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800" />
                        <div className="flex justify-end pt-2"><button onClick={handleImport} disabled={!importFile} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">Import</button></div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isBackupRestoreOpen} onClose={() => setIsBackupRestoreOpen(false)} title="Backup & Restore" size="md">
                <div className="py-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Create Full Backup</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Download a single JSON file containing all your business data, including products, sales, users, and settings.</p>
                        <button onClick={handleCreateBackup} className="mt-2 w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"><ExportIcon /> Create Backup</button>
                    </div>
                    <div className="border-t pt-6 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Restore from Backup</h3>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">Restoring will overwrite all current data. This action is irreversible.</p>
                        <div className="mt-4 space-y-4">
                            <input type="file" accept=".json" ref={backupFileInputRef} onChange={e => { if (e.target.files) setBackupFile(e.target.files[0]); }} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800" />
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Password</label><input type="password" value={restorePassword} onChange={e => setRestorePassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" /></div>
                            <div className="flex justify-end pt-2"><button onClick={handleRestoreBackup} disabled={!backupFile || !restorePassword} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400">Restore Data</button></div>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDangerZoneOpen} onClose={() => setIsDangerZoneOpen(false)} title="Danger Zone" size="lg">
                <div className="py-6 space-y-6">
                    <div className="p-4 border border-red-200 dark:border-red-900/50 rounded-lg">
                        <h3 className="font-semibold text-red-700 dark:text-red-300">Prune Old Data</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Permanently delete old records to reduce data size. This action cannot be undone.</p>
                        <button onClick={() => setDangerAction('pruneData')} className="mt-2 text-sm font-medium px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md">Prune Data...</button>
                    </div>
                    <div className="p-4 border border-red-200 dark:border-red-900/50 rounded-lg">
                        <h3 className="font-semibold text-red-700 dark:text-red-300">Clear Sales Data</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Permanently delete sales records, including associated returns and stock history. Product stock levels will NOT be changed.</p>
                        <button onClick={() => setDangerAction('clearSales')} className="mt-2 text-sm font-medium px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md">Clear Sales...</button>
                    </div>
                    <div className="p-4 border border-red-200 dark:border-red-900/50 rounded-lg">
                        <h3 className="font-semibold text-red-700 dark:text-red-300">Factory Reset</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Delete all products, sales, and cashier accounts. Your admin account will be preserved.</p>
                        <button onClick={() => setDangerAction('factoryReset')} className="mt-2 text-sm font-medium px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md">Factory Reset...</button>
                    </div>
                </div>
            </Modal>
            
            {dangerAction && (
                <Modal isOpen={!!dangerAction} onClose={closeDangerModal} title={dangerDetails.title}>
                    <div className="space-y-4">
                        {dangerAction === 'pruneData' && <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                You are about to permanently delete old data records. This can help improve performance but cannot be undone.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Data to Prune</label>
                                    <Dropdown 
                                        value={pruneTarget} 
                                        onChange={(v) => setPruneTarget(v as PruneTarget)}
                                        options={[
                                            {value: 'sales', label: 'Sales Records'},
                                            {value: 'purchaseOrders', label: 'Purchase Orders'},
                                            {value: 'stockHistory', label: 'Stock History'},
                                            {value: 'notifications', label: 'Notifications'},
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Older than (days)</label>
                                    <input type="number" value={pruneDays} onChange={e => setPruneDays(parseInt(e.target.value, 10))} min="1" className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700"/>
                                </div>
                            </div>
                            {pruneTarget === 'sales' && <div>
                                 <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/50 p-3 rounded-md mb-4">
                                    When a sales receipt is pruned, its related return receipts and stock history will also be permanently deleted. Product stock levels will not be changed.
                                </p>
                                <h4 className="text-sm font-medium mb-2">Only prune sales with these statuses:</h4>
                                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md flex flex-wrap gap-x-6 gap-y-2">
                                    <StatusCheckbox label="All Statuses" checked={allPruneStatusesSelected} onChange={handlePruneSelectAll} />
                                    {saleStatuses.map(s => <StatusCheckbox key={s} label={s} checked={pruneStatuses.includes(s)} onChange={c => handlePruneStatusChange(s, c)} />)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">If no statuses are selected, all sales older than the specified days will be pruned.</p>
                            </div>}
                        </>}

                        {dangerAction === 'clearSales' && <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                You are about to permanently delete sales receipts based on the statuses you select. When a sales receipt is deleted, its related return receipts and stock history entries will also be deleted. <strong className="text-gray-800 dark:text-gray-200">Product stock levels will not be changed.</strong> This is irreversible.
                            </p>
                            <div><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Select sales data to clear:</h4><div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md flex flex-wrap gap-x-6 gap-y-2"><StatusCheckbox label="All Sales Data" checked={allClearStatusesSelected} onChange={handleClearSelectAll} />{saleStatuses.map(s => <StatusCheckbox key={s} label={s} checked={clearSaleStatuses.includes(s)} onChange={c => handleClearStatusChange(s, c)} />)}</div><p className="text-xs text-gray-500 mt-1">If no statuses are selected, no sales data will be cleared.</p></div>
                        </>}
                        
                        {dangerAction === 'factoryReset' && (
                             <p className="text-sm text-gray-600 dark:text-gray-400">
                                This will reset your business to its initial state. All products (reverting to defaults), sales records (including returns), stock history, purchase orders, and cashier accounts will be permanently deleted. Your admin account will be preserved. This action is irreversible.
                            </p>
                        )}


                        <div><label className="block text-sm font-medium">To confirm, type <strong className="font-mono">{dangerDetails.confirmWord}</strong></label><input type="text" value={confirmationText} onChange={e => setConfirmationText(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white dark:bg-gray-700" /></div>
                        <div><label className="block text-sm font-medium">Please enter your admin password</label><input type="password" value={confirmationPassword} onChange={e => setConfirmationPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-red-500 bg-white dark:bg-gray-700" /></div>
                        {dangerError && <p className="text-red-500 text-sm">{dangerError}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={closeDangerModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button onClick={handleDangerAction} disabled={!isDangerConfirmValid || !confirmationPassword || (dangerAction === 'clearSales' && noClearStatusesSelected)} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400">I understand, proceed</button>
                    </div>
                </Modal>
            )}
        </>
    );
};