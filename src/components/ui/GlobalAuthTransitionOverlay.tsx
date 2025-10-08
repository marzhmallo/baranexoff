import React, { useEffect, useState } from 'react';
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';

const getState = () => {
  const active = typeof window !== 'undefined' && sessionStorage.getItem('auth:transition') === '1';
  const message = (typeof window !== 'undefined' && sessionStorage.getItem('auth:transitionMessage')) || 'Loading...';
  return { active, message };
};

const GlobalAuthTransitionOverlay: React.FC = () => {
  const [{ active, message }, setState] = useState(getState());

  useEffect(() => {
    const onChange = () => setState(getState());
    window.addEventListener('auth:transition', onChange);
    // In case of route changes without event, also check on visibility change
    document.addEventListener('visibilitychange', onChange);
    return () => {
      window.removeEventListener('auth:transition', onChange);
      document.removeEventListener('visibilitychange', onChange);
    };
  }, []);

  if (!active) return null;
  return <GlobalLoadingScreen message={message} />;
};

export default GlobalAuthTransitionOverlay;
