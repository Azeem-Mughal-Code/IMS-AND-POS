import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, UserRole, CashierPermissions } from './types';
import { Modal } from './components/common/Modal';
import { Pagination } from './components/common/Pagination';
import { TrashIcon, PlusIcon, SearchIcon, ChevronUpIcon, ChevronDownIcon, PencilIcon, ShieldCheckIcon } from './components/Icons';
import { ToggleSwitch } from './components/common/ToggleSwitch';
import { useAuth } from './components/context/AuthContext';
import { useUIState } from './components/context/UIStateContext';
import { useSettings } from './components/context/SettingsContext';

const UserForm: React.FC<{
    user?: User | null;
    onSubmit: (userId: string | null, data: { username: string, pass: string }) => Promise<void>,
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


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(isEditMode ? user.id : null, { username, pass: password });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!isEditMode} minLength={isEditMode && !password ? 0 : 6} placeholder={isEditMode ? "Leave blank to keep current" : ""} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
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

const PermissionsModal: React.FC<{
    onClose: () => void;
}> = ({ onClose }) => {
    const { cashierPermissions, setCashierPermissions } = useSettings();
    const [localPermissions, setLocalPermissions] = useState<CashierPermissions>(cashierPermissions);

    const handleToggle = (key: keyof CashierPermissions, value: boolean) => {
        setLocalPermissions(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = () => {
        setCashierPermissions(localPermissions);
        onClose();
    };

    return (
        <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure what actions users with the 'Cashier' role are permitted to perform throughout the application.
            </p>
            <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-2 dark:border-gray-600">Page Access</h4>
                <ToggleSwitch
                    enabled={!!localPermissions.canViewDashboard}
                    onChange={(val) => handleToggle('canViewDashboard', val)}
                    label="Can View Dashboard Page"
                />
                 <ToggleSwitch
                    enabled={!!localPermissions.canViewInventory}
                    onChange={(val) => handleToggle('canViewInventory', val)}
                    label="Can View Inventory Page"
                />
                <ToggleSwitch
                    enabled={!!localPermissions.canViewReports}
                    onChange={(val) => handleToggle('canViewReports', val)}
                    label="Can View Reports Page"
                />
                <ToggleSwitch
                    enabled={!!localPermissions.canViewAnalysis}
                    onChange={(val) => handleToggle('canViewAnalysis', val)}
                    label="Can View Analysis Page"
                />

                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 mb-2 pt-4 dark:border-gray-600">Action & Settings Permissions</h4>
                <ToggleSwitch
                    enabled={!!localPermissions.canProcessReturns}
                    onChange={(val) => handleToggle('canProcessReturns', val)}
                    label="Can Process Returns in POS"
                />
                 <ToggleSwitch
                    enabled={!!localPermissions.canEditOwnProfile}
                    onChange={(val) => handleToggle('canEditOwnProfile', val)}
                    label="Can Edit Own Profile"
                />
                 <ToggleSwitch
                    enabled={!!localPermissions.canEditBehaviorSettings}
                    onChange={(val) => handleToggle('canEditBehaviorSettings', val)}
                    label="Can Edit Behavior Settings"
                />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
                <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Save Permissions</button>
            </div>
        </div>
    );
};

type SortableUserKeys = 'username' | 'role';

export const UserSettings: React.FC = () => {
  const { users, currentUser, addUser, updateUser, deleteUser } = useAuth();
  const { usersViewState, onUsersViewUpdate, showToast } = useUIState();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState('');
  
  const { searchTerm, sortConfig, currentPage, itemsPerPage } = usersViewState;

  const requestSort = (key: SortableUserKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    onUsersViewUpdate({ sortConfig: { key, direction } });
  };
  
  const filteredAndSortedUsers = useMemo(() => {
    const filtered = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return filtered.sort((a, b) => {
        if (!sortConfig.key) return 0;
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

  const handleUserFormSubmit = async (userId: string | null, data: { username: string, pass: string }) => {
    setFormError('');
    const isEditMode = !!userId;
    const result = await (isEditMode
        ? updateUser(userId!, data.username, data.pass)
        : addUser(data.username, data.pass, UserRole.Cashier));
    
    if (result.success) {
        showToast(`User ${isEditMode ? 'updated' : 'added'} successfully!`, 'success');
        closeUserModal();
    } else {
        setFormError(result.message || `Failed to ${isEditMode ? 'update' : 'add'} user.`);
    }
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === currentUser?.id) return;
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      const result = await deleteUser(userToDelete.id);
      if (!result.success) {
        showToast(result.message || 'Failed to delete user.', 'error');
      } else {
        showToast('User deleted successfully!', 'success');
      }
      setUserToDelete(null);
    }
  };
  
  const openAddModal = () => {
      setEditingUser(null);
      setFormError('');
      setIsUserModalOpen(true);
  }

  const openEditModal = (user: User) => {
      if (user.role === UserRole.Admin) {
          showToast('Admin accounts cannot be edited from this panel.', 'error');
          return;
      }
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
                ) : <ChevronDownIcon className="h-4 w-4 invisible" />}
            </button>
        </th>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button onClick={() => setIsPermissionsModalOpen(true)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 w-full sm:w-auto justify-center">
            <ShieldCheckIcon />
            Cashier Permissions
        </button>
        <button onClick={openAddModal} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 w-full sm:w-auto justify-center">
            <PlusIcon />
            Add User
        </button>
      </div>

      <div className="mt-4">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={e => onUsersViewUpdate({ searchTerm: e.target.value, currentPage: 1 })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
        </div>
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 responsive-table">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
              <tr>
                <SortableHeader sortKey="username">Email</SortableHeader>
                <SortableHeader sortKey="role">Role</SortableHeader>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedUsers.map(user => (
                <tr key={user.id}>
                  <td data-label="Username" className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{user.username} {user.id === currentUser?.id && <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(You)</span>}</td>
                  <td data-label="Role" className="px-6 py-4">{user.role}</td>
                  <td data-label="Actions" className="px-6 py-4 text-right space-x-2">
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
                      disabled={user.id === currentUser?.id || user.role === UserRole.Admin}
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
            onPageChange={(page) => onUsersViewUpdate({ currentPage: page })}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
        />

      <Modal isOpen={isUserModalOpen} onClose={closeUserModal} title={editingUser ? "Edit User" : "Add New User"} size="sm">
          <UserForm user={editingUser} onSubmit={handleUserFormSubmit} onCancel={closeUserModal} errorMessage={formError} />
      </Modal>

      <Modal isOpen={isPermissionsModalOpen} onClose={() => setIsPermissionsModalOpen(false)} title="Cashier Role Permissions" size="md">
        <PermissionsModal onClose={() => setIsPermissionsModalOpen(false)} />
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