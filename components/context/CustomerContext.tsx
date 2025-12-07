
import React, { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useLiveQuery } from "dexie-react-hooks";
import { Customer } from '../../types';
import { INITIAL_CUSTOMERS } from '../../constants';
import { generateUUIDv7, generateUniqueNanoID } from '../../utils/idGenerator';
import { db } from '../../utils/db';

interface CustomerContextType {
    customers: Customer[];
    addCustomer: (customerData: Omit<Customer, 'id' | 'dateAdded' | 'workspaceId'>) => Promise<{ success: boolean; message?: string; customer?: Customer }>;
    updateCustomer: (id: string, customerData: Partial<Omit<Customer, 'id' | 'dateAdded' | 'workspaceId'>>) => Promise<{ success: boolean; message?: string }>;
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
    
    // Filter customers by workspaceId
    const customers = useLiveQuery(() => db.customers.where('workspaceId').equals(workspaceId).toArray(), [workspaceId]) || [];

    // Seed data if empty
    useEffect(() => {
        const seed = async () => {
            if (!workspaceId) return;
            const count = await db.customers.where('workspaceId').equals(workspaceId).count();
            if (count === 0 && workspaceId === 'guest_workspace') {
                await db.customers.bulkAdd(INITIAL_CUSTOMERS.map(c => ({...c, sync_status: 'pending', workspaceId})));
            }
        }
        seed();
    }, [workspaceId]);

    const addCustomer = useCallback(async (customerData: Omit<Customer, 'id' | 'dateAdded' | 'workspaceId'>) => {
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
            sync_status: 'pending',
            workspaceId
        };
        
        try {
            await db.customers.add(newCustomer);
            return { success: true, customer: newCustomer };
        } catch (error) {
            console.error("Add Customer Failed:", error);
            return { success: false, message: "Failed to add customer." };
        }
    }, [customers, workspaceId]);

    const updateCustomer = useCallback(async (id: string, customerData: Partial<Omit<Customer, 'id' | 'dateAdded' | 'workspaceId'>>) => {
        if (!id) return { success: false, message: "Invalid ID" };
        
        try {
            const existing = await db.customers.get(id);
            if (!existing) return { success: false, message: "Customer not found" };

            const updatedCustomer: Customer = {
                ...existing,
                ...customerData,
                sync_status: 'pending',
                updated_at: new Date().toISOString()
            };
            
            // Use put instead of update to ensure encryption middleware (which hooks into put/add) works correctly
            await db.customers.put(updatedCustomer);
            return { success: true };
        } catch (error) {
            console.error("Update Customer Failed:", error);
            return { success: false, message: "Failed to update customer in database." };
        }
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
            await db.customers.where('workspaceId').equals(workspaceId).delete();
            if (workspaceId === 'guest_workspace') {
                await db.customers.bulkAdd(INITIAL_CUSTOMERS.map(c => ({...c, sync_status: 'pending', workspaceId})));
            }
        });
    }, [workspaceId]);

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
