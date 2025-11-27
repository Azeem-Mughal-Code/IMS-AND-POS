
import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Workspace } from '../../types';
import { db, getFromDB, setInDB } from '../../utils/db';
import { generateSalt, deriveKeyFromPassword, generateDataKey, wrapKey, unwrapKey, exportKey, importKey } from '../../utils/crypto';
import { generateUniqueNanoID, generateUUIDv7 } from '../../utils/idGenerator';
import { INITIAL_PRODUCTS, INITIAL_CUSTOMERS, INITIAL_SUPPLIERS, DEFAULT_CATEGORIES } from '../../constants';

interface AuthContextType {
    users: User[]; // Users of the CURRENT workspace
    currentUser: User | null;
    currentWorkspace: Workspace | null;
    
    login: (storeCode: string, username: string, pass: string) => Promise<{ success: boolean, message?: string }>;
    loginByEmail: (email: string, pass: string) => Promise<{ success: boolean, message?: string }>;
    registerBusiness: (businessName: string, username: string, email: string, pass: string) => Promise<{ success: boolean, message?: string, recoveryKey?: string, storeCode?: string }>;
    logout: () => void;
    
    addUser: (username: string, pass: string, role: UserRole, email?: string) => Promise<{ success: boolean, message?: string }>;
    updateUser: (userId: string, newUsername: string, newPassword?: string, newEmail?: string) => Promise<{ success: boolean, message?: string, recoveryKey?: string }>;
    deleteUser: (userId: string) => { success: boolean; message?: string };
    recoverAccount: (username: string, recoveryKey: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
    getDecryptedKey: (password: string) => Promise<string | null>;
    
    // Special Guest Mode
    enterGuestMode: () => Promise<void>;
    updateStoreCode: (newCode: string) => Promise<{ success: boolean, message?: string }>; // Deprecated, use updateBusinessDetails
    updateBusinessDetails: (name: string, code: string) => Promise<{ success: boolean, message?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]); // Local state of users for the current workspace

    // Load session on mount
    useEffect(() => {
        const restoreSession = async () => {
            try {
                const session = await getFromDB<{ workspaceId: string, userId: string }>('ims-session');
                if (session && session.workspaceId && session.userId) {
                    const ws = await db.workspaces.get(session.workspaceId);
                    if (!ws) return;

                    // Load users for this workspace
                    const wsUsers = await getFromDB<User[]>(`ims-${ws.id}-users`) || [];
                    const user = wsUsers.find(u => u.id === session.userId);

                    if (user) {
                        // IMPORTANT: For this local-first architecture without password memory, 
                        // we cannot auto-unlock the DB encryption key on refresh. 
                        // The user must re-login to provide the password for key derivation.
                        // Therefore, we invalidate the session if we can't ensure the key is present.
                        await db.keyval.delete('ims-session');
                    }
                }
            } catch (e) {
                console.error("Session restore failed", e);
            }
        };
        restoreSession();
    }, []);

    const login = useCallback(async (storeCode: string, username: string, pass: string): Promise<{ success: boolean, message?: string }> => {
        try {
            const normalizedCode = storeCode.trim().toUpperCase();
            // 1. Find Workspace
            const workspace = await db.workspaces.where('alias').equals(normalizedCode).first();
            
            // Support Guest Mode Login explicitly or by alias
            if (normalizedCode === 'GUEST' || (!workspace && storeCode === 'guest_workspace')) {
                 // Guest logic handled via enterGuestMode usually, but if they type it manually:
                 return { success: false, message: 'Please use the "Demo Mode" button.' };
            }

            if (!workspace) {
                return { success: false, message: 'Store Code not found.' };
            }

            // 2. Get Users for Workspace
            const wsUsers = await getFromDB<User[]>(`ims-${workspace.id}-users`) || [];
            const user = wsUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

            if (!user) {
                return { success: false, message: 'Invalid username or password.' };
            }

            // 3. Validate Password (Simple string check for demo, normally bcrypt)
            if (user.password !== pass) {
                return { success: false, message: 'Invalid username or password.' };
            }

            // 4. Unlock DB (Decrypt DEK)
            try {
                if (user.encryptedDEK && user.salt) {
                    const kek = await deriveKeyFromPassword(pass, user.salt);
                    const dek = await unwrapKey(user.encryptedDEK, kek);
                    db.setEncryptionKey(dek);
                } else {
                    db.setEncryptionKey(null);
                }
            } catch (e) {
                console.error("Crypto error", e);
                return { success: false, message: 'Security error: Could not decrypt data key.' };
            }

            // 5. Set Session
            setUsers(wsUsers);
            setCurrentWorkspace(workspace);
            setCurrentUser(user);
            
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Login failed due to an error.' };
        }
    }, []);

