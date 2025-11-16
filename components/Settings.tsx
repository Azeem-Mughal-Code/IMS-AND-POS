import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../types';
import { UserSettings } from './UserSettings';
import { Modal } from './common/Modal';
import { LogoutIcon } from './Icons';
import { useAppContext } from './context/AppContext';
import { AccordionSection } from './common/AccordionSection';
import { ToggleSwitch } from './common/ToggleSwitch';
import { Dropdown } from './common/Dropdown';
import { ThemeSelector } from './settings/ThemeSelector';
import { DataManagement } from './settings/DataManagement';
import { CurrencyDisplaySelector } from './settings/CurrencyDisplaySelector';
import { CurrencyManager } from './settings/CurrencyManager';
import { PaddingSelector } from './settings/PaddingSelector';

export const Settings: React.FC = () => {
    const { 
        currentUser, updateUser, onLogout, theme, itemsPerPage, setItemsPerPage,
        isSplitPaymentEnabled, setIsSplitPaymentEnabled, isChangeDueEnabled, setIsChangeDueEnabled,
        isIntegerCurrency, setIsIntegerCurrency, isTaxEnabled, setIsTaxEnabled, taxRate, setTaxRate,
        isDiscountEnabled, setIsDiscountEnabled, discountRate, setDiscountRate, discountThreshold, setDiscountThreshold,
        cashierPermissions, verticalPadding, horizontalPadding
    } = useAppContext();

    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    
    const [profileUsername, setProfileUsername] = useState(currentUser.username);
    const [profilePassword, setProfilePassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    const [expandedSection, setExpandedSection] = useState<string | null>('profile');
    
    const canEditProfile = currentUser.role === UserRole.Admin || cashierPermissions.canEditOwnProfile;
    const canEditBehavior = currentUser.role === UserRole.Admin || cashierPermissions.canEditBehaviorSettings;

    const paddingClass = useMemo(() => {
        const verticalPaddingMap = {
            xs: 'py-2',
            sm: 'py-3',
            md: 'py-6',
            lg: 'py-9',
            xl: 'py-12',
        };
        const horizontalPaddingMap = {
            xs: 'px-2',
            sm: 'px-4',
            md: 'px-6',
            lg: 'px-8',
            xl: 'px-10',
        };
        return `${verticalPaddingMap[verticalPadding]} ${horizontalPaddingMap[horizontalPadding]}`;
    }, [verticalPadding, horizontalPadding]);

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
        <div className={`${paddingClass} space-y-4`}>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white px-2">Settings</h1>

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

             <AccordionSection
                title="Appearance"
                subtitle="Customize the look and feel of the application."
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
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Page Padding</h3>
                        <PaddingSelector />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Rows Per Page</h3>
                         <Dropdown
                            value={itemsPerPage}
                            onChange={setItemsPerPage}
                            options={[
                                { value: 5, label: '5' },
                                { value: 10, label: '10' },
                                { value: 20, label: '20' },
                                { value: 50, label: '50' },
                            ]}
                        />
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

            <AccordionSection
                title="Account Actions"
                subtitle="Manage your current session."
                sectionId="actions"
                expandedSection={expandedSection}
                setExpandedSection={setExpandedSection}
            >
                 <button 
                    onClick={() => onLogout(currentUser)} 
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