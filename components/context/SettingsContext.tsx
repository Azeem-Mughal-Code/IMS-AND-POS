
import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { CashierPermissions, Currency, PaginationConfig, PaginationTarget } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { DEFAULT_CURRENCIES } from '../../constants';

interface SettingsContextType {
    workspaceId: string;
    workspaceName: string;
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    timezoneOffsetMinutes: number;
    setTimezoneOffsetMinutes: (offset: number) => void;
    formatDateTime: (dateInput: string | Date, options?: Intl.DateTimeFormatOptions) => string;
    paginationConfig: PaginationConfig;
    setPaginationLimit: (target: PaginationTarget, limit: number) => void;
    currency: string;
    setCurrency: (code: string) => void;
    currencies: Currency[];
    addCurrency: (currency: Currency) => { success: boolean, message?: string };
    updateCurrency: (code: string, data: Partial<Currency>) => { success: boolean, message?: string };
    deleteCurrency: (code: string) => { success: boolean, message?: string };
    currencyDisplay: 'symbol' | 'code';
    setCurrencyDisplay: (display: 'symbol' | 'code') => void;
    formatCurrency: (amount: number) => string;
    isIntegerCurrency: boolean;
    setIsIntegerCurrency: (enabled: boolean) => void;
    isTaxEnabled: boolean;
    setIsTaxEnabled: (enabled: boolean) => void;
    taxRate: number;
    setTaxRate: (rate: number) => void;
    isDiscountEnabled: boolean;
    setIsDiscountEnabled: (enabled: boolean) => void;
    discountRate: number;
    setDiscountRate: (rate: number) => void;
    discountThreshold: number;
    setDiscountThreshold: (threshold: number) => void;
    cashierPermissions: CashierPermissions;
    setCashierPermissions: (permissions: CashierPermissions) => void;
    restoreBackup: (data: any) => { success: boolean, message: string };
    storeAddress: string;
    setStoreAddress: (address: string) => void;
    storePhone: string;
    setStorePhone: (phone: string) => void;
    receiptFooter: string;
    setReceiptFooter: (footer: string) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};

const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
    inventory: 10,
    inventoryCategories: 10,
    posCatalog: 12,
    posSales: 10,
    salesReports: 10,
    productReports: 10,
    inventoryValuation: 10,
    users: 10,
    analysis: 10,
    purchaseOrders: 10,
    suppliers: 10,
    customers: 10,
    inventoryStockHistory: 10,
    inventoryPriceHistory: 10,
    shifts: 10,
};

