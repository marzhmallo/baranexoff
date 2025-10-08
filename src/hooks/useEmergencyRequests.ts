import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

export const useEmergencyRequests = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['emergency-requests', userProfile?.brgyid],
    queryFn: async () => {
      if (!userProfile?.brgyid) throw new Error('No barangay ID');

      const { data, error } = await supabase
        .from('emergency_requests')
        .select('*')
        .eq('brgyid', userProfile.brgyid)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.brgyid,
    staleTime: 1000 * 30, // 30 seconds for critical emergency data
  });
  
  // Setup realtime subscription
  useEffect(() => {
    if (!userProfile?.brgyid) return;
    
    const channel = supabase
      .channel('emergency-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
          filter: `brgyid=eq.${userProfile.brgyid}`
        },
        (payload) => {
          // Invalidate query to trigger refetch
          queryClient.invalidateQueries({ 
            queryKey: ['emergency-requests', userProfile.brgyid] 
          });
          
          // Show toast for new emergency
          if (payload.eventType === 'INSERT') {
            toast({
              title: "🚨 New Emergency Request",
              description: `${(payload.new as any).request_type} request received`,
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.brgyid, queryClient]);
  
  return query;
};
