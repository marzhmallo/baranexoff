import { useState, useEffect } from 'react';
import { formatDistanceToNow } from "date-fns";
import { Bell, Archive, Filter, Loader2, ChevronDown, AlertCircle, Clock, Zap, Star, Check, CheckCheck, Settings, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const getNotificationRoute = (notification: Notification): string => {
  // Handle special cases first
  if (notification.type === 'dnexus' || notification.type === 'dnexus_status') {
    return '/nexus';
  }

  // Map categories to appropriate routes
  switch (notification.category) {
    case 'announcement':
      return '/announcements';
    case 'event':
      return '/calendar';
    case 'document':
      return '/documents';
    case 'emergency':
      return '/emergency';
    case 'profile':
    case 'user_management':
      return '/profile';
    case 'feedback':
      return '/feedback';
    case 'blotter':
      return '/blotter';
    case 'household':
      return '/households';
    case 'resident':
      return '/residents';
    case 'official':
      return '/officials';
    default:
      // Fallback to dashboard if no specific route is found
      return '/dashboard';
  }
};
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'high':
      return <Zap className="h-4 w-4 text-orange-500" />;
    case 'normal':
      return <Star className="h-4 w-4 text-blue-500" />;
    case 'low':
      return <Clock className="h-4 w-4 text-gray-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'border-red-200 bg-red-50 hover:bg-red-100';
    case 'high':
      return 'border-orange-200 bg-orange-50 hover:bg-orange-100';
    case 'normal':
      return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
    case 'low':
      return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    default:
      return 'border-gray-200 bg-white hover:bg-gray-50';
  }
};
const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'announcement':
      return 'Announcement';
    case 'event':
      return 'Event';
    case 'document':
      return 'Document';
    case 'emergency':
      return 'Emergency';
    case 'profile':
      return 'Profile';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
};
export const NotificationsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    archiveNotification
  } = useNotifications(20, selectedCategory === 'all' ? undefined : selectedCategory, selectedPriority === 'all' ? undefined : selectedPriority);
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };
  const renderNotificationCard = (notification: Notification) => {
    const content = <div className={cn("group relative p-6 border border-border/40 rounded-xl transition-all duration-300 cursor-pointer", "hover:border-border hover:shadow-lg hover:shadow-primary/5", !notification.read ? "bg-gradient-to-r from-primary/5 via-background to-background border-primary/20" : "bg-background hover:bg-accent/30")}>
        {/* Unread indicator */}
        {!notification.read && <div className="absolute left-3 top-6 w-2 h-2 bg-primary rounded-full animate-pulse" />}

        <div className="flex items-start gap-4 ml-4">
          {/* Avatar */}
          

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-medium bg-accent/80 text-accent-foreground border-0">
                  {getCategoryLabel(notification.category)}
                </Badge>
                <Badge variant="outline" className={cn("text-xs border-0", notification.priority === 'urgent' && "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", notification.priority === 'high' && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300", notification.priority === 'normal' && "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300", notification.priority === 'low' && "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300")}>
                  {notification.priority}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                if (!notification.read) markAsRead(notification.id);
              }} className="h-8 w-8 p-0 hover:bg-accent" title={notification.read ? "Already read" : "Mark as read"} disabled={notification.read}>
                  {notification.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                archiveNotification(notification.id);
              }} className="h-8 w-8 p-0 hover:bg-accent" title="Archive notification">
                  <Archive className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <p className={cn("text-sm leading-relaxed mb-3", !notification.read ? "font-medium text-foreground" : "text-muted-foreground")}>
              {notification.message || 'No message available'}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {notification.created_at ? formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true
              }) : 'Just now'}
              </p>
              {!notification.read && <Badge variant="default" className="text-xs bg-primary/10 text-primary border-primary/20">
                  New
                </Badge>}
            </div>
          </div>
        </div>
      </div>;

    // Use smart routing
    const route = getNotificationRoute(notification);
    
    return (
      <Link to={route} onClick={() => handleNotificationClick(notification)} key={notification.id}>
        {content}
      </Link>
    );
  };
  if (loading && notifications.length === 0) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center py-24">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your notifications...</p>
            </div>
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
              <p className="text-muted-foreground">
                Stay updated with your latest activities and important updates
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between mt-6 p-4 bg-card rounded-xl border border-border/40 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            <div className="flex gap-2">
              {unreadCount > 0 && <Button onClick={markAllAsRead} variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary/10">
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all read
                </Button>}
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="mb-6 border-border/40 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[160px] border-border/60">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="announcement">Announcements</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="profile">Profile</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-full sm:w-[140px] border-border/60">
                  <Star className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground self-center ml-auto">
                {notifications.length > 0 && `Showing ${notifications.length} notifications`}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.map(notification => renderNotificationCard(notification))}
          
          {notifications.length === 0 && <Card className="border-border/40 shadow-sm">
              <CardContent className="text-center py-16">
                <div className="p-4 bg-accent/20 rounded-full w-fit mx-auto mb-4">
                  <Bell className="h-12 w-12 text-muted-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">All caught up!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  You don't have any notifications right now. We'll notify you when something important happens.
                </p>
              </CardContent>
            </Card>}

          {/* Load More Button */}
          {hasMore && notifications.length > 0 && <div className="flex justify-center pt-6">
              <Button onClick={loadMore} variant="outline" disabled={loading} className="min-w-[200px] border-border/60 hover:bg-accent/50">
                {loading ? <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading more...
                  </> : <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Load more notifications
                  </>}
              </Button>
            </div>}
        </div>
      </div>
    </div>;
};