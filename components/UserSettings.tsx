import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Modal } from './common/Modal';
import { TrashIcon } from './Icons';

interface UserSettingsProps {
  users: User[];
  currentUser: User;
  deleteUser: (userId: string) => { success: boolean; message?: string };
}

export const UserSettings: React.FC<UserSettingsProps> = ({ users, currentUser, deleteUser }) => {
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [error, setError] = useState('');

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser.id) return;
    setError('');
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      const result = deleteUser(userToDelete.id);
      if (!result.success) {
        setError(result.message || 'Failed to delete user.');
      } else {
        setError('');
      }
      setUserToDelete(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">Username</th>
              <th scope="col" className="px-6 py-3">Role</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{user.username}</td>
                <td className="px-6 py-4">{user.role}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteClick(user)}
                    disabled={user.id === currentUser.id || user.role === UserRole.Admin}
                    className="text-red-500 hover:text-red-700 p-1 disabled:text-gray-400 disabled:cursor-not-allowed"
                    aria-label={`Delete user ${user.username}`}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Confirm Deletion" size="sm">
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the user <span className="font-bold">{userToDelete.username}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setUserToDelete(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Delete User
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
