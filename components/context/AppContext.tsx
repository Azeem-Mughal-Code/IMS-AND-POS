
import React, { ReactNode } from 'react';
import { ProductProvider } from './ProductContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { UIStateProvider } from './UIStateContext';
import { CustomerProvider } from './CustomerContext';
import { Workspace } from '../../types';

// This provider now wraps the functional parts of the app that require a workspace context.
// It assumes AuthProvider is a parent and currentWorkspace is valid.
export const AppProvider: React.FC<{ children: ReactNode; workspace: Workspace }> = ({ children, workspace }) => {
    const { id, name } = workspace;
    
    return (
        <SettingsProvider workspaceId={id} workspaceName={name}>
            <UIStateProvider workspaceId={id}>
                <CustomerProvider workspaceId={id}>
                    <ProductProvider workspaceId={id}>
                        <SalesProvider workspaceId={id}>
                            {children}
                        </SalesProvider>
                    </ProductProvider>
                </CustomerProvider>
            </UIStateProvider>
        </SettingsProvider>
    );
};
