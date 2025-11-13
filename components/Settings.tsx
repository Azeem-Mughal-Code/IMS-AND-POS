import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, View, UsersViewState, Product, Sale } from '../types';
import { UserSettings } from './UserSettings';
import { Modal } from './common/Modal';
import { SunIcon, MoonIcon, ComputerDesktopIcon, LogoutIcon, ExportIcon, ImportIcon, DangerIcon, ChevronDownIcon } from './Icons';

interface SettingsProps {
    currentUser: User;
    businessName: string;
    updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
    users: User[];
    addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
    deleteUser: (userId: string) => { success: boolean; message?: string };
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    onLogout: () => void;
    usersViewState: UsersViewState;
    onUsersViewUpdate: (updates: Partial<UsersViewState>) => void;
    // Data management props
    products: Product[];
    sales: Sale[];
    importProducts: (newProducts: Omit<Product, 'id'>[]) => { success: boolean; message: string };
    clearSales: () => void;
    factoryReset: () => void;
}

const ThemeSelector: React.FC<{ theme: 'light' | 'dark' | 'system', setTheme: (theme: 'light' | 'dark' | 'system') => void }> = ({ theme, setTheme }) => {
    const options = [
        { value: 'light', label: 'Light', icon: <SunIcon /> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon /> }
    ];

    return (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className={`flex flex-col items-center justify-center p-3 rounded-md text-sm font-medium transition-colors ${
                        theme === option.value
                            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {option.icon}
                    <span className="mt-1">{option.label}</span>
                </button>
            ))}
        </div>
    );
};

// --- Data Management Component ---
const DataManagement: React.FC<Omit<SettingsProps, 'onUsersViewUpdate' | 'usersViewState' | 'theme' | 'setTheme' | 'onLogout'>> = ({ currentUser, businessName, products, sales, importProducts, clearSales, factoryReset }) => {
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
            const flattenedData = data.flatMap(sale => 
                sale.items.map((item: any) => ({
                    sale_id: sale.id,
                    sale_date: sale.date,
                    sale_type: sale.type,
                    payment_type: sale.paymentType,
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

interface AccordionSectionProps {
    title: string;
    subtitle: string;
    sectionId: string;
    expandedSection: string | null;
    setExpandedSection: (id: string | null) => void;
    children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, subtitle, sectionId, expandedSection, setExpandedSection, children }) => {
    const isExpanded = expandedSection === sectionId;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300">
            <button
                onClick={() => setExpandedSection(isExpanded ? null : sectionId)}
                className="w-full flex justify-between items-center p-6 text-left"
                aria-expanded={isExpanded}
                aria-controls={`section-content-${sectionId}`}
            >
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <div
                id={`section-content-${sectionId}`}
                className={`transition-all duration-300 ease-in-out grid ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};


export const Settings: React.FC<SettingsProps> = (props) => {
    const { currentUser, updateUser, theme, setTheme, onLogout } = props;
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    
    const [profileUsername, setProfileUsername] = useState(currentUser.username);
    const [profilePassword, setProfilePassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const [expandedSection, setExpandedSection] = useState<string | null>('profile');

    useEffect(() => {
        if (isEditProfileModalOpen) {
            setProfileUsername(currentUser.username);
            setProfilePassword('');
            setProfileConfirmPassword('');
            setProfileError('');
            setProfileSuccess('');
        }
    }, [isEditProfileModalOpen, currentUser.username]);

    const handleProfileUpdate = () => {
        setProfileError('');
        setProfileSuccess('');

        if (profilePassword && profilePassword.length < 4) {
            setProfileError("New password must be at least 4 characters long.");
            return;
        }

        if (profilePassword !== profileConfirmPassword) {
            setProfileError("Passwords do not match.");
            return;
        }
        
        const result = updateUser(currentUser.id, profileUsername, profilePassword);
        
        if (result.success) {
            setProfileSuccess("Profile updated successfully!");
            setTimeout(() => {
                setIsEditProfileModalOpen(false);
            }, 1500)
        } else {
            setProfileError(result.message || "Failed to update profile.");
        }
    };

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white px-2">Settings</h1>

            <AccordionSection
                title="My Profile"
                subtitle={`${currentUser.username} · ${currentUser.role}`}
                sectionId="profile"
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
            >
                 <button onClick={() => setIsEditProfileModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium w-full sm:w-auto">
                    Edit Profile
                </button>
            </AccordionSection>

             <AccordionSection
                title="Appearance"
                subtitle="Customize the look and feel of the application."
                sectionId="appearance"
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
            >
                <ThemeSelector theme={theme} setTheme={setTheme} />
            </AccordionSection>
            
            {currentUser.role === UserRole.Admin && (
                <>
                    <AccordionSection
                        title="User Management"
                        subtitle="Add, edit, or remove cashier accounts."
                        sectionId="users"
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                    >
                        <UserSettings 
                            users={props.users}
                            currentUser={props.currentUser}
                            addUser={props.addUser}
                            updateUser={props.updateUser}
                            deleteUser={props.deleteUser}
                            viewState={props.usersViewState}
                            onViewStateUpdate={props.onUsersViewUpdate}
                        />
                    </AccordionSection>

                    <AccordionSection
                        title="Data Management"
                        subtitle="Export, import, or reset your business data."
                        sectionId="data"
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                    >
                         <DataManagement {...props} />
                    </AccordionSection>
                </>
            )}

            <AccordionSection
                title="Account Actions"
                subtitle="Manage your current session."
                sectionId="actions"
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
            >
                 <button 
                    onClick={onLogout} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium transition-colors"
                >
                    <LogoutIcon className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </AccordionSection>

            <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Edit Profile" size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password (optional)</label>
                        <input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Leave blank to keep current" className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <input type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    {profileError && <p className="text-red-500 text-sm text-center mt-2">{profileError}</p>}
                    {profileSuccess && <p className="text-green-500 text-sm text-center mt-2">{profileSuccess}</p>}
                </div>
                <div className="flex justify-end items-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 gap-2">
                    <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
                    <button type="button" onClick={handleProfileUpdate} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
                </div>
            </Modal>
        </div>
    )
}