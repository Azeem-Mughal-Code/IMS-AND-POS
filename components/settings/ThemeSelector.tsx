import React from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '../Icons';
import { useSettings } from '../context/SettingsContext';

export const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useSettings();
    const options = [
        { value: 'light', label: 'Light', icon: <SunIcon /> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon /> }
    ];

    return (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className={`flex flex-col items-center justify-center p-3 rounded-md text-sm font-medium transition-colors ${
                        theme === option.value
                            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {option.icon}
                    <span className="mt-1">{option.label}</span>
                </button>
            ))}
        </div>
    );
};