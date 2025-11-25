
import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { GlobalUser, Workspace, User, UserRole } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { setInDB } from '../../utils/db';
import { generateUniqueNanoID, generateUUIDv7 } from '../../utils/idGenerator';

interface GlobalAuthContextType {
    globalUsers: GlobalUser[];
    workspaces: Workspace[];
    currentGlobalUser: GlobalUser | null;
    signup: (email: string, username: string, password: string) => { success: boolean; message?: string; user?: GlobalUser };
    login: (email: string, password: string) => { success: boolean; message?: string; user?: GlobalUser };
    logout: () => void;
    createWorkspace: (name: string) => Promise<Workspace | null>;
    updateWorkspace: (id: string, data: { name?: string, alias?: string }) => { success: boolean; message?: string };
    getUserWorkspaces: () => Workspace[];
    getWorkspaceById: (id: string) => Workspace | undefined;
    getWorkspaceByIdOrAlias: (identifier: string) => Workspace | undefined;
}

const GlobalAuthContext = createContext<GlobalAuthContextType | null>(null);

export const useGlobalAuth = () => {
    const context = useContext(GlobalAuthContext);
    if (!context) throw new Error('useGlobalAuth must be used within a GlobalAuthProvider');
    return context;
};

export const GlobalAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [globalUsers, setGlobalUsers] = usePersistedState<GlobalUser[]>('ims-global-users', []);
    const [workspaces, setWorkspaces] = usePersistedState<Workspace[]>('ims-workspaces', []);
    const [currentGlobalUser, setCurrentGlobalUser] = usePersistedState<GlobalUser | null>('ims-current-global-user', null);

    const signup = useCallback((email: string, username: string, password: string): { success: boolean; message?: string; user?: GlobalUser } => {
        if (globalUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: 'An account with this email already exists.' };
        }
        const newUser: GlobalUser = {
            id: `g_user_${Date.now()}`,
            email,
            username,
            passwordHash: password, // NOT a real hash! For demo purposes only.
        };
        setGlobalUsers(prev => [...prev, newUser]);
        setCurrentGlobalUser(newUser);
        return { success: true, user: newUser };
    }, [globalUsers, setGlobalUsers, setCurrentGlobalUser]);

    const login = useCallback((email: string, password: string): { success: boolean; message?: string; user?: GlobalUser } => {
        const user = globalUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password);
        if (user) {
            setCurrentGlobalUser(user);
            return { success: true, user };
        }
        return { success: false, message: 'Invalid email or password.' };
    }, [globalUsers, setCurrentGlobalUser]);

    const logout = useCallback(() => {
        setCurrentGlobalUser(null);
    }, [setCurrentGlobalUser]);

    const createWorkspace = useCallback(async (name: string): Promise<Workspace | null> => {
        if (!currentGlobalUser) return null;
        const newWorkspaceId = generateUUIDv7();
        
        // Generate unique alias (Short Code) with WS- prefix
        const alias = generateUniqueNanoID(workspaces, (w, id) => w.alias === id, 6, 'WS-');

        const newWorkspace: Workspace = {
            id: newWorkspaceId,
            name,
            alias,
            ownerId: currentGlobalUser.id,
            memberIds: [currentGlobalUser.id],
        };
        
        // Seed local data for this workspace
        const localAdmin: User = {
            id: `user_${Date.now()}`,
            username: currentGlobalUser.username,
            password: currentGlobalUser.passwordHash, // Using stored hash as password for local (demo simplicity)
            role: UserRole.Admin
        };
        
        try {
            await setInDB(`ims-${newWorkspaceId}-users`, [localAdmin]);
        } catch (error) {
            console.error("Failed to seed workspace users", error);
        }

        setWorkspaces(prev => [...prev, newWorkspace]);
        return newWorkspace;
    }, [currentGlobalUser, workspaces, setWorkspaces]);

    const updateWorkspace = useCallback((id: string, data: { name?: string, alias?: string }): { success: boolean; message?: string } => {
        // Check alias uniqueness if changing
        if (data.alias) {
            const conflict = workspaces.find(w => w.alias === data.alias && w.id !== id);
            if (conflict) {
                return { success: false, message: 'Store Code already taken.' };
            }
        }

        setWorkspaces(prev => prev.map(ws => ws.id === id ? { ...ws, ...data } : ws));
        return { success: true };
    }, [workspaces, setWorkspaces]);
    
    const getUserWorkspaces = useCallback((): Workspace[] => {
        if (!currentGlobalUser) return [];
        return workspaces.filter(ws => ws.memberIds.includes(currentGlobalUser.id));
    }, [currentGlobalUser, workspaces]);

    const getWorkspaceById = useCallback((id: string): Workspace | undefined => {
        return workspaces.find(ws => ws.id === id);
    }, [workspaces]);

    const getWorkspaceByIdOrAlias = useCallback((identifier: string): Workspace | undefined => {
        return workspaces.find(ws => ws.id === identifier || ws.alias === identifier);
    }, [workspaces]);

    const value = {
        globalUsers,
        workspaces,
        currentGlobalUser,
        signup,
        login,
        logout,
        createWorkspace,
        updateWorkspace,
        getUserWorkspaces,
        getWorkspaceById,
        getWorkspaceByIdOrAlias
    };

    return <GlobalAuthContext.Provider value={value}>{children}</GlobalAuthContext.Provider>;
};