
import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { Customer } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { INITIAL_CUSTOMERS } from '../../constants';
import { generateUUIDv7, generateUniqueNanoID } from '../../utils/idGenerator';

interface CustomerContextType {
    customers: Customer[];
    addCustomer: (customerData: Omit<Customer, 'id' | 'dateAdded'>) => { success: boolean; message?: string; customer?: Customer };
    updateCustomer: (id: string, customerData: Partial<Omit<Customer, 'id' | 'dateAdded'>>) => { success: boolean; message?: string };
    deleteCustomer: (id: string) => { success: boolean; message?: string };
    getCustomerById: (id: string) => Customer | undefined;
    factoryReset: () => void;
}

const CustomerContext = createContext<CustomerContextType | null>(null);

export const useCustomers = () => {
    const context = useContext(CustomerContext);
    if (!context) throw new Error('useCustomers must be used within a CustomerProvider');
    return context;
};

export const CustomerProvider: React.FC<{ children: ReactNode; workspaceId: string }> = ({ children, workspaceId }) => {
    const ls_prefix = `ims-${workspaceId}`;
    const [customers, setCustomers] = usePersistedState<Customer[]>(`${ls_prefix}-customers`, INITIAL_CUSTOMERS);

    const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'dateAdded'>) => {
        if (customers.some(c => c.name.toLowerCase() === customerData.name.toLowerCase() && c.phone === customerData.phone)) {
            return { success: false, message: 'A customer with this name and phone number already exists.' };
        }
        
        const internalId = generateUUIDv7();
        // Public ID with CUS- prefix, 6 chars length
        const publicId = generateUniqueNanoID(customers, (c, id) => c.publicId === id, 6, 'CUS-'); 

        const newCustomer: Customer = {
            ...customerData,
            id: internalId,
            publicId: publicId,
            dateAdded: new Date().toISOString(),
        };
        setCustomers(prev => [...prev, newCustomer]);
        return { success: true, customer: newCustomer };
    }, [customers, setCustomers]);

    const updateCustomer = useCallback((id: string, customerData: Partial<Omit<Customer, 'id' | 'dateAdded'>>) => {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...customerData } : c));
        return { success: true };
    }, [setCustomers]);

    const deleteCustomer = useCallback((id: string) => {
        setCustomers(prev => prev.filter(c => c.id !== id));
        return { success: true };
    }, [setCustomers]);

    const getCustomerById = useCallback((id: string) => {
        return customers.find(c => c.id === id);
    }, [customers]);

    const factoryReset = useCallback(() => {
        setCustomers(INITIAL_CUSTOMERS);
    }, [setCustomers]);

    const value = useMemo(() => ({
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        factoryReset
    }), [customers, addCustomer, updateCustomer, deleteCustomer, getCustomerById, factoryReset]);

    return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};
