import React, { useState, FormEvent, useEffect } from 'react';
import { AppProvider } from './components/context/AppContext';
import { useAuth } from './components/context/AuthContext';
import { useSettings } from './components/context/SettingsContext';
import { MainLayout } from './components/layout/MainLayout';
import useLocalStorage from './hooks/useLocalStorage';
import { useUIState } from './components/context/UIStateContext';

// Component to select a business workspace
const BusinessSelector: React.FC<{ onSelect: (name: string) => void }> = ({ onSelect }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSelect(name.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
          <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2">IMS / POS System</h1>
          <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white mb-6">Enter Business Name</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Business Name</label>
              <input
                id="businessName"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
                placeholder="e.g., My Awesome Store"
              />
            </div>
            <button type="submit" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// AuthForm Component for Login/Signup within a business context
const AuthForm: React.FC<{ onGoBack: () => void; }> = ({ onGoBack }) => {
  const { businessName } = useSettings();
  const { users, login, signup } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const isNewBusiness = users.length === 0;

  const handleSubmit = (e: FormEvent) => {
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
          <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-2 truncate">{businessName}</h1>
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
            <button onClick={onGoBack} className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
              Not your business? Go back.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BusinessWorkspace: React.FC<{ onGoBack: () => void }> = ({ onGoBack }) => {
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
    return <AuthForm onGoBack={onGoBack} />;
  }

  return <MainLayout />;
};


const App: React.FC = () => {
    const [businessName, setBusinessName] = useLocalStorage<string | null>('ims-current-business', null);

    if (!businessName) {
        return <BusinessSelector onSelect={setBusinessName} />;
    }

    return (
      <AppProvider businessName={businessName}>
        <BusinessWorkspace onGoBack={() => setBusinessName(null)} />
      </AppProvider>
    );
};

export default App;