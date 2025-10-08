import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import PublicPagesSidebar from '@/components/layout/PublicPagesSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';

const PublicPageLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  useEffect(() => {
    const handleSidebarChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsSidebarCollapsed(customEvent.detail.isCollapsed);
    };

    window.addEventListener('publicSidebarStateChange', handleSidebarChange);

    return () => {
      window.removeEventListener('publicSidebarStateChange', handleSidebarChange);
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full">
      <PublicPagesSidebar />
      <div 
        className={`flex-1 transition-all duration-300 ease-in-out animate-fade-in ${
          isMobile 
            ? 'ml-0 mb-14 pt-14' 
            : isTablet 
            ? 'ml-16' 
            : (isSidebarCollapsed ? 'ml-16' : 'ml-64')
        }`}
      >
        <Outlet />
      </div>
    </div>
  );
};

export default PublicPageLayout;