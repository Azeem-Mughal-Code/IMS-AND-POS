import React from 'react';
import { useAppContext } from '../context/AppContext';
import { MinusIcon, PlusIcon } from '../Icons';

export const ZoomSelector: React.FC = () => {
    const { zoomLevel, setZoomLevel } = useAppContext();
    const ZOOM_STEP = 0.05; // 5% step
    const MIN_ZOOM = 0.5; // 50%
    const MAX_ZOOM = 1.5; // 150%

    const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newZoom = parseInt(e.target.value, 10) / 100;
        setZoomLevel(newZoom);
    };

    const increaseZoom = () => {
        // FIX: Replaced functional update with direct value update to match the type definition of `setZoomLevel`.
        setZoomLevel(Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP));
    };

    const decreaseZoom = () => {
        // FIX: Replaced functional update with direct value update to match the type definition of `setZoomLevel`.
        setZoomLevel(Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP));
    };

    const buttonClasses = "p-2 rounded-full bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

    return (
        <div className="flex items-center gap-4">
             <button 
                onClick={decreaseZoom} 
                disabled={zoomLevel <= MIN_ZOOM} 
                className={buttonClasses} 
                aria-label="Decrease zoom level"
            >
                <MinusIcon />
            </button>
            <input
                type="range"
                min={MIN_ZOOM * 100}
                max={MAX_ZOOM * 100}
                step="1"
                value={Math.round(zoomLevel * 100)}
                onChange={handleZoomChange}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                aria-label="Application zoom level"
            />
             <button 
                onClick={increaseZoom} 
                disabled={zoomLevel >= MAX_ZOOM} 
                className={buttonClasses} 
                aria-label="Increase zoom level"
            >
                <PlusIcon />
            </button>
            <div className="w-16 text-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 py-1 px-2 rounded-md">
                    {Math.round(zoomLevel * 100)}%
                </span>
            </div>
        </div>
    );
};
