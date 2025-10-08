
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Official } from '@/lib/types';

interface AssignOfficialToRankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  official: Official | null;
}

interface OfficialRank {
  id: string;
  rankno: string; // Changed from number to string
  ranklabel: string;
}

export const AssignOfficialToRankDialog = ({ open, onOpenChange, official }: AssignOfficialToRankDialogProps) => {
  const [selectedRankId, setSelectedRankId] = useState<string>('');
  const queryClient = useQueryClient();

  // Fetch available ranks with real-time updates
  const { data: ranks } = useQuery({
    queryKey: ['official-ranks-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('officialranks')
        .select('id, rankno, ranklabel')
        .order('rankno', { ascending: true });
      
      if (error) throw error;
      return data as OfficialRank[];
    },
    enabled: open
  });

  // Set up real-time subscription for ranks
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel('assign-rank-dialog')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'officialranks'
        },
        () => {
          // Invalidate queries to refetch the data
          queryClient.invalidateQueries({ queryKey: ['official-ranks-for-assignment'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, queryClient]);

  // Assign official to rank mutation
  const assignMutation = useMutation({
    mutationFn: async ({ rankId, officialId }: { rankId: string; officialId: string }) => {
      const { data, error } = await supabase
        .from('officialranks')
        .update({
          officialid: officialId,
          updated_at: new Date().toISOString()
        })
        .eq('id', rankId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-ranks'] });
      queryClient.invalidateQueries({ queryKey: ['officials-with-positions'] });
      setSelectedRankId('');
      onOpenChange(false);
      toast.success('Official assigned to rank successfully');
    },
    onError: (error) => {
      console.error('Error assigning official to rank:', error);
      toast.error('Failed to assign official to rank');
    }
  });

  const handleAssign = () => {
    if (!selectedRankId || !official) {
      toast.error('Please select a rank');
      return;
    }
    
    assignMutation.mutate({
      rankId: selectedRankId,
      officialId: official.id
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Official to Rank</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {official && (
            <div className="p-4 bg-muted rounded-lg">
              <p><strong>Official:</strong> {official.name}</p>
              <p><strong>Position:</strong> {official.position}</p>
            </div>
          )}
          
          <div>
            <Label htmlFor="rank-select">Select Rank</Label>
            <Select value={selectedRankId} onValueChange={setSelectedRankId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a rank..." />
              </SelectTrigger>
              <SelectContent>
                {ranks?.map((rank) => (
                  <SelectItem key={rank.id} value={rank.id}>
                    Rank {rank.rankno}: {rank.ranklabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={assignMutation.isPending || !selectedRankId}
            >
              {assignMutation.isPending ? 'Assigning...' : 'Assign to Rank'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
