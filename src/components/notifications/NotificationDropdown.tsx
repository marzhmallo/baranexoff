import { formatDistanceToNow, isToday, isThisWeek, isYesterday } from "date-fns";
import { Bell, Check, CheckCheck, Dot, AlertCircle, Clock, Zap, Star, Archive, Settings, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const getNotificationRoute = (notification: any): string => {
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
    case 'urgent': return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'high': return <Zap className="h-4 w-4 text-orange-500" />;
    case 'normal': return <Star className="h-4 w-4 text-primary" />;
    case 'low': return <Clock className="h-4 w-4 text-muted-foreground" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

const groupNotificationsByDate = (notifications: any[]) => {
  const groups: { [key: string]: any[] } = {
    'Today': [],
    'Yesterday': [],
    'This Week': [],
    'Earlier': []
  };

  notifications.forEach(notification => {
    if (!notification.created_at) {
      groups['Today'].push(notification);
      return;
    }

    const date = new Date(notification.created_at);
    if (isToday(date)) {
      groups['Today'].push(notification);
    } else if (isYesterday(date)) {
      groups['Yesterday'].push(notification);
    } else if (isThisWeek(date)) {
      groups['This Week'].push(notification);
    } else {
      groups['Earlier'].push(notification);
    }
  });

  return groups;
};

const NotificationItem = ({ notification, onMarkAsRead }: { notification: any; onMarkAsRead: (id: string) => void }) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const getNotificationContent = () => {
    const baseContent = (
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/30 transition-colors cursor-pointer group">
        {/* Avatar/Icon */}
        <div className="relative flex-shrink-0 mt-1">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            {getPriorityIcon(notification.priority)}
          </div>
          {!notification.read && (
            <div className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full border-2 border-background" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className="text-xs px-2 py-0.5 capitalize"
            >
              {notification.category}
            </Badge>
            {notification.priority === 'urgent' && (
              <Badge 
                variant="destructive" 
                className="text-xs px-2 py-0.5"
              >
                Urgent
              </Badge>
            )}
          </div>
          
          <p className={cn(
            "text-sm leading-relaxed",
            !notification.read ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}>
            {notification.message || 'No message'}
          </p>
          
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {notification.created_at ? 
              formatDistanceToNow(new Date(notification.created_at), { addSuffix: true }) : 
              'Just now'
            }
          </p>
        </div>

        {/* Action button */}
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            aria-label="Mark notification as read"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    );

    // Use smart routing
    const route = getNotificationRoute(notification);
    
    return (
      <Link to={route} className="block" onClick={handleClick}>
        {baseContent}
      </Link>
    );
  };

  return getNotificationContent();
};

export const NotificationDropdown = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const groupedNotifications = groupNotificationsByDate(notifications);

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-accent/50 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-destructive-foreground border-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0 rounded-2xl bg-background border shadow-2xl z-50 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-foreground">Notifications</h3>
            <Button variant="ghost" size="sm" asChild className="h-8 px-3 text-xs hover:bg-accent/50">
              <Link to="/notifications">
                View all
              </Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            You have <span className="font-medium text-primary">{unreadCount}</span> {unreadCount === 1 ? 'notification' : 'notifications'} today.
          </p>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="mt-3 h-7 px-3 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Content */}
        {notifications.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <h4 className="font-medium text-foreground mb-1">All caught up!</h4>
            <p className="text-sm text-muted-foreground">No new notifications right now.</p>
          </div>
        ) : (
          <ScrollArea className="h-[480px] max-h-[60vh]">
            <div className="p-2">
              {Object.entries(groupedNotifications).map(([period, periodNotifications]) => {
                if (periodNotifications.length === 0) return null;
                
                return (
                  <div key={period} className="mb-4 last:mb-0">
                    <div className="px-4 py-2">
                      <h4 className="text-sm font-medium text-muted-foreground">{period}</h4>
                    </div>
                    <div className="space-y-1">
                      {periodNotifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};