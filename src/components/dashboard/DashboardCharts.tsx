import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { FileText, Users, Home, ChevronRight, UserX, MapPin } from 'lucide-react';
import { useData } from "@/context/DataContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from 'react';
import { UAParser } from 'ua-parser-js';
import { Phone, Mail, Clock } from 'lucide-react';
import CachedAvatar from "@/components/ui/CachedAvatar";

interface ActivityLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string;
  ip?: string;
  agent?: string;
}

interface UserProfile {
  id: string;
  firstname?: string;
  lastname?: string;
  username: string;
  role: string;
  profile_picture?: string;
}

interface BarangayContact {
  phone?: string;
  email?: string;
  officehours?: string;
}

// Function to parse device information from User-Agent string using ua-parser-js
const parseDeviceInfo = (userAgent?: string): string => {
  if (!userAgent) return 'Unknown Device';
  
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    const { browser, os, device } = result;
    
    // Check if it's a mobile device
    if (device.type === 'mobile' || device.type === 'tablet') {
      if (device.vendor && device.model) {
        return `${device.vendor} ${device.model} (${browser.name || 'Unknown Browser'})`;
      } else if (os.name && os.version) {
        return `${os.name} ${os.version} (${browser.name || 'Unknown Browser'})`;
      } else {
        return `Mobile Device (${browser.name || 'Unknown Browser'})`;
      }
    }
    
    // Desktop/Laptop devices
    let deviceInfo = '';
    
    // Build OS info
    if (os.name) {
      deviceInfo = os.name;
      if (os.version) {
        deviceInfo += ` ${os.version}`;
      }
    } else {
      deviceInfo = 'Unknown OS';
    }
    
    // Add browser info
    if (browser.name) {
      deviceInfo += ` (${browser.name}`;
      if (browser.version) {
        // Only show major version number
        const majorVersion = browser.version.split('.')[0];
        deviceInfo += ` ${majorVersion}`;
      }
      deviceInfo += ')';
    }
    
    return deviceInfo || 'Unknown Device';
  } catch (error) {
    console.error('Error parsing user agent:', error);
    return 'Unknown Device';
  }
};

