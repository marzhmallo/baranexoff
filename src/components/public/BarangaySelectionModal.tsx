import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BarangaySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: 'announcements' | 'events' | 'officials' | 'emergency' | 'forum';
}

interface Barangay {
  id: string;
  barangayname: string;
  municipality: string;
  country: string;
}

export const BarangaySelectionModal: React.FC<BarangaySelectionModalProps> = ({
  isOpen,
  onClose,
  contentType
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const navigate = useNavigate();

  // Get all data using the security definer function
  const { data: allBarangaysData, isLoading: allDataLoading } = useQuery({
    queryKey: ['all-barangays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_barangay_list' as any);
      
      if (error) throw error;
      return data as Barangay[];
    }
  });

  // Get unique countries
  const countries = React.useMemo(() => {
    if (!allBarangaysData) return [];
    return [...new Set(allBarangaysData.map(item => item.country))].sort();
  }, [allBarangaysData]);

  // Get municipalities for selected country
  const municipalities = React.useMemo(() => {
    if (!allBarangaysData || !selectedCountry) return [];
    return [...new Set(allBarangaysData
      .filter(item => item.country === selectedCountry)
      .map(item => item.municipality))].sort();
  }, [allBarangaysData, selectedCountry]);

  // Get barangays for selected municipality
  const barangays = React.useMemo(() => {
    if (!allBarangaysData || !selectedCountry || !selectedMunicipality) return [];
    return allBarangaysData.filter(item => 
      item.country === selectedCountry && 
      item.municipality === selectedMunicipality
    );
  }, [allBarangaysData, selectedCountry, selectedMunicipality]);

  // Reset selections when parent selections change
  useEffect(() => {
    setSelectedMunicipality('');
    setSelectedBarangay('');
  }, [selectedCountry]);

  useEffect(() => {
    setSelectedBarangay('');
  }, [selectedMunicipality]);

  const handleProceed = () => {
    if (!selectedBarangay) return;

    const selectedBarangayData = barangays?.find(b => b.id === selectedBarangay);
    if (!selectedBarangayData) return;

    // Save selection to localStorage
    localStorage.setItem('selectedBarangay', JSON.stringify({
      id: selectedBarangayData.id,
      name: selectedBarangayData.barangayname,
      municipality: selectedBarangayData.municipality,
      province: selectedBarangayData.country // Using country as province for now
    }));

    // Navigate to the selected content page
    navigate(`/public/${contentType}?barangay=${selectedBarangayData.id}`);
    onClose();
  };

  const getContentLabel = () => {
    switch (contentType) {
      case 'announcements':
        return 'Announcements';
      case 'events':
        return 'Events';
      case 'officials':
        return 'Officials';
      case 'emergency':
        return 'Emergency Services';
      case 'forum':
        return 'Community Forum';
      default:
        return 'Content';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Your Barangay</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select Country" />
              </SelectTrigger>
              <SelectContent>
                {allDataLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  countries?.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Municipality/City</label>
            <Select 
              value={selectedMunicipality} 
              onValueChange={setSelectedMunicipality}
              disabled={!selectedCountry}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Municipality/City" />
              </SelectTrigger>
              <SelectContent>
                {municipalities?.map((municipality) => (
                  <SelectItem key={municipality} value={municipality}>
                    {municipality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Barangay</label>
            <Select 
              value={selectedBarangay} 
              onValueChange={setSelectedBarangay}
              disabled={!selectedMunicipality}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Barangay" />
              </SelectTrigger>
              <SelectContent>
                {barangays?.map((barangay) => (
                  <SelectItem key={barangay.id} value={barangay.id}>
                    {barangay.barangayname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleProceed} 
            className="w-full" 
            disabled={!selectedBarangay}
          >
            View {getContentLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};