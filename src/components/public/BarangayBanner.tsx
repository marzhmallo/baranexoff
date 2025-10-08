import React from 'react';
import { Button } from '@/components/ui/button';
import { X, MapPin } from 'lucide-react';

interface BarangayBannerProps {
  onChangeBarangay: () => void;
  onDismiss: () => void;
}

export const BarangayBanner: React.FC<BarangayBannerProps> = ({ onChangeBarangay, onDismiss }) => {
  const selectedBarangay = localStorage.getItem('selectedBarangay');
  
  if (!selectedBarangay) return null;

  const barangayData = JSON.parse(selectedBarangay);

  return (
    <div className="bg-primary/10 border-b border-primary/20">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span>
              Viewing content for <strong>{barangayData.name}, {barangayData.municipality}</strong>
            </span>
            <Button 
              variant="link" 
              size="sm" 
              onClick={onChangeBarangay}
              className="p-0 h-auto text-primary hover:text-primary/80"
            >
              [Change]
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};