const DashboardCharts = () => {
  const { residents, households, loading: dataLoading } = useData();
  const { userProfile } = useAuth();
  
  // Get cached activities synchronously to prevent flash
  const getCachedActivities = (brgyid: string): { activities: ActivityLog[]; profiles: Record<string, UserProfile> } | null => {
    try {
      const cached = localStorage.getItem(`dashboardActivities_${brgyid}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  // Initialize with cached data if available
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>(() => {
    if (userProfile?.brgyid) {
      const cached = getCachedActivities(userProfile.brgyid);
      return cached?.activities || [];
    }
    return [];
  });
  
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>(() => {
    if (userProfile?.brgyid) {
      const cached = getCachedActivities(userProfile.brgyid);
      return cached?.profiles || {};
    }
    return {};
  });
  
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [barangayContact, setBarangayContact] = useState<BarangayContact>({});
  
  const {
    monthlyResidents,
    genderDistribution,
    residentGrowthRate,
    totalDeceased,
    totalRelocated,
    totalResidents: activePopulation,
    newResidentsThisMonth,
    isLoading: dashboardLoading,
    error
  } = useDashboardData(userProfile?.brgyid);

  // Use active population from dashboard data (excludes deceased and relocated)
  const isLoading = dataLoading || dashboardLoading;

  // Fetch recent activities from activity_logs table with cache refresh
  const fetchRecentActivities = async (useCache = true) => {
    if (!userProfile?.brgyid) return;
    
    // Check if cached data is stale (older than 5 minutes)
    const cachedData = getCachedActivities(userProfile.brgyid);
    const cacheAge = cachedData ? Date.now() - new Date(cachedData.activities[0]?.created_at || 0).getTime() : Infinity;
    const isCacheStale = cacheAge > 5 * 60 * 1000; // 5 minutes
    
    // Skip if we have fresh cached data and useCache is true
    if (cachedData && !isCacheStale && useCache) {
      return;
    }
    
    try {
      setActivitiesLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, ip, agent')
        .eq('brgyid', userProfile.brgyid)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) {
        console.error('Error fetching activity logs:', error);
        return;
      }

      const activities = data || [];

      // Fetch user profiles for the activities and filter by allowed roles
      let profiles: Record<string, UserProfile> = {};
      let filteredActivities: ActivityLog[] = [];
      if (activities.length > 0) {
        const userIds = [...new Set(activities.map(activity => activity.user_id))];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, firstname, lastname, username, role, profile_picture')
            .in('id', userIds)
            .in('role', ['user', 'admin', 'staff']);

        if (!profilesError && profilesData) {
          const allowedUserIds = new Set(profilesData.map(profile => profile.id));
          
          // Filter activities to only include those from users with allowed roles
          filteredActivities = activities.filter(activity => allowedUserIds.has(activity.user_id));
          
          profiles = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, UserProfile>);
          
          setRecentActivities(filteredActivities);
          setUserProfiles(profiles);
        }
      }

      // Cache the filtered activities and profiles data
      localStorage.setItem(`dashboardActivities_${userProfile.brgyid}`, JSON.stringify({
        activities: filteredActivities,
        profiles
      }));
    } catch (err) {
      console.error('Error in fetchRecentActivities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchRecentActivities();
  }, [userProfile?.brgyid]);

  // Set up real-time subscription for activity logs
  useEffect(() => {
    if (!userProfile?.brgyid) return;

    const channel = supabase
      .channel(`dashboard_activity_logs_${userProfile.brgyid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_logs',
          filter: `brgyid=eq.${userProfile.brgyid}`
        },
        (payload) => {
          // Refresh activity logs in real-time when changes occur
          fetchRecentActivities(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.brgyid]);

  // Fetch barangay contact information
  useEffect(() => {
    const fetchBarangayContact = async () => {
      if (!userProfile?.brgyid) return;
      
      try {
        const { data, error } = await supabase
          .from('barangays')
          .select('phone, email, officehours')
          .eq('id', userProfile.brgyid)
          .maybeSingle();

        if (error) {
          console.error('Error fetching barangay contact:', error);
          return;
        }

        if (data) {
          setBarangayContact({
            phone: (data as any).phone || undefined,
            email: (data as any).email || undefined,
            officehours: (data as any).officehours || undefined,
          });
        }
      } catch (err) {
        console.error('Error in fetchBarangayContact:', err);
      }
    };

    fetchBarangayContact();
  }, [userProfile?.brgyid]);

  // Update current time every minute for real-time "time ago" display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Helper function to get icon based on action type
  const getActivityIcon = (action: string) => {
    if (action.toLowerCase().includes('resident')) {
      return <Users className="h-4 w-4 text-primary" />;
    } else if (action.toLowerCase().includes('document')) {
      return <FileText className="h-4 w-4 text-primary" />;
    } else if (action.toLowerCase().includes('household')) {
      return <Home className="h-4 w-4 text-primary" />;
    } else {
      return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  // Helper function to format time ago with real-time updates
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = currentTime; // Use the state that updates every minute
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const diffInHours = Math.floor(diffInMinutes / 60);
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInMinutes / 1440);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  const formatGrowthRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  // Helper function to get gender-specific colors
  const getGenderColor = (gender: string) => {
    const normalizedGender = gender.toLowerCase();
    if (normalizedGender === 'male') return '#3b82f6'; // Blue
    if (normalizedGender === 'female') return '#ec4899'; // Pink
    if (normalizedGender === 'others' || normalizedGender === 'other') return '#10b981'; // Green
    return '#6b7280'; // Gray for any other values
  };

  // Helper function to get user initials for avatar fallback
  const getUserInitials = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile) return 'U';
    
    if (profile.firstname && profile.lastname) {
      return `${profile.firstname[0]}${profile.lastname[0]}`;
    }
    return profile.username ? profile.username.substring(0, 2).toUpperCase() : 'U';
  };
  const formatActivityMessage = (activity: ActivityLog) => {
    const userProfile = userProfiles[activity.user_id];
    const userName = userProfile 
      ? `${userProfile.firstname} ${userProfile.lastname}`.trim() || userProfile.username
      : 'Unknown User';

    const residentName = activity.details?.resident_name;

    switch (activity.action) {
      case 'user_sign_in':
        return `${userName} has signed in`;
      case 'user_sign_out':
        return `${userName} has signed out`;
      case 'resident_created':
      case 'resident_added':
        return residentName 
          ? `${userName} added a new resident: ${residentName}`
          : `${userName} added a new resident`;
      case 'resident_updated':
        return residentName 
          ? `${userName} updated resident: ${residentName}`
          : `${userName} updated a resident`;
      case 'document_issued':
        return `${userName} issued a document`;
      case 'household_created':
        return `${userName} added a new household`;
      case 'household_updated':
        return `${userName} updated household information`;
      default:
        return `${userName} performed an action: ${activity.action}`;
    }
  };
  
  if (error) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3">
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              Error loading dashboard data: {error}
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Main chart area - takes up 2 columns on md screens */}
      <div className="md:col-span-2 space-y-6">
        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle className="text-lg">Population Growth</CardTitle>
              <CardDescription>Monthly resident registration trends</CardDescription>
            </div>
            <Tabs defaultValue="line" className="w-full">
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="line">Line Chart</TabsTrigger>
                <TabsTrigger value="bar">Bar Chart</TabsTrigger>
              </TabsList>
              <TabsContent value="line" className="mt-4">
                <ChartContainer config={{
                residents: {
                  theme: {
                    dark: '#3b82f6',
                    light: '#3b82f6'
                  }
                }
              }} className="h-[350px] w-full">
                  {isLoading ? <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div> : <LineChart data={monthlyResidents} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20
                }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent nameKey="month" />} />
                      <Legend />
                      <Line type="monotone" dataKey="residents" name="Active Residents" stroke="var(--color-residents, #3b82f6)" strokeWidth={2} activeDot={{
                    r: 8
                  }} />
                    </LineChart>}
                </ChartContainer>
              </TabsContent>
              <TabsContent value="bar" className="mt-4">
                <ChartContainer config={{
                residents: {
                  theme: {
                    dark: '#3b82f6',
                    light: '#3b82f6'
                  }
                }
              }} className="h-[350px] w-full">
                  {isLoading ? <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div> : <BarChart data={monthlyResidents} margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20
                }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent nameKey="month" />} />
                      <Legend />
                      <Bar dataKey="residents" name="Active Residents" fill="var(--color-residents, #3b82f6)" />
                    </BarChart>}
                </ChartContainer>
              </TabsContent>
            </Tabs>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="text-xs uppercase text-muted-foreground mb-1">Active Population</div>
                  <div className="text-2xl font-bold text-center">
                    {isLoading ? '...' : activePopulation.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="text-xs uppercase text-muted-foreground mb-1">Growth Rate</div>
                  <div className={`text-2xl font-bold text-center ${residentGrowthRate >= 0 ? 'text-baranex-success' : 'text-red-500'}`}>
                    {isLoading ? '...' : formatGrowthRate(residentGrowthRate)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="text-xs uppercase text-muted-foreground mb-1">New this Month</div>
                  <div className="text-2xl font-bold text-center">
                    {isLoading ? '...' : newResidentsThisMonth}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="text-xs uppercase text-muted-foreground mb-1 flex items-center">
                    <UserX className="h-3 w-3 mr-1" />
                    Deceased
                  </div>
                  <div className="text-2xl font-bold text-center text-red-500">
                    {isLoading ? '...' : totalDeceased.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col items-center">
                  <div className="text-xs uppercase text-muted-foreground mb-1 flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    Relocated
                  </div>
                  <div className="text-2xl font-bold text-center text-orange-500">
                    {isLoading ? '...' : totalRelocated.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Barangay Contact - below population growth chart */}
        <Card>
          <CardHeader>
            <CardTitle>Barangay Contact</CardTitle>
            <CardDescription>Get in touch with the barangay office</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {barangayContact.phone && (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Phone</p>
                  <p className="text-sm font-medium">{barangayContact.phone}</p>
                </div>
              </div>
            )}
            
            {barangayContact.email && (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Email</p>
                  <p className="text-sm font-medium">{barangayContact.email}</p>
                </div>
              </div>
            )}
            
            {barangayContact.officehours && (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Office Hours</p>
                  <p className="text-sm font-medium">{barangayContact.officehours}</p>
                </div>
              </div>
            )}
            
            {!barangayContact.phone && !barangayContact.email && !barangayContact.officehours && (
              <p className="text-center text-muted-foreground py-4">
                No contact information available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar area - takes 1 column */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-md transition-colors">
                    <CachedAvatar
                      userId={activity.user_id}
                      profilePicture={userProfiles[activity.user_id]?.profile_picture}
                      fallback={getUserInitials(activity.user_id)}
                      className="w-8 h-8 mt-1"
                    />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">
                        {formatActivityMessage(activity)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.details?.description || 'System activity'}
                      </p>
                      {activity.agent && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {parseDeviceInfo(activity.agent)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent activity found
                </p>
              )}

              <Link to="/activitylog" className="flex items-center justify-center text-sm text-primary hover:underline mt-2 py-2">
                View all activity
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gender Distribution</CardTitle>
            <CardDescription>
              {isLoading ? "Loading..." : `${genderDistribution.length} gender categories found (active residents only)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : genderDistribution.length > 0 ? (
              <div className="space-y-4">
                <ChartContainer config={{}} className="h-[200px] w-full">
                  <PieChart>
                    <Pie 
                      data={genderDistribution} 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      fill="#8884d8" 
                      dataKey="count" 
                      label={({ gender, percentage }) => `${gender}: ${percentage}%`}
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getGenderColor(entry.gender)} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, 'Count']} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-2">
                  {genderDistribution.map((item, index) => (
                    <div key={item.gender} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getGenderColor(item.gender) }} 
                        />
                        <span>{item.gender}</span>
                      </div>
                      <span className="font-medium">{item.count} ({item.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No gender data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>;
};

export default DashboardCharts;
