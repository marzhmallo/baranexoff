
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HouseholdSelectorProps {
  residentId: string;
  residentName: string;
  currentHouseholdId?: string | null;
  onHouseholdUpdate: () => void;
}

const HouseholdSelector = ({ 
  residentId, 
  residentName, 
  currentHouseholdId,
  onHouseholdUpdate 
}: HouseholdSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch households for selection
  const { data: households, isLoading } = useQuery({
    queryKey: ['households-for-selection', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('households')
        .select('id, name, address, purok, status')
        .order('name');

      if (searchTerm.length >= 2) {
        query = query.or(`name.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,purok.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const handleAssignToHousehold = async (householdId: string, householdName: string) => {
    try {
      const { error } = await supabase
        .from('residents')
        .update({ household_id: householdId })
        .eq('id', residentId);

      if (error) throw error;

      toast({
        title: "Household assigned successfully",
        description: `${residentName} has been assigned to ${householdName}.`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
      queryClient.invalidateQueries({ queryKey: ['household-members', householdId] });
      if (currentHouseholdId) {
        queryClient.invalidateQueries({ queryKey: ['household-members', currentHouseholdId] });
      }
      
      onHouseholdUpdate();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error assigning household:', error);
      toast({
        title: "Error assigning household",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromHousehold = async () => {
    try {
      const { error } = await supabase
        .from('residents')
        .update({ household_id: null })
        .eq('id', residentId);

      if (error) throw error;

      toast({
        title: "Removed from household",
        description: `${residentName} has been removed from their household.`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['resident', residentId] });
      if (currentHouseholdId) {
        queryClient.invalidateQueries({ queryKey: ['household-members', currentHouseholdId] });
      }
      
      onHouseholdUpdate();
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error removing from household:', error);
      toast({
        title: "Error removing from household",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {currentHouseholdId ? 'Change Household' : 'Assign to Household'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {currentHouseholdId ? 'Change' : 'Assign'} Household for {residentName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {currentHouseholdId && (
            <div className="p-3 bg-muted border border-border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                This resident is currently assigned to a household.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveFromHousehold}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                Remove from Current Household
              </Button>
            </div>
          )}
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search households by name, address, or purok..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {isLoading && (
            <p className="text-sm text-muted-foreground">Searching households...</p>
          )}
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {households?.map((household) => (
                <div
                  key={household.id}
                  className={`flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors ${
                    household.id === currentHouseholdId ? 'bg-primary/10 border-primary/20' : ''
                  }`}
                >
                  <div>
                    <p className="font-medium text-foreground">{household.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {household.address} • Purok {household.purok}
                    </p>
                    <p className="text-xs text-muted-foreground/80">Status: {household.status}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAssignToHousehold(household.id, household.name)}
                    disabled={household.id === currentHouseholdId}
                  >
                    {household.id === currentHouseholdId ? 'Current' : 'Assign'}
                  </Button>
                </div>
              ))}
              
              {searchTerm.length >= 2 && !isLoading && households?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No households found matching your search.
                </p>
              )}
              
              {searchTerm.length < 2 && !isLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Type at least 2 characters to search households.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HouseholdSelector;