    const loginByEmail = useCallback(async (email: string, pass: string): Promise<{ success: boolean, message?: string }> => {
        try {
            // 1. Find User by Email
            const allWorkspaces = await db.workspaces.toArray();
            let foundUser: User | null = null;
            let foundWorkspace: Workspace | null = null;
            let foundUsersArray: User[] = [];

            for (const ws of allWorkspaces) {
                const wsUsers = await getFromDB<User[]>(`ims-${ws.id}-users`) || [];
                const user = wsUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
                if (user) {
                    foundUser = user;
                    foundWorkspace = ws;
                    foundUsersArray = wsUsers;
                    break;
                }
            }

            if (!foundUser || !foundWorkspace) {
                return { success: false, message: 'No account found with this email.' };
            }

            // 2. Validate Password
            if (foundUser.password !== pass) {
                return { success: false, message: 'Invalid password.' };
            }

            // 3. Unlock DB
            try {
                if (foundUser.encryptedDEK && foundUser.salt) {
                    const kek = await deriveKeyFromPassword(pass, foundUser.salt);
                    const dek = await unwrapKey(foundUser.encryptedDEK, kek);
                    db.setEncryptionKey(dek);
                } else {
                    db.setEncryptionKey(null);
                }
            } catch (e) {
                console.error("Crypto error", e);
                return { success: false, message: 'Security error: Could not decrypt data key.' };
            }

            // 4. Set Session
            setUsers(foundUsersArray);
            setCurrentWorkspace(foundWorkspace);
            setCurrentUser(foundUser);

            return { success: true };

        } catch (e) {
            console.error(e);
            return { success: false, message: 'Login failed due to an error.' };
        }
    }, []);

    const registerBusiness = useCallback(async (businessName: string, username: string, email: string, pass: string): Promise<{ success: boolean, message?: string, recoveryKey?: string, storeCode?: string }> => {
        try {
            // 1. Create Workspace
            const workspaceId = generateUUIDv7();
            const existingAliases = await db.workspaces.toArray().then(ws => ws.map(w => w.alias));
            const alias = generateUniqueNanoID([], (i, id) => existingAliases.includes(id), 6, 'WS-'); 
            
            const newWorkspace: Workspace = {
                id: workspaceId,
                name: businessName,
                alias: alias
            };

            // 2. Create Crypto Keys
            const salt = generateSalt();
            const kek = await deriveKeyFromPassword(pass, salt);
            const dek = await generateDataKey();
            const encryptedDEK = await wrapKey(dek, kek);
            const recoveryKey = await exportKey(dek);

            // 3. Create Admin User
            const newUser: User = {
                id: `user_${generateUUIDv7()}`,
                username,
                email,
                password: pass,
                role: UserRole.Admin,
                salt,
                encryptedDEK,
                workspaceId
            };

            // 4. Save Workspace and User
            await db.workspaces.add(newWorkspace);
            await setInDB(`ims-${workspaceId}-users`, [newUser]);

            // 5. Seed Initial Data
            // We enable encryption momentarily to ensure data is encrypted with the new DEK
            db.setEncryptionKey(dek);

            // Generate Map for Category IDs to maintain relationships and ensure global uniqueness
            const categoryMap = new Map<string, string>();
            const categories = DEFAULT_CATEGORIES.map(c => {
                const newId = `cat_${generateUUIDv7()}`;
                categoryMap.set(c.id, newId);
                return { ...c, id: newId, workspaceId, sync_status: 'pending' as const };
            });

            // Fix parentIds in categories
            categories.forEach(c => {
                if (c.parentId && categoryMap.has(c.parentId)) {
                    c.parentId = categoryMap.get(c.parentId);
                }
            });

            // Map Products to new IDs (including variants)
            const products = INITIAL_PRODUCTS.map(p => ({
                ...p,
                id: `prod_${generateUUIDv7()}`,
                categoryIds: p.categoryIds.map(cid => categoryMap.get(cid) || cid),
                variants: p.variants?.map(v => ({ ...v, id: `var_${generateUUIDv7()}` })) || [],
                workspaceId,
                sync_status: 'pending' as const
            }));

            const customers = INITIAL_CUSTOMERS.map(c => ({ 
                ...c, 
                id: `cust_${generateUUIDv7()}`,
                workspaceId, 
                sync_status: 'pending' as const 
            }));
            
            await db.products.bulkAdd(products);
            await db.categories.bulkAdd(categories);
            await db.customers.bulkAdd(customers);
            
            // Seed Suppliers in KeyVal (consistent with SupplierView implementation)
            const suppliers = INITIAL_SUPPLIERS.map(s => ({ ...s, workspaceId }));
            await setInDB(`ims-${workspaceId}-suppliers`, suppliers);

            db.setEncryptionKey(null); // Lock DB after seeding

            return { success: true, recoveryKey, storeCode: alias };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Registration failed.' };
        }
    }, []);

