import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { MapPin, AlertTriangle, Edit } from "lucide-react";
import { EditDisasterZoneModal } from "./EditDisasterZoneModal";

interface DisasterZone {
  id: string;
  zone_name: string;
  zone_type: 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other';
  risk_level: 'low' | 'medium' | 'high';
  notes: string | null;
  polygon_coords: [number, number][];
}

interface DisasterZoneDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: DisasterZone | null;
  onEdit?: () => void;
}

export const DisasterZoneDetailsModal = ({ 
  isOpen, 
  onClose, 
  zone,
  onEdit 
}: DisasterZoneDetailsModalProps) => {
  const [showEditModal, setShowEditModal] = useState(false);

  if (!zone) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flood': return '🌊';
      case 'fire': return '🔥';
      case 'landslide': return '⛰️';
      case 'earthquake': return '🌍';
      case 'typhoon': return '🌀';
      default: return '⚠️';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

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
              <span className="text-2xl">{getTypeIcon(zone.zone_type)}</span>
              {zone.zone_name}
            </DialogTitle>
            <DialogDescription>
              Disaster zone details and information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={getRiskColor(zone.risk_level) as any}>
                {zone.risk_level} risk
              </Badge>
              <Badge variant="outline" className="capitalize">
                {zone.zone_type.replace('_', ' ')} zone
              </Badge>
            </div>

            {zone.notes && (
              <div>
                <h4 className="font-semibold mb-2">Notes:</h4>
                <p className="text-sm text-muted-foreground">{zone.notes}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Coordinates: {zone.polygon_coords?.length || 0} points mapped</span>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Zone
              </Button>
            )}
            <Button onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EditDisasterZoneModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        zone={zone}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};