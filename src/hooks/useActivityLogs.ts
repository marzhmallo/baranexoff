import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { DateRange } from "react-day-picker";

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
  roles: string[];
  profile_picture?: string;
}

interface UseActivityLogsParams {
  searchQuery: string;
  selectedUser: string;
  selectedAction: string | string[];
  dateRange: DateRange | undefined;
  currentPage: number;
  itemsPerPage: number;
}

interface UseActivityLogsReturn {
  activities: ActivityLog[];
  userProfiles: Record<string, UserProfile>;
  loading: boolean;
  totalItems: number;
  refetch: () => void;
}

const CACHE_KEY = 'activity_logs_cache';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

interface CacheData {
  data: ActivityLog[];
  profiles: Record<string, UserProfile>;
  timestamp: number;
  brgyid: string;
}

export function useActivityLogs(params: UseActivityLogsParams): UseActivityLogsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [userBrgyId, setUserBrgyId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Get user's brgy ID and roles
  useEffect(() => {
    const getUserInfo = async () => {
      if (!user) return;
      
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('brgyid')
        .eq('id', user.id)
        .single();
      
      if (userProfile?.brgyid) {
        setUserBrgyId(userProfile.brgyid);
      }

      // Fetch user roles from user_roles table
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (rolesData) {
        setUserRoles(rolesData.map(r => r.role));
      }
    };

    getUserInfo();
  }, [user]);

  // Cache utilities
  const getCachedData = useCallback((): CacheData | null => {
    if (!userBrgyId || !user) return null;
    
    try {
      const cached = localStorage.getItem(`${CACHE_KEY}_${userBrgyId}_${user.id}`);
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      const now = Date.now();
      
      if (now - data.timestamp > CACHE_DURATION) {
        localStorage.removeItem(`${CACHE_KEY}_${userBrgyId}_${user.id}`);
        return null;
      }
      
      return data;
    } catch {
      return null;
    }
  }, [userBrgyId, user]);

  const setCachedData = useCallback((data: ActivityLog[], profiles: Record<string, UserProfile>) => {
    if (!userBrgyId || !user) return;
    
    const cacheData: CacheData = {
      data,
      profiles,
      timestamp: Date.now(),
      brgyid: userBrgyId
    };
    
    try {
      localStorage.setItem(`${CACHE_KEY}_${userBrgyId}_${user.id}`, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache activity logs:', error);
    }
  }, [userBrgyId, user]);

  // Filter cached data based on current filters
  const filteredActivities = useMemo(() => {
    if (!activities.length) return [];

    let filtered = [...activities];

    // Apply search filter
    if (params.searchQuery.trim()) {
      const query = params.searchQuery.toLowerCase();
      filtered = filtered.filter(activity => 
        activity.action.toLowerCase().includes(query) ||
        JSON.stringify(activity.details || {}).toLowerCase().includes(query) ||
        userProfiles[activity.user_id]?.firstname?.toLowerCase().includes(query) ||
        userProfiles[activity.user_id]?.lastname?.toLowerCase().includes(query) ||
        userProfiles[activity.user_id]?.username?.toLowerCase().includes(query)
      );
    }

    // Apply action filter
    if (Array.isArray(params.selectedAction) && params.selectedAction.length > 0) {
      filtered = filtered.filter(activity => params.selectedAction.includes(activity.action));
    } else if (typeof params.selectedAction === 'string' && params.selectedAction !== 'all') {
      filtered = filtered.filter(activity => activity.action === params.selectedAction);
    }

    // Apply user filter (by role)
    if (params.selectedUser !== 'all') {
      filtered = filtered.filter(activity => {
        const userRolesArr = userProfiles[activity.user_id]?.roles || [];
        return userRolesArr.includes(params.selectedUser);
      });
    }

    // Apply date range filter
    if (params.dateRange?.from) {
      filtered = filtered.filter(activity => {
        const activityDate = new Date(activity.created_at);
        const fromDate = new Date(params.dateRange!.from!);
        fromDate.setHours(0, 0, 0, 0);
        
        if (params.dateRange?.to) {
          const toDate = new Date(params.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          return activityDate >= fromDate && activityDate <= toDate;
        } else {
          // If only 'from' date is selected, show activities from that date onwards
          return activityDate >= fromDate;
        }
      });
    }

    return filtered;
  }, [activities, userProfiles, params]);

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

  const fetchActivityLogs = useCallback(async (useCache = true) => {
    if (!user || !userBrgyId || userRoles.length === 0) return;

    try {
      // Try to use cached data first
      if (useCache) {
        const cached = getCachedData();
        if (cached) {
          setActivities(cached.data);
          setUserProfiles(cached.profiles);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      // Check if user is admin or staff
      const isAdminOrStaff = userRoles.includes('admin') || userRoles.includes('staff');

      // Fetch logs based on role
      let logsQuery = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (isAdminOrStaff) {
        // Admins/staff see all logs in their barangay
        logsQuery = logsQuery.eq('brgyid', userBrgyId);
      } else {
        // Regular users see only their own logs
        logsQuery = logsQuery.eq('user_id', user.id);
      }

      const { data: logs, error } = await logsQuery;

      if (error) throw error;

      // Get unique user IDs from logs
      const userIds = [...new Set(logs?.map(log => log.user_id) || [])];
      
      if (userIds.length > 0) {
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, firstname, lastname, username, email, profile_picture')
          .in('id', userIds);

        // Fetch roles for all users
        const { data: allUserRoles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);

        // Group roles by user_id
        const rolesMap = (allUserRoles || []).reduce((acc, item) => {
          if (!acc[item.user_id]) {
            acc[item.user_id] = [];
          }
          acc[item.user_id].push(item.role);
          return acc;
        }, {} as Record<string, string[]>);

        // Build profile map with roles
        const profileMap = profiles?.reduce((acc, profile) => ({
          ...acc,
          [profile.id]: {
            ...profile,
            roles: rolesMap[profile.id] || []
          }
        }), {}) || {};

        // Filter out users with glyph or overseer roles
        const filteredLogs = logs?.filter(log => {
          const userRolesArr = profileMap[log.user_id]?.roles || [];
          return !userRolesArr.includes('glyph') && !userRolesArr.includes('overseer');
        }) || [];

        setActivities(filteredLogs);
        setUserProfiles(profileMap);

        // Cache the filtered data
        setCachedData(filteredLogs, profileMap);
      } else {
        setActivities([]);
        setUserProfiles({});
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch activity logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, userBrgyId, userRoles, getCachedData, setCachedData, toast]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userBrgyId) return;

    const channel = supabase
      .channel('activity_logs_changes')
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
          fetchActivityLogs(false);
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
    if (userBrgyId && user) {
      localStorage.removeItem(`${CACHE_KEY}_${userBrgyId}_${user.id}`);
    }
    fetchActivityLogs(false);
  }, [userBrgyId, user, fetchActivityLogs]);

  return {
    activities: paginatedActivities,
    userProfiles,
    loading,
    totalItems,
    refetch
  };
}