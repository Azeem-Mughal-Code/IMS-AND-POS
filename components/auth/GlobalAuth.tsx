
import React from 'react';
import { UnifiedAuth } from './UnifiedAuth';

interface GlobalAuthProps {
  onAuthSuccess: () => void;
  onSelectGuest: () => void;
  onSelectWorkspace: (workspaceId: string) => void;
}

export const GlobalAuth: React.FC<GlobalAuthProps> = (props) => {
    // This component is deprecated in favor of UnifiedAuth.
    // Returning UnifiedAuth to maintain functionality if this component is still used anywhere.
    return <UnifiedAuth />;
};
