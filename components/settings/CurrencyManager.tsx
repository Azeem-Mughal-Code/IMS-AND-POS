import React, { useState, useEffect } from 'react';
import { Currency } from '../../types';
import { useAppContext } from '../context/AppContext';
import { PlusIcon, PencilIcon, TrashIcon } from '../Icons';
import { Modal } from '../common/Modal';

const CurrencyForm: React.FC<{
    currency?: Currency | null;
    onSubmit: (data: Currency) => void;
    onCancel: () => void;
    errorMessage: string;
}> = ({ currency, onSubmit, onCancel, errorMessage }) => {
    const [formData, setFormData] = useState({
        name: currency?.name || '',
        code: currency?.code || '',
        symbol: currency?.symbol || '',
    });
    const isEditMode = !!currency;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'code' ? value.toUpperCase() : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., United States Dollar" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Code (3-4 letters)</label>
                <input type="text" name="code" value={formData.code} onChange={handleChange} required placeholder="e.g., USD" pattern="[A-Z]{3,4}" title="3 or 4 uppercase letters" disabled={isEditMode} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-600" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Symbol</label>
                <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} required placeholder="e.g., $" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700" />
            </div>
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">{isEditMode ? 'Save Changes' : 'Add Currency'}</button>
            </div>
        </form>
    );
};

export const CurrencyManager: React.FC = () => {
    const { currencies, currency, setCurrency, addCurrency, updateCurrency, deleteCurrency } = useAppContext();
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
    const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success', text: string } | null>(null);

     useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);
    
    const handleAddClick = () => {
        setEditingCurrency(null);
        setFeedback(null);
        setIsFormModalOpen(true);
    };

    const handleEditClick = (c: Currency) => {
        setEditingCurrency(c);
        setFeedback(null);
        setIsFormModalOpen(true);
    };
    
    const handleDeleteClick = (c: Currency) => {
        setDeletingCurrency(c);
        setFeedback(null);
        setIsDeleteModalOpen(true);
    };

    const handleFormSubmit = (data: Currency) => {
        const result = editingCurrency
            ? updateCurrency(editingCurrency.code, data)
            : addCurrency(data);

        if (result.success) {
            setIsFormModalOpen(false);
        } else {
            setFeedback({ type: 'error', text: result.message || 'An error occurred.' });
        }
    };
    
    const confirmDelete = () => {
        if (!deletingCurrency) return;
        const result = deleteCurrency(deletingCurrency.code);
        if (result.success) {
            setIsDeleteModalOpen(false);
            setDeletingCurrency(null);
        } else {
            setFeedback({ type: 'error', text: result.message || 'An error occurred.' });
        }
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-4 flex justify-between items-center">
                <h4 className="font-medium text-gray-800 dark:text-gray-200">Available Currencies</h4>
                <button onClick={handleAddClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-sm font-medium rounded-md hover:bg-blue-100 dark:hover:bg-blue-900">
                    <PlusIcon /> Add New
                </button>
            </div>
            {feedback && feedback.type === 'error' && isDeleteModalOpen && <p className="px-4 pb-2 text-sm text-red-500">{feedback.text}</p>}

            <div className="max-h-60 overflow-y-auto border-t border-gray-200 dark:border-gray-700">
                {currencies.map(c => (
                     <div key={c.code} onClick={() => setCurrency(c.code)} role="button" className={`p-4 border-b dark:border-gray-700 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/50 ${c.code === currency ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`}>
                         <div className="flex-grow">
                            <p className="font-semibold text-gray-900 dark:text-white">{c.name} ({c.symbol})</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{c.code}</p>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleEditClick(c)} className="p-1.5 text-blue-500 hover:text-blue-700"><PencilIcon /></button>
                            <button 
                                onClick={() => handleDeleteClick(c)} 
                                disabled={c.code === currency}
                                className="p-1.5 text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                                title={c.code === currency ? 'Cannot delete active currency' : 'Delete currency'}
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <Modal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingCurrency ? 'Edit Currency' : 'Add New Currency'} size="sm">
                <CurrencyForm currency={editingCurrency} onSubmit={handleFormSubmit} onCancel={() => setIsFormModalOpen(false)} errorMessage={feedback?.text || ''}/>
            </Modal>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete" size="sm">
                {deletingCurrency && (
                    <div>
                        <p>Are you sure you want to delete {deletingCurrency.name} ({deletingCurrency.code})?</p>
                        <div className="flex justify-end gap-2 pt-4 mt-4">
                             <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">Cancel</button>
                             <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md">Delete</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};