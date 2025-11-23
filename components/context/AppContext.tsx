
import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ProductProvider } from './ProductContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { UIStateProvider } from './UIStateContext';
import { CustomerProvider } from './CustomerContext';
import { GlobalUser } from '../../types';

// The new AppProvider now composes all the other providers.
// The order is important to handle dependencies between contexts.
export const AppProvider: React.FC<{ children: ReactNode; workspaceId: string, workspaceName: string, globalUser: GlobalUser | null }> = ({ children, workspaceId, workspaceName, globalUser }) => {
    return (
        <SettingsProvider workspaceId={workspaceId} workspaceName={workspaceName}>
            <UIStateProvider workspaceId={workspaceId}>
                <AuthProvider workspaceId={workspaceId} globalUser={globalUser}>
                    <CustomerProvider workspaceId={workspaceId}>
                        <ProductProvider workspaceId={workspaceId}>
                            <SalesProvider workspaceId={workspaceId}>
                                {children}
                            </SalesProvider>
                        </ProductProvider>
                    </CustomerProvider>
                </AuthProvider>
            </UIStateProvider>
        </SettingsProvider>
    );
};
