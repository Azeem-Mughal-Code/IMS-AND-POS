import React, { useState } from 'react';
import { useGlobalAuth } from '../../hooks/useGlobalAuth';
import { PlusIcon, LogoutIcon, PencilIcon, ClipboardIcon, CheckCircleIcon } from '../Icons';
import { Workspace } from '../../types';

interface WorkspaceSelectorProps {
  onSelectWorkspace: (workspaceId: string) => void;
  onLogout: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ onSelectWorkspace, onLogout }) => {
    const { currentGlobalUser, getUserWorkspaces, createWorkspace, updateWorkspace } = useGlobalAuth();
    const [isCreating, setIsCreating] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    
    const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const userWorkspaces = getUserWorkspaces();

    const handleCreate = async () => {
        if (newWorkspaceName.trim()) {
            const newWs = await createWorkspace(newWorkspaceName.trim());
            if (newWs) {
                onSelectWorkspace(newWs.id);
            }
        }
        setIsCreating(false);
        setNewWorkspaceName('');
    };

    const handleStartEdit = (ws: Workspace) => {
        setEditingWorkspaceId(ws.id);
        setEditName(ws.name);
    };

    const handleSaveEdit = () => {
        if (editingWorkspaceId && editName.trim()) {
            updateWorkspace(editingWorkspaceId, editName.trim());
            setEditingWorkspaceId(null);
            setEditName('');
        }
    };

    const handleCancelEdit = () => {
        setEditingWorkspaceId(null);
        setEditName('');
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleLogout = async () => {
        onLogout();
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white">Welcome</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentGlobalUser?.username || currentGlobalUser?.email}</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md">
                        <LogoutIcon />
                        <span>Logout</span>
                    </button>
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Select a Workspace</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {userWorkspaces.map(ws => (
                        editingWorkspaceId === ws.id ? (
                            <div key={ws.id} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col gap-4">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    placeholder="Workspace Name"
                                    autoFocus
                                    className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit();
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleCancelEdit} className="flex-1 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                                    <button onClick={handleSaveEdit} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div key={ws.id} onClick={() => onSelectWorkspace(ws.id)} className="relative p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all text-left cursor-pointer">
                                <div className="absolute top-2 right-2 flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1 shadow-sm z-10 opacity-100">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopyId(ws.id); }} 
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300" 
                                        title="Copy Workspace ID"
                                    >
                                        {copiedId === ws.id ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4"/>}
                                    </button>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleStartEdit(ws); }} 
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-blue-600 dark:text-blue-400" 
                                        title="Rename Workspace"
                                    >
                                        <PencilIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                                <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400 truncate pr-12">{ws.name}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Workspace
                                </p>
                            </div>
                        )
                    ))}
                    
                    {isCreating ? (
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col gap-4">
                            <input
                                type="text"
                                value={newWorkspaceName}
                                onChange={e => setNewWorkspaceName(e.target.value)}
                                placeholder="Business Name"
                                autoFocus
                                className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') setIsCreating(false);
                                }}
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setIsCreating(false)} className="flex-1 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                                <button onClick={handleCreate} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Create</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreating(true)} className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 transition-colors">
                            <PlusIcon />
                            <span className="mt-2 text-sm font-medium">Create New Workspace</span>
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};