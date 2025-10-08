import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MapPin, Clock, Navigation, Edit } from "lucide-react";
import { EditEvacuationRouteModal } from "./EditEvacuationRouteModal";

interface SafeRoute {
  id: string;
  route_name: string;
  route_coords: [number, number][];
  start_point: { lat: number; lng: number };
  end_point: { lat: number; lng: number };
  distance_km?: number | null;
  estimated_time_minutes?: number | null;
}

interface EvacuationRouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: SafeRoute | null;
  onEdit?: () => void;
}

export const EvacuationRouteDetailsModal = ({ 
  isOpen, 
  onClose, 
  route,
  onEdit 
}: EvacuationRouteDetailsModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);

  if (!route) return null;

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    // Just refresh data but don't close the detail modal
    onEdit?.();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px] z-[3000]" style={{ zIndex: 3000 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-600" />
              {route.route_name}
            </DialogTitle>
            <DialogDescription>
              Evacuation route details and path information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Badge variant="outline">Evacuation Route</Badge>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium">Start Point:</span>
                  <p className="text-sm text-muted-foreground">
                    Start location
                  </p>
                  {route.start_point && (
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {route.start_point.lat.toFixed(6)}, {route.start_point.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium">End Point:</span>
                  <p className="text-sm text-muted-foreground">
                    End location
                  </p>
                  {route.end_point && (
                    <p className="text-xs text-muted-foreground">
                      Coordinates: {route.end_point.lat.toFixed(6)}, {route.end_point.lng.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {route.distance_km && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">Distance:</span>
                    <p className="text-sm text-muted-foreground">{route.distance_km} km</p>
                  </div>
                </div>
              )}

              {route.estimated_time_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">Est. Time:</span>
                    <p className="text-sm text-muted-foreground">{route.estimated_time_minutes} min</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4" />
              <span>Route points: {route.route_coords?.length || 0} coordinates mapped</span>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Route
              </Button>
            )}
            <Button onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EditEvacuationRouteModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        route={route}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};