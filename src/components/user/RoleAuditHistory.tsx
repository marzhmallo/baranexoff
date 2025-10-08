import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, Plus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CachedAvatar from '@/components/ui/CachedAvatar';

interface RoleAuditLog {
  id: string;
  user_id: string;
  old_role: string;
  new_role: string;
  changed_by: string;
  reason?: string;
  changed_at: string;
  changer_profile?: {
    firstname?: string;
    lastname?: string;
    profile_picture?: string;
  };
}

interface RoleAuditHistoryProps {
  userId: string;
}

export const RoleAuditHistory = ({ userId }: RoleAuditHistoryProps) => {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['role-audit-logs', userId],
    queryFn: async () => {
      // Fetch audit logs
      const { data: logs, error: logsError } = await supabase
        .from('role_audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('changed_at', { ascending: false });

      if (logsError) {
        console.error('Error fetching role audit logs:', logsError);
        throw logsError;
      }

      if (!logs || logs.length === 0) return [];

      // Get unique changer IDs
      const changerIds = [...new Set(logs.map(log => log.changed_by))];

      // Fetch profiles for all changers
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, profile_picture')
        .in('id', changerIds);

      if (profilesError) {
        console.error('Error fetching changer profiles:', profilesError);
      }

      // Manually join the data
      const logsWithProfiles = logs.map(log => ({
        ...log,
        changer_profile: profiles?.find(p => p.id === log.changed_by) || null
      }));

      return logsWithProfiles as RoleAuditLog[];
    },
  });

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const capitalizeRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Role History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!auditLogs || auditLogs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Role History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No role changes recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Role History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLogs.map((log) => {
            const isRoleChange = log.old_role !== log.new_role;
            const isPromotion = log.old_role === 'user' && (log.new_role === 'admin' || log.new_role === 'staff');
            
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="mt-1">
                  {isPromotion ? (
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-full">
                      <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full">
                      <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.old_role && (
                      <Badge variant="outline" className="font-medium">
                        {capitalizeRole(log.old_role)}
                      </Badge>
                    )}
                    {isRoleChange && (
                      <span className="text-muted-foreground">→</span>
                    )}
                    <Badge
                      variant={isPromotion ? 'default' : 'secondary'}
                      className="font-medium"
                    >
                      {capitalizeRole(log.new_role)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Changed by</span>
                    <div className="flex items-center gap-1.5">
                      <CachedAvatar
                        userId={log.changed_by}
                        profilePicture={log.changer_profile?.profile_picture}
                        fallback={getInitials(
                          log.changer_profile?.firstname,
                          log.changer_profile?.lastname
                        )}
                        className="h-5 w-5"
                      />
                      <span className="font-medium text-foreground">
                        {log.changer_profile?.firstname}{' '}
                        {log.changer_profile?.lastname}
                      </span>
                    </div>
                  </div>

                  {log.reason && (
                    <p className="text-sm text-muted-foreground italic">
                      "{log.reason}"
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {formatDate(log.changed_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
