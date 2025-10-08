import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HouseholdActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: any;
  created_at: string;
  ip?: string;
  agent?: string;
  brgyid: string;
}

interface UserProfile {
  id: string;
  firstname?: string;
  lastname?: string;
  username: string;
  email: string;
  role: string;
  profile_picture?: string;
}

interface UseHouseholdActivityLogsProps {
  householdId: string;
  currentPage: number;
  itemsPerPage: number;
}

export const useHouseholdActivityLogs = ({ householdId, currentPage, itemsPerPage }: UseHouseholdActivityLogsProps) => {
  const [activities, setActivities] = useState<HouseholdActivityLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [totalItems, setTotalItems] = useState(0);

  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ['household-activity-logs', householdId, currentPage, itemsPerPage],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Query for logs where the household ID appears in the details
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .or(`details->>household_id.eq.${householdId},details->>record_id.eq.${householdId},details->>table_name.eq.households`)
        .order('created_at', { ascending: false })
        .range(offset, offset + itemsPerPage - 1);

      if (error) {
        console.error('Error fetching household activity logs:', error);
        throw error;
      }

      return {
        logs: data as HouseholdActivityLog[],
        totalCount: count || 0
      };
    },
    enabled: !!householdId,
  });

  // Fetch user profiles when logs change
  useEffect(() => {
    if (logsData?.logs) {
      setActivities(logsData.logs);
      setTotalItems(logsData.totalCount);

      const userIds = [...new Set(logsData.logs.map(log => log.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        supabase
          .from('profiles')
          .select('id, firstname, lastname, username, email, role')
          .in('id', userIds)
          .then(({ data: profiles, error }) => {
            if (error) {
              console.error('Error fetching user profiles:', error);
              return;
            }

            const profileMap: Record<string, UserProfile> = {};
            profiles?.forEach(profile => {
              profileMap[profile.id] = profile as UserProfile;
            });
            setUserProfiles(profileMap);
          });
      }
    }
  }, [logsData]);

  return {
    activities,
    userProfiles,
    loading: isLoading,
    totalItems,
    refetch: () => refetch()
  };
};