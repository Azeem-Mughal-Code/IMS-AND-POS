
import React, { useEffect } from 'react';
import { AppProvider } from './components/context/AppContext';
import { useAuth } from './components/context/AuthContext';
import { MainLayout } from './components/layout/MainLayout';
import { UnifiedAuth } from './components/auth/UnifiedAuth';
import { useUIState } from './components/context/UIStateContext';
import { useSettings } from './components/context/SettingsContext';

// Internal component to handle theme/zoom effects within the workspace context
const WorkspaceEffects: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

    return <>{children}</>;
};

const App: React.FC = () => {
    const { currentUser, currentWorkspace, logout, encryptionRevision } = useAuth();

    if (!currentUser || !currentWorkspace) {
        return <UnifiedAuth />;
    }

    // Using encryptionRevision as part of the key forces the entire AppProvider tree to unmount and remount
    // whenever the encryption key is repaired via "Emergency Key Repair". 
    // This ensures all useLiveQuery hooks in child components re-subscribe and fetch fresh, decrypted data from Dexie.
    return (
        <AppProvider workspace={currentWorkspace} key={`workspace-${currentWorkspace.id}-rev-${encryptionRevision || 0}`}>
            <WorkspaceEffects>
                <MainLayout onSwitchWorkspace={logout} />
            </WorkspaceEffects>
        </AppProvider>
    );
};

export default App;
