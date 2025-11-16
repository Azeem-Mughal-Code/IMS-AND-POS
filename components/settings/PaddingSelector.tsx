import React from 'react';
import { useAppContext } from '../context/AppContext';
import { PaddingLevel } from '../../types';

const paddingOptions: { value: PaddingLevel; label: string }[] = [
    { value: 'xs', label: 'XS' },
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
];

const PaddingControl: React.FC<{
    label: string;
    value: PaddingLevel;
    onChange: (value: PaddingLevel) => void;
}> = ({ label, value, onChange }) => (
    <div>
        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</h4>
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {paddingOptions.map(option => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`flex-1 p-2.5 rounded-md text-sm font-medium transition-colors ${
                        value === option.value
                            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    </div>
);

export const PaddingSelector: React.FC = () => {
    const { verticalPadding, setVerticalPadding, horizontalPadding, setHorizontalPadding } = useAppContext();

    return (
        <div className="space-y-4">
            <PaddingControl
                label="Vertical Padding"
                value={verticalPadding}
                onChange={setVerticalPadding}
            />
            <PaddingControl
                label="Horizontal Padding"
                value={horizontalPadding}
                onChange={setHorizontalPadding}
            />
        </div>
    );
};
