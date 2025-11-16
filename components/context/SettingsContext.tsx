import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { CashierPermissions, Currency } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { DEFAULT_CURRENCIES, TIMEZONE_OPTIONS } from '../../constants';

interface SettingsContextType {
    businessName: string;
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    timezone: string;
    setTimezone: (timezone: string) => void;
    formatDateTime: (dateInput: string | Date, options?: Intl.DateTimeFormatOptions) => string;
    itemsPerPage: number;
    setItemsPerPage: (num: number) => void;
    currency: string;
    setCurrency: (code: string) => void;
    currencies: Currency[];
    addCurrency: (currency: Currency) => { success: boolean, message?: string };
    updateCurrency: (code: string, data: Partial<Currency>) => { success: boolean, message?: string };
    deleteCurrency: (code: string) => { success: boolean, message?: string };
    currencyDisplay: 'symbol' | 'code';
    setCurrencyDisplay: (display: 'symbol' | 'code') => void;
    formatCurrency: (amount: number) => string;
    isSplitPaymentEnabled: boolean;
    setIsSplitPaymentEnabled: (enabled: boolean) => void;
    isChangeDueEnabled: boolean;
    setIsChangeDueEnabled: (enabled: boolean) => void;
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
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within a SettingsProvider');
    return context;
};

export const SettingsProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const ls_prefix = `ims-${businessName}`;

    const detectedTimezone = useMemo(() => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (TIMEZONE_OPTIONS.some(opt => opt.value === tz)) {
                return tz;
            }
            // Cannot reliably map a regional timezone to a fixed offset one, so default to UTC.
            return 'Etc/GMT+0';
        } catch (e) {
            return 'Etc/GMT+0';
        }
    }, []);
    
    const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>(`${ls_prefix}-theme`, 'system');
    const [timezone, setTimezone] = useLocalStorage<string>(`${ls_prefix}-timezone`, detectedTimezone);
    const [itemsPerPage, setItemsPerPage] = useLocalStorage<number>(`${ls_prefix}-itemsPerPage`, 10);
    const [currencies, setCurrencies] = useLocalStorage<Currency[]>(`${ls_prefix}-currencies`, DEFAULT_CURRENCIES);
    const [currency, setCurrency] = useLocalStorage<string>(`${ls_prefix}-currency`, 'USD');
    const [currencyDisplay, setCurrencyDisplay] = useLocalStorage<'symbol' | 'code'>(`${ls_prefix}-currencyDisplay`, 'symbol');
    const [isSplitPaymentEnabled, setIsSplitPaymentEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isSplitPaymentEnabled`, false);
    const [isChangeDueEnabled, setIsChangeDueEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isChangeDueEnabled`, true);
    const [isIntegerCurrency, setIsIntegerCurrency] = useLocalStorage<boolean>(`${ls_prefix}-isIntegerCurrency`, false);
    const [isTaxEnabled, setIsTaxEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isTaxEnabled`, true);
    const [taxRate, setTaxRate] = useLocalStorage<number>(`${ls_prefix}-taxRate`, 0.08); // 8%
    const [isDiscountEnabled, setIsDiscountEnabled] = useLocalStorage<boolean>(`${ls_prefix}-isDiscountEnabled`, false);
    const [discountRate, setDiscountRate] = useLocalStorage<number>(`${ls_prefix}-discountRate`, 0.1); // 10%
    const [discountThreshold, setDiscountThreshold] = useLocalStorage<number>(`${ls_prefix}-discountThreshold`, 100);
    const [cashierPermissions, setCashierPermissions] = useLocalStorage<CashierPermissions>(`${ls_prefix}-cashierPermissions`, {
        canProcessReturns: true,
        canViewReports: true,
        canViewAnalysis: false,
        canEditOwnProfile: true,
        canViewDashboard: false,
        canViewInventory: false,
        canEditBehaviorSettings: false,
    });
    
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
        const defaultOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: '2-digit',
            timeZone: timezone,
        };
        try {
            return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(date);
        } catch (e) {
            console.error("Error formatting date:", e);
            // Fallback for invalid timezone
            return date.toLocaleString();
        }
    }, [timezone]);

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

    const restoreBackup = (data: any): { success: boolean, message: string } => {
        try {
            if (data.businessName !== businessName) { return { success: false, message: `Backup is for a different business ('${data.businessName}').`}}
            if (data.theme) setTheme(data.theme);
            if (data.timezone) setTimezone(data.timezone);
            if (data.itemsPerPage) setItemsPerPage(data.itemsPerPage);
            if (data.currencies) setCurrencies(data.currencies);
            if (data.currency) setCurrency(data.currency);
            if (data.currencyDisplay) setCurrencyDisplay(data.currencyDisplay);
            if (data.isSplitPaymentEnabled) setIsSplitPaymentEnabled(data.isSplitPaymentEnabled);
            if (data.isChangeDueEnabled) setIsChangeDueEnabled(data.isChangeDueEnabled);
            if (data.isIntegerCurrency) setIsIntegerCurrency(data.isIntegerCurrency);
            if (data.isTaxEnabled) setIsTaxEnabled(data.isTaxEnabled);
            if (data.taxRate) setTaxRate(data.taxRate);
            if (data.isDiscountEnabled) setIsDiscountEnabled(data.isDiscountEnabled);
            if (data.discountRate) setDiscountRate(data.discountRate);
            if (data.discountThreshold) setDiscountThreshold(data.discountThreshold);
            if (data.cashierPermissions) setCashierPermissions(data.cashierPermissions);
            return { success: true, message: 'Settings restored. The application will now reload.' };
        } catch (e) {
            return { success: false, message: 'Failed to restore settings from backup.' };
        }
    };


    const value = {
        businessName,
        theme, setTheme,
        timezone, setTimezone,
        formatDateTime,
        itemsPerPage, setItemsPerPage,
        currency, setCurrency,
        currencies, addCurrency, updateCurrency, deleteCurrency,
        currencyDisplay, setCurrencyDisplay,
        formatCurrency,
        isSplitPaymentEnabled, setIsSplitPaymentEnabled,
        isChangeDueEnabled, setIsChangeDueEnabled,
        isIntegerCurrency, setIsIntegerCurrency,
        isTaxEnabled, setIsTaxEnabled, taxRate, setTaxRate,
        isDiscountEnabled, setIsDiscountEnabled, discountRate, setDiscountRate, discountThreshold, setDiscountThreshold,
        cashierPermissions, setCashierPermissions,
        restoreBackup,
    };

    return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};