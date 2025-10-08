import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export const useEmergencyContacts = (limit?: number) => {
  const { userProfile } = useAuth();
  
  return useQuery({
    queryKey: ['emergency-contacts', userProfile?.brgyid, limit],
    queryFn: async () => {
      if (!userProfile?.brgyid) throw new Error('No barangay ID');

      let query = supabase
        .from('emergency_contacts')
        .select('id, name, phone_number, type')
        .eq('brgyid', userProfile.brgyid);
      
      if (limit) query = query.limit(limit);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!userProfile?.brgyid,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
