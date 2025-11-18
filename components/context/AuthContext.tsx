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
        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await fetchUserProfile(session.user.id);
            }
        };
        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                await fetchUserProfile(session.user.id);
            } else {
                setCurrentUser(null);
                setUsers([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error);
            await supabase.auth.signOut();
            setCurrentUser(null);
        } else if (profile) {
            const user: User = {
                id: profile.id,
                username: profile.username,
                role: profile.role as UserRole,
            };
            setCurrentUser(user);
            if (user.role === UserRole.Admin) {
                await fetchAllUsers();
            }
        }
    };

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
        // Step 1: Sign up the new user. The database trigger will automatically create their profile with 'Cashier' role.
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: pass });

        if (signUpError) {
            if (signUpError.message.includes('User already registered')) {
                return { success: false, message: 'This email is already registered. Please try logging in.' };
            }
            return { success: false, message: signUpError.message };
        }
        if (!signUpData.user) {
            return { success: false, message: 'Signup failed to create a user. Please try again.' };
        }

        // After signup, the user is automatically logged in.
        // Step 2: As the newly authenticated user, attempt to promote themself to 'Admin'.
        // This relies on the "Allow first user to become admin" RLS policy, which uses a
        // SECURITY DEFINER function to safely check if any other admins exist.
        const { error: updateError } = await supabase
            .from('users')
            .update({ role: UserRole.Admin })
            .eq('id', signUpData.user.id);
        
        // Step 3: Handle the result of the promotion attempt.
        if (updateError) {
            // If the update fails, it's almost certainly because the RLS policy failed.
            // This means an admin already exists. The user has been created as a 'Cashier'.
            // For a better user experience on the signup page, we sign them out and inform them.
            console.warn("Could not promote user to admin, likely because an admin already exists.", updateError.message);
            await supabase.auth.signOut();
            return { success: false, message: 'An admin account already exists for this business. Please use the login page.' };
        }
        
        // Success! The user is now an admin.
        // The onAuthStateChange listener will fetch their updated profile and log them in.
        addNotification('Admin account created successfully!', NotificationType.USER, signUpData.user.id);
        return { success: true };
    };

    const onLogout = async (user: User) => {
        if (user.role === UserRole.Cashier) {
            addNotification(`Cashier '${user.username}' logged out.`, NotificationType.USER, user.id);
        }
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error logging out:', error);
    };
  
    const addUser = async (email: string, pass: string, role: UserRole): Promise<{ success: boolean, message?: string }> => {
        return { success: false, message: 'Adding users requires a secure server-side Edge Function.' };
    };
   
    const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
        if (userId === currentUser?.id) return { success: false, message: 'Cannot delete your own account.' };
        return { success: false, message: 'Deleting users requires a secure server-side Edge Function.' };
    };
   
    const updateUser = async (userId: string, newUsername: string, newPassword?: string): Promise<{ success: boolean, message?: string }> => {
        // A user can only update their own profile from the client.
        if (userId === currentUser?.id) {
            const updatePayload: { email?: string, password?: string } = {};
            if (newUsername !== currentUser.username) {
                updatePayload.email = newUsername;
            }
            if (newPassword) {
                updatePayload.password = newPassword;
            }
    
            // Update auth.users
            if (Object.keys(updatePayload).length > 0) {
                const { error: authError } = await supabase.auth.updateUser(updatePayload);
                if (authError) return { success: false, message: authError.message };
            }
    
            // Update public.users table if username (email) changed
            if (newUsername !== currentUser.username) {
                 const { error: profileError } = await supabase
                    .from('users')
                    .update({ username: newUsername })
                    .eq('id', userId);
    
                if (profileError) return { success: false, message: `Authentication details updated, but profile update failed: ${profileError.message}` };
            }
            
            // Refresh local state after successful updates
            await fetchUserProfile(userId);
            if(currentUser.role === UserRole.Admin) {
                await fetchAllUsers();
            }

            return { success: true };
        } 
        // Admin trying to update another user is disabled without an edge function.
        else {
            return { success: false, message: 'Updating other users requires a secure server-side Edge Function.' };
        }
    };

    const value = {
        users, currentUser, login, signup, onLogout, addUser, updateUser, deleteUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};