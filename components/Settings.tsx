
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserRole, PaginationTarget } from '../types';
import { Modal } from './common/Modal';
import { LogoutIcon, TagIcon, UserCircleIcon, PencilIcon, CheckCircleIcon, XMarkIcon, ClipboardIcon, BuildingStoreIcon, ReceiveIcon, DangerIcon, BugIcon, TrashIcon, ShieldCheckIcon } from './Icons';
import { AccordionSection } from './common/AccordionSection';
import { ToggleSwitch } from './common/ToggleSwitch';
import { Dropdown } from './common/Dropdown';
import { ThemeSelector } from './settings/ThemeSelector';
import { DataManagement } from './settings/DataManagement';
import { CurrencyDisplaySelector } from './settings/CurrencyDisplaySelector';
import { CurrencyManager } from './settings/CurrencyManager';
import { ZoomSelector } from './settings/ZoomSelector';
import { useAuth } from './context/AuthContext';
import { useSettings } from './context/SettingsContext';
import { TimezoneSelector } from './settings/TimezoneSelector';
import { useUIState } from './context/UIStateContext';
import { syncService } from '../services/SyncService';

export const Settings: React.FC<{ onSwitchWorkspace: () => void; }> = ({ onSwitchWorkspace }) => {
    const { currentUser, updateUser, currentWorkspace, updateBusinessDetails, logout, sessionPersistence, setSessionPersistence } = useAuth();
    const { 
        workspaceId, workspaceName,
        isIntegerCurrency, setIsIntegerCurrency, isTaxEnabled, setIsTaxEnabled, taxRate, setTaxRate,
        includeTaxInProfit, setIncludeTaxInProfit,
        isDiscountEnabled, setIsDiscountEnabled, discountRate, setDiscountRate, discountThreshold, setDiscountThreshold,
        cashierPermissions,
        storeAddress, setStoreAddress, storePhone, setStorePhone, receiptFooter, setReceiptFooter,
        paginationConfig, setPaginationLimit,
        syncApiUrl, setSyncApiUrl, syncApiKey, setSyncApiKey
    } = useSettings();
    const { showToast } = useUIState();

    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    
    const [profileUsername, setProfileUsername] = useState(currentUser?.username || '');
    const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
    const [profilePassword, setProfilePassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const [expandedSection, setExpandedSection] = useState<string | null>('profile');
    
    // Business Edit State
    const [isEditBusinessModalOpen, setIsEditBusinessModalOpen] = useState(false);
    const [editBusinessName, setEditBusinessName] = useState('');
    const [editStoreCode, setEditStoreCode] = useState('');
    const [businessEditError, setBusinessEditError] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    
    // Sync State
    const [isSyncing, setIsSyncing] = useState(false);

    // Guest Exit State
    const [isGuestExitModalOpen, setIsGuestExitModalOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    const workspace = currentWorkspace;

    if (!currentUser) return null;

    const isGuest = currentUser.id === 'guest';
    const canEditProfile = currentUser.role === UserRole.Admin || cashierPermissions.canEditOwnProfile;
    const canEditBehavior = currentUser.role === UserRole.Admin || cashierPermissions.canEditBehaviorSettings;

    useEffect(() => {
        if (isGuest) {
            setExpandedSection('guest');
        }
    }, [isGuest]);

    useEffect(() => {
        if (isEditProfileModalOpen) {
            setProfileUsername(currentUser.username);
            setProfileEmail(currentUser.email || '');
            setProfilePassword('');
            setProfileConfirmPassword('');
            setProfileError('');
            setProfileSuccess('');
        }
    }, [isEditProfileModalOpen, currentUser]);

    const handleProfileUpdate = async () => {
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
        
        try {
            const result = await updateUser(currentUser.id, profileUsername, profilePassword, profileEmail);
            
            if (result.success) {
                setProfileSuccess("Profile updated successfully!");
                showToast("Profile updated successfully!", "success");
                setTimeout(() => {
                    setIsEditProfileModalOpen(false);
                }, 1500)
            } else {
                setProfileError(result.message || "Failed to update profile.");
            }
        } catch (error) {
            console.error("Profile update failed", error);
            setProfileError("An unexpected error occurred.");
        }
    };

    const openEditBusinessModal = () => {
        setEditBusinessName(workspaceName || '');
        setEditStoreCode(workspace?.alias || '');
        setBusinessEditError('');
        setIsEditBusinessModalOpen(true);
    };

    const handleUpdateBusiness = async () => {
        setBusinessEditError('');
        const result = await updateBusinessDetails(editBusinessName, editStoreCode);
        if (result.success) {
            showToast('Business details updated successfully.', 'success');
            setIsEditBusinessModalOpen(false);
        } else {
            setBusinessEditError(result.message || 'Failed to update business details.');
        }
    };

    const handleCopyCode = () => {
        if (workspace?.alias) {
            navigator.clipboard.writeText(workspace.alias);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handlePaginationChange = (target: PaginationTarget, value: string) => {
        if (value === '') {
            setPaginationLimit(target, 0);
            return;
        }
        const limit = parseInt(value, 10);
        if (!isNaN(limit) && limit >= 0) {
            setPaginationLimit(target, limit);
        }
    };
    
    const handleManualSync = async () => {
        setIsSyncing(true);
        const result = await syncService.sync();
        setIsSyncing(false);
        showToast(result.message || (result.success ? 'Sync complete' : 'Sync failed'), result.success ? 'success' : 'error');
    };

    const handleGuestLogout = () => {
        setIsLoggingOut(true);
        // Force direct logout to bypass shift check since we are nuking data anyway
        setTimeout(() => {
            logout();
        }, 50);
    };

    const paginationLabels: Record<PaginationTarget, string> = {
        inventory: 'Inventory-Products Table',
        inventoryCategories: 'Inventory-Categories Table',
        inventoryValuation: 'Inventory-Valuation Table',
        posCatalog: 'POS-Catalog View',
        posSales: 'POS-Sales View',
        salesReports: 'Reports-Sales History Table',
        productReports: 'Reports-Stock Levels Table',
        users: 'Users-List Table',
        analysis: 'Analysis-Data Table',
        purchaseOrders: 'Procurement-Purchase Orders Table',
        suppliers: 'Procurement-Suppliers Table',
        customers: 'Customers-List Table',
        inventoryStockHistory: 'Inventory-Stock History Table',
        inventoryPriceHistory: 'Inventory-Price History Table',
        shifts: 'Users-Shift History Table',
    };

    const paginationTargets = (Object.keys(paginationLabels) as PaginationTarget[]).sort((a, b) => {
        return paginationLabels[a].localeCompare(paginationLabels[b]);
    });

    const allValues = paginationTargets.map(t => paginationConfig[t]);
    const firstValue = allValues[0] || 10;
    const isMixed = !allValues.every(v => (v || 10) === (firstValue || 10));
    const currentCommonValue = isMixed ? 'custom' : (firstValue === 0 ? '10' : firstValue.toString());

    const [forceCustomMode, setForceCustomMode] = useState(false);

    const effectiveValue = isMixed || forceCustomMode ? 'custom' : currentCommonValue;

    const handleUniversalChange = (val: string) => {
        if (val === 'custom') {
            setForceCustomMode(true);
        } else {
            setForceCustomMode(false);
            const limit = parseInt(val, 10);
            paginationTargets.forEach(target => setPaginationLimit(target, limit));
        }
    };

    const paginationOptions = [
        { value: '5', label: '5 Rows' },
        { value: '10', label: '10 Rows' },
        { value: '20', label: '20 Rows' },
        { value: '50', label: '50 Rows' },
        { value: 'custom', label: 'Custom (Per View)' },
    ];

    const sessionOptions = [
        { value: 'session', label: 'Session Only (Clear on Close)' },
        { value: 'local', label: 'Persistent (Keep me logged in)' },
    ];

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white px-2">Settings</h1>

            {isGuest ? (
                 <AccordionSection
                    title="Guest Session"
                    subtitle="Your data is temporary."
                    sectionId="guest"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-300 mb-4">Login or create an account to save your business data and access it anywhere.</p>
                        <button onClick={() => setIsGuestExitModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base font-medium w-full sm:w-auto">
                            Login / Sign Up
                        </button>
                    </div>
                </AccordionSection>
            ) : null}

            {!isGuest && (
                <AccordionSection
                    title="Profile"
                    subtitle="Manage your account details."
                    sectionId="profile"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <div className="space-y-6">
                        {/* User Profile Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                                        <UserCircleIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{currentUser.username}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded inline-block mt-1 mr-2">{currentUser.role}</p>
                                        {currentUser.email && <p className="text-sm text-blue-600 dark:text-blue-400 inline-block">{currentUser.email}</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    {canEditProfile && (
                                        <button onClick={() => setIsEditProfileModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/70 text-sm font-medium transition-colors">
                                            <PencilIcon className="w-4 h-4" />
                                            Edit Profile
                                        </button>
                                    )}
                                    <button 
                                        onClick={onSwitchWorkspace}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 text-sm font-medium transition-colors"
                                    >
                                        <LogoutIcon className="w-4 h-4"/>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Business Card (Admin Only) */}
                        {currentUser.role === UserRole.Admin && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 flex-shrink-0">
                                            <BuildingStoreIcon className="w-8 h-8" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{workspaceName}</h3>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Store Code:</span>
                                                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded px-2 py-0.5 border border-gray-200 dark:border-gray-600">
                                                    <code className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{workspace?.alias}</code>
                                                    <button onClick={handleCopyCode} className="ml-2 text-gray-400 hover:text-blue-500 transition-colors" title="Copy Code">
                                                        {copiedCode ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={openEditBusinessModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors w-full sm:w-auto">
                                        <PencilIcon className="w-4 h-4" />
                                        Edit Business
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-start gap-1">
                                    <span className="mt-0.5 text-blue-500">ℹ️</span> 
                                    Use your Store Code or Email (if set) to login from other devices.
                                </p>
                            </div>
                        )}
                    </div>
                </AccordionSection>
            )}

            <AccordionSection
                title="General"
                subtitle="Theme, Zoom, Session, and Timezone."
                sectionId="general"
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
            >
                <div className="space-y-6">
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Theme</h3>
                        <ThemeSelector />
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Zoom Level</h3>
                        <ZoomSelector />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Timezone</h3>
                        <TimezoneSelector />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Session Persistence</h3>
                        <Dropdown 
                            value={sessionPersistence}
                            onChange={(val) => setSessionPersistence(val as 'session' | 'local')}
                            options={sessionOptions}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {sessionPersistence === 'local' 
                                ? "Your session will persist even if you close the browser. Use only on private devices."
                                : "Your session will be cleared when you close the browser tab or window."}
                        </p>
                    </div>
                </div>
            </AccordionSection>

            {canEditBehavior && (
                <AccordionSection
                    title="Business Details"
                    subtitle="Store information for receipts."
                    sectionId="business"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store Address</label>
                                <textarea 
                                    value={storeAddress} 
                                    onChange={(e) => setStoreAddress(e.target.value)}
                                    rows={2} 
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="123 Main St, City, Country"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store Phone</label>
                                <input 
                                    type="text" 
                                    value={storePhone} 
                                    onChange={(e) => setStorePhone(e.target.value)} 
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Footer Message</label>
                                <input 
                                    type="text" 
                                    value={receiptFooter}
                                    onChange={(e) => setReceiptFooter(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Thank you for shopping with us!"
                                />
                            </div>
                        </div>
                    </div>
                </AccordionSection>
            )}

            {canEditBehavior && (
                <AccordionSection
                    title="Currency & Payment"
                    subtitle="Manage currency formats, taxes, and payment options."
                    sectionId="currency"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Currency Settings</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Format</label>
                                <CurrencyDisplaySelector />
                            </div>
                            <CurrencyManager />
                            <div className="mt-4">
                                <ToggleSwitch
                                    enabled={isIntegerCurrency}
                                    onChange={setIsIntegerCurrency}
                                    label="Integer Currency (No Decimals)"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Useful for currencies like JPY, KRW, etc.</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Tax & Payments</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <ToggleSwitch
                                        enabled={isTaxEnabled}
                                        onChange={setIsTaxEnabled}
                                        label="Enable Sales Tax"
                                    />
                                    {isTaxEnabled && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={(taxRate * 100).toFixed(1)}
                                                onChange={(e) => setTaxRate(parseFloat(e.target.value) / 100)}
                                                className="w-20 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <ToggleSwitch
                                        enabled={includeTaxInProfit}
                                        onChange={setIncludeTaxInProfit}
                                        label="Include Tax in Profit Calculation"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">If enabled, profit = Revenue + Tax - Cost. Otherwise, Profit = Revenue - Cost.</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Discounts</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <ToggleSwitch
                                        enabled={isDiscountEnabled}
                                        onChange={setIsDiscountEnabled}
                                        label="Enable Auto-Discount"
                                    />
                                    {isDiscountEnabled && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={(discountRate * 100).toFixed(1)}
                                                onChange={(e) => setDiscountRate(parseFloat(e.target.value) / 100)}
                                                className="w-20 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                            <span className="text-gray-700 dark:text-gray-300">%</span>
                                        </div>
                                    )}
                                </div>
                                {isDiscountEnabled && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Threshold Amount</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={discountThreshold}
                                            onChange={(e) => setDiscountThreshold(parseFloat(e.target.value))}
                                            className="w-24 rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </AccordionSection>
            )}

            {canEditBehavior && (
                <AccordionSection
                    title="Sync Settings"
                    subtitle="Configure synchronization with central server."
                    sectionId="sync"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Server API URL</label>
                            <input 
                                type="text" 
                                value={syncApiUrl} 
                                onChange={(e) => setSyncApiUrl(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                placeholder="https://api.myshop.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                            <input 
                                type="password" 
                                value={syncApiKey} 
                                onChange={(e) => setSyncApiKey(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Secret Key"
                            />
                        </div>
                        <div className="pt-2">
                            <button 
                                onClick={handleManualSync} 
                                disabled={isSyncing || !syncApiUrl}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                <ReceiveIcon className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>
                    </div>
                </AccordionSection>
            )}

            <AccordionSection
                title="View Settings"
                subtitle="Configure pagination limits."
                sectionId="view"
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
            >
                <div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Rows Per Page</h3>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Global Setting
                        </label>
                        <Dropdown
                            options={paginationOptions}
                            value={effectiveValue}
                            onChange={handleUniversalChange}
                        />
                    </div>

                    {(isMixed || forceCustomMode) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            {paginationTargets.map(target => (
                                <div key={target}>
                                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        {paginationLabels[target]}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={paginationConfig[target] === 0 ? '' : paginationConfig[target]}
                                        onChange={(e) => handlePaginationChange(target, e.target.value)}
                                        placeholder="Default (10)"
                                        className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </AccordionSection>

            {canEditBehavior && (
                <AccordionSection
                    title="Data Management"
                    subtitle="Backup, restore, or reset data."
                    sectionId="data"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <DataManagement />
                </AccordionSection>
            )}

            {/* Profile Edit Modal */}
            <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Edit Profile" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    {/* Email field removed as requested */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                        <input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Leave blank to keep current" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <input type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Re-enter new password" />
                    </div>
                    {profileError && <p className="text-red-500 text-sm text-center">{profileError}</p>}
                    {profileSuccess && <p className="text-green-500 text-sm text-center">{profileSuccess}</p>}
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsEditProfileModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancel</button>
                        <button onClick={handleProfileUpdate} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save Changes</button>
                    </div>
                </div>
            </Modal>

            {/* Business Edit Modal */}
            <Modal isOpen={isEditBusinessModalOpen} onClose={() => setIsEditBusinessModalOpen(false)} title="Edit Business Details" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
                        <input 
                            type="text" 
                            value={editBusinessName} 
                            onChange={e => setEditBusinessName(e.target.value)} 
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                            placeholder="Enter Business Name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store Code</label>
                        <input 
                            type="text" 
                            value={editStoreCode} 
                            onChange={e => setEditStoreCode(e.target.value.toUpperCase())} 
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase font-mono" 
                            placeholder="WS-XXXXXX"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must be unique and at least 3 characters.</p>
                    </div>
                    {businessEditError && <p className="text-red-500 text-sm text-center">{businessEditError}</p>}
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsEditBusinessModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md">Cancel</button>
                        <button onClick={handleUpdateBusiness} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save Changes</button>
                    </div>
                </div>
            </Modal>

            {/* Guest Exit Confirmation Modal */}
            <Modal isOpen={isGuestExitModalOpen} onClose={() => setIsGuestExitModalOpen(false)} title="End Guest Session?">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        To login or create an account, we must end the current guest session.
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-md flex items-start gap-3">
                        <DangerIcon className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div>
                            <h4 className="font-bold text-red-800 dark:text-red-200 text-sm">Warning: Data Deletion</h4>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                All data created in this guest session (sales, products, etc.) will be <strong>permanently deleted</strong> immediately.
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsGuestExitModalOpen(false)} disabled={isLoggingOut} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">Cancel</button>
                        <button onClick={handleGuestLogout} disabled={isLoggingOut} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                            {isLoggingOut && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                            {isLoggingOut ? 'Deleting...' : 'End Session & Delete Data'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
