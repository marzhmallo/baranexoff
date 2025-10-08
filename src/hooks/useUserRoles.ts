import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'staff' | 'user' | 'glyph' | 'overseer';

export const useUserRoles = (userId?: string) => {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      // Get current user if no userId provided
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        targetUserId = user?.id;
      }

      if (!targetUserId) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return (data?.map(r => r.role as AppRole) || []);
    },
    enabled: true,
  });
};

// Helper function to check if user has a specific role
export const hasRole = (roles: AppRole[] | undefined, role: AppRole): boolean => {
  return roles?.includes(role) || false;
};
