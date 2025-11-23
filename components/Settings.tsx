
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, PaginationTarget } from '../types';
import { UserSettings } from './UserSettings';
import { Modal } from './common/Modal';
import { LogoutIcon } from './Icons';
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

export const Settings: React.FC<{ onSwitchWorkspace: () => void; }> = ({ onSwitchWorkspace }) => {
    const { currentUser, updateUser } = useAuth();
    const { 
        isSplitPaymentEnabled, setIsSplitPaymentEnabled, isChangeDueEnabled, setIsChangeDueEnabled,
        isIntegerCurrency, setIsIntegerCurrency, isTaxEnabled, setIsTaxEnabled, taxRate, setTaxRate,
        isDiscountEnabled, setIsDiscountEnabled, discountRate, setDiscountRate, discountThreshold, setDiscountThreshold,
        cashierPermissions,
        storeAddress, setStoreAddress, storePhone, setStorePhone, receiptFooter, setReceiptFooter,
        paginationConfig, setPaginationLimit
    } = useSettings();

    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    
    const [profileUsername, setProfileUsername] = useState(currentUser?.username || '');
    const [profilePassword, setProfilePassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const [expandedSection, setExpandedSection] = useState<string | null>('profile');
    
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
        users: 'Settings-User Management Table',
        analysis: 'Analysis-Data Table',
        purchaseOrders: 'Procurement-Purchase Orders Table',
        suppliers: 'Procurement-Suppliers Table',
        customers: 'Customers-List Table',
    };

    const paginationTargets = (Object.keys(paginationLabels) as PaginationTarget[]).sort((a, b) => {
        return paginationLabels[a].localeCompare(paginationLabels[b]);
    });

    const allValues = paginationTargets.map(t => paginationConfig[t]);
    // Consider values of 0 (default) as matching if others are 10? No, let's check exact match first.
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
            ) : (
                <AccordionSection
                    title="My Profile"
                    subtitle={`${currentUser.username} · ${currentUser.role}`}
                    sectionId="profile"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    {canEditProfile ? (
                        <button onClick={() => setIsEditProfileModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium w-full sm:w-auto">
                            Edit Profile
                        </button>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Your profile is managed by an administrator.
                        </p>
                    )}
                </AccordionSection>
            )}

             <AccordionSection
                title="Appearance & System"
                subtitle="Customize look, feel, and store details."
                sectionId="appearance"
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
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Pagination Settings (Rows Per Page)</h3>
                        
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
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4">Receipt Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store Address</label>
                                <textarea 
                                    value={storeAddress} 
                                    onChange={(e) => setStoreAddress(e.target.value)}
                                    rows={2} 
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="123 Main St, City, Country"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Store Phone</label>
                                <input 
                                    type="text" 
                                    value={storePhone} 
                                    onChange={(e) => setStorePhone(e.target.value)} 
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Receipt Footer Message</label>
                                <input 
                                    type="text" 
                                    value={receiptFooter} 
                                    onChange={(e) => setReceiptFooter(e.target.value)} 
                                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Thank you for shopping with us!"
                                />
                            </div>
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Currency Management</h3>
                        <CurrencyManager />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Currency Display Style</h3>
                        <CurrencyDisplaySelector />
                    </div>
                </div>
            </AccordionSection>

            {canEditBehavior && (
                <AccordionSection
                    title="Behavior"
                    subtitle="Customize the functionality of the application."
                    sectionId="behavior"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <div className="space-y-6">
                        <div>
                            <ToggleSwitch
                                enabled={isIntegerCurrency}
                                onChange={setIsIntegerCurrency}
                                label="Use Integer Currency"
                            />
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                Display and calculate all money values as whole numbers (e.g., for JPY).
                            </p>
                        </div>
                         <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                        <div>
                            <ToggleSwitch
                                enabled={isTaxEnabled}
                                onChange={setIsTaxEnabled}
                                label="Enable Sales Tax"
                            />
                            {isTaxEnabled && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        value={taxRate * 100}
                                        onChange={e => setTaxRate(parseFloat(e.target.value) / 100)}
                                        className="mt-1 block w-full sm:w-1/2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                        step="0.01" min="0"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                        <div>
                            <ToggleSwitch
                                enabled={isDiscountEnabled}
                                onChange={setIsDiscountEnabled}
                                label="Enable Automatic Discount"
                            />
                            {isDiscountEnabled && (
                                <div className="mt-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Rate (%)</label>
                                        <input
                                            type="number"
                                            value={discountRate * 100}
                                            onChange={e => setDiscountRate(parseFloat(e.target.value) / 100)}
                                            className="mt-1 block w-full sm:w-1/2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                            step="0.1" min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Purchase for Discount</label>
                                        <input
                                            type="number"
                                            value={discountThreshold}
                                            onChange={e => setDiscountThreshold(parseFloat(e.target.value))}
                                            className="mt-1 block w-full sm:w-1/2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                            step="1" min="0"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                         <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                        <div>
                            <ToggleSwitch
                                enabled={isSplitPaymentEnabled}
                                onChange={setIsSplitPaymentEnabled}
                                label="Enable Split Payments"
                            />
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                Allows a single sale to be paid for with multiple payment methods.
                            </p>
                        </div>
                        <div>
                            <ToggleSwitch
                                enabled={isChangeDueEnabled}
                                onChange={setIsChangeDueEnabled}
                                label="Calculate Change Due"
                            />
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                Automatically calculate and display change due in the POS and on receipts.
                            </p>
                        </div>
                    </div>
                </AccordionSection>
            )}
            
            {currentUser.role === UserRole.Admin && (
                <>
                    <AccordionSection
                        title="User Management"
                        subtitle="Add, edit, or remove cashier accounts."
                        sectionId="users"
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                    >
                        <UserSettings />
                    </AccordionSection>

                    <AccordionSection
                        title="Data Management"
                        subtitle="Export, import, or reset your business data."
                        sectionId="data"
                        expandedSection={expandedSection}
                        setExpandedSection={setExpandedSection}
                    >
                         <DataManagement />
                    </AccordionSection>
                </>
            )}

            {!isGuest && (
                <AccordionSection
                    title="Account Actions"
                    subtitle="Manage your current session."
                    sectionId="actions"
                    expandedSection={expandedSection}
                    setExpandedSection={setExpandedSection}
                >
                    <button 
                        onClick={onSwitchWorkspace}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium transition-colors"
                    >
                        <LogoutIcon className="h-5 w-5" />
                        <span>Switch Workspace</span>
                    </button>
                </AccordionSection>
            )}

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
