import React, { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { ProductProvider } from './ProductContext';
import { SalesProvider } from './SalesContext';
import { SettingsProvider } from './SettingsContext';
import { UIStateProvider } from './UIStateContext';

// The new AppProvider now composes all the other providers.
// The order is important to handle dependencies between contexts.
export const AppProvider: React.FC<{ children: ReactNode; businessName: string }> = ({ children, businessName }) => {
    return (
        <SettingsProvider businessName={businessName}>
            <UIStateProvider businessName={businessName}>
                <AuthProvider businessName={businessName}>
                    <ProductProvider businessName={businessName}>
                        <SalesProvider businessName={businessName}>
                            {children}
                        </SalesProvider>
                    </ProductProvider>
                </AuthProvider>
            </UIStateProvider>
        </SettingsProvider>
    );
};
