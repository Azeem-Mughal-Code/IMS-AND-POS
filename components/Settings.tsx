
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, PaginationTarget } from '../types';
import { Modal } from './common/Modal';
import { LogoutIcon, TagIcon, UserCircleIcon, PencilIcon } from './Icons';
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
import { useGlobalAuth } from './context/GlobalAuthContext';
import { useUIState } from './context/UIStateContext';

export const Settings: React.FC<{ onSwitchWorkspace: () => void; }> = ({ onSwitchWorkspace }) => {
    const { currentUser, updateUser } = useAuth();
    const { 
        workspaceId, workspaceName,
        isSplitPaymentEnabled, setIsSplitPaymentEnabled, isChangeDueEnabled, setIsChangeDueEnabled,
        isIntegerCurrency, setIsIntegerCurrency, isTaxEnabled, setIsTaxEnabled, taxRate, setTaxRate,
        isDiscountEnabled, setIsDiscountEnabled, discountRate, setDiscountRate, discountThreshold, setDiscountThreshold,
        cashierPermissions,
        storeAddress, setStoreAddress, storePhone, setStorePhone, receiptFooter, setReceiptFooter,
        paginationConfig, setPaginationLimit
    } = useSettings();
    const { currentGlobalUser, getWorkspaceById } = useGlobalAuth();

    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    
    const [profileUsername, setProfileUsername] = useState(currentUser?.username || '');
    const [profilePassword, setProfilePassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const [expandedSection, setExpandedSection] = useState<string | null>('profile');
    
    const workspace = useMemo(() => getWorkspaceById(workspaceId), [getWorkspaceById, workspaceId]);

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
                        <button onClick={onSwitchWorkspace} className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base font-medium w-full sm:w-auto">
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
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                                <UserCircleIcon className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{currentUser.username}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded inline-block mt-1">{currentUser.role}</p>
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
                </AccordionSection>
            )}

            <AccordionSection
                title="General"
                subtitle="Theme, Zoom, and Timezone settings."
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
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Business Name</label>
                                    <p className="font-semibold text-gray-900 dark:text-white text-lg">{workspaceName}</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Store Code</label>
                                    <div className="flex items-center gap-2">
                                        <TagIcon className="w-4 h-4 text-blue-500" />
                                        <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{workspace?.alias || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-4 flex items-start gap-1">
                                <span className="mt-0.5">ℹ️</span> 
                                Business Name and Store Code can only be modified from the Workspace Selector screen.
                            </p>
                        </div>

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
                                
                                <ToggleSwitch
                                    enabled={isChangeDueEnabled}
                                    onChange={setIsChangeDueEnabled}
                                    label="Show Change Due"
                                />
                                <ToggleSwitch
                                    enabled={isSplitPaymentEnabled}
                                    onChange={setIsSplitPaymentEnabled}
                                    label="Enable Split Payments"
                                />
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

            <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Edit Profile" size="sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
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
        </div>
    );
};
