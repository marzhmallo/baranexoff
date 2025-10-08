import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Monitor, LogOut, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MobileBlocker: React.FC = () => {
  const { userProfile, signOut } = useAuth();
  const [shouldBlock, setShouldBlock] = useState(false);

  useEffect(() => {
    const checkDeviceAndRole = () => {
      const isAdminOrStaff = userProfile?.role === 'admin' || userProfile?.role === 'staff';
      const isMobileOrTablet = window.innerWidth < 1024;
      
      setShouldBlock(isAdminOrStaff && isMobileOrTablet);
    };

    checkDeviceAndRole();
    window.addEventListener('resize', checkDeviceAndRole);
    
    return () => window.removeEventListener('resize', checkDeviceAndRole);
  }, [userProfile]);

  if (!shouldBlock) return null;

  return (
    <div className="fixed inset-0 bg-background z-[9999] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Monitor className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Desktop Required
          </h1>
          <p className="text-muted-foreground text-lg">
            Administrative features are optimized for desktop
          </p>
        </div>

        {/* Feature List */}
        <div className="bg-muted/50 rounded-lg p-6 space-y-3 text-left">
          <p className="text-sm text-muted-foreground font-medium mb-4">
            Desktop access provides:
          </p>
          <div className="space-y-2">
            {[
              'Full dashboard visibility',
              'Advanced data management tools',
              'Detailed analytics and reports',
              'Efficient multi-panel workflows'
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestion */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-foreground">
            For mobile access, please use the{' '}
            <span className="font-semibold text-primary">public portal</span> or{' '}
            <span className="font-semibold text-primary">user view</span>
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={signOut}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileBlocker;
