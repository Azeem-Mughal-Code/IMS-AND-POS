import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { User, UserRole, NotificationType } from '../../types';
import { useUIState } from './UIStateContext';
import { supabase } from '../../utils/supabase';

interface AuthContextType {
    users: User[];
    currentUser: User | null;
    login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
    signup: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
    onLogout: (user: User) => Promise<void>;
    addUser: (email: string, pass: string, role: UserRole) => Promise<{ success: boolean; message?: string }>;
    updateUser: (userId: string, newUsername: string, newPassword?: string) => Promise<{ success: boolean; message?: string }>;
    deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const { addNotification } = useUIState();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                const { data: profile, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user profile:', error);
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                } else if (profile) {
                    setCurrentUser({
                        id: profile.id,
                        username: profile.username,
                        role: profile.role as UserRole,
                    });
                     if (profile.role === UserRole.Admin) {
                        fetchAllUsers();
                    }
                }
            } else {
                setCurrentUser(null);
                setUsers([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchAllUsers = async () => {
        const { data, error } = await supabase.from('users').select('id, username, role');
        if (error) {
            console.error('Error fetching all users:', error);
        } else if (data) {
            setUsers(data as User[]);
        }
    };

    const login = async (email: string, pass: string): Promise<{ success: boolean, message?: string }> => {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) return { success: false, message: error.message };
        return { success: true };
    };
      
    const signup = async (email: string, pass: string): Promise<{ success: boolean, message?: string }> => {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password: pass });
        if (authError) return { success: false, message: authError.message };
        if (!authData.user) return { success: false, message: 'Signup failed to return a user.' };
        
        const { error: profileError } = await supabase
            .from('users')
            .insert({ id: authData.user.id, username: email, role: UserRole.Admin });

        if (profileError) {
            console.error("Error creating user profile:", profileError);
            // In a real app, you might want to try and delete the auth.user here
            return { success: false, message: 'Could not create user profile in database.' };
        }
        
        // onAuthStateChange will handle setting the current user
        return { success: true };
    };

    const onLogout = async (user: User) => {
        if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged out.`, NotificationType.USER, user.id);
        }
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error);
    };
  
    // NOTE: The following user management functions require Supabase Edge Functions for security.
    // The client invokes these functions, but the secure logic (using the service_role key) lives on Supabase servers.
    const addUser = async (email: string, pass: string, role: UserRole): Promise<{ success: boolean, message?: string }> => {
        const { data, error } = await supabase.functions.invoke('create-user', {
            body: { email, password: pass, role, username: email }
        });
        if (error) return { success: false, message: error.message };
        if (data.error) return { success: false, message: data.error };
        await fetchAllUsers();
        return { success: true };
    };
   
    const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
        if (userId === currentUser?.id) return { success: false, message: 'Cannot delete your own account.' };
        const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } });
        if (error) return { success: false, message: error.message };
        if (data.error) return { success: false, message: data.error };
        await fetchAllUsers();
        return { success: true };
    };
   
    const updateUser = async (userId: string, newUsername: string, newPassword?: string): Promise<{ success: boolean, message?: string }> => {
        const { data, error } = await supabase.functions.invoke('update-user', {
            body: { userId, newUsername, newPassword }
        });
        if (error) return { success: false, message: error.message };
        if (data.error) return { success: false, message: data.error };
        
        await fetchAllUsers();
        // If current user was updated, refresh their local state
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? { ...prev, username: newUsername } : null);
        }
        
        return { success: true };
    };

    const value = {
        users, currentUser, login, signup, onLogout, addUser, updateUser, deleteUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};