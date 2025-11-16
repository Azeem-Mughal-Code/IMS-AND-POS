import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { TIMEZONE_OPTIONS } from '../../constants';
import { MinusIcon, PlusIcon } from '../Icons';

export const TimezoneSelector: React.FC = () => {
    const { timezone, setTimezone } = useSettings();

    const currentIndex = TIMEZONE_OPTIONS.findIndex(opt => opt.value === timezone);
    const currentLabel = TIMEZONE_OPTIONS[currentIndex]?.label || 'Select Timezone';

    const handlePrevious = () => {
        const newIndex = (currentIndex - 1 + TIMEZONE_OPTIONS.length) % TIMEZONE_OPTIONS.length;
        setTimezone(TIMEZONE_OPTIONS[newIndex].value);
    };

    const handleNext = () => {
        const newIndex = (currentIndex + 1) % TIMEZONE_OPTIONS.length;
        setTimezone(TIMEZONE_OPTIONS[newIndex].value);
    };
    
    const buttonClasses = "p-2 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

    return (
        <div className="flex items-center gap-4">
            <button 
                onClick={handlePrevious} 
                className={buttonClasses} 
                aria-label="Decrease timezone offset"
            >
                <MinusIcon />
            </button>
            <div className="flex-grow text-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 py-2 px-4 rounded-md">
                    {currentLabel}
                </span>
            </div>
            <button 
                onClick={handleNext} 
                className={buttonClasses} 
                aria-label="Increase timezone offset"
            >
                <PlusIcon />
            </button>
        </div>
    );
};
