import React, { useState, useEffect } from 'react';
import { User, UserRole, View, UsersViewState } from '../types';
import { UserSettings } from './UserSettings';
import { Modal } from './common/Modal';
import { SunIcon, MoonIcon, ComputerDesktopIcon, LogoutIcon } from './Icons';

interface SettingsProps {
    currentUser: User;
    updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
    users: User[];
    addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
    deleteUser: (userId: string) => { success: boolean; message?: string };
    theme: 'light' | 'dark' | 'system';
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    onLogout: () => void;
    usersViewState: UsersViewState;
    onUsersViewUpdate: (updates: Partial<UsersViewState>) => void;
}

const ThemeSelector: React.FC<{ theme: 'light' | 'dark' | 'system', setTheme: (theme: 'light' | 'dark' | 'system') => void }> = ({ theme, setTheme }) => {
    const options = [
        { value: 'light', label: 'Light', icon: <SunIcon /> },
        { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
        { value: 'system', label: 'System', icon: <ComputerDesktopIcon /> }
    ];

    return (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
            {options.map(option => (
                <button
                    key={option.value}
                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                    className={`flex flex-col items-center justify-center p-3 rounded-md text-sm font-medium transition-colors ${
                        theme === option.value
                            ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {option.icon}
                    <span className="mt-1">{option.label}</span>
                </button>
            ))}
        </div>
    );
};


export const Settings: React.FC<SettingsProps> = (props) => {
    const { currentUser, updateUser, theme, setTheme, users, addUser, deleteUser, usersViewState, onUsersViewUpdate, onLogout } = props;
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    
    const [profileUsername, setProfileUsername] = useState(currentUser.username);
    const [profilePassword, setProfilePassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');

    useEffect(() => {
        if (isEditProfileModalOpen) {
            setProfileUsername(currentUser.username);
            setProfilePassword('');
            setProfileConfirmPassword('');
            setProfileError('');
            setProfileSuccess('');
        }
    }, [isEditProfileModalOpen, currentUser.username]);

    const handleProfileUpdate = () => {
        setProfileError('');
        setProfileSuccess('');

        if (profilePassword && profilePassword.length < 4) {
            setProfileError("New password must be at least 4 characters long.");
            return;
        }

        if (profilePassword !== profileConfirmPassword) {
            setProfileError("Passwords do not match.");
            return;
        }
        
        const result = updateUser(currentUser.id, profileUsername, profilePassword);
        
        if (result.success) {
            setProfileSuccess("Profile updated successfully!");
            setTimeout(() => {
                setIsEditProfileModalOpen(false);
            }, 1500)
        } else {
            setProfileError(result.message || "Failed to update profile.");
        }
    };

    return (
        <div className="p-6 space-y-8">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Profile</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currentUser.username} &middot; <span className="font-semibold">{currentUser.role}</span></p>
                    </div>
                    <button onClick={() => setIsEditProfileModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium w-full sm:w-auto">
                        Edit Profile
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Appearance</h2>
                <ThemeSelector theme={theme} setTheme={setTheme} />
            </div>
            
            {currentUser.role === UserRole.Admin && <UserSettings 
                users={users}
                currentUser={currentUser}
                addUser={addUser}
                updateUser={updateUser}
                deleteUser={deleteUser}
                viewState={usersViewState}
                onViewStateUpdate={onUsersViewUpdate}
            />}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Account Actions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Manage your current session.</p>
                 <button 
                    onClick={onLogout} 
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium transition-colors"
                >
                    <LogoutIcon className="h-5 w-5" />
                    <span>Logout</span>
                </button>
            </div>

            <Modal isOpen={isEditProfileModalOpen} onClose={() => setIsEditProfileModalOpen(false)} title="Edit Profile" size="md">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input type="text" value={profileUsername} onChange={e => setProfileUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password (optional)</label>
                        <input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Leave blank to keep current" className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                        <input type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
                    </div>
                    {profileError && <p className="text-red-500 text-sm text-center mt-2">{profileError}</p>}
                    {profileSuccess && <p className="text-green-500 text-sm text-center mt-2">{profileSuccess}</p>}
                </div>
                <div className="flex justify-end items-center pt-6 mt-6 border-t border-gray-200 dark:border-gray-700 gap-2">
                    <button type="button" onClick={() => setIsEditProfileModalOpen(false)} className="w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
                    <button type="button" onClick={handleProfileUpdate} className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Changes</button>
                </div>
            </Modal>
        </div>
    )
}