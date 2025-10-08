import React from 'react';

const GlobalLoadingScreen: React.FC<{ message?: string }> = ({ message = "Initializing your dashboard..." }) => {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="text-center">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 rounded-full mx-auto w-20 h-20 flex items-center justify-center mb-4">
            <svg 
              className="w-10 h-10 text-primary-foreground" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Baranex
          </h1>
          <p className="text-muted-foreground text-sm mt-2" aria-live="polite">Community Connect Platform</p>
        </div>

        {/* Loading Animation */}
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
          <div className="absolute inset-0 animate-pulse">
            <div className="rounded-full h-12 w-12 bg-primary/10 mx-auto"></div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="mt-6">
          <p className="text-muted-foreground text-sm animate-pulse">
            {message}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoadingScreen;