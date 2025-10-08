import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Clock, MapPin, Search, X, Flame, Droplets, Heart, Wrench, Users, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEmergencyRequests } from '@/hooks/useEmergencyRequests';

interface EmergencyRequest {
  id: string;
  request_type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  details: string | null;
  created_at: string;
  resident_id: string;
}

interface EmergencyTriageFeedProps {
  brgyid: string;
  isOpen: boolean;
  onClose: () => void;
  onRequestClick: (requestId: string) => void;
}

const requestTypeIcons: Record<string, any> = {
  'Fire': Flame,
  'Medical Emergency': Heart,
  'Flood': Droplets,
  'Infrastructure Damage': Wrench,
  'Rescue Operation': Users,
};

const statusConfig = {
  'Pending': { color: 'bg-red-500', textColor: 'text-red-500', icon: '🔴', badgeVariant: 'destructive' as const },
  'In Progress': { color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: '🟡', badgeVariant: 'secondary' as const },
  'Responded': { color: 'bg-green-500', textColor: 'text-green-500', icon: '🟢', badgeVariant: 'default' as const },
};

export const EmergencyTriageFeed = ({ brgyid, isOpen, onClose, onRequestClick }: EmergencyTriageFeedProps) => {
  const { data: requests = [], isLoading } = useEmergencyRequests();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [geocodeCache, setGeocodeCache] = useState<Map<string, string>>(new Map());

  // Geocode requests when they load or change
  useEffect(() => {
    requests.forEach((req) => {
      if (req.latitude && req.longitude && !geocodeCache.has(req.id)) {
        reverseGeocode(req.latitude, req.longitude, req.id);
      }
    });
  }, [requests]);

  const reverseGeocode = async (lat: number, lng: number, id: string): Promise<string> => {
    // Check cache first
    if (geocodeCache.has(id)) {
      return geocodeCache.get(id)!;
    }
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const address = data.display_name || 'Unknown Location';
      
      // Update cache
      setGeocodeCache(prev => new Map(prev).set(id, address));
      return address;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return 'Location unavailable';
    }
  };

  const filteredRequests = requests
    .filter(req => filterStatus === 'All' || req.status === filterStatus)
    .filter(req => 
      searchQuery === '' || 
      req.request_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.details?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by status priority (Pending > In Progress > Responded), then by timestamp
      const statusPriority = { 'Pending': 0, 'In Progress': 1, 'Responded': 2 };
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 3;
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 3;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const statusCounts = {
    'All': requests.length,
    'Pending': requests.filter(r => r.status === 'Pending').length,
    'In Progress': requests.filter(r => r.status === 'In Progress').length,
    'Responded': requests.filter(r => r.status === 'Responded').length,
  };

  return (
    <div 
      className={`
        fixed right-4 top-20 h-[500px] w-full md:w-[380px]
        bg-background/95 backdrop-blur-lg shadow-2xl
        border border-border rounded-lg
        z-[999] flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Emergency Triage
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                {filterStatus}
                <Badge variant="secondary" className="text-xs">
                  {statusCounts[filterStatus as keyof typeof statusCounts]}
                </Badge>
              </span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[calc(380px-2rem)] bg-background border-border z-[1000]">
            {Object.entries(statusCounts).map(([status, count]) => (
              <DropdownMenuItem
                key={status}
                onClick={() => setFilterStatus(status)}
                className="cursor-pointer flex items-center justify-between"
              >
                <span className={filterStatus === status ? 'font-semibold' : ''}>
                  {status}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {count}
                </Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="flex-1 p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-6 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">
                  {filterStatus === 'All' ? 'No emergency requests' : `No ${filterStatus.toLowerCase()} requests`}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => {
              const Icon = requestTypeIcons[request.request_type] || AlertCircle;
              const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig['Pending'];

              return (
                <Card 
                  key={request.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
                  onClick={() => onRequestClick(request.id)}
                >
                  <CardHeader className="pb-3 space-y-3">
                    {/* Avatar and Location Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        U
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {request.latitude && request.longitude 
                            ? (geocodeCache.get(request.id) || 'Loading location...')
                            : 'Unknown Location'
                          }
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>1</span>
                          <span className="text-orange-500 font-medium ml-1">
                            {request.request_type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Need Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0.5">
                        {request.request_type}
                      </Badge>
                      {request.details && request.details.length > 0 && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs px-2 py-0.5">
                          Emergency
                        </Badge>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      <Badge variant={status.badgeVariant} className="text-xs">
                        {request.status}
                      </Badge>
                    </div>
                  </CardHeader>
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
