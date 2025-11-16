import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserRole, View } from '../../types';
import { Dashboard } from '../Dashboard';
import { POS } from '../POS';
import { Inventory } from '../Inventory';
import { Reports } from '../Reports';
import { Settings } from '../Settings';
import { Analysis } from '../Analysis';
import { DashboardIcon, POSIcon, InventoryIcon, ReportsIcon, SettingsIcon, AnalysisIcon, UserIcon, ChevronDownIcon, LogoutIcon } from '../Icons';
import { ToastContainer } from '../common/ToastContainer';
import { useAuth } from '../context/AuthContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';

export const MainLayout: React.FC = () => {
    const { currentUser, onLogout } = useAuth();
    const { businessName, cashierPermissions } = useSettings();
    const { activeView, setActiveView, toasts, dismissToast } = useUIState();
    
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef<HTMLDivElement>(null);
    
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

    const availableViews = useMemo(() => {
        if (currentUser.role === UserRole.Admin) {
            // FIX: Cast array of strings to View[] to resolve type error.
            return ['dashboard', 'pos', 'inventory', 'reports', 'analysis', 'settings'] as View[];
        }
        // For Cashier
        const views: View[] = [];
        if (cashierPermissions.canViewDashboard) views.push('dashboard');
        views.push('pos');
        if (cashierPermissions.canViewInventory) views.push('inventory');
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
            case 'reports': return <Reports />;
            case 'analysis': return <Analysis />;
            case 'settings': return <Settings />;
            default: return <Dashboard />;
        }
    };

    const NavItem: React.FC<{ view: View; icon: React.ReactNode; label: string }> = ({ view, icon, label }) => (
        <button onClick={() => setActiveView(view)} className={`flex items-center space-x-3 p-3 rounded-lg w-full text-left transition-colors ${activeView === view ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
        {icon}
        <span className="font-medium">{label}</span>
        </button>
    );

    // FIX: Changed icon prop type from React.ReactElement to React.ReactElement<{ className?: string }> to fix cloneElement error.
    const BottomNavItem: React.FC<{ view: View; icon: React.ReactElement<{ className?: string }>; label: string }> = ({ view, icon, label }) => (
        <button onClick={() => setActiveView(view)} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors ${activeView === view ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        {React.cloneElement(icon, { className: 'h-6 w-6' })}
        <span className="text-xs font-medium">{label}</span>
        </button>
    );
  
    if (!availableViews.includes(activeView)) {
        return null; // Render nothing on this cycle, useEffect will fix it
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex-col hidden md:flex">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate">{businessName}</h1>
            </div>
            <nav className="flex-grow p-4 space-y-2">
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewDashboard) && <NavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />}
            <NavItem view="pos" icon={<POSIcon />} label="Point of Sale" />
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewInventory) && <NavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewReports) && <NavItem view="reports" icon={<ReportsIcon />} label="Reports" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewAnalysis) && <NavItem view="analysis" icon={<AnalysisIcon />} label="Analysis" />}
            </nav>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700" ref={profileDropdownRef}>
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
                                <button onClick={() => onLogout(currentUser)} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 dark:hover:bg-opacity-50">
                                    <LogoutIcon className="h-5 w-5" /> <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </aside>
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{renderView()}</main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around shadow-lg z-40">
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewDashboard) && <BottomNavItem view="dashboard" icon={<DashboardIcon />} label="Dashboard" />}
            <BottomNavItem view="pos" icon={<POSIcon />} label="POS" />
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewInventory) && <BottomNavItem view="inventory" icon={<InventoryIcon />} label="Inventory" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewReports) && <BottomNavItem view="reports" icon={<ReportsIcon />} label="Reports" />}
            {(currentUser.role === UserRole.Admin || cashierPermissions.canViewAnalysis) && <BottomNavItem view="analysis" icon={<AnalysisIcon />} label="Analysis" />}
            <BottomNavItem view="settings" icon={<SettingsIcon />} label="Settings" />
        </nav>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
};