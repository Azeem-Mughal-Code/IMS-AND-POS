
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, ProductVariant, ProductVariationOption } from '../../types';
import { useSettings } from '../context/SettingsContext';
import { ChevronDownIcon } from '../Icons';
import { Modal } from './Modal';

export const OptionSelector: React.FC<{
    typeName: string;
    options: ProductVariationOption[];
    selectedValue: string | undefined;
    onSelect: (optionName: string) => void;
}> = ({ typeName, options, selectedValue, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                className="w-full flex justify-between items-center text-left pl-3 pr-2 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            >
                <span className={selectedValue ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}>
                    {selectedValue || `Select ${typeName}`}
                </span>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200 dark:border-gray-700">
                    <ul className="py-1">
                        {options.map(opt => (
                            <li
                                key={opt.id}
                                onClick={() => { onSelect(opt.name); setIsOpen(false); }}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${selectedValue === opt.name ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                {opt.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

interface VariantSelectionModalProps {
    product: Product;
    onConfirm: (product: Product, variant: ProductVariant) => void;
    onClose: () => void;
    confirmLabel?: string;
    priceType?: 'retail' | 'cost';
    showStock?: boolean;
}

export const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({ 
    product, 
    onConfirm, 
    onClose, 
    confirmLabel = 'Add', 
    priceType = 'retail',
    showStock = true
}) => {
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const { formatCurrency } = useSettings();

    const handleSelectOption = (typeName: string, optionName: string) => {
        setSelectedOptions(prev => ({ ...prev, [typeName]: optionName }));
    };

    const selectedVariant = useMemo(() => {
        const requiredTypeNames = product.variationTypes.map(vt => vt.name);
        if (requiredTypeNames.length !== Object.keys(selectedOptions).length || requiredTypeNames.some(name => !selectedOptions[name])) {
            return null;
        }
        
        return product.variants.find(variant => {
            return requiredTypeNames.every(typeName => variant.options[typeName] === selectedOptions[typeName]);
        });
    }, [selectedOptions, product]);

    const handleConfirmClick = () => {
        if (selectedVariant) {
            onConfirm(product, selectedVariant);
        }
    };
    
    const displayPrice = selectedVariant ? (priceType === 'retail' ? selectedVariant.retailPrice : selectedVariant.costPrice) : 0;
    const priceLabel = priceType === 'retail' ? '' : 'Cost Price: ';

    return (
        <Modal isOpen={true} onClose={onClose} title={`Select Options for ${product.name}`} size="sm">
            <div className="space-y-4">
                {product.variationTypes.map(vt => (
                    <div key={vt.id}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{vt.name}</label>
                        <OptionSelector
                            typeName={vt.name}
                            options={vt.options.filter(o => o.name)}
                            selectedValue={selectedOptions[vt.name]}
                            onSelect={(optionName) => handleSelectOption(vt.name, optionName)}
                        />
                    </div>
                ))}

                {selectedVariant && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mt-4 text-center">
                        <p className="font-semibold text-lg text-gray-800 dark:text-white">
                            {priceLabel}{formatCurrency(displayPrice)}
                        </p>
                        {showStock && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Stock: {selectedVariant.stock}</p>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end gap-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                    <button 
                        type="button" 
                        onClick={handleConfirmClick} 
                        disabled={!selectedVariant || (showStock && priceType === 'retail' && selectedVariant.stock <= 0)} 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {showStock && priceType === 'retail' && selectedVariant && selectedVariant.stock <= 0 ? 'Out of Stock' : confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};