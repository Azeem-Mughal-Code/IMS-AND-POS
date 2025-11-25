
import React, { useState } from 'react';
import { useGlobalAuth } from '../../hooks/useGlobalAuth';
import { UserIcon, ComputerDesktopIcon, SearchIcon } from '../Icons';

interface GlobalAuthProps {
  onAuthSuccess: () => void;
  onSelectGuest: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
}

export const GlobalAuth: React.FC<GlobalAuthProps> = ({ onAuthSuccess, onSelectGuest, onSelectWorkspace }) => {
    const [authTab, setAuthTab] = useState<'owner' | 'employee'>('owner');
    
    // Owner State
    const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    // Employee State
    const [workspaceIdentifier, setWorkspaceIdentifier] = useState('');
    const [employeeError, setEmployeeError] = useState('');

    const { login, signup, getWorkspaceByIdOrAlias } = useGlobalAuth();

    const handleOwnerSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (mode === 'forgot') {
            // Mock password reset
            if (!email) {
                setError("Please enter your email.");
                return;
            }
            // In a real app, this would call an API
            setTimeout(() => {
                setSuccessMsg(`If an account exists for ${email}, a reset link has been sent.`);
                setTimeout(() => {
                    setMode('login');
                    setSuccessMsg('');
                }, 3000);
            }, 1000);
            return;
        }

        const result = mode === 'login' 
            ? login(email, password) 
            : signup(email, username, password);
            
        if (result.success) {
            onAuthSuccess();
        } else {
            setError(result.message || 'An unexpected error occurred.');
        }
    };

    const handleFindWorkspace = (e: React.FormEvent) => {
        e.preventDefault();
        setEmployeeError('');
        const trimmedInput = workspaceIdentifier.trim();
        if (!trimmedInput) {
            setEmployeeError('Please enter a Store Code or Workspace ID.');
            return;
        }
        
        const workspace = getWorkspaceByIdOrAlias(trimmedInput);
        if (workspace) {
            onSelectWorkspace(workspace.id);
        } else {
            setEmployeeError('Workspace not found on this device.');
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center items-center p-4 transition-colors duration-300">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-2">
                    IMS & POS
                </h1>
                <p className="text-gray-600 dark:text-gray-300 font-medium">Retail Management System</p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl rounded-2xl overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-gray-700">
                    <button 
                        onClick={() => setAuthTab('owner')}
                        className={`flex-1 py-4 text-sm font-semibold transition-all ${
                            authTab === 'owner' 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        Business Owner
                    </button>
                    <button 
                        onClick={() => setAuthTab('employee')}
                        className={`flex-1 py-4 text-sm font-semibold transition-all ${
                            authTab === 'employee' 
                            ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        Employee / POS
                    </button>
                </div>

                <div className="p-8">
                    {authTab === 'owner' ? (
                        <div className="animate-fadeIn">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 text-center">
                                {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Business Account' : 'Reset Password'}
                            </h2>
                            
                            <form onSubmit={handleOwnerSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        required 
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="you@company.com"
                                    />
                                </div>
                                {mode === 'signup' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                                        <input 
                                            type="text" 
                                            value={username} 
                                            onChange={e => setUsername(e.target.value)} 
                                            required 
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Admin Username"
                                        />
                                    </div>
                                )}
                                {mode !== 'forgot' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                        <input 
                                            type="password" 
                                            value={password} 
                                            onChange={e => setPassword(e.target.value)} 
                                            required 
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                        />
                                        {mode === 'login' && (
                                            <div className="text-right mt-1">
                                                <button type="button" onClick={() => { setMode('forgot'); setError(''); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                                    Forgot Password?
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-md">{error}</p>}
                                {successMsg && <p className="text-green-500 text-sm text-center bg-green-50 dark:bg-green-900/20 p-2 rounded-md">{successMsg}</p>}
                                <button 
                                    type="submit" 
                                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    {mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                                </button>
                            </form>

                            <div className="mt-6 text-center">
                                {mode === 'forgot' ? (
                                    <button 
                                        onClick={() => { setMode('login'); setError(''); }}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                                    >
                                        Back to Login
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-6">
                                <div className="mx-auto w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mb-3">
                                    <ComputerDesktopIcon />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Find Workspace</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter Store Code or Workspace ID.</p>
                            </div>

                            <form onSubmit={handleFindWorkspace} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Code / Workspace ID</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                            <SearchIcon />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={workspaceIdentifier} 
                                            onChange={e => setWorkspaceIdentifier(e.target.value)} 
                                            required 
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
                                            placeholder="e.g. WS-K9X2M4"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ask your manager for the Store Code.</p>
                                </div>
                                {employeeError && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-md">{employeeError}</p>}
                                <button 
                                    type="submit" 
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    Enter Store
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={onSelectGuest}
                className="mt-8 flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-lg transition-all duration-200 group"
            >
                <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                    <UserIcon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Try Demo Mode</span>
            </button>
        </div>
    );
};
