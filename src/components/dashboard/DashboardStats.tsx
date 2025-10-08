
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Users, Home, Calendar, TrendingUp, TrendingDown, Megaphone, RefreshCw } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "@/hooks/use-toast";

const DashboardStats = () => {
  const { residents, households, loading: dataLoading } = useData();
  const { userProfile } = useAuth();
  const { 
    activeAnnouncements, 
    upcomingEvents,
    residentGrowthRate,
    householdGrowthRate,
    newResidentsThisMonth,
    newHouseholdsThisMonth,
    newAnnouncementsThisWeek,
    nextEventDays,
    isLoading: dashboardLoading,
    refreshData
  } = useDashboardData(userProfile?.brgyid);
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize progress with cached value to prevent flash
  const [progress, setProgress] = useState(() => {
    try {
      const cached = localStorage.getItem(`dashboardProgress_${userProfile?.brgyid}`);
      return cached ? JSON.parse(cached) : 13;
    } catch {
      return 13;
    }
  });

  useEffect(() => {
    // Only animate if we don't have cached progress
    const cachedProgress = localStorage.getItem(`dashboardProgress_${userProfile?.brgyid}`);
    if (!cachedProgress) {
      const timer = setTimeout(() => {
        setProgress(66);
        // Cache the final progress value
        if (userProfile?.brgyid) {
          localStorage.setItem(`dashboardProgress_${userProfile.brgyid}`, JSON.stringify(66));
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [userProfile?.brgyid]);

  // Use data from context for totals
  const totalResidents = residents.length;
  const totalHouseholds = households.length;
  const isLoading = dataLoading || dashboardLoading;

  const formatGrowthRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  const formatAnnouncementText = () => {
    if (newAnnouncementsThisWeek === 0) {
      return "No new announcements this week";
    } else if (newAnnouncementsThisWeek === 1) {
      return "1 new this week";
    } else {
      return `${newAnnouncementsThisWeek} new this week`;
    }
  };

  const formatEventText = () => {
    if (nextEventDays === null || upcomingEvents === 0) {
      return "No upcoming events";
    } else if (nextEventDays === 0) {
      return "Event today";
    } else if (nextEventDays === 1) {
      return "Next event tomorrow";
    } else {
      return `Next event in ${nextEventDays} days`;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
      toast({
        title: "Dashboard Refreshed",
        description: "Statistics have been updated with the latest data.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden border shadow-sm animate-pulse">
            <div className="flex">
              <div className="flex-grow p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
              <div className="w-16 bg-gray-200"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Dashboard Statistics</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex">
          <div className="flex-grow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Residents</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{totalResidents.toLocaleString()}</div>
              <div className="flex items-center mt-1">
                {residentGrowthRate >= 0 ? (
                  <TrendingUp className="text-baranex-success h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="text-red-500 h-3 w-3 mr-1" />
                )}
                <p className={`text-xs ${residentGrowthRate >= 0 ? 'text-baranex-success' : 'text-red-500'}`}>
                  {formatGrowthRate(residentGrowthRate)} ({newResidentsThisMonth} this month)
                </p>
              </div>
              <Progress value={progress} className="mt-3 h-1.5" />
            </CardContent>
          </div>
          <div className="bg-gradient-to-br from-baranex-primary/10 to-baranex-primary/5 p-4 flex items-center justify-center">
            <Users className="h-8 w-8 text-baranex-primary" />
          </div>
        </div>
      </Card>
      
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex">
          <div className="flex-grow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Registered Households</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{totalHouseholds.toLocaleString()}</div>
              <div className="flex items-center mt-1">
                {householdGrowthRate >= 0 ? (
                  <TrendingUp className="text-baranex-success h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="text-red-500 h-3 w-3 mr-1" />
                )}
                <p className={`text-xs ${householdGrowthRate >= 0 ? 'text-baranex-success' : 'text-red-500'}`}>
                  {formatGrowthRate(householdGrowthRate)} ({newHouseholdsThisMonth} this month)
                </p>
              </div>
              <Progress value={35} className="mt-3 h-1.5" />
            </CardContent>
          </div>
          <div className="bg-gradient-to-br from-baranex-secondary/10 to-baranex-secondary/5 p-4 flex items-center justify-center">
            <Home className="h-8 w-8 text-baranex-secondary" />
          </div>
        </div>
      </Card>
      
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex">
          <div className="flex-grow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Announcements</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{activeAnnouncements}</div>
              <div className="flex items-center mt-1">
                <Megaphone className="text-baranex-warning h-3 w-3 mr-1" />
                <p className="text-xs text-baranex-warning">
                  {formatAnnouncementText()}
                </p>
              </div>
              <Progress value={78} className="mt-3 h-1.5" />
            </CardContent>
          </div>
          <div className="bg-gradient-to-br from-baranex-warning/10 to-baranex-warning/5 p-4 flex items-center justify-center">
            <Megaphone className="h-8 w-8 text-baranex-warning" />
          </div>
        </div>
      </Card>
      
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex">
          <div className="flex-grow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{upcomingEvents}</div>
              <div className="flex items-center mt-1">
                <Calendar className="text-baranex-accent h-3 w-3 mr-1" />
                <p className="text-xs text-accent-foreground">
                  {formatEventText()}
                </p>
              </div>
              <Progress value={45} className="mt-3 h-1.5" />
            </CardContent>
          </div>
          <div className="bg-gradient-to-br from-baranex-accent/10 to-baranex-accent/5 p-4 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-baranex-accent" />
          </div>
        </div>
      </Card>
    </div>
  </div>
  );
};

export default DashboardStats;
