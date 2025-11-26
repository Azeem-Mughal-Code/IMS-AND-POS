
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
    const { currentUser, currentWorkspace, logout } = useAuth();

    if (!currentUser || !currentWorkspace) {
        return <UnifiedAuth />;
    }

    return (
        <AppProvider workspace={currentWorkspace}>
            <WorkspaceEffects>
                <MainLayout onSwitchWorkspace={logout} />
            </WorkspaceEffects>
        </AppProvider>
    );
};

export default App;
