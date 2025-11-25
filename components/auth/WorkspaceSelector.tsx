
import React, { useState } from 'react';
import { useGlobalAuth } from '../../hooks/useGlobalAuth';
import { PlusIcon, LogoutIcon, PencilIcon, ClipboardIcon, CheckCircleIcon, TagIcon } from '../Icons';
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
    const [editAlias, setEditAlias] = useState('');
    const [editError, setEditError] = useState('');
    
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
        setEditAlias(ws.alias || '');
        setEditError('');
    };

    const handleSaveEdit = () => {
        if (editingWorkspaceId && editName.trim()) {
            const result = updateWorkspace(editingWorkspaceId, { 
                name: editName.trim(),
                alias: editAlias.trim() || undefined
            });
            
            if (result.success) {
                setEditingWorkspaceId(null);
                setEditName('');
                setEditAlias('');
                setEditError('');
            } else {
                setEditError(result.message || 'Update failed');
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingWorkspaceId(null);
        setEditName('');
        setEditAlias('');
        setEditError('');
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
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
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        placeholder="Workspace Name"
                                        autoFocus
                                        className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-semibold">Store Code</label>
                                    <input
                                        type="text"
                                        value={editAlias}
                                        onChange={e => setEditAlias(e.target.value)}
                                        placeholder="e.g. WS-STORE-01"
                                        className="w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 font-mono uppercase"
                                    />
                                </div>
                                {editError && <p className="text-xs text-red-500">{editError}</p>}
                                <div className="flex gap-2">
                                    <button onClick={handleCancelEdit} className="flex-1 px-4 py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md">Cancel</button>
                                    <button onClick={handleSaveEdit} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div key={ws.id} onClick={() => onSelectWorkspace(ws.id)} className="relative p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all text-left cursor-pointer group">
                                <div className="absolute top-2 right-2 flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1 shadow-sm z-10">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleStartEdit(ws); }} 
                                        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-blue-600 dark:text-blue-400" 
                                        title="Edit Workspace"
                                    >
                                        <PencilIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-white truncate pr-8 mb-3">{ws.name}</h3>
                                
                                {ws.alias && (
                                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md mb-2 border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center gap-2">
                                            <TagIcon className="w-4 h-4 text-gray-500" />
                                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200 tracking-wider">{ws.alias}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleCopy(ws.alias, `alias-${ws.id}`); }} 
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-500 dark:text-gray-400" 
                                            title="Copy Store Code"
                                        >
                                            {copiedId === `alias-${ws.id}` ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                )}

                                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
                                    <span className="truncate">ID: {ws.id}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopy(ws.id, `id-${ws.id}`); }} 
                                        className="hover:text-blue-500"
                                        title="Copy Internal ID"
                                    >
                                        {copiedId === `id-${ws.id}` ? <CheckCircleIcon className="w-3 h-3 text-green-500" /> : <ClipboardIcon className="w-3 h-3"/>}
                                    </button>
                                </div>
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
                        <button onClick={() => setIsCreating(true)} className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 transition-colors h-full min-h-[160px]">
                            <PlusIcon />
                            <span className="mt-2 text-sm font-medium">Create New Workspace</span>
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};
