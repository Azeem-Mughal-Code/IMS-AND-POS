
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserRole, View } from '../../types';
import { Dashboard } from '../Dashboard';
import { POS } from '../POS';
import { Inventory } from '../Inventory';
import { Procurement } from '../Procurement';
import { Reports } from '../Reports';
import { Settings } from '../Settings';
import { Analysis } from '../Analysis';
import { Customers } from '../Customers';
import { Users } from '../Users';
import { DashboardIcon, POSIcon, InventoryIcon, ProcurementIcon, ReportsIcon, SettingsIcon, AnalysisIcon, UserIcon, ChevronDownIcon, LogoutIcon, UserGroupIcon, DangerIcon, UsersIcon } from '../Icons';
import { ToastContainer } from '../common/ToastContainer';
import { Modal } from '../common/Modal';
import { useAuth } from '../context/AuthContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';
import { useSales } from '../context/SalesContext';

export const MainLayout: React.FC<{ onSwitchWorkspace: () => void; }> = ({ onSwitchWorkspace }) => {
    const { currentUser } = useAuth();
    const { workspaceId, workspaceName, cashierPermissions } = useSettings();
    const { activeView, setActiveView, toasts, dismissToast } = useUIState();
    const { currentShift } = useSales();
    
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isAuthWarningModalOpen, setIsAuthWarningModalOpen] = useState(false);
    const [isShiftWarningOpen, setIsShiftWarningOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);
    const isGuest = workspaceId === 'guest_workspace';
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        if (isProfileDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isProfileDropdownOpen]);

    // Reset scroll position when view changes
    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
    }, [activeView]);

    const handleSwitchWorkspaceWithDelay = async () => {
        if (currentShift) {
            setIsShiftWarningOpen(true);
            return;
        }
        onSwitchWorkspace();
    };

    const handleSwitchToAuth = async () => {
        setIsAuthWarningModalOpen(false);
        onSwitchWorkspace();
    };

    const availableViews = useMemo(() => {
        if (currentUser?.role === UserRole.Admin) {
            return ['dashboard', 'pos', 'inventory', 'procurement', 'customers', 'users', 'reports', 'analysis', 'settings'] as View[];
        }
        // For Cashier
        const views: View[] = [];
        if (cashierPermissions.canViewDashboard) views.push('dashboard');
        views.push('pos');
        if (cashierPermissions.canViewInventory) {
            views.push('inventory');
            views.push('procurement');
        }
        if (cashierPermissions.canManageCustomers) views.push('customers');
        if (cashierPermissions.canViewReports) views.push('reports');
        if (cashierPermissions.canViewAnalysis) views.push('analysis');
        views.push('settings');
        return views;
    }, [currentUser, cashierPermissions]);

    useEffect(() => {
        if (!availableViews.includes(activeView)) {
            setActiveView(availableViews[0] || 'pos');
        }
    }, [activeView, availableViews, setActiveView]);

    const renderView = () => {
        switch (activeView) {
            case 'dashboard': return <Dashboard />;
            case 'pos': return <POS />;
            case 'inventory': return <Inventory />;
            case 'procurement': return <Procurement />;
            case 'customers': return <Customers />;
            case 'users': return <Users />;
            case 'reports': return <Reports />;
            case 'analysis': return <Analysis />;
            case 'settings': return <Settings onSwitchWorkspace={handleSwitchWorkspaceWithDelay} />;
            default: return <Dashboard />;
        }
    };

    const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
        <button onClick={() => setActiveView(view)} className={`flex items-center space-x-3 p-3 rounded-lg w-full text-left transition-colors ${activeView === view ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
        {icon}
        <span className="font-medium">{label}</span>
        </button>
    );

    const BottomNavItem: React.FC<{ view: View; icon: React.ReactElement<{ className?: string }>; label: string }> = ({ view, icon, label }) => (
        <button onClick={() => setActiveView(view)} className={`flex flex-col items-center justify-center min-w-[4rem] flex-shrink-0 pt-2 pb-1 transition-colors ${activeView === view ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        {React.cloneElement(icon, { className: 'h-6 w-6' })}
        <span className="text-xs font-medium whitespace-nowrap">{label}</span>
        </button>
    );
  
    if (!currentUser || !availableViews.includes(activeView)) {
        return null; // Render nothing on this cycle, useEffect will fix it
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex-col hidden md:flex">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate">{workspaceName}</h1>
            </div>
            <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewDashboard) && <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />}
            <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewInventory) && <NavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewInventory) && <NavItem view="procurement" icon={<ProcurementIcon />} label="Procurement" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canManageCustomers) && <NavItem view="customers" icon={<UserGroupIcon />} label="Customers" />}
            {currentUser.role === UserRole.Admin && <NavItem view="users" icon={<UsersIcon />} label="Users" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewReports) && <NavItem view="reports" icon={<ReportsIcon />} label="Reports" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewAnalysis) && <NavItem view="analysis" icon={<AnalysisIcon />} label="Analysis" />}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700" ref={profileDropdownRef}>
               {isGuest ? (
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-center">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Guest Session</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 my-2">Your data is temporary. Login or sign up to save your progress.</p>
                        <button
                            onClick={() => setIsAuthWarningModalOpen(true)}
                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Login / Sign Up
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <button onClick={() => setIsProfileDropdownOpen(p => !p)} className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <div className="p-2 bg-gray-200 dark:bg-gray-600 rounded-full"><UserIcon /></div>
                            <div className="flex-1">
                                <p className="font-semibold text-sm truncate">{currentUser.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                            </div>
                            <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isProfileDropdownOpen && (
                            <div className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                                <div className="p-2">
                                    <button onClick={() => { setActiveView('settings'); setIsProfileDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <SettingsIcon className="h-5 w-5" /> <span>Settings</span>
                                    </button>
                                    <div className="my-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                                    <button onClick={handleSwitchWorkspaceWithDelay} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 dark:hover:bg-opacity-50">
                                        <LogoutIcon className="h-5 w-5" /> <span>Logout</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
        <main ref={mainContentRef} className="flex-1 overflow-y-auto pb-16 md:pb-0">{renderView()}</main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-start overflow-x-auto shadow-lg z-40 no-scrollbar">
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewDashboard) && <BottomNavItem view="dashboard" icon={<DashboardIcon />} label="Dash" />}
            <BottomNavItem view="pos" icon={<POSIcon />} label="POS" />
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewInventory) && <BottomNavItem view="inventory" icon={<InventoryIcon />} label="Inv" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewInventory) && <BottomNavItem view="procurement" icon={<ProcurementIcon />} label="Proc" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canManageCustomers) && <BottomNavItem view="customers" icon={<UserGroupIcon />} label="Cust" />}
            {currentUser.role === UserRole.Admin && <BottomNavItem view="users" icon={<UsersIcon />} label="Users" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewReports) && <BottomNavItem view="reports" icon={<ReportsIcon />} label="Rpts" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewAnalysis) && <BottomNavItem view="analysis" icon={<AnalysisIcon />} label="Analysis" />}
            <BottomNavItem view="settings" icon={<SettingsIcon />} label="Set" />
        </nav>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        
        <Modal isOpen={isAuthWarningModalOpen} onClose={() => setIsAuthWarningModalOpen(false)} title="Create Account or Login">
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">To save your data and access it from any device, please create an account or log in.</p>
                <p className="font-semibold text-orange-600 dark:text-orange-400">Continuing will start a new session, and your current guest data will be lost.</p>
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={() => setIsAuthWarningModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={handleSwitchToAuth} className="px-4 py-2 bg-blue-600 text-white rounded-md">Continue</button>
                </div>
            </div>
        </Modal>

        <Modal isOpen={isShiftWarningOpen} onClose={() => setIsShiftWarningOpen(false)} title="Shift Still Open" size="sm">
            <div className="space-y-4 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <DangerIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Please Close Shift</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        You cannot switch workspaces while a shift is open. Please go to the POS and close your shift first.
                    </p>
                </div>
                <div className="flex justify-center pt-2">
                    <button onClick={() => setIsShiftWarningOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 w-full sm:w-auto">
                        OK
                    </button>
                </div>
            </div>
        </Modal>
        </div>
    );
};
