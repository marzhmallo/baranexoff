import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Search, Activity, Download, Filter, RefreshCw, MoreVertical, ChevronLeft, ChevronRight, X, Eye, FileDown, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useAuth } from "@/components/AuthProvider";
import { useUserRoles, hasRole } from "@/hooks/useUserRoles";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { UAParser } from 'ua-parser-js';
import CachedAvatar from "@/components/ui/CachedAvatar";

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

// Action mapping system to connect dropdown options to actual database actions
const ACTION_MAPPING: Record<string, string[]> = {
  'all': [],
  'create': ['INSERT', 'resident_added'],
  'update': ['UPDATE', 'resident_updated'],
  'login': ['user_sign_in', 'recognized_device_login'],
  'logout': ['user_sign_out'],
  'alerts': ['login_alert_sent', 'new_device_login_alert'],
  'delete': ['DELETE'], // Future implementation
  'export': ['EXPORT'] // Future implementation
};

export default function ActivityLogPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const userRoles = useUserRoles();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [tempFromDate, setTempFromDate] = useState({ month: "", day: "", year: "" });
  const [tempToDate, setTempToDate] = useState({ month: "", day: "", year: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLog | null>(null);

  const { activities, userProfiles, loading, totalItems, refetch } = useActivityLogs({
    searchQuery,
    selectedUser,
    selectedAction: ACTION_MAPPING[selectedAction] || [selectedAction],
    dateRange,
    currentPage,
    itemsPerPage
  });


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

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
      case 'sign_in':
      case 'user_sign_in':
      case 'recognized_device_login':
        return '👤';
      case 'logout':
      case 'sign_out':
      case 'user_sign_out':
        return '🚪';
      case 'create':
      case 'insert':
      case 'resident_added':
        return '➕';
      case 'update':
      case 'resident_updated':
        return '✏️';
      case 'delete':
        return '🗑️';
      case 'export':
        return '📤';
      case 'login_alert_sent':
      case 'new_device_login_alert':
        return '🔔';
      default:
        return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
      case 'sign_in':
      case 'user_sign_in':
      case 'recognized_device_login':
        return 'bg-green-100 text-green-800';
      case 'logout':
      case 'sign_out':
      case 'user_sign_out':
        return 'bg-gray-100 text-gray-800';
      case 'create':
      case 'insert':
      case 'resident_added':
        return 'bg-blue-100 text-blue-800';
      case 'update':
      case 'resident_updated':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'export':
        return 'bg-purple-100 text-purple-800';
      case 'login_alert_sent':
      case 'new_device_login_alert':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserName = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile) return 'Unknown User';
    
    if (profile.firstname && profile.lastname) {
      return `${profile.firstname} ${profile.lastname}`;
    }
    return profile.username || profile.email || 'Unknown User';
  };

  const getUserRole = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile?.roles || profile.roles.length === 0) return 'user';
    // Return the highest priority role
    if (profile.roles.includes('admin')) return 'admin';
    if (profile.roles.includes('staff')) return 'staff';
    if (profile.roles.includes('user')) return 'user';
    return profile.roles[0];
  };

  const getUserInitials = (userId: string) => {
    const profile = userProfiles[userId];
    if (!profile) return 'U';
    
    if (profile.firstname && profile.lastname) {
      return `${profile.firstname[0]}${profile.lastname[0]}`;
    }
    return profile.username ? profile.username.substring(0, 2).toUpperCase() : 'U';
  };

  const getActionTitle = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
      case 'sign_in':
      case 'user_sign_in':
        return 'Login';
      case 'recognized_device_login':
        return 'Recognized Login';
      case 'logout':
      case 'sign_out':
      case 'user_sign_out':
        return 'Logout';
      case 'create':
      case 'insert':
        return 'Create';
      case 'resident_added':
        return 'Resident Added';
      case 'update':
        return 'Update';
      case 'resident_updated':
        return 'Resident Updated';
      case 'delete':
        return 'Delete';
      case 'export':
        return 'Export';
      case 'login_alert_sent':
        return 'Login Alert';
      case 'new_device_login_alert':
        return 'New Device Alert';
      default:
        return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getActionDescription = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
      case 'sign_in':
      case 'user_sign_in':
        return 'Successful authentication';
      case 'logout':
      case 'sign_out':
      case 'user_sign_out':
        return 'User signed out';
      default:
        return 'Action performed';
    }
  };

  const handleViewDetails = (activity: ActivityLog) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  const handleSaveDateRange = () => {
    if (tempFromDate.month && tempFromDate.day && tempFromDate.year && 
        tempToDate.month && tempToDate.day && tempToDate.year) {
      const fromDate = new Date(
        parseInt(tempFromDate.year), 
        parseInt(tempFromDate.month) - 1, 
        parseInt(tempFromDate.day)
      );
      const toDate = new Date(
        parseInt(tempToDate.year), 
        parseInt(tempToDate.month) - 1, 
        parseInt(tempToDate.day)
      );
      setDateRange({ from: fromDate, to: toDate });
    } else if (tempFromDate.month && tempFromDate.day && tempFromDate.year) {
      const fromDate = new Date(
        parseInt(tempFromDate.year), 
        parseInt(tempFromDate.month) - 1, 
        parseInt(tempFromDate.day)
      );
      setDateRange({ from: fromDate, to: undefined });
    }
  };

  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Activity logs export will be ready shortly",
    });
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background p-2 sm:p-4 lg:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background overflow-hidden">
      <div className="h-screen flex flex-col">
        <div className="bg-card rounded-none lg:rounded-lg lg:m-4 shadow-sm border-0 lg:border border-border flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/90 px-3 sm:px-6 py-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg flex-shrink-0">
                  <Activity className="text-white" size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                    {hasRole(userRoles.data, 'admin') || hasRole(userRoles.data, 'staff') ? 'Activity Logs' : 'My Activity History'}
                  </h1>
                  <p className="text-primary-foreground/80 text-xs sm:text-sm truncate">
                    {hasRole(userRoles.data, 'admin') || hasRole(userRoles.data, 'staff')
                      ? 'Track all user activities and system events' 
                      : 'View your account activity and login history'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <div className="px-2 sm:px-3 py-1 bg-white bg-opacity-20 rounded-full">
                  <span className="text-white text-xs sm:text-sm font-medium whitespace-nowrap">{totalItems} Total Logs</span>
                </div>
                <button 
                  onClick={refetch}
                  className="p-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200 flex-shrink-0"
                >
                  <RefreshCw className="text-white" size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 sm:p-6 border-b border-border flex-shrink-0 overflow-x-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <div className="relative min-w-0">
                <label className="block text-sm font-medium text-foreground mb-2">Search Activities</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground flex-shrink-0" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search activities..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 bg-background text-sm"
                  />
                </div>
              </div>
              
              {(hasRole(userRoles.data, 'admin') || hasRole(userRoles.data, 'staff')) && (
                <div className="relative min-w-0">
                  <label className="block text-sm font-medium text-foreground mb-2">Sort by User</label>
                  <select 
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 bg-background text-sm"
                  >
                    <option value="all">All Users</option>
                    <option value="admin">Admin Users</option>
                    <option value="user">Regular Users</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
              )}

              <div className="relative min-w-0">
                <label className="block text-sm font-medium text-foreground mb-2">Sort by Action</label>
                <select 
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full px-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 bg-background text-sm"
                >
                  <option value="all">All Actions</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="alerts">Alerts</option>
                  <option value="delete">Delete</option>
                  <option value="export">Export</option>
                </select>
              </div>

              <div className="relative min-w-0">
                <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                            </>
                          ) : (
                            format(dateRange.from, "MMM dd, y")
                          )
                        ) : (
                          "Pick a date range"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-4 max-w-sm" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Select Date Range</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDateRange(undefined)}
                          className="text-xs"
                        >
                          Clear
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">From Date</label>
                          <div className="flex gap-2 mt-1">
                            <select 
                              value={tempFromDate.month}
                              onChange={(e) => setTempFromDate(prev => ({ ...prev, month: e.target.value }))}
                              className="flex-1 px-2 py-1 text-sm border rounded-md bg-background min-w-0"
                            >
                              <option value="">Month</option>
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i + 1}>{new Date(0, i).toLocaleDateString('en', { month: 'short' })}</option>
                              ))}
                            </select>
                            <select 
                              value={tempFromDate.day}
                              onChange={(e) => setTempFromDate(prev => ({ ...prev, day: e.target.value }))}
                              className="w-16 px-2 py-1 text-sm border rounded-md bg-background"
                            >
                              <option value="">Day</option>
                              {Array.from({ length: 31 }, (_, i) => (
                                <option key={i} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                            <select 
                              value={tempFromDate.year}
                              onChange={(e) => setTempFromDate(prev => ({ ...prev, year: e.target.value }))}
                              className="w-20 px-2 py-1 text-sm border rounded-md bg-background"
                            >
                              <option value="">Year</option>
                              {Array.from({ length: 11 }, (_, i) => (
                                <option key={i} value={2020 + i}>{2020 + i}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">To Date</label>
                          <div className="flex gap-2 mt-1">
                            <select 
                              value={tempToDate.month}
                              onChange={(e) => setTempToDate(prev => ({ ...prev, month: e.target.value }))}
                              className="flex-1 px-2 py-1 text-sm border rounded-md bg-background min-w-0"
                            >
                              <option value="">Month</option>
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i} value={i + 1}>{new Date(0, i).toLocaleDateString('en', { month: 'short' })}</option>
                              ))}
                            </select>
                            <select 
                              value={tempToDate.day}
                              onChange={(e) => setTempToDate(prev => ({ ...prev, day: e.target.value }))}
                              className="w-16 px-2 py-1 text-sm border rounded-md bg-background"
                            >
                              <option value="">Day</option>
                              {Array.from({ length: 31 }, (_, i) => (
                                <option key={i} value={i + 1}>{i + 1}</option>
                              ))}
                            </select>
                            <select 
                              value={tempToDate.year}
                              onChange={(e) => setTempToDate(prev => ({ ...prev, year: e.target.value }))}
                              className="w-20 px-2 py-1 text-sm border rounded-md bg-background"
                            >
                              <option value="">Year</option>
                              {Array.from({ length: 11 }, (_, i) => (
                                <option key={i} value={2020 + i}>{2020 + i}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t">
                          <Button 
                            onClick={handleSaveDateRange}
                            className="w-full"
                            size="sm"
                          >
                            Apply Date Range
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden sm:flex flex-1 overflow-hidden">
            <div className="w-full overflow-auto">
              <table className="w-full table-fixed">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32 lg:w-40">Timestamp</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-36 lg:w-48">User</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 lg:w-32">Action</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 lg:w-32 hidden md:table-cell">Resource</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-36 lg:w-48 hidden lg:table-cell">Details</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28 lg:w-36 hidden lg:table-cell">IP Address</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20 lg:w-24 hidden lg:table-cell">Status</th>
                    <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-muted/50 transition-colors duration-200">
                      <td className="px-3 lg:px-6 py-4">
                        <div className="text-xs lg:text-sm text-foreground truncate">{format(new Date(activity.created_at), "MMM dd, HH:mm")}</div>
                        <div className="text-xs text-muted-foreground truncate">{formatDistanceToNow(new Date(activity.created_at))} ago</div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <div className="flex items-center min-w-0">
                          <CachedAvatar
                            userId={activity.user_id}
                            profilePicture={userProfiles[activity.user_id]?.profile_picture}
                            fallback={getUserInitials(activity.user_id)}
                            className="w-6 h-6 lg:w-8 lg:h-8 flex-shrink-0"
                          />
                          <div className="ml-2 lg:ml-3 min-w-0 flex-1">
                            <div className="text-xs lg:text-sm font-medium text-foreground truncate">{getUserName(activity.user_id)}</div>
                            <div className="text-xs text-muted-foreground capitalize truncate">{getUserRole(activity.user_id)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)} max-w-full`}>
                          <span className="mr-1 flex-shrink-0">{getActionIcon(activity.action)}</span>
                          <span className="truncate">{getActionTitle(activity.action)}</span>
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-foreground hidden md:table-cell">
                        <div className="truncate">{activity.details?.resource || 'System'}</div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 hidden lg:table-cell">
                        <div className="text-xs lg:text-sm text-foreground truncate">{getActionDescription(activity.action)}</div>
                        {activity.agent && (
                          <div className="text-xs text-muted-foreground truncate">{parseDeviceInfo(activity.agent)}</div>
                        )}
                      </td>
                      <td className="px-3 lg:px-6 py-4 text-xs lg:text-sm text-foreground font-mono hidden lg:table-cell">
                        <div className="truncate">{activity.ip || 'N/A'}</div>
                      </td>
                      <td className="px-3 lg:px-6 py-4 hidden lg:table-cell">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Success
                        </span>
                      </td>
                      <td className="px-3 lg:px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(activity)}
                          className="p-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View - Visible only on mobile */}
          <div className="sm:hidden flex-1 overflow-auto p-3 space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="bg-card border border-border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <CachedAvatar
                      userId={activity.user_id}
                      profilePicture={userProfiles[activity.user_id]?.profile_picture}
                      fallback={getUserInitials(activity.user_id)}
                      className="w-8 h-8 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">{getUserName(activity.user_id)}</div>
                      <div className="text-xs text-muted-foreground capitalize">{getUserRole(activity.user_id)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewDetails(activity)}
                    className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 flex-shrink-0"
                  >
                    <Eye size={16} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                    <span className="mr-1">{getActionIcon(activity.action)}</span>
                    {getActionTitle(activity.action)}
                  </span>
                  <div className="text-right">
                    <div className="text-xs text-foreground">{format(new Date(activity.created_at), "MMM dd, HH:mm")}</div>
                    <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.created_at))} ago</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <div className="truncate">{getActionDescription(activity.action)}</div>
                  {activity.ip && (
                    <div className="font-mono">IP: {activity.ip}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="bg-muted/50 px-3 sm:px-6 py-4 border-t border-border flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-foreground">Showing</span>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-2 py-1 border border-input rounded bg-background text-sm min-w-0"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-foreground whitespace-nowrap">of {totalItems} results</span>
              </div>
              
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-input rounded hover:bg-muted transition-colors duration-200 disabled:opacity-50 text-sm"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                
                {/* Page numbers - responsive */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5 || window.innerWidth < 640) {
                      page = i + 1;
                    } else {
                      // Show current page and surrounding pages
                      const start = Math.max(1, currentPage - 2);
                      const end = Math.min(totalPages, start + 4);
                      page = start + i;
                      if (page > end) return null;
                    }
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 sm:px-3 py-1 rounded transition-colors duration-200 text-sm min-w-[32px] ${
                          currentPage === page 
                            ? 'bg-primary text-primary-foreground' 
                            : 'border border-input hover:bg-muted'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  {totalPages > 5 && window.innerWidth >= 640 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-2 text-muted-foreground">...</span>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-2 sm:px-3 py-1 border border-input rounded hover:bg-muted transition-colors duration-200 text-sm"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-input rounded hover:bg-muted transition-colors duration-200 disabled:opacity-50 text-sm"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-3 sm:px-6 py-4 bg-card border-t border-border flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Activity size={16} className="flex-shrink-0" />
                <span className="truncate">Last updated: {formatDistanceToNow(new Date())} ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-[calc(100vw-1rem)] sm:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-primary to-primary/90 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="p-2 bg-white bg-opacity-20 rounded-lg flex-shrink-0">
                  <Eye className="text-white" size={18} />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">Audit Log Details</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200 text-white flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="border-b border-border pb-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-foreground text-sm font-medium">{getUserInitials(selectedActivity.user_id)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">{getActionTitle(selectedActivity.action)} Activity</h3>
                    <p className="text-muted-foreground text-sm truncate">
                      Performed by {getUserName(selectedActivity.user_id)} ({getUserRole(selectedActivity.user_id)}) • {formatDistanceToNow(new Date(selectedActivity.created_at))} ago
                    </p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                    Success
                  </span>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase mb-2">Event Information</h4>
                    <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row">
                        <span className="text-muted-foreground text-sm font-medium mb-1 sm:mb-0 sm:w-1/3 flex-shrink-0">Timestamp:</span>
                        <span className="font-medium text-sm break-words">{format(new Date(selectedActivity.created_at), "MMMM d, yyyy, h:mm a")}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row">
                        <span className="text-muted-foreground text-sm font-medium mb-1 sm:mb-0 sm:w-1/3 flex-shrink-0">Event ID:</span>
                        <span className="font-medium text-sm break-all font-mono">{selectedActivity.id}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row">
                        <span className="text-muted-foreground text-sm font-medium mb-1 sm:mb-0 sm:w-1/3 flex-shrink-0">IP Address:</span>
                        <span className="font-medium text-sm font-mono">{selectedActivity.ip || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row">
                        <span className="text-muted-foreground text-sm font-medium mb-1 sm:mb-0 sm:w-1/3 flex-shrink-0">Action:</span>
                        <span className="font-medium text-sm">{selectedActivity.action}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="min-w-0">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase mb-2">Device Information</h4>
                    <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-4">
                      {selectedActivity.agent ? (
                        <>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">Device</div>
                            <div className="font-medium text-sm break-words">{parseDeviceInfo(selectedActivity.agent)}</div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground uppercase tracking-wide">User Agent</div>
                            <div className="font-mono text-xs break-all bg-background p-2 rounded border overflow-hidden">{selectedActivity.agent}</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground text-sm">No device information available</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted-foreground uppercase mb-2">Detailed Event Data</h4>
                <div className="bg-muted rounded-lg p-3 sm:p-4 overflow-hidden">
                  <pre className="whitespace-pre-wrap text-xs sm:text-sm font-mono text-foreground overflow-auto max-h-40">
                    {JSON.stringify(selectedActivity.details || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="bg-muted px-4 sm:px-6 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <button className="flex items-center space-x-2 px-3 sm:px-4 py-2 border border-input rounded-lg hover:bg-background transition-colors duration-200 text-sm">
                  <FileDown size={14} />
                  <span>Export</span>
                </button>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 text-sm w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}