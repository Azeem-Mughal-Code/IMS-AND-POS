import React, { useState, useEffect, useMemo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { MinusIcon, PlusIcon } from '../Icons';

export const TimezoneSelector: React.FC = () => {
    const { timezoneOffsetMinutes, setTimezoneOffsetMinutes } = useSettings();
    const [currentTime, setCurrentTime] = useState('');

    const [hour, setHour] = useState('0');
    const [minute, setMinute] = useState('00');
    const [sign, setSign] = useState('+');

    useEffect(() => {
        const total = timezoneOffsetMinutes;
        setSign(total >= 0 ? '+' : '-');
        const absTotal = Math.abs(total);
        setHour(String(Math.floor(absTotal / 60)));
        setMinute(String(absTotal % 60).padStart(2, '0'));
    }, [timezoneOffsetMinutes]);
    
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            // Get UTC time by adding the local timezone offset
            const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
            // Get target time by adding the selected offset
            const targetTime = new Date(utcTime + timezoneOffsetMinutes * 60000);
            setCurrentTime(targetTime.toLocaleTimeString());
        }, 1000);

        return () => clearInterval(timer);
    }, [timezoneOffsetMinutes]);

    const handleUpdate = (newTotalMinutes: number) => {
        const clamped = Math.max(-12 * 60, Math.min(12 * 60, newTotalMinutes));
        setTimezoneOffsetMinutes(clamped);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newHour = parseInt(e.target.value) || 0;
        const currentMinute = parseInt(minute) || 0;
        const total = (newHour * 60 + currentMinute) * (sign === '+' ? 1 : -1);
        handleUpdate(total);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newMinute = parseInt(e.target.value) || 0;
        const currentHour = parseInt(hour) || 0;
        const total = (currentHour * 60 + newMinute) * (sign === '+' ? 1 : -1);
        handleUpdate(total);
    };

    const handleSignChange = () => {
        const newSign = sign === '+' ? '-' : '+';
        const total = (parseInt(hour) * 60 + parseInt(minute)) * (newSign === '+' ? 1 : -1);
        handleUpdate(total);
    };

    const handleIncrement = () => handleUpdate(timezoneOffsetMinutes + 15);
    const handleDecrement = () => handleUpdate(timezoneOffsetMinutes - 15);
    
    const buttonClasses = "p-2 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

    const currentOffsetLabel = useMemo(() => {
        const total = timezoneOffsetMinutes;
        const sign = total >= 0 ? '+' : '-';
        const absTotal = Math.abs(total);
        const hours = String(Math.floor(absTotal / 60)).padStart(2, '0');
        const minutes = String(absTotal % 60).padStart(2, '0');
        return `UTC ${sign}${hours}:${minutes}`;
    }, [timezoneOffsetMinutes]);

    return (
        <div className="space-y-4">
             <div className="flex items-center gap-4">
                <button onClick={handleDecrement} className={buttonClasses} aria-label="Decrease timezone offset by 15 minutes">
                    <MinusIcon />
                </button>
                <div className="flex-grow flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                    <span className="font-semibold text-gray-500 dark:text-gray-400 text-sm">UTC</span>
                    <button onClick={handleSignChange} className="px-2 font-mono text-xl">{sign}</button>
                    <input
                        type="number"
                        min="0"
                        max="12"
                        value={hour}
                        onChange={handleHourChange}
                        className="w-12 text-center bg-transparent font-mono text-xl focus:outline-none"
                    />
                    <span className="font-mono text-xl">:</span>
                    <input
                        type="number"
                        min="0"
                        max="45"
                        step="15"
                        value={minute}
                        onChange={handleMinuteChange}
                        className="w-12 text-center bg-transparent font-mono text-xl focus:outline-none"
                    />
                </div>
                <button onClick={handleIncrement} className={buttonClasses} aria-label="Increase timezone offset by 15 minutes">
                    <PlusIcon />
                </button>
            </div>
            <div className="text-center bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Time ({currentOffsetLabel})</p>
                <p className="font-mono text-2xl font-semibold text-gray-800 dark:text-white">{currentTime}</p>
            </div>
        </div>
    );
};
