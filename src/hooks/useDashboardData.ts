
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  totalResidents: number;
  totalHouseholds: number;
  activeAnnouncements: number;
  upcomingEvents: number;
  monthlyResidents: Array<{ month: string; residents: number }>;
  genderDistribution: Array<{ gender: string; count: number; percentage: number }>;
  residentGrowthRate: number;
  householdGrowthRate: number;
  newResidentsThisMonth: number;
  newHouseholdsThisMonth: number;
  newAnnouncementsThisWeek: number;
  nextEventDays: number | null;
  totalDeceased: number;
  totalRelocated: number;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export const useDashboardData = (brgyid?: string) => {
  // Check localStorage synchronously to avoid flash, with 5-minute expiration
  const getCachedData = (): DashboardData | null => {
    try {
      const cacheKey = brgyid ? `dashboardData_${brgyid}` : 'preloadedDashboardData';
      const timestampKey = brgyid ? `dashboardData_timestamp_${brgyid}` : 'preloadedDashboardData_timestamp';
      
      const cached = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(timestampKey);
      
      if (!cached || !timestamp) return null;
      
      // Check if cache is older than 5 minutes (300000 ms)
      const now = Date.now();
      const cacheAge = now - parseInt(timestamp);
      const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
      
      if (cacheAge > CACHE_EXPIRY) {
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(timestampKey);
        return null;
      }
      
      return JSON.parse(cached);
    } catch {
      return null;
    }
  };

  // Initialize with cached data if available
  const [data, setData] = useState<DashboardData>(() => {
    const cachedData = getCachedData();
    const refreshDataPlaceholder = async () => {}; // Placeholder, will be replaced
    
    if (cachedData) {
      return { ...cachedData, isLoading: false, refreshData: refreshDataPlaceholder };
    }
    
    return {
      totalResidents: 0,
      totalHouseholds: 0,
      activeAnnouncements: 0,
      upcomingEvents: 0,
      monthlyResidents: [],
      genderDistribution: [],
      residentGrowthRate: 0,
      householdGrowthRate: 0,
      newResidentsThisMonth: 0,
      newHouseholdsThisMonth: 0,
      newAnnouncementsThisWeek: 0,
      nextEventDays: null,
      totalDeceased: 0,
      totalRelocated: 0,
      isLoading: true,
      error: null,
      refreshData: refreshDataPlaceholder,
    };
  });

  // Add a refresh function that can be called manually
  const refreshData = async () => {
    // Clear cache before fetching fresh data
    const cacheKey = brgyid ? `dashboardData_${brgyid}` : 'preloadedDashboardData';
    const timestampKey = brgyid ? `dashboardData_timestamp_${brgyid}` : 'preloadedDashboardData_timestamp';
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(timestampKey);
    
    setData(prev => ({ ...prev, isLoading: true }));
    await fetchDashboardData();
  };

  const fetchDashboardData = async () => {
      try {
        // Fetch total active residents (excluding deceased and relocated)
        const { count: residentsCount, error: residentsError } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .not('status', 'in', '("Deceased","Relocated")');

        if (residentsError) throw residentsError;

        // Fetch deceased residents count
        const { count: deceasedCount, error: deceasedError } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .eq('status', 'Deceased');

        if (deceasedError) throw deceasedError;

        // Fetch relocated residents count
        const { count: relocatedCount, error: relocatedError } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .eq('status', 'Relocated');

        if (relocatedError) throw relocatedError;

        // Fetch total households
        const { count: householdsCount, error: householdsError } = await supabase
          .from('households')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string);

        if (householdsError) throw householdsError;

        // Fetch active announcements
        const { count: announcementsCount, error: announcementsError } = await supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string);

        if (announcementsError) throw announcementsError;

        // Fetch upcoming events
        const { count: eventsCount, error: eventsError } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .gte('start_time', new Date().toISOString());

        if (eventsError) throw eventsError;

        // Calculate growth rates and monthly additions
        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const startOfThisWeek = new Date(now.setDate(now.getDate() - now.getDay()));

        // Fetch active residents added this month (excluding deceased and relocated)
        const { count: newResidentsThisMonth, error: newResidentsError } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .gte('created_at', startOfThisMonth.toISOString())
          .not('status', 'in', '("Deceased","Relocated")');

        if (newResidentsError) throw newResidentsError;

        // Fetch active residents added last month (excluding deceased and relocated)
        const { count: newResidentsLastMonth, error: lastMonthResidentsError } = await supabase
          .from('residents')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .gte('created_at', startOfLastMonth.toISOString())
          .lt('created_at', startOfThisMonth.toISOString())
          .not('status', 'in', '("Deceased","Relocated")');

        if (lastMonthResidentsError) throw lastMonthResidentsError;

        // Fetch households added this month
        const { count: newHouseholdsThisMonth, error: newHouseholdsError } = await supabase
          .from('households')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .gte('created_at', startOfThisMonth.toISOString());

        if (newHouseholdsError) throw newHouseholdsError;

        // Fetch households added last month
        const { count: newHouseholdsLastMonth, error: lastMonthHouseholdsError } = await supabase
          .from('households')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .gte('created_at', startOfLastMonth.toISOString())
          .lt('created_at', startOfThisMonth.toISOString());

        if (lastMonthHouseholdsError) throw lastMonthHouseholdsError;

        // Fetch announcements added this week
        const { count: newAnnouncementsThisWeek, error: weekAnnouncementsError } = await supabase
          .from('announcements')
          .select('*', { count: 'exact', head: true })
          .eq('brgyid', brgyid as string)
          .gte('created_at', startOfThisWeek.toISOString());

        if (weekAnnouncementsError) throw weekAnnouncementsError;

        // Find next upcoming event
        const { data: nextEvent, error: nextEventError } = await supabase
          .from('events')
          .select('start_time')
          .eq('brgyid', brgyid as string)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1)
          .single();

        let nextEventDays = null;
        if (!nextEventError && nextEvent) {
          const eventDate = new Date(nextEvent.start_time);
          const today = new Date();
          const diffTime = eventDate.getTime() - today.getTime();
          nextEventDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Calculate growth rates
        const residentGrowthRate = newResidentsLastMonth > 0 
          ? ((newResidentsThisMonth || 0) - (newResidentsLastMonth || 0)) / (newResidentsLastMonth || 1) * 100
          : newResidentsThisMonth > 0 ? 100 : 0;

        const householdGrowthRate = newHouseholdsLastMonth > 0 
          ? ((newHouseholdsThisMonth || 0) - (newHouseholdsLastMonth || 0)) / (newHouseholdsLastMonth || 1) * 100
          : newHouseholdsThisMonth > 0 ? 100 : 0;

        // Fetch monthly active residents data (excluding deceased and relocated, up to current month only)
        const { data: monthlyData, error: monthlyError } = await supabase
          .from('residents')
          .select('created_at')
          .eq('brgyid', brgyid as string)
          .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
          .not('status', 'in', '("Deceased","Relocated")');

        if (monthlyError) throw monthlyError;

        // Process monthly data (only up to current month)
        const monthlyResidents = processMonthlyData(monthlyData || []);

        // Fetch gender distribution from active residents table (excluding deceased and relocated)
        const { data: genderData, error: genderError } = await supabase
          .from('residents')
          .select('gender')
          .eq('brgyid', brgyid as string)
          .not('status', 'in', '("Deceased","Relocated")');

        if (genderError) throw genderError;

        const genderDistribution = processGenderDistribution(genderData || [], residentsCount || 0);

        const dashboardData = {
          totalResidents: residentsCount || 0,
          totalHouseholds: householdsCount || 0,
          activeAnnouncements: announcementsCount || 0,
          upcomingEvents: eventsCount || 0,
          monthlyResidents,
          genderDistribution,
          residentGrowthRate,
          householdGrowthRate,
          newResidentsThisMonth: newResidentsThisMonth || 0,
          newHouseholdsThisMonth: newHouseholdsThisMonth || 0,
          newAnnouncementsThisWeek: newAnnouncementsThisWeek || 0,
          nextEventDays,
          totalDeceased: deceasedCount || 0,
          totalRelocated: relocatedCount || 0,
          isLoading: false,
          error: null,
          refreshData,
        };

        // Cache the data with timestamp
        const cacheKey = brgyid ? `dashboardData_${brgyid}` : 'preloadedDashboardData';
        const timestampKey = brgyid ? `dashboardData_timestamp_${brgyid}` : 'preloadedDashboardData_timestamp';
        localStorage.setItem(cacheKey, JSON.stringify(dashboardData));
        localStorage.setItem(timestampKey, Date.now().toString());
        
        setData(dashboardData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        }));
      }
    };

  useEffect(() => {
    // Check if we have valid cached data, if not fetch fresh data
    const cachedData = getCachedData();
    if (!cachedData) {
      fetchDashboardData();
    }
  }, [brgyid]);

  // Expose refresh function alongside data
  return { ...data, refreshData };
};

