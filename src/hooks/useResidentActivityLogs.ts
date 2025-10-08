import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface ActivityLog {
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

interface UseResidentActivityLogsParams {
  residentId: string;
  currentPage: number;
  itemsPerPage: number;
}

interface UseResidentActivityLogsReturn {
  activities: ActivityLog[];
  userProfiles: Record<string, UserProfile>;
  loading: boolean;
  totalItems: number;
  refetch: () => void;
}

export function useResidentActivityLogs(params: UseResidentActivityLogsParams): UseResidentActivityLogsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [userBrgyId, setUserBrgyId] = useState<string | null>(null);

  // Get user's brgy ID
  useEffect(() => {
    const getUserBrgyId = async () => {
      if (!user) return;
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('brgyid')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.brgyid) {
        setUserBrgyId(userProfile.brgyid);
      }
    };

    getUserBrgyId();
  }, [user]);

  // Filter activities related to the specific resident
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Check if the activity is related to this resident
      if (activity.details?.record_id === params.residentId) return true;
      if (activity.details?.resident_id === params.residentId) return true;
      if (activity.details?.residentId === params.residentId) return true;
      if (activity.details?.id === params.residentId) return true;
      
      // Check in nested details
      if (activity.details?.new_data?.id === params.residentId) return true;
      if (activity.details?.old_data?.id === params.residentId) return true;
      
      // Check action type and details content
      if (activity.action === 'resident_added' || activity.action === 'resident_updated' || activity.action === 'resident_deleted') {
        return JSON.stringify(activity.details).includes(params.residentId);
      }
      
      return false;
    });
  }, [activities, params.residentId]);

  // Paginated results
  const paginatedActivities = useMemo(() => {
    const startIndex = (params.currentPage - 1) * params.itemsPerPage;
    const endIndex = startIndex + params.itemsPerPage;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, params.currentPage, params.itemsPerPage]);

  // Update total items when filtered data changes
  useEffect(() => {
    setTotalItems(filteredActivities.length);
  }, [filteredActivities]);

  const fetchActivityLogs = useCallback(async () => {
    if (!user || !userBrgyId) return;

    try {
      setLoading(true);

      // Fetch all logs for this barangay
      const { data: logs, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('brgyid', userBrgyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs from logs
      const userIds = [...new Set(logs?.map(log => log.user_id) || [])];
      
      if (userIds.length > 0) {
        // Fetch only profiles with allowed roles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, firstname, lastname, username, email, role, profile_picture')
          .in('id', userIds)
          .in('role', ['user', 'admin', 'staff']);

        const profileMap = profiles?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: profile
        }), {}) || {};

        // Filter logs to only include those from users with allowed roles
        const filteredLogs = logs?.filter(log => profileMap[log.user_id]) || [];

        setActivities(filteredLogs);
        setUserProfiles(profileMap);
      } else {
        setActivities([]);
        setUserProfiles({});
      }
    } catch (error) {
      console.error('Error fetching resident activity logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, userBrgyId, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userBrgyId) return;

    const channel = supabase
      .channel('resident_activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
          filter: `brgyid=eq.${userBrgyId}`
        },
        (payload) => {
          // Refresh data when changes occur
          fetchActivityLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userBrgyId, fetchActivityLogs]);

  // Initial fetch
  useEffect(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  const refetch = useCallback(() => {
    fetchActivityLogs();
  }, [fetchActivityLogs]);

  return {
    activities: paginatedActivities,
    userProfiles,
    loading,
    totalItems,
    refetch
  };
}