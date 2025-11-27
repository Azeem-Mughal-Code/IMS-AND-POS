
import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Customer } from '../../types';
import { INITIAL_CUSTOMERS } from '../../constants';
import { generateUUIDv7, generateUniqueNanoID } from '../../utils/idGenerator';
import { db } from '../../utils/db';

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
    
    const customers = useLiveQuery(() => db.customers.toArray()) || [];

    // Seed data if empty
    useEffect(() => {
        const seed = async () => {
            const count = await db.customers.count();
            if (count === 0) {
                await db.customers.bulkAdd(INITIAL_CUSTOMERS.map(c => ({...c, sync_status: 'pending'})));
            }
        }
        seed();
    }, []);

    const addCustomer = useCallback((customerData: Omit<Customer, 'id' | 'dateAdded'>) => {
        if (customers.some(c => c.name.toLowerCase() === customerData.name.toLowerCase() && c.phone === customerData.phone)) {
            return { success: false, message: 'A customer with this name and phone number already exists.' };
        }
        
        const internalId = generateUUIDv7();
        const publicId = generateUniqueNanoID<Customer>(customers, (c, id) => c.publicId === id, 6, 'CUS-'); 

        const newCustomer: Customer = {
            ...customerData,
            id: internalId,
            publicId: publicId,
            dateAdded: new Date().toISOString(),
            sync_status: 'pending'
        };
        db.customers.add(newCustomer);
        return { success: true, customer: newCustomer };
    }, [customers]);

    const updateCustomer = useCallback((id: string, customerData: Partial<Omit<Customer, 'id' | 'dateAdded'>>) => {
        db.customers.update(id, { ...customerData, sync_status: 'pending', updated_at: new Date().toISOString() });
        return { success: true };
    }, []);

    const deleteCustomer = useCallback((id: string) => {
        (db as any).transaction('rw', db.customers, db.deletedRecords, async () => {
            await db.customers.delete(id);
            await db.deletedRecords.add({
                id: id,
                table: 'customers',
                deletedAt: new Date().toISOString(),
                sync_status: 'pending'
            });
        });
        return { success: true };
    }, []);

    const getCustomerById = useCallback((id: string) => {
        return customers.find(c => c.id === id);
    }, [customers]);

    const factoryReset = useCallback(async () => {
        await (db as any).transaction('rw', db.customers, db.deletedRecords, async () => {
            await db.customers.clear();
            await db.deletedRecords.clear();
            await db.customers.bulkAdd(INITIAL_CUSTOMERS.map(c => ({...c, sync_status: 'pending'})));
        });
    }, []);

    const value = {
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        factoryReset
    };

    return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
};