    const enterGuestMode = useCallback(async () => {
        const guestId = 'guest_workspace';
        const guestWs: Workspace = { id: guestId, name: 'Demo Store', alias: 'DEMO' };
        
        const guestUser: User = { id: 'guest', username: 'Guest Admin', password: '', role: UserRole.Admin, workspaceId: guestId };
        
        // Ephemeral key for guest
        const key = await generateDataKey();
        db.setEncryptionKey(key);

        // Initialize guest data if needed
        let existingUsers = await getFromDB<User[]>(`ims-${guestId}-users`) || [];
        if (existingUsers.length === 0) {
            existingUsers = [guestUser];
            await setInDB(`ims-${guestId}-users`, existingUsers);
        }

        setCurrentWorkspace(guestWs);
        setUsers(existingUsers);
        setCurrentUser(guestUser);
    }, []);

    const logout = useCallback(() => {
        db.setEncryptionKey(null);
        setCurrentUser(null);
        setCurrentWorkspace(null);
        setUsers([]);
        db.keyval.delete('ims-session');
    }, []);

    // User Management (Scoped to current workspace)
    const addUser = useCallback(async (username: string, pass: string, role: UserRole, email?: string): Promise<{ success: boolean, message?: string }> => {
        if (!currentWorkspace) return { success: false, message: 'No active workspace.' };
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: 'Username taken.' };
        }
        if (email && users.some(u => u.email?.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'Email already in use in this workspace.' };
        }