export const SettingsProvider: React.FC<{ children: ReactNode; workspaceId: string, workspaceName: string }> = ({ children, workspaceId, workspaceName }) => {
    const ls_prefix = `ims-${workspaceId}`;

    const detectedOffset = useMemo(() => {
        // getTimezoneOffset returns the difference in minutes between UTC and local time.
        // The sign is inverted (e.g., UTC-7 returns 420), so we negate it.
        return -new Date().getTimezoneOffset();
    }, []);
    
    const [theme, setTheme] = usePersistedState<'light' | 'dark' | 'system'>(`${ls_prefix}-theme`, 'system');
    const [timezoneOffsetMinutes, setTimezoneOffsetMinutes] = usePersistedState<number>(`${ls_prefix}-timezoneOffset`, detectedOffset);
    const [paginationConfig, setPaginationConfig] = usePersistedState<PaginationConfig>(`${ls_prefix}-paginationConfig`, DEFAULT_PAGINATION_CONFIG);
    const [currencies, setCurrencies] = usePersistedState<Currency[]>(`${ls_prefix}-currencies`, DEFAULT_CURRENCIES);
    const [currency, setCurrency] = usePersistedState<string>(`${ls_prefix}-currency`, 'USD');
    const [currencyDisplay, setCurrencyDisplay] = usePersistedState<'symbol' | 'code'>(`${ls_prefix}-currencyDisplay`, 'symbol');
    const [isIntegerCurrency, setIsIntegerCurrency] = usePersistedState<boolean>(`${ls_prefix}-isIntegerCurrency`, false);
    const [isTaxEnabled, setIsTaxEnabled] = usePersistedState<boolean>(`${ls_prefix}-isTaxEnabled`, true);
    const [taxRate, setTaxRate] = usePersistedState<number>(`${ls_prefix}-taxRate`, 0.08); // 8%
    const [isDiscountEnabled, setIsDiscountEnabled] = usePersistedState<boolean>(`${ls_prefix}-isDiscountEnabled`, false);
    const [discountRate, setDiscountRate] = usePersistedState<number>(`${ls_prefix}-discountRate`, 0.1); // 10%
    const [discountThreshold, setDiscountThreshold] = usePersistedState<number>(`${ls_prefix}-discountThreshold`, 100);
    const [cashierPermissions, setCashierPermissions] = usePersistedState<CashierPermissions>(`${ls_prefix}-cashierPermissions`, {
        canProcessReturns: true,
        canViewReports: true,
        canViewAnalysis: false,
        canEditOwnProfile: true,
        canViewDashboard: false,
        canViewInventory: false,
        canEditBehaviorSettings: false,
        canManageCustomers: false,
    });
    
    const [storeAddress, setStoreAddress] = usePersistedState<string>(`${ls_prefix}-storeAddress`, '');
    const [storePhone, setStorePhone] = usePersistedState<string>(`${ls_prefix}-storePhone`, '');
    const [receiptFooter, setReceiptFooter] = usePersistedState<string>(`${ls_prefix}-receiptFooter`, 'Thank you for shopping with us!');

    const activeCurrency = useMemo(() => currencies.find(c => c.code === currency) || currencies[0] || { code: 'USD', symbol: '$', name: '' }, [currency, currencies]);

    const formatCurrency = useCallback((amount: number) => {
        try {
            const displaySymbol = currencyDisplay === 'symbol' ? activeCurrency.symbol : activeCurrency.code;
            const formatted = new Intl.NumberFormat(undefined, {
                minimumFractionDigits: isIntegerCurrency ? 0 : 2,
                maximumFractionDigits: isIntegerCurrency ? 0 : 2,
            }).format(amount);
            return `${displaySymbol}${formatted}`;
        } catch (e) {
            return `${activeCurrency.symbol}${amount.toFixed(isIntegerCurrency ? 0 : 2)}`;
        }
    }, [activeCurrency, currencyDisplay, isIntegerCurrency]);
    
    const formatDateTime = useCallback((dateInput: string | Date, options?: Intl.DateTimeFormatOptions) => {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        // 1. Get the date in UTC milliseconds
        const utcMillis = date.getTime() + (date.getTimezoneOffset() * 60000);
        // 2. Apply the desired offset to get the target time in milliseconds
        const targetMillis = utcMillis + (timezoneOffsetMinutes * 60000);
        // 3. Create a new Date object from the target time
        const targetDate = new Date(targetMillis);
        
        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
        };
        try {
            // 4. Format the date. Intl.DateTimeFormat will use the browser's locale for formatting conventions (like MM/DD/YYYY)
            // but will display the time of the `targetDate` object.
            return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(targetDate);
        } catch (e) {
            console.error("Error formatting date:", e);
            // Fallback for any unexpected errors
            return date.toLocaleString();
        }
    }, [timezoneOffsetMinutes]);

    const addCurrency = (c: Currency): { success: boolean, message?: string } => {
        if (currencies.some(curr => curr.code === c.code)) return { success: false, message: 'Currency code already exists.'};
        setCurrencies(prev => [...prev, c]);
        return { success: true };
    };
    
    const updateCurrency = (code: string, data: Partial<Currency>): { success: boolean, message?: string } => {
        setCurrencies(prev => prev.map(c => c.code === code ? {...c, ...data} : c));
        return { success: true };
    };

    const deleteCurrency = (code: string): { success: boolean, message?: string } => {
        if (code === currency) return { success: false, message: 'Cannot delete the active currency.'};
        if (currencies.length <= 1) return { success: false, message: 'Cannot delete the last currency.' };
        setCurrencies(prev => prev.filter(c => c.code !== code));
        return { success: true };
    };

    const setPaginationLimit = (target: PaginationTarget, limit: number) => {
        // Allow 0 to represent "empty" or "default" in UI
        setPaginationConfig(prev => ({ ...prev, [target]: Math.max(0, Math.floor(limit)) }));
    };

    const restoreBackup = (data: any): { success: boolean, message: string } => {
        try {
            if (data.theme) setTheme(data.theme);
            if (data.timezoneOffsetMinutes !== undefined) setTimezoneOffsetMinutes(data.timezoneOffsetMinutes);
            if (data.itemsPerPage) {
                // Migration from old single value to new config object if needed
                // Or if restoring a new backup, use the config
                if (typeof data.itemsPerPage === 'object') {
                    setPaginationConfig(data.itemsPerPage);
                } else if (typeof data.itemsPerPage === 'number') {
                    // Legacy support: apply to all
                    const legacyVal = data.itemsPerPage;
                    const newConfig: PaginationConfig = {} as any;
                    (Object.keys(DEFAULT_PAGINATION_CONFIG) as PaginationTarget[]).forEach(k => newConfig[k] = legacyVal);
                    setPaginationConfig(newConfig);
                }
            } else if (data.paginationConfig) {
                setPaginationConfig(data.paginationConfig);
            }

            if (data.currencies) setCurrencies(data.currencies);
            if (data.currency) setCurrency(data.currency);
            if (data.currencyDisplay) setCurrencyDisplay(data.currencyDisplay);
            if (data.isIntegerCurrency !== undefined) setIsIntegerCurrency(data.isIntegerCurrency);
            if (data.isTaxEnabled !== undefined) setIsTaxEnabled(data.isTaxEnabled);
            if (data.taxRate) setTaxRate(data.taxRate);
            if (data.isDiscountEnabled !== undefined) setIsDiscountEnabled(data.isDiscountEnabled);
            if (data.discountRate) setDiscountRate(data.discountRate);
            if (data.discountThreshold) setDiscountThreshold(data.discountThreshold);
            if (data.cashierPermissions) setCashierPermissions(data.cashierPermissions);
            if (data.storeAddress) setStoreAddress(data.storeAddress);
            if (data.storePhone) setStorePhone(data.storePhone);
            if (data.receiptFooter) setReceiptFooter(data.receiptFooter);
            return { success: true, message: 'Settings restored. The application will now reload.' };
        } catch (e) {
            return { success: false, message: 'Failed to restore settings from backup.' };
        }
    };


    const value = {
        workspaceId,
        workspaceName,
        theme, setTheme,
        timezoneOffsetMinutes, setTimezoneOffsetMinutes,
        formatDateTime,
        paginationConfig, setPaginationLimit,
        currency, setCurrency,
        currencies, addCurrency, updateCurrency, deleteCurrency,
        currencyDisplay, setCurrencyDisplay,
        formatCurrency,
        isIntegerCurrency, setIsIntegerCurrency,
        isTaxEnabled, setIsTaxEnabled, taxRate, setTaxRate,
        isDiscountEnabled, setIsDiscountEnabled, discountRate, setDiscountRate, discountThreshold, setDiscountThreshold,
        cashierPermissions, setCashierPermissions,
        restoreBackup,
        storeAddress, setStoreAddress,
        storePhone, setStorePhone,
        receiptFooter, setReceiptFooter,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
