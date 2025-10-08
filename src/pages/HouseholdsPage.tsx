import React, { useState } from 'react';
import HouseholdList from '@/components/households/HouseholdList';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import HouseholdForm from '@/components/households/HouseholdForm';
import { useQueryClient } from '@tanstack/react-query';
const HouseholdPage = () => {
  const [isAddHouseholdOpen, setIsAddHouseholdOpen] = useState(false);
  const queryClient = useQueryClient();
  const handleCloseDialog = () => {
    console.log("Dialog close handler triggered");

    // First close the dialog through state
    setIsAddHouseholdOpen(false);

    // Then clean up any lingering effects to ensure UI remains interactive
    setTimeout(() => {
      document.body.classList.remove('overflow-hidden');
      document.body.style.pointerEvents = '';

      // Remove any focus traps or aria-hidden attributes that might be lingering
      const elements = document.querySelectorAll('[aria-hidden="true"]');
      elements.forEach(el => {
        el.setAttribute('aria-hidden', 'false');
      });

      // Refresh the households list
      queryClient.invalidateQueries({
        queryKey: ['households']
      });
      console.log("Dialog cleanup completed");
    }, 150);
  };
  return <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Household Registry</h1>
          <p className="text-muted-foreground mt-2">Track and manage households within the barangay</p>
        </div>
        
        <Button onClick={() => setIsAddHouseholdOpen(true)} className="bg-baranex-primary hover:bg-baranex-primary/90 py-0 mx-0 px-[10px]">
          <Home className="h-4 w-4 mr-2" />
          Add Household
        </Button>
      </div>
      
      <Card className="shadow-lg border-t-4 border-t-baranex-primary bg-card text-card-foreground">
        <CardContent className="p-6 px-0 py-0">
          <div className="max-h-[calc(100vh-200px)] overflow-auto">
            <HouseholdList />
          </div>
        </CardContent>
      </Card>
      
      {/* Add Household Dialog */}
      <Dialog open={isAddHouseholdOpen} onOpenChange={isOpen => {
      console.log("Dialog open state changed to:", isOpen);
      if (!isOpen) {
        handleCloseDialog();
      } else {
        setIsAddHouseholdOpen(true);
      }
    }}>
        <DialogContent className="sm:max-w-[600px]" onInteractOutside={e => {
        console.log("Interaction outside dialog detected");
        e.preventDefault();
      }} onEscapeKeyDown={e => {
        console.log("Escape key pressed");
        e.preventDefault();
      }}>
          <DialogHeader>
            <DialogTitle>Add New Household</DialogTitle>
            <DialogDescription>
              Enter the household information below. Required fields are marked with an asterisk (*).
            </DialogDescription>
          </DialogHeader>
          <HouseholdForm onSubmit={handleCloseDialog} />
        </DialogContent>
      </Dialog>
      
      <Toaster />
    </div>;
};
export default HouseholdPage;