
import { Official } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye, Users, UserPlus, Building } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import LocalizedLoadingScreen from '@/components/ui/LocalizedLoadingScreen';

interface OrganizationalChartProps {
  officials: Official[];
  isLoading: boolean;
  error: Error | null;
  isMobile?: boolean;
}

interface OfficialRank {
  id: string;
  rankno: string;
  ranklabel: string;
  brgyid: string;
  officialid: string | null;
  created_at: string;
  updated_at: string;
}

export const OrganizationalChart = ({
  officials,
  isLoading,
  error,
  isMobile = false
}: OrganizationalChartProps) => {
  const [selectedOfficial, setSelectedOfficial] = useState<Official | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedRankId, setSelectedRankId] = useState<string>('');
  const [selectedOfficialForAssignment, setSelectedOfficialForAssignment] = useState<string>('');
  const queryClient = useQueryClient();

  // Get current user's brgyid
  const {
    data: currentUser,
    isLoading: isCurrentUserLoading
  } = useQuery({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const {
        data,
        error
      } = await supabase.from('profiles').select('brgyid').eq('id', user.id).single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch all ranks with real-time updates
  const {
    data: allRanks,
    isLoading: isRanksLoading
  } = useQuery({
    queryKey: ['all-official-ranks'],
    queryFn: async () => {
      if (!currentUser?.brgyid) return [];
      const {
        data,
        error
      } = await supabase.from('officialranks').select('*').eq('brgyid', currentUser.brgyid).order('rankno', {
        ascending: true
      });
      if (error) throw error;
      return data as OfficialRank[];
    },
    enabled: !!currentUser?.brgyid
  });

  // Set up real-time subscription for ranks
  useEffect(() => {
    if (!currentUser?.brgyid) return;

    const channel = supabase
      .channel('organizational-chart-ranks')
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
          queryClient.invalidateQueries({ queryKey: ['all-official-ranks'] });
          queryClient.invalidateQueries({ queryKey: ['officials-with-positions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.brgyid, queryClient]);

  // Assign official to rank mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      rankId,
      officialId
    }: {
      rankId: string;
      officialId: string;
    }) => {
      const {
        data,
        error
      } = await supabase.from('officialranks').update({
        officialid: officialId,
        updated_at: new Date().toISOString()
      }).eq('id', rankId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['all-official-ranks']
      });
      queryClient.invalidateQueries({
        queryKey: ['officials-with-positions']
      });
      setShowAssignDialog(false);
      setSelectedRankId('');
      setSelectedOfficialForAssignment('');
      toast.success('Official assigned to rank successfully');
    },
    onError: error => {
      console.error('Error assigning official to rank:', error);
      toast.error('Failed to assign official to rank');
    }
  });

  const handleAssignOfficial = (rankId: string) => {
    setSelectedRankId(rankId);
    setShowAssignDialog(true);
  };

  const handleConfirmAssignment = () => {
    if (!selectedRankId || !selectedOfficialForAssignment) {
      toast.error('Please select an official');
      return;
    }
    assignMutation.mutate({
      rankId: selectedRankId,
      officialId: selectedOfficialForAssignment
    });
  };

  const getOfficialInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Get officials assigned to specific ranks
  const getOfficialsForRank = (rankId: string) => {
    return officials.filter(official => {
      const rank = allRanks?.find(r => r.id === rankId);
      return rank?.officialid === official.id;
    });
  };

  // Get unassigned officials for the assignment dropdown
  const unassignedOfficials = officials.filter(official => {
    const hasRank = allRanks?.some(rank => rank.officialid === official.id);
    return !hasRank;
  });

  // Check if any critical data is still loading
  const isAnyLoading = isLoading || isCurrentUserLoading || isRanksLoading;

  // Calculate totals for summary
  const getTotals = () => {
    const totalOfficials = officials.length;
    const assignedOfficials = allRanks?.filter(rank => rank.officialid).length || 0;
    const unassignedOfficials = totalOfficials - assignedOfficials;
    return {
      totalOfficials,
      assignedOfficials,
      unassignedOfficials,
      totalRanks: allRanks?.length || 0
    };
  };

  if (error) {
    return <div className="p-6 text-destructive bg-card rounded-lg border">
        Error loading officials: {error.message}
      </div>;
  }

  const totals = getTotals();

  return <div className="relative space-y-6">
      {/* Localized Loading Screen */}
      <LocalizedLoadingScreen 
        isLoading={isAnyLoading} 
        icon={Users} 
        loadingText="Loading officials" 
      />
      
      <div className={`text-center ${isMobile ? 'mb-4' : 'mb-8'}`}>
        <h2 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-foreground mb-2`}>Barangay Officials</h2>
        <p className={`${isMobile ? 'text-sm' : 'text-base'} text-muted-foreground`}>Official Directory</p>
      </div>

      {/* Display all ranks individually using their actual rank labels */}
      {allRanks?.map(rank => {
        const official = getOfficialsForRank(rank.id)[0];
        const rankNum = parseInt(rank.rankno);
        
        // Determine styling based on rank number - using theme-aware classes
        let cardStyle = '';
        let badgeColor = 'bg-muted-foreground';
        let statusText = 'Appointed';
        
        if (rankNum === 1) {
          cardStyle = 'border-2 border-purple-500/20 bg-purple-50 dark:bg-purple-950/20';
          badgeColor = 'bg-purple-500';
          statusText = 'Elected';
        } else if (rankNum >= 2 && rankNum <= 11) {
          cardStyle = 'border-2 border-blue-500/20 bg-blue-50 dark:bg-blue-950/20';
          badgeColor = 'bg-blue-500';
          statusText = 'Elected';
        } else if (rankNum >= 12 && rankNum <= 14) {
          cardStyle = 'border-2 border-orange-500/20 bg-orange-50 dark:bg-orange-950/20';
          badgeColor = 'bg-orange-500';
          statusText = 'Elected';
        } else if (rankNum >= 15 && rankNum <= 21) {
          cardStyle = 'border-2 border-red-500/20 bg-red-50 dark:bg-red-950/20';
          badgeColor = 'bg-red-500';
          statusText = 'Appointed';
        } else if (rankNum >= 22 && rankNum <= 24) {
          cardStyle = 'border-2 border-teal-500/20 bg-teal-50 dark:bg-teal-950/20';
          badgeColor = 'bg-teal-500';
          statusText = 'Appointed';
        } else if (rankNum >= 25 && rankNum <= 28) {
          cardStyle = 'border-2 border-purple-500/20 bg-purple-50 dark:bg-purple-950/20';
          badgeColor = 'bg-purple-600';
          statusText = 'Appointed';
        }

        return (
          <Card key={rank.id} className={`overflow-hidden ${cardStyle}`}>
            <CardHeader className={isMobile ? 'pb-3' : 'pb-4'}>
              <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${badgeColor}`}>
                    <Building className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-white`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className={`${isMobile ? 'text-base' : 'text-xl'} flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-2'}`}>
                      <span className="truncate">{rank.ranklabel}</span>
                      <Badge variant="outline" className={`${badgeColor} text-white border-none ${isMobile ? 'w-fit text-xs' : ''}`}>
                        Rank {rank.rankno}
                      </Badge>
                    </CardTitle>
                  </div>
                </div>
                <Button 
                  size={isMobile ? 'sm' : 'sm'} 
                  variant="outline" 
                  onClick={() => handleAssignOfficial(rank.id)} 
                  className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}
                >
                  <UserPlus className="h-4 w-4" />
                  {isMobile ? 'Assign Official' : 'Assign'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {official ? (
                <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-4 ${isMobile ? 'p-4' : 'p-6'} rounded-lg bg-card border`}>
                  <Avatar className={`${isMobile ? 'h-20 w-20 mx-auto' : 'h-16 w-16'} ring-2 ring-offset-2 ring-primary`}>
                    <AvatarImage src={official.photo_url} alt={official.name} />
                    <AvatarFallback className={`${badgeColor} text-white ${isMobile ? 'text-xl' : 'text-lg'} font-semibold`}>
                      {getOfficialInitials(official.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 min-w-0 ${isMobile ? 'text-center' : ''}`}>
                    <h4 className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'} truncate text-foreground`}>
                      {official.name}
                    </h4>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>
                      {rank.ranklabel}
                    </p>
                    <div className={`flex gap-2 mt-2 ${isMobile ? 'justify-center' : ''}`}>
                      <Badge className={`${badgeColor} text-white ${isMobile ? 'text-xs' : ''}`}>
                        {statusText}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size={isMobile ? 'sm' : 'sm'} 
                    onClick={() => setSelectedOfficial(official)}
                    className={isMobile ? 'w-full' : ''}
                  >
                    <Eye className="h-4 w-4" />
                    {isMobile && <span className="ml-2">View Details</span>}
                  </Button>
                </div>
              ) : (
                <div className={`text-center ${isMobile ? 'py-6' : 'py-8'} text-muted-foreground bg-muted/30 rounded-lg border`}>
                  <Building className={`${isMobile ? 'h-6 w-6' : 'h-8 w-8'} mx-auto mb-2 opacity-50`} />
                  <p className={isMobile ? 'text-xs' : 'text-sm'}>No official assigned to this position</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Organization Summary */}
      <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-500/20">
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 text-blue-700 dark:text-blue-300 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Building className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            Organization Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
            <div className={`text-center ${isMobile ? 'p-3' : 'p-4'} bg-card rounded-lg shadow-sm border`}>
              <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-blue-600 dark:text-blue-400 mb-1`}>{totals.totalOfficials}</div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Total Officials</div>
            </div>
            <div className={`text-center ${isMobile ? 'p-3' : 'p-4'} bg-card rounded-lg shadow-sm border`}>
              <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-green-600 dark:text-green-400 mb-1`}>{totals.assignedOfficials}</div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Assigned Officials</div>
            </div>
            <div className={`text-center ${isMobile ? 'p-3' : 'p-4'} bg-card rounded-lg shadow-sm border`}>
              <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-orange-600 dark:text-orange-400 mb-1`}>{totals.unassignedOfficials}</div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Unassigned Officials</div>
            </div>
            <div className={`text-center ${isMobile ? 'p-3' : 'p-4'} bg-card rounded-lg shadow-sm border`}>
              <div className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold text-purple-600 dark:text-purple-400 mb-1`}>{totals.totalRanks}+</div>
              <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-muted-foreground`}>Available Ranks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Official to Rank</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRankId && allRanks && <div className="p-4 bg-muted rounded-lg">
                <p><strong>Rank:</strong> {allRanks.find(r => r.id === selectedRankId)?.ranklabel}</p>
              </div>}
            
            <div>
              <Label htmlFor="official-select">Select Official</Label>
              <Select value={selectedOfficialForAssignment} onValueChange={setSelectedOfficialForAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an official..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedOfficials.map(official => <SelectItem key={official.id} value={official.id}>
                      {official.name} - {official.position}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {unassignedOfficials.length === 0 && <p className="text-sm text-muted-foreground mt-2">
                  No unassigned officials available
                </p>}
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmAssignment} disabled={assignMutation.isPending || !selectedOfficialForAssignment}>
                {assignMutation.isPending ? 'Assigning...' : 'Assign Official'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Details Dialog */}
      <Dialog open={!!selectedOfficial} onOpenChange={() => setSelectedOfficial(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedOfficial?.name}</DialogTitle>
          </DialogHeader>
          {selectedOfficial && <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedOfficial.photo_url} alt={selectedOfficial.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getOfficialInitials(selectedOfficial.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedOfficial.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedOfficial.position}</p>
                </div>
              </div>
              
              {selectedOfficial.bio && <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedOfficial.bio}</p>
                </div>}
              
              <div className="space-y-2">
                {selectedOfficial.email && <div className="text-sm">
                    <span className="font-medium">Email:</span> {selectedOfficial.email}
                  </div>}
                {selectedOfficial.phone && <div className="text-sm">
                    <span className="font-medium">Phone:</span> {selectedOfficial.phone}
                  </div>}
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
