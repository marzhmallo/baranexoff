import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { setAuthTransition } from '@/lib/authTransition';

export function useLogoutWithLoader() {
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    // Persist a global overlay across route changes
    setAuthTransition('Logging out...');
    try {
      await signOut(); // AuthProvider handles navigation and cleanup
    } finally {
      // Local state only affects current component; global overlay stays until cleared on /login
      setIsLoggingOut(false);
    }
  };

  return { isLoggingOut, handleLogout };
}
