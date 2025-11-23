
import React, { createContext, useContext, ReactNode, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, UserRole, GlobalUser } from '../../types';
import usePersistedState from '../../hooks/usePersistedState';
import { useUIState } from './UIStateContext';

interface AuthContextType {
    users: User[];
    currentUser: User | null;
    login: (username: string, pass: string) => boolean;
    signup: (username: string, pass: string) => { success: boolean, message?: string };
    onLogout: (user: User) => Promise<void>;
    addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
    updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
    deleteUser: (userId: string) => { success: boolean; message?: string };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode; workspaceId: string; globalUser: GlobalUser | null }> = ({ children, workspaceId, globalUser }) => {
    const ls_prefix = `ims-${workspaceId}`;
    const [users, setUsers] = usePersistedState<User[]>(`${ls_prefix}-users`, []);
    const [currentUser, setCurrentUser, setCurrentUserAsync] = usePersistedState<User | null>(`${ls_prefix}-currentUser`, null);
    const { setActiveView, addNotification } = useUIState();
    
    // Ref to track if a logout is in progress to prevent auto-login race conditions
    const isLoggingOut = useRef(false);

    const isGuestWorkspace = workspaceId === 'guest_workspace';

    useEffect(() => {
        if (isGuestWorkspace && !currentUser) {
            // Auto-login guest user
            const guestUser = users.find(u => u.id === 'guest');
            if (guestUser) {
                setCurrentUser(guestUser);
            } else {
                // Create guest user if it doesn't exist. Give them admin role for full trial access.
                const newGuestUser: User = { id: 'guest', username: 'Guest', password: '', role: UserRole.Admin };
                setUsers(prev => [...prev, newGuestUser]);
                setCurrentUser(newGuestUser);
            }
        } else if (!isGuestWorkspace && currentUser?.id === 'guest') {
            // If we switched to a real workspace but are still logged in as guest (e.g. browser back), log out.
            setCurrentUser(null);
        } else if (!isGuestWorkspace && !currentUser && globalUser && users.length > 0) {
            // Auto-login logic for workspace owners
            // Prevent auto-login if we just explicitly logged out
            if (isLoggingOut.current) return;

            // We look for a local admin user that matches the global user's credentials
            const localAdmin = users.find(u => u.username === globalUser.username && u.role === UserRole.Admin);
            
            // In a real app, we'd verify the password hash more securely or use a session token.
            // Here we check if the stored password (which is the hash for the seeded admin) matches the global user's password hash.
            if (localAdmin && localAdmin.password === globalUser.passwordHash) {
                setCurrentUser(localAdmin);
                // Force view to dashboard if entering as admin
                setActiveView('dashboard');
            }
        }
    }, [isGuestWorkspace, currentUser, users, setUsers, setCurrentUser, globalUser, setActiveView]);

    const login = useCallback((username: string, pass: string): boolean => {
        const user = users.find(u => u.username === username && u.password === pass);
        if (user) {
          isLoggingOut.current = false;
          setCurrentUser(user);
          setActiveView(user.role === UserRole.Admin ? 'dashboard' : 'pos');
          if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged in.`, 'USER', user.id);
          }
          return true;
        }
        return false;
    }, [users, setCurrentUser, setActiveView, addNotification]);
      
    const signup = useCallback((username: string, pass: string): { success: boolean, message?: string } => {
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'Username is already taken.' };
        }
        const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role: UserRole.Admin };
        setUsers([newUser]);
        isLoggingOut.current = false;
        setCurrentUser(newUser);
        setActiveView('dashboard');
        return { success: true };
    }, [users, setUsers, setCurrentUser, setActiveView]);

    const onLogout = useCallback(async (user: User) => {
        isLoggingOut.current = true; // Prevent auto-login effect from re-triggering immediately
        if (user.id !== 'guest' && user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged out.`, 'USER', user.id);
        }
        await setCurrentUserAsync(null);
    }, [addNotification, setCurrentUserAsync]);
  
    const addUser = useCallback((username: string, pass: string, role: UserRole): { success: boolean, message?: string } => {
        if (users.some(u => u.username === username)) {
         return { success: false, message: 'Username is already taken.' };
       }
       const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role };
       setUsers(prev => [...prev, newUser]);
       return { success: true };
     }, [users, setUsers]);
   
     const deleteUser = useCallback((userId: string): { success: boolean; message?: string } => {
         const userToDelete = users.find(u => u.id === userId);
         if (!userToDelete) return { success: false, message: 'User not found.' };
         if (userToDelete.role === UserRole.Admin) return { success: false, message: 'Cannot delete an admin account.' };
         if (userToDelete.id === currentUser?.id) return { success: false, message: 'Cannot delete your own account.' };
         setUsers(prev => prev.filter(u => u.id !== userId));
         return { success: true };
     }, [users, currentUser, setUsers]);
   
     const updateUser = useCallback((userId: string, newUsername: string, newPassword?: string): { success: boolean, message?: string } => {
       const userToUpdate = users.find(u => u.id === userId);
       if (!userToUpdate) return { success: false, message: 'User not found.' };
   
       if (currentUser?.role !== UserRole.Admin && currentUser?.id !== userId) return { success: false, message: 'Permission denied.' };
       
       if (userToUpdate.role === UserRole.Admin && userToUpdate.id !== currentUser.id) {
           return { success: false, message: "Admins cannot edit other admin accounts."};
       }
   
       if (users.some(u => u.username === newUsername && u.id !== userId)) {
         return { success: false, message: 'Username is already taken.' };
       }
   
       let updatedUser: User | null = null;
       const updatedUsers = users.map(user => {
         if (user.id === userId) {
           updatedUser = { ...user, username: newUsername, password: newPassword && newPassword.length > 0 ? newPassword : user.password };
           return updatedUser;
         }
         return user;
       });
       setUsers(updatedUsers);
       if (currentUser?.id === userId && updatedUser) setCurrentUser(updatedUser);
       return { success: true };
     }, [users, currentUser, setUsers, setCurrentUser]);

    const value = useMemo(() => ({
        users, currentUser, login, signup, onLogout, addUser, updateUser, deleteUser
    }), [users, currentUser, login, signup, onLogout, addUser, updateUser, deleteUser]);


    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
