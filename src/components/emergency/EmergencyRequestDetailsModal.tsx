import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { MapPin, Clock, Phone, AlertTriangle, ExternalLink, Flame, Droplets, Heart, Wrench, Users } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface EmergencyRequest {
  id: string;
  request_type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  details: string | null;
  created_at: string;
  resident_id: string;
  brgyid: string;
  needs: string[] | null;
  specificplace: string | null;
  contactno: string | null;
}

interface EmergencyRequestDetailsModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
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

export const EmergencyRequestDetailsModal = ({
  requestId,
  isOpen,
  onClose,
  isAdmin = false,
}: EmergencyRequestDetailsModalProps) => {
  const [request, setRequest] = useState<EmergencyRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [geocodedAddress, setGeocodedAddress] = useState<string>('');

  useEffect(() => {
    if (requestId && isOpen) {
      fetchRequestDetails();
    }
  }, [requestId, isOpen]);

  const fetchRequestDetails = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergency_requests' as any)
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast({
          title: "Not Found",
          description: "Emergency request not found",
          variant: "destructive",
        });
        onClose();
        return;
      }
      
      const requestData = data as unknown as EmergencyRequest;
      setRequest(requestData);
      setNewStatus(requestData.status);
      
      // Fetch geocoded address if coordinates exist
      if (requestData.latitude && requestData.longitude) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${requestData.latitude}&lon=${requestData.longitude}`
          );
          const geoData = await response.json();
          setGeocodedAddress(geoData.display_name || 'Unknown Location');
        } catch (geoError) {
          console.error('Geocoding error:', geoError);
          setGeocodedAddress('Location unavailable');
        }
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to load request details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!request || !isAdmin) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('emergency_requests' as any)
        .update({ status: newStatus })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Request status changed to ${newStatus}`,
      });

      setRequest({ ...request, status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const openInMaps = () => {
    if (request?.latitude && request?.longitude) {
      window.open(
        `https://www.google.com/maps?q=${request.latitude},${request.longitude}`,
        '_blank'
      );
    }
  };

  if (loading || !request) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const Icon = requestTypeIcons[request.request_type] || AlertTriangle;
  const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig['Pending'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="space-y-2">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${status.color} bg-opacity-10 flex-shrink-0`}>
                <Icon className={`h-6 w-6 ${status.textColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold text-foreground break-words">
                  📍 {geocodedAddress || 'Loading location...'}
                </div>
                <div className="text-xs font-normal text-muted-foreground mt-1">
                  Request ID: {request.id.slice(0, 8)}...
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Section */}
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <Badge className="text-sm py-1 px-3">
              {status.icon} {request.status}
            </Badge>
          </div>

          <Separator />

          {/* Needs Section */}
          {request.needs && request.needs.length > 0 && (
            <>
              <div>
                <h3 className="font-semibold mb-3 text-red-600 flex items-center gap-2">
                  🆘 Urgent Needs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {request.needs.map((need, index) => (
                    <Badge key={index} variant="destructive" className="text-sm py-1.5 px-3">
                      {need}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Time Information */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time Information
            </h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Reported:</span> {format(new Date(request.created_at), 'PPpp')}</p>
              <p><span className="text-muted-foreground">Time Elapsed:</span> {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>
            </div>
          </div>

          <Separator />

          {/* Details */}
          {request.details && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Request Details</h3>
                <p className="text-sm leading-relaxed bg-muted p-3 rounded-md">
                  {request.details}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Location */}
          {request.latitude && request.longitude && (
            <>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Details
                </h3>
                <div className="space-y-3">
                  {request.specificplace && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        🏷️ Landmark/Specific Place
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                        {request.specificplace}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">GPS Coordinates</p>
                    <p className="text-sm font-mono bg-muted p-2 rounded">
                      📐 {request.latitude.toFixed(6)}, {request.longitude.toFixed(6)}
                    </p>
                  </div>
                  <Button onClick={openInMaps} variant="outline" size="sm" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in Google Maps
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Contact Information */}
          {request.contactno && (
            <>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Resident Contact
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                      Contact Number
                    </p>
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-1">
                      {request.contactno}
                    </p>
                  </div>
                  <Button 
                    onClick={() => window.open(`tel:${request.contactno}`, '_self')}
                    className="w-full"
                    variant="default"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Now
                  </Button>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div>
              <h3 className="font-semibold mb-3">Admin Actions</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Update Status</label>
                  <div className="flex gap-2">
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">🔴 Pending</SelectItem>
                        <SelectItem value="In Progress">🟡 In Progress</SelectItem>
                        <SelectItem value="Responded">🟢 Responded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleUpdateStatus} 
                      disabled={updating || newStatus === request.status}
                    >
                      {updating ? 'Updating...' : 'Update'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                  <Textarea
                    placeholder="Add notes about this request..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
