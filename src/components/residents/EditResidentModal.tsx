import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Resident } from "@/lib/types";
import EnhancedResidentPhotoUpload from "./EnhancedResidentPhotoUpload";
import ResidentForm from "./ResidentForm";

interface EditResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident?: Resident | null;
}

const EditResidentModal = ({ isOpen, onClose, resident }: EditResidentModalProps) => {
  const handlePhotoUploaded = (url: string) => {
    // The photo URL will be handled by the ResidentForm component
    console.log('Photo uploaded:', url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-7xl h-[95vh] flex flex-col p-0">
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-tight">
              {resident ? 'Edit Resident' : 'Add New Resident'}
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              {resident 
                ? 'Update resident information and profile picture below.'
                : 'Add a new resident with their information and profile picture.'
              }
            </DialogDescription>
          </DialogHeader>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Responsive Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              
              {/* Left Column: Profile Picture Upload */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 border border-border/50 shadow-sm">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium mb-2">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground">Upload or capture a photo</p>
                  </div>
                  <EnhancedResidentPhotoUpload
                    residentId={resident?.id}
                    existingPhotoUrl={resident?.photoUrl}
                    onPhotoUploaded={handlePhotoUploaded}
                  />
                </div>
              </div>

              {/* Right Column: Resident Form */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-xl border border-border/50 shadow-sm">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-medium mb-2">Personal Information</h3>
                    <p className="text-sm text-muted-foreground">Fill in the resident details below</p>
                  </div>
                  <div className="p-6">
                    <ResidentForm 
                      resident={resident} 
                      onSubmit={onClose}
                    />
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditResidentModal;