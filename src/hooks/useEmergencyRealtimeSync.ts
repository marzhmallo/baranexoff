import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export const useEmergencyRealtimeSync = () => {
  const { userProfile } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!userProfile?.brgyid) return;
    
    const channels = [
      // Emergency contacts realtime
      supabase.channel('emergency-contacts-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'emergency_contacts',
          filter: `brgyid=eq.${userProfile.brgyid}`
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['emergency-contacts'] });
          queryClient.invalidateQueries({ queryKey: ['emergency-stats'] });
        }),
      
      // Disaster zones realtime
      supabase.channel('disaster-zones-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'disaster_zones',
          filter: `brgyid=eq.${userProfile.brgyid}`
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['disaster-zones'] });
          queryClient.invalidateQueries({ queryKey: ['emergency-stats'] });
        }),
      
      // Evacuation centers realtime
      supabase.channel('evacuation-centers-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'evacuation_centers',
          filter: `brgyid=eq.${userProfile.brgyid}`
        }, () => {
          queryClient.invalidateQueries({ queryKey: ['evacuation-centers'] });
          queryClient.invalidateQueries({ queryKey: ['emergency-stats'] });
        }),
    ];
    
    // Subscribe all channels
    channels.forEach(channel => channel.subscribe());
    
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [userProfile?.brgyid, queryClient]);
};
