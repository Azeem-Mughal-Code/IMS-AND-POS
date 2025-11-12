import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Modal } from './common/Modal';
import { TrashIcon, PlusIcon } from './Icons';

interface UserSettingsProps {
  users: User[];
  currentUser: User;
  addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
}

const UserForm: React.FC<{
    onSubmit: (username: string, pass: string, role: UserRole) => void,
    onCancel: () => void,
}> = ({ onSubmit, onCancel }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const role = UserRole.Cashier; // Admins can only create Cashiers

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(username, password, role);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={4} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <input type="text" value={role} disabled className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Add User</button>
            </div>
        </form>
    );
};


export const UserSettings: React.FC<UserSettingsProps> = ({ users, currentUser, addUser, deleteUser }) => {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddUser = (username: string, pass: string, role: UserRole) => {
    setError('');
    setSuccess('');
    const result = addUser(username, pass, role);
    if (result.success) {
        setSuccess('User added successfully!');
        setIsAddUserModalOpen(false);
    } else {
        // Error message will be shown in the modal form if it existed
        // but here we handle it outside
        const modalErrorInput = document.getElementById('modal-error');
        if (modalErrorInput) {
            modalErrorInput.innerText = result.message || 'Failed to add user.';
        } else {
            setError(result.message || 'Failed to add user.');
        }
    }
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser.id) return;
    setError('');
    setSuccess('');
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      const result = deleteUser(userToDelete.id);
      if (!result.success) {
        setError(result.message || 'Failed to delete user.');
      } else {
        setSuccess('User deleted successfully!');
        setError('');
      }
      setUserToDelete(null);
    }
  };
  
  const handleOpenAddModal = () => {
      setError('');
      setSuccess('');
      setIsAddUserModalOpen(true);
  }

  return (
    <div className="p-6">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">User Management</h1>
        <button onClick={handleOpenAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
            <PlusIcon />
            Add User
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{success}</span>
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
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{user.username} {user.id === currentUser.id && '(You)'}</td>
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

      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title="Add New User" size="sm">
          <UserForm onSubmit={handleAddUser} onCancel={() => setIsAddUserModalOpen(false)} />
          <p id="modal-error" className="text-red-500 text-sm text-center mt-2"></p>
      </Modal>

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