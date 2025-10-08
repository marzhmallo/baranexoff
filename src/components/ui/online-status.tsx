
import React from 'react';
import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const OnlineStatus = ({ isOnline = false, className, size = 'md' }: OnlineStatusProps) => {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <div className={cn("relative inline-flex", className)}>
      <div
        className={cn(
          "rounded-full border-2 border-white",
          sizeClasses[size],
          isOnline ? "bg-green-500" : "bg-gray-400"
        )}
      />
      {isOnline && (
        <div
          className={cn(
            "absolute rounded-full bg-green-500 animate-ping",
            sizeClasses[size]
          )}
        />
      )}
    </div>
  );
};

export default OnlineStatus;
