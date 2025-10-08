
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface RankManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OfficialRank {
  id: string;
  rankno: string;
  ranklabel: string;
  brgyid: string;
  created_at: string;
  updated_at: string;
}

export const RankManagementDialog = ({ open, onOpenChange }: RankManagementDialogProps) => {
  const [newRank, setNewRank] = useState({ rankno: '', ranklabel: '' });
  const [editingRank, setEditingRank] = useState<OfficialRank | null>(null);
  const queryClient = useQueryClient();

  // Get current user's brgyid
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('brgyid')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Fetch existing ranks with real-time updates
  const { data: ranks, isLoading } = useQuery({
    queryKey: ['official-ranks'],
    queryFn: async () => {
      if (!currentUser?.brgyid) return [];
      
      const { data, error } = await supabase
        .from('officialranks')
        .select('*')
        .eq('brgyid', currentUser.brgyid)
        .order('rankno', { ascending: true });
      
      if (error) throw error;
      return data as OfficialRank[];
    },
    enabled: open && !!currentUser?.brgyid
  });

  // Set up real-time subscription for ranks
  useEffect(() => {
    if (!open || !currentUser?.brgyid) return;

    const channel = supabase
      .channel('official-ranks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'officialranks',
          filter: `brgyid=eq.${currentUser.brgyid}`
        },
        () => {
          // Invalidate queries to refetch the data
          queryClient.invalidateQueries({ queryKey: ['official-ranks'] });
          queryClient.invalidateQueries({ queryKey: ['officials-with-positions'] });
          queryClient.invalidateQueries({ queryKey: ['all-official-ranks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, currentUser?.brgyid, queryClient]);

  // Create rank mutation
  const createRankMutation = useMutation({
    mutationFn: async (rankData: { rankno: string; ranklabel: string }) => {
      if (!currentUser?.brgyid) {
        throw new Error('Barangay ID not found');
      }

      const { data: insertData, error: insertError } = await supabase
        .from('officialranks')
        .insert([{
          id: crypto.randomUUID(),
          rankno: rankData.rankno,
          ranklabel: rankData.ranklabel,
          brgyid: currentUser.brgyid,
          officialid: null, // Set to null when creating a new rank
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      return insertData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-ranks'] });
      queryClient.invalidateQueries({ queryKey: ['officials-with-positions'] });
      setNewRank({ rankno: '', ranklabel: '' });
      toast.success('Rank created successfully');
    },
    onError: (error) => {
      console.error('Error creating rank:', error);
      toast.error('Failed to create rank');
    }
  });

  // Update rank mutation
  const updateRankMutation = useMutation({
    mutationFn: async (rankData: { id: string; rankno: string; ranklabel: string }) => {
      const { data, error } = await supabase
        .from('officialranks')
        .update({
          rankno: rankData.rankno,
          ranklabel: rankData.ranklabel,
          updated_at: new Date().toISOString()
        })
        .eq('id', rankData.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-ranks'] });
      queryClient.invalidateQueries({ queryKey: ['officials-with-positions'] });
      setEditingRank(null);
      toast.success('Rank updated successfully');
    },
    onError: (error) => {
      console.error('Error updating rank:', error);
      toast.error('Failed to update rank');
    }
  });

  // Delete rank mutation
  const deleteRankMutation = useMutation({
    mutationFn: async (rankId: string) => {
      // First check if any officials are assigned to this rank
      const { data: officials, error: checkError } = await supabase
        .from('officialranks')
        .select('officialid')
        .eq('id', rankId)
        .not('officialid', 'is', null);
      
      if (checkError) throw checkError;
      
      if (officials && officials.length > 0) {
        throw new Error('Cannot delete rank with assigned officials');
      }

      const { error } = await supabase
        .from('officialranks')
        .delete()
        .eq('id', rankId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['official-ranks'] });
      queryClient.invalidateQueries({ queryKey: ['officials-with-positions'] });
      toast.success('Rank deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting rank:', error);
      toast.error(error.message || 'Failed to delete rank');
    }
  });

  const handleCreateRank = () => {
    if (!newRank.rankno || !newRank.ranklabel) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (!currentUser?.brgyid) {
      toast.error('Unable to determine your barangay. Please try logging in again.');
      return;
    }
    
    createRankMutation.mutate({
      rankno: newRank.rankno,
      ranklabel: newRank.ranklabel
    });
  };

  const handleUpdateRank = () => {
    if (!editingRank || !editingRank.ranklabel) {
      toast.error('Please fill in all fields');
      return;
    }
    
    updateRankMutation.mutate({
      id: editingRank.id,
      rankno: editingRank.rankno,
      ranklabel: editingRank.ranklabel
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Official Ranks</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create New Rank */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Rank
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rankno">Rank Number</Label>
                  <Input
                    id="rankno"
                    type="text"
                    placeholder="e.g., 1"
                    value={newRank.rankno}
                    onChange={(e) => setNewRank({ ...newRank, rankno: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="ranklabel">Rank Label</Label>
                  <Input
                    id="ranklabel"
                    placeholder="e.g., Barangay Captain"
                    value={newRank.ranklabel}
                    onChange={(e) => setNewRank({ ...newRank, ranklabel: e.target.value })}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateRank}
                disabled={createRankMutation.isPending || !currentUser?.brgyid}
              >
                {createRankMutation.isPending ? 'Creating...' : 'Create Rank'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Ranks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Existing Ranks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading ranks...</div>
              ) : ranks && ranks.length > 0 ? (
                <div className="space-y-4">
                  {ranks.map((rank) => (
                    <div key={rank.id} className="flex items-center justify-between p-4 border rounded-lg">
                      {editingRank?.id === rank.id ? (
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Rank {rank.rankno}</Badge>
                            <Input
                              value={editingRank.ranklabel}
                              onChange={(e) => setEditingRank({ ...editingRank, ranklabel: e.target.value })}
                              className="max-w-xs"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateRank} disabled={updateRankMutation.isPending}>
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingRank(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">Rank {rank.rankno}</Badge>
                            <span className="font-medium">{rank.ranklabel}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setEditingRank(rank)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteRankMutation.mutate(rank.id)}
                              disabled={deleteRankMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No ranks created yet. Create your first rank above.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