// Helper function to process monthly data (only up to current month)
const processMonthlyData = (data: Array<{ created_at: string }>) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyCount: Record<string, number> = {};
  
  // Initialize months up to current month only
  for (let i = 0; i <= currentMonth; i++) {
    monthlyCount[months[i]] = 0;
  }

  // Count residents by month (only up to current month)
  data.forEach(resident => {
    const date = new Date(resident.created_at);
    const residentYear = date.getFullYear();
    const residentMonth = date.getMonth();
    
    // Only include data from current year and up to current month
    if (residentYear === currentYear && residentMonth <= currentMonth) {
      const monthName = months[residentMonth];
      if (monthlyCount.hasOwnProperty(monthName)) {
        monthlyCount[monthName]++;
      }
    }
  });

  // Convert to array format and calculate cumulative (only up to current month)
  let cumulative = 0;
  return months.slice(0, currentMonth + 1).map(month => {
    cumulative += monthlyCount[month];
    return {
      month,
      residents: cumulative
    };
  });
};

// Helper function to process gender distribution
const processGenderDistribution = (data: Array<{ gender: string }>, totalResidents: number) => {
  const genderCount: Record<string, number> = {};
  
  // Count each gender
  data.forEach(resident => {
    let gender = resident.gender || 'Unknown';
    // Normalize gender values
    gender = gender.toLowerCase();
    if (gender === 'male' || gender === 'm') {
      gender = 'Male';
    } else if (gender === 'female' || gender === 'f') {
      gender = 'Female';
    } else if (gender === 'other' || gender === 'o') {
      gender = 'Other';
    } else {
      gender = 'Unknown';
    }
    genderCount[gender] = (genderCount[gender] || 0) + 1;
  });

  // Convert to array format with percentages
  return Object.entries(genderCount).map(([gender, count]) => ({
    gender,
    count,
    percentage: totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0
  }));
};
