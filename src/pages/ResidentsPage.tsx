
import React from 'react';
import ResidentsList from '@/components/residents/ResidentsList';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EditResidentModal from '@/components/residents/EditResidentModal';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { getResidents } from '@/lib/api/residents';

const ResidentsPage = () => {
  const [isAddResidentOpen, setIsAddResidentOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();

  // Fetch residents data - simple loading pattern like calendar/feedback pages
  const { isLoading } = useQuery({
    queryKey: ['residents'],
    queryFn: getResidents,
    enabled: !!userProfile
  });


  const handleCloseDialog = () => {
    console.log("Dialog close handler triggered");
    
    // First close the dialog through state
    setIsAddResidentOpen(false);
    
    // Then clean up any lingering effects to ensure UI remains interactive
    setTimeout(() => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.pointerEvents = '';
      
      // Remove any focus traps or aria-hidden attributes that might be lingering
      const elements = document.querySelectorAll('[aria-hidden="true"]');
      elements.forEach(el => {
        el.setAttribute('aria-hidden', 'false');
      });

      // Refresh the residents list
      queryClient.invalidateQueries({
        queryKey: ['residents']
      });
      
      console.log("Dialog cleanup completed");
    }, 150);
  };

  // Show loading screen only during initial load like calendar/feedback pages
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <UserPlus className="h-8 w-8 animate-spin text-primary" />
            <div className="absolute inset-0 h-8 w-8 animate-pulse rounded-full border border-primary/20" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">Loading residents</p>
            <p className="text-xs text-muted-foreground mt-1">Preparing resident registry and statistics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resident Registry</h1>
          <p className="text-muted-foreground mt-2">Manage and track resident information in your barangay</p>
        </div>
        
        <Button 
          onClick={() => setIsAddResidentOpen(true)}
          className="bg-baranex-primary hover:bg-baranex-primary/90"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Resident
        </Button>
      </div>
      
      <Card className="shadow-lg border-t-4 border-t-baranex-primary bg-card text-card-foreground">
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-200px)] overflow-auto">
            <ResidentsList />
          </div>
        </CardContent>
      </Card>
      
      {/* Add Resident Modal */}
      <EditResidentModal 
        isOpen={isAddResidentOpen} 
        onClose={handleCloseDialog}
        resident={null}
      />
      
      {/* Make sure Toaster is included on the page */}
      <Toaster />
    </div>
  );
};

export default ResidentsPage;
