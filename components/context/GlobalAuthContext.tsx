
import React from 'react';
// This context is deprecated and replaced by the unified AuthContext logic.
// Keeping file to prevent build errors if imports exist elsewhere before full cleanup.
export const useGlobalAuth = () => { throw new Error("GlobalAuth is deprecated"); };
export const GlobalAuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => <>{children}</>;
