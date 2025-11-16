import React from 'react';
import { useSettings } from '../context/SettingsContext';

export const CurrencyDisplaySelector: React.FC = () => {
    const { currencyDisplay, setCurrencyDisplay, currency, currencies } = useSettings();
    
    const activeCurrency = currencies.find(c => c.code === currency) || { code: 'N/A', symbol: '?' };
    
    const options = [
        { value: 'symbol', label: `Symbol (${activeCurrency.symbol})` },
        { value: 'code', label: `Code (${activeCurrency.code})` },
    ];

    return (
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => setCurrencyDisplay(option.value as 'symbol' | 'code')}
                    className={`flex-1 p-2.5 rounded-md text-sm font-medium transition-colors ${
                        currencyDisplay === option.value
                            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
};