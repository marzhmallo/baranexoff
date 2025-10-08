import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, MapPin, X, Flame, Droplets, Heart, Wrench, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmergencyRequest {
  id: string;
  request_type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  details: string | null;
  created_at: string;
}

const requestTypeIcons: Record<string, any> = {
  'Fire': Flame,
  'Medical Emergency': Heart,
  'Flood': Droplets,
  'Infrastructure Damage': Wrench,
  'Rescue Operation': Users,
};

const statusConfig = {
  'Pending': { color: 'bg-red-500', textColor: 'text-red-500', icon: '🔴' },
  'In Progress': { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: '🟡' },
  'Responded': { color: 'bg-green-500', textColor: 'text-green-500', icon: '🟢' },
};

interface UserEmergencyRequestsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserEmergencyRequests = ({ isOpen, onClose }: UserEmergencyRequestsProps) => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');

  useEffect(() => {
    fetchRequests();
    setupRealtimeSubscription();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('emergency_requests' as any)
        .select('*')
        .eq('resident_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching emergency requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('user-emergency-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_requests',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRequests(prev => [payload.new as EmergencyRequest, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setRequests(prev =>
              prev.map(req => req.id === payload.new.id ? payload.new as EmergencyRequest : req)
            );
          } else if (payload.eventType === 'DELETE') {
            setRequests(prev => prev.filter(req => req.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredRequests = requests.filter(req => 
    filterStatus === 'All' || req.status === filterStatus
  );

  const statusCounts = {
    'All': requests.length,
    'Pending': requests.filter(r => r.status === 'Pending').length,
    'In Progress': requests.filter(r => r.status === 'In Progress').length,
    'Responded': requests.filter(r => r.status === 'Responded').length,
  };

  return (
    <div 
      className={`
        fixed top-20 h-[45vh] 
        left-1/2 -translate-x-1/2 w-[90vw]
        md:left-auto md:right-4 md:translate-x-0 md:w-[342px]
        bg-background/95 backdrop-blur-lg shadow-2xl
        border border-border rounded-lg
        z-[999] flex flex-col
        transition-all duration-300 ease-in-out
        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}
      `}
    >
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              My Emergency Requests
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Filter by Status:</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusCounts).map(([status, count]) => (
                <SelectItem key={status} value={status}>
                  <div className="flex items-center gap-2">
                    {status}
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">{filteredRequests.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    {filterStatus === 'All' ? 'No emergency requests yet' : `No ${filterStatus.toLowerCase()} requests`}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRequests.map((request) => {
                const Icon = requestTypeIcons[request.request_type] || AlertCircle;
                const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig['Pending'];

                return (
                  <Card key={request.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${status.color} bg-opacity-10`}>
                            <Icon className={`h-4 w-4 ${status.textColor}`} />
                          </div>
                          <CardTitle className="text-sm font-medium">
                            {request.request_type}
                          </CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {status.icon} {request.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                      </div>
                      {request.details && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.details}
                        </p>
                      )}
                      {request.latitude && request.longitude && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">
                            {request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
