import React, { useState, useMemo, useEffect } from 'react';
import { User, UserRole, UsersViewState } from '../types';
import { Modal } from './common/Modal';
import { Pagination } from './common/Pagination';
import { TrashIcon, PlusIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon } from './Icons';

interface UserSettingsProps {
  users: User[];
  currentUser: User;
  addUser: (username: string, pass: string, role: UserRole) => { success: boolean, message?: string };
  updateUser: (userId: string, newUsername: string, newPassword?: string) => { success: boolean, message?: string };
  deleteUser: (userId: string) => { success: boolean; message?: string };
  viewState: UsersViewState;
  onViewStateUpdate: (updates: Partial<UsersViewState>) => void;
}

const UserForm: React.FC<{
    user?: User | null;
    onSubmit: (userId: string | null, data: { username: string, pass: string }) => void,
    onCancel: () => void,
    errorMessage?: string,
}> = ({ user, onSubmit, onCancel, errorMessage }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const isEditMode = !!user;

    useEffect(() => {
        if(isEditMode) {
            setUsername(user.username);
            setPassword('');
        }
    }, [user, isEditMode]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(isEditMode ? user.id : null, { username, pass: password });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!isEditMode} minLength={isEditMode && !password ? 0 : 4} placeholder={isEditMode ? "Leave blank to keep current" : ""} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <input type="text" value={user?.role || UserRole.Cashier} disabled className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400" />
            </div>
             {errorMessage && <p className="text-red-500 text-sm text-center">{errorMessage}</p>}
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">{isEditMode ? 'Save Changes' : 'Add User'}</button>
            </div>
        </form>
    );
};

type SortableUserKeys = 'username' | 'role';

export const UserSettings: React.FC<UserSettingsProps> = ({ users, currentUser, addUser, updateUser, deleteUser, viewState, onViewStateUpdate }) => {
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState('');
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);


  const { searchTerm, sortConfig, currentPage, itemsPerPage } = viewState;

  const requestSort = (key: SortableUserKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    onViewStateUpdate({ sortConfig: { key, direction } });
  };
  
  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return filtered.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        const comparison = valA.localeCompare(valB);
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });

  }, [users, searchTerm, sortConfig]);

  const totalItems = filteredAndSortedUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    return filteredAndSortedUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const handleUserFormSubmit = (userId: string | null, data: { username: string, pass: string }) => {
    setFormError('');
    const isEditMode = !!userId;
    const result = isEditMode
        ? updateUser(userId!, data.username, data.pass)
        : addUser(data.username, data.pass, UserRole.Cashier);
    
    if (result.success) {
        setFeedback({ type: 'success', text: `User ${isEditMode ? 'updated' : 'added'} successfully!` });
        closeUserModal();
    } else {
        setFormError(result.message || `Failed to ${isEditMode ? 'update' : 'add'} user.`);
    }
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser.id) return;
    setFeedback(null);
    setUserToDelete(user);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      const result = deleteUser(userToDelete.id);
      if (!result.success) {
        setFeedback({type: 'error', text: result.message || 'Failed to delete user.'});
      } else {
        setFeedback({type: 'success', text: 'User deleted successfully!'});
      }
      setUserToDelete(null);
    }
  };
  
  const openAddModal = () => {
      setFeedback(null);
      setEditingUser(null);
      setFormError('');
      setIsUserModalOpen(true);
  }

  const openEditModal = (user: User) => {
      if (user.role === UserRole.Admin) {
          setFeedback({ type: 'error', text: 'Admin accounts cannot be edited.' });
          return;
      }
      setFeedback(null);
      setEditingUser(user);
      setFormError('');
      setIsUserModalOpen(true);
  }

  const closeUserModal = () => {
      setIsUserModalOpen(false);
      setEditingUser(null);
      setFormError('');
  }


  const SortableHeader: React.FC<{ children: React.ReactNode, sortKey: SortableUserKeys }> = ({ children, sortKey }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
        <th scope="col" className="px-6 py-3">
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-1.5 group">
                <span className="group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{children}</span>
                {isSorted ? (
                    sortConfig.direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                ) : <ChevronDownIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-500 transition-colors" />}
            </button>
        </th>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center">
            <PlusIcon />
            Add User
        </button>
      </div>

      {feedback && (
        <div className={`my-4 px-4 py-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'}`} role="alert">
          {feedback.text}
        </div>
      )}

      <div className="mt-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchTerm}
                    onChange={e => onViewStateUpdate({ searchTerm: e.target.value, currentPage: 1 })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
              <tr>
                <SortableHeader sortKey="username">Username</SortableHeader>
                <SortableHeader sortKey="role">Role</SortableHeader>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map(user => (
                <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{user.username} {user.id === currentUser.id && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(You)</span>}</td>
                  <td className="px-6 py-4">{user.role}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                     <button
                      onClick={() => openEditModal(user)}
                      disabled={user.role === UserRole.Admin}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1 disabled:text-gray-400 disabled:cursor-not-allowed"
                      aria-label={`Edit user ${user.username}`}
                    >
                      <PencilIcon />
                    </button>
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
        <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => onViewStateUpdate({ currentPage: page })}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={(size) => onViewStateUpdate({ itemsPerPage: size, currentPage: 1 })}
            totalItems={totalItems}
        />

      <Modal isOpen={isUserModalOpen} onClose={closeUserModal} title={editingUser ? "Edit User" : "Add New User"} size="sm">
          <UserForm user={editingUser} onSubmit={handleUserFormSubmit} onCancel={closeUserModal} errorMessage={formError} />
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