        try {
            // Encrypt DEK for new user
            const currentDEK = db.encryptionKey;
            if (!currentDEK) {
                console.error("addUser: DB encryption key is missing.");
                return { success: false, message: 'System is locked. Cannot add user.' };
            }

            const salt = generateSalt();
            const kek = await deriveKeyFromPassword(pass, salt);
            const encryptedDEK = await wrapKey(currentDEK, kek);

            const newUser: User = {
                id: `user_${generateUUIDv7()}`,
                username,
                email,
                password: pass,
                role,
                salt,
                encryptedDEK,
                workspaceId: currentWorkspace.id
            };

            const updatedUsers = [...users, newUser];
            setUsers(updatedUsers);
            await setInDB(`ims-${currentWorkspace.id}-users`, updatedUsers);
            
            return { success: true };
        } catch (error) {
            console.error("addUser failed", error);
            return { success: false, message: "Failed to secure user credentials." };
        }
    }, [users, currentWorkspace]);

    const updateUser = useCallback(async (userId: string, newUsername: string, newPassword?: string, newEmail?: string): Promise<{ success: boolean, message?: string, recoveryKey?: string }> => {
        if (!currentWorkspace) return { success: false, message: 'No active workspace.' };
        
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) return { success: false, message: 'User not found.' };
        
        const user = users[userIndex];
        if (users.some(u => u.id !== userId && u.username.toLowerCase() === newUsername.toLowerCase())) {
            return { success: false, message: 'Username taken.' };
        }
        if (newEmail && users.some(u => u.id !== userId && u.email?.toLowerCase() === newEmail.toLowerCase())) {
            return { success: false, message: 'Email already in use.' };
        }

        let updatedUser = { ...user, username: newUsername, email: newEmail };
        let recoveryKey: string | undefined;

        if (newPassword && newPassword !== user.password) {
             const currentDEK = db.encryptionKey;
             if (currentDEK) {
                 try {
                     const salt = generateSalt();
                     const kek = await deriveKeyFromPassword(newPassword, salt);
                     const encryptedDEK = await wrapKey(currentDEK, kek);
                     
                     updatedUser.password = newPassword;
                     updatedUser.salt = salt;
                     updatedUser.encryptedDEK = encryptedDEK;

                     if (currentUser?.id === userId) {
                         recoveryKey = await exportKey(currentDEK);
                     }
                 } catch (e) {
                     console.error("updateUser crypto failed", e);
                     return { success: false, message: "Failed to update password." };
                 }
             } else {
                 // Guest mode or unlocked?
                 updatedUser.password = newPassword;
             }
        }

        const newUsers = [...users];
        newUsers[userIndex] = updatedUser;
        setUsers(newUsers);
        await setInDB(`ims-${currentWorkspace.id}-users`, newUsers);
        
        if (currentUser?.id === userId) setCurrentUser(updatedUser);

        return { success: true, recoveryKey };
    }, [users, currentWorkspace, currentUser]);

    const deleteUser = useCallback((userId: string) => {
        if (!currentWorkspace) return { success: false, message: 'No active workspace.' };
        if (userId === currentUser?.id) return { success: false, message: 'Cannot delete self.' };
        
        const newUsers = users.filter(u => u.id !== userId);
        setUsers(newUsers);
        setInDB(`ims-${currentWorkspace.id}-users`, newUsers);
        
        // Record deletion
        db.deletedRecords.add({
            id: userId,
            table: 'users',
            deletedAt: new Date().toISOString(),
            sync_status: 'pending'
        });
        
        return { success: true };
    }, [users, currentWorkspace, currentUser]);

    const recoverAccount = useCallback(async (username: string, recoveryKeyBase64: string, newPassword: string): Promise<{ success: boolean, message?: string }> => {
        if (!currentWorkspace) return { success: false, message: 'No active session.' };
        
        const user = users.find(u => u.username === username);
        if (!user) return { success: false, message: 'User not found.' };

        try {
            const dek = await importKey(recoveryKeyBase64);
            const salt = generateSalt();
            const kek = await deriveKeyFromPassword(newPassword, salt);
            const encryptedDEK = await wrapKey(dek, kek);

            const updatedUser = { ...user, password: newPassword, salt, encryptedDEK };
            const newUsers = users.map(u => u.id === user.id ? updatedUser : u);
            
            setUsers(newUsers);
            await setInDB(`ims-${currentWorkspace.id}-users`, newUsers);
            
            // If recovering self, update session
            if (currentUser?.id === user.id) {
                db.setEncryptionKey(dek);
                setCurrentUser(updatedUser);
            }

            return { success: true };
        } catch (e) {
            return { success: false, message: 'Invalid key.' };
        }
    }, [users, currentWorkspace, currentUser]);

    const getDecryptedKey = useCallback(async (password: string): Promise<string | null> => {
        if (!currentUser || !currentUser.encryptedDEK || !currentUser.salt) return null;
        try {
            const kek = await deriveKeyFromPassword(password, currentUser.salt);
            const dek = await unwrapKey(currentUser.encryptedDEK, kek);
            return await exportKey(dek);
        } catch (e) {
            return null;
        }
    }, [currentUser]);

    // Deprecated, maintained for backward compatibility within file
    const updateStoreCode = useCallback(async (newCode: string): Promise<{ success: boolean, message?: string }> => {
        return updateBusinessDetails(currentWorkspace?.name || '', newCode);
    }, [currentWorkspace]);

    const updateBusinessDetails = useCallback(async (name: string, code: string): Promise<{ success: boolean, message?: string }> => {
        if (!currentWorkspace) return { success: false, message: 'No active workspace.' };
        
        const normalizedCode = code.trim().toUpperCase();
        const trimmedName = name.trim();

        if (normalizedCode.length < 3) return { success: false, message: 'Store Code must be at least 3 characters.' };
        if (!/^[A-Z0-9-]+$/.test(normalizedCode)) return { success: false, message: 'Store Code can only contain letters, numbers, and hyphens.' };
        if (trimmedName.length === 0) return { success: false, message: 'Business Name cannot be empty.' };

        const existing = await db.workspaces.where('alias').equals(normalizedCode).first();
        if (existing && existing.id !== currentWorkspace.id) {
            return { success: false, message: 'Store Code is already taken.' };
        }

        await db.workspaces.update(currentWorkspace.id, { name: trimmedName, alias: normalizedCode });
        setCurrentWorkspace(prev => prev ? { ...prev, name: trimmedName, alias: normalizedCode } : null);
        
        return { success: true };
    }, [currentWorkspace]);

    const value = {
        users, currentUser, currentWorkspace,
        login, loginByEmail, registerBusiness, logout, enterGuestMode,
        addUser, updateUser, deleteUser, recoverAccount, getDecryptedKey,
        updateStoreCode, updateBusinessDetails
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
