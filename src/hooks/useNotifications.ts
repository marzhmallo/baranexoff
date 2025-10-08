import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export interface Notification {
  id: string;
  message: string | null;
  type: string;
  read: boolean | null;
  linkurl: string | null;
  created_at: string | null;
  updated_at: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  archived: boolean;
}

export const useNotifications = (limit: number = 10, category?: string, priority?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = async (offset: number = 0) => {
    if (!user?.id) return;

    try {
      let query = supabase
        .from('notification')
        .select('*')
        .eq('userid', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data, error } = await query
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      if (offset === 0) {
        setNotifications((data || []).map(n => ({
          ...n,
          priority: n.priority as 'low' | 'normal' | 'high' | 'urgent'
        })));
      } else {
        setNotifications(prev => [...prev, ...(data || []).map(n => ({
          ...n,
          priority: n.priority as 'low' | 'normal' | 'high' | 'urgent'
        }))]);
      }

      setHasMore((data?.length || 0) === limit);
      
      // Get unread count separately
      const { count } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: true })
        .eq('userid', user.id)
        .eq('read', false)
        .eq('archived', false);
      
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notification')
        .update({ read: true })
        .eq('userid', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Set up real-time subscription
    if (user?.id) {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notification',
            filter: `userid=eq.${user.id}`
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const loadMore = async () => {
    if (!loading && hasMore) {
      await fetchNotifications(notifications.length);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification')
        .update({ archived: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error archiving notification:', error);
        return;
      }

      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    archiveNotification,
    refetch: fetchNotifications
  };
};