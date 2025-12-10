
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
import { DashboardIcon, POSIcon, InventoryIcon, ProcurementIcon, ReportsIcon, SettingsIcon, AnalysisIcon, UserIcon, ChevronDownIcon, LogoutIcon, UserGroupIcon, DangerIcon, UsersIcon, DownloadIcon, CloudCheckIcon } from '../Icons';
import { ToastContainer } from '../common/ToastContainer';
import { Modal } from '../common/Modal';
import { useAuth } from '../context/AuthContext';
import { useUIState } from '../context/UIStateContext';
import { useSettings } from '../context/SettingsContext';
import { useSales } from '../context/SalesContext';

const OfflineIndicator = () => (
    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold animate-pulse">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
        <span className="hidden sm:inline">Offline</span>
    </div>
);

const OfflineReadyIndicator = () => (
    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs font-bold" title="App ready for offline use">
        <CloudCheckIcon className="h-4 w-4" />
        <span className="hidden lg:inline">Offline Ready</span>
    </div>
);

// Helper to log to the global buffer from React
const logToScreen = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] [React] ${msg}`;
    console.log(logLine);
    if ((window as any).__PWA_LOGS__) {
        (window as any).__PWA_LOGS__.push(logLine);
    }
};

export const MainLayout: React.FC<{ onSwitchWorkspace: () => void; }> = ({ onSwitchWorkspace }) => {
    const { currentUser } = useAuth();
    const { workspaceId, workspaceName, cashierPermissions } = useSettings();
    const { activeView, setActiveView, toasts, dismissToast, showToast } = useUIState();
    const { currentShift } = useSales();
    
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isAuthWarningModalOpen, setIsAuthWarningModalOpen] = useState(false);
    const [isShiftWarningOpen, setIsShiftWarningOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isOfflineReady, setIsOfflineReady] = useState(false);
    // Initialize deferredPrompt from global window object if available
    const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPrompt || null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

    const profileDropdownRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);
    const isGuest = workspaceId === 'guest_workspace';
    
    useEffect(() => {
        logToScreen("MainLayout mounted. Checking Online Status...");
        const handleOnline = () => {
            logToScreen("Event: Online");
            setIsOnline(true);
        };
        const handleOffline = () => {
            logToScreen("Event: Offline");
            setIsOnline(false);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Check if service worker is controlling the page (means app is cached and ready)
        if ('serviceWorker' in navigator) {
            if (navigator.serviceWorker.controller) {
                logToScreen("navigator.serviceWorker.controller is active. isOfflineReady = true.");
                setIsOfflineReady(true);
            } else {
                logToScreen("navigator.serviceWorker.controller is NULL. Page not controlled by SW yet.");
            }
        } else {
             logToScreen("Service Worker not supported in this browser.");
        }

        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsInstallable(!isStandalone);

        // Check iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        if (isIosDevice) {
            logToScreen("Device identified as iOS. Native prompt unavailable.");
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        // Listen for the custom event dispatched by index.html when beforeinstallprompt fires
        const handleDeferredPromptReady = () => {
            logToScreen("Received 'deferred-prompt-ready' event.");
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        };

        window.addEventListener('deferred-prompt-ready', handleDeferredPromptReady);

        // Also check immediately in case it fired before we mounted
        if ((window as any).deferredPrompt) {
            logToScreen("Found existing deferredPrompt in window.");
            setDeferredPrompt((window as any).deferredPrompt);
            setIsInstallable(true);
        }

        return () => {
            window.removeEventListener('deferred-prompt-ready', handleDeferredPromptReady);
        };
    }, []);

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

    const handleInstallClick = async () => {
        if (deferredPrompt) {
            // Android / Desktop Chrome logic
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            logToScreen(`User installation choice: ${outcome}`);
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                (window as any).deferredPrompt = null;
                setIsInstallable(false);
            }
        } else {
            // iOS or Fallback logic
            setIsInstallModalOpen(true);
        }
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

    const InstallButton = () => (
        <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            title="Install App"
        >
            <DownloadIcon className="h-4 w-4" />
            <span className="hidden lg:inline">Install</span>
        </button>
    );

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-lg flex-col hidden md:flex">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-2">
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 truncate flex-grow">{workspaceName}</h1>
                <div className="flex items-center gap-1">
                    {isInstallable && <InstallButton />}
                    {isOnline && isOfflineReady && <OfflineReadyIndicator />}
                    {!isOnline && <OfflineIndicator />}
                </div>
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
        <main ref={mainContentRef} className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {/* Mobile Header */}
            <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20">
                <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400 truncate flex-grow">{workspaceName}</h1>
                <div className="flex items-center gap-1">
                    {isInstallable && <InstallButton />}
                    {isOnline && isOfflineReady && <OfflineReadyIndicator />}
                    {!isOnline && <OfflineIndicator />}
                </div>
            </div>
            {renderView()}
        </main>

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

        <Modal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} title="Install App">
            <div className="space-y-6 text-center">
                {isIOS ? (
                    <>
                        <p className="text-gray-600 dark:text-gray-300">To install on iOS:</p>
                        <ol className="list-decimal text-left pl-6 space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            <li>Tap the <strong>Share</strong> button (square with arrow) at the bottom or top of your browser.</li>
                            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                            <li>Confirm by tapping <strong>Add</strong>.</li>
                        </ol>
                    </>
                ) : (
                    <>
                        <p className="text-gray-600 dark:text-gray-300">To install this app:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                            Please check your browser menu (usually three dots) for an <strong>"Install App"</strong> or <strong>"Add to Home Screen"</strong> option.
                        </p>
                    </>
                )}
                <button onClick={() => setIsInstallModalOpen(false)} className="w-full py-2 bg-blue-600 text-white rounded-md">Close</button>
            </div>
        </Modal>
        </div>
    );
};
