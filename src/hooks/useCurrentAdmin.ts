
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useCurrentAdmin = () => {
  const [adminProfileId, setAdminProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getCurrentAdminProfile = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setAdminProfileId(null);
          setIsLoading(false);
          return;
        }
        
        // Get admin profile from profiles table
        const { data: profile, error } = await supabase
          .from('public_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error('Error fetching admin profile:', error);
          setAdminProfileId(null);
        } else {
          setAdminProfileId(profile?.id || null);
        }
      } catch (error) {
        console.error('Error getting current admin:', error);
        setAdminProfileId(null);
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentAdminProfile();
  }, []);

  return { adminProfileId, isLoading };
};
