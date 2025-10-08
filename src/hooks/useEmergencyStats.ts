import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export const useEmergencyStats = () => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: ['emergency-stats', userProfile?.brgyid],
    queryFn: async () => {
      if (!userProfile?.brgyid) throw new Error('No barangay ID');

      // Fetch all stats in parallel
      const [contacts, zones, centers] = await Promise.all([
        supabase
          .from('emergency_contacts')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', userProfile.brgyid),
        supabase
          .from('disaster_zones')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', userProfile.brgyid),
        supabase
          .from('evacuation_centers')
          .select('*')
          .eq('brgyid', userProfile.brgyid),
      ]);
      
      return {
        emergencyContacts: contacts.count || 0,
        disasterZones: zones.count || 0,
        evacuationCenters: centers.data?.length || 0,
        availableCenters: centers.data?.filter(c => c.status === 'available').length || 0,
        totalCapacity: centers.data?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0,
        currentOccupancy: centers.data?.reduce((sum, c) => sum + (c.occupancy || 0), 0) || 0,
      };
    },
    enabled: !!userProfile?.brgyid,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
