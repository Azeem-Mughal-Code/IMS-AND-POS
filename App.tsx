
import React, { useState, useEffect } from 'react';
import { AppProvider } from './components/context/AppContext';
import { useAuth } from './components/context/AuthContext';
import { useSettings } from './components/context/SettingsContext';
import { MainLayout } from './components/layout/MainLayout';
import usePersistedState from './hooks/usePersistedState';
import { useUIState } from './components/context/UIStateContext';
import { useGlobalAuth } from './hooks/useGlobalAuth';
import { GlobalAuth } from './components/auth/GlobalAuth';
import { WorkspaceSelector } from './components/auth/WorkspaceSelector';
import { GlobalUser } from './types';

// Local authentication form for a specific workspace
const WorkspaceAuthForm: React.FC<{ onSwitchWorkspace: () => void; }> = ({ onSwitchWorkspace }) => {
  const { workspaceName } = useSettings();
  const { users, login, signup } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isNewBusiness = users.length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    let success = false;
    if (isNewBusiness) {
        if (password.length < 4) {
            setError("Password must be at least 4 characters long.");
            return;
        }
        const result = signup(username, password);
        success = result.success;
        if (!success) setError(result.message || 'Could not create account.');
    } else {
        success = login(username, password);
        if (!success) setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2 truncate">{workspaceName}</h1>
          <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-6">
            {isNewBusiness ? 'Create Admin Account' : 'Login'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" />
            </div>
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
              {isNewBusiness ? 'Create Account' : 'Login'}
            </button>
          </form>
          <div className="text-center mt-6">
            <button onClick={onSwitchWorkspace} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Switch Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Container for the main app UI within a workspace
const WorkspaceUI: React.FC<{ onSwitchWorkspace: () => void }> = ({ onSwitchWorkspace }) => {
  const { currentUser } = useAuth();
  const { theme } = useSettings();
  const { zoomLevel } = useUIState();

  useEffect(() => {
    document.documentElement.style.fontSize = `${zoomLevel * 100}%`;
  }, [zoomLevel]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      if (theme === 'dark' || (theme === 'system' && mediaQuery.matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme();
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  if (!currentUser) {
    return <WorkspaceAuthForm onSwitchWorkspace={onSwitchWorkspace} />;
  }

  return <MainLayout onSwitchWorkspace={onSwitchWorkspace} />;
};

const WorkspaceContainer: React.FC<{ workspaceId: string; workspaceName: string, onSwitchWorkspace: () => void, globalUser: GlobalUser | null }> = ({ workspaceId, workspaceName, onSwitchWorkspace, globalUser }) => {
    // This component ensures contexts are re-mounted with the correct scope when workspaceId changes.
    return (
        <AppProvider workspaceId={workspaceId} workspaceName={workspaceName} globalUser={globalUser}>
            <WorkspaceUI onSwitchWorkspace={onSwitchWorkspace} />
        </AppProvider>
    );
};

const App: React.FC = () => {
    const { currentGlobalUser, logout: globalLogout, workspaces } = useGlobalAuth();
    const [selectedWorkspaceId, setSelectedWorkspaceId] = usePersistedState<string | null>('ims-selected-workspace-id', null);

    const handleGlobalLogout = () => {
        globalLogout();
        setSelectedWorkspaceId(null);
    };

    const handleSwitchWorkspace = () => {
        setSelectedWorkspaceId(null);
    };

    // 1. If a workspace is explicitly selected (either via Employee Login, Guest Mode, or Owner Selection), load it.
    // This prioritizes the "Shop Floor" view regardless of who is logged in globally.
    if (selectedWorkspaceId) {
        let workspaceName = 'Workspace';
        if (selectedWorkspaceId === 'guest_workspace') {
            workspaceName = 'Guest Workspace';
        } else {
            const ws = workspaces.find(w => w.id === selectedWorkspaceId);
            if (ws) workspaceName = ws.name;
        }
        return (
            <WorkspaceContainer 
                key={selectedWorkspaceId} 
                workspaceId={selectedWorkspaceId} 
                workspaceName={workspaceName} 
                onSwitchWorkspace={handleSwitchWorkspace} 
                globalUser={currentGlobalUser}
            />
        );
    }

    // 2. If no workspace is selected and no global user is logged in, show the Landing/Global Auth page.
    if (!currentGlobalUser) {
        return (
            <GlobalAuth 
                onAuthSuccess={() => { /* Auto-redirect happens because currentGlobalUser becomes not null */ }}
                onSelectGuest={() => setSelectedWorkspaceId('guest_workspace')}
                onSelectWorkspace={(id) => setSelectedWorkspaceId(id)}
            />
        );
    }

    // 3. If Global User is logged in but hasn't picked a workspace, show the Selector.
    return <WorkspaceSelector onSelectWorkspace={setSelectedWorkspaceId} onLogout={handleGlobalLogout} />;
};

export default App;
