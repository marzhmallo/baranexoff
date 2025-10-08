import React from 'react';

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout = ({ children }: UserLayoutProps) => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Main content container with top padding to account for fixed header */}
      <main className="pt-28 md:pt-0 min-h-screen max-w-full overflow-x-hidden px-2 md:px-0">
        {children}
      </main>
    </div>
  );
};

export default UserLayout;