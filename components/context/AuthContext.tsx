import React, { createContext, useContext, ReactNode } from 'react';
import { User, UserRole } from '../../types';
import useLocalStorage from '../../hooks/useLocalStorage';
import { useUIState } from './UIStateContext';

interface AuthContextType {
    users: User[];
    currentUser: User | null;
    login: (username: string, pass: string) => boolean;
    signup: (username: string, pass: string) => { success: boolean, message?: string };
    onLogout: (user: User) => void;
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

export const AuthProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const ls_prefix = `ims-${businessName}`;
    const [users, setUsers] = useLocalStorage<User[]>(`${ls_prefix}-users`, []);
    const [currentUser, setCurrentUser] = useLocalStorage<User | null>(`${ls_prefix}-currentUser`, null);
    const { setActiveView, addNotification } = useUIState();

    const login = (username: string, pass: string): boolean => {
        const user = users.find(u => u.username === username && u.password === pass);
        if (user) {
          setCurrentUser(user);
          setActiveView(user.role === UserRole.Admin ? 'dashboard' : 'pos');
          if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged in.`, 'USER', user.id);
          }
          return true;
        }
        return false;
    };
      
    const signup = (username: string, pass: string): { success: boolean, message?: string } => {
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'Username is already taken.' };
        }
        const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role: UserRole.Admin };
        setUsers([newUser]);
        setCurrentUser(newUser);
        setActiveView('dashboard');
        return { success: true };
    };

    const onLogout = (user: User) => {
        if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged out.`, 'USER', user.id);
        }
        setCurrentUser(null);
    };
  
    const addUser = (username: string, pass: string, role: UserRole): { success: boolean, message?: string } => {
        if (users.some(u => u.username === username)) {
         return { success: false, message: 'Username is already taken.' };
       }
       const newUser: User = { id: `user_${Date.now()}`, username, password: pass, role };
       setUsers(prev => [...prev, newUser]);
       return { success: true };
     };
   
     const deleteUser = (userId: string): { success: boolean; message?: string } => {
         const userToDelete = users.find(u => u.id === userId);
         if (!userToDelete) return { success: false, message: 'User not found.' };
         if (userToDelete.role === UserRole.Admin) return { success: false, message: 'Cannot delete an admin account.' };
         if (userToDelete.id === currentUser?.id) return { success: false, message: 'Cannot delete your own account.' };
         setUsers(prev => prev.filter(u => u.id !== userId));
         return { success: true };
     };
   
     const updateUser = (userId: string, newUsername: string, newPassword?: string): { success: boolean, message?: string } => {
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
     };

    const value = {
        users, currentUser, login, signup, onLogout, addUser, updateUser, deleteUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
