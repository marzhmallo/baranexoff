import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { MapPin, Users, Phone, Edit } from "lucide-react";
import { EditEvacuationCenterModal } from "./EditEvacuationCenterModal";

interface EvacCenter {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  occupancy: number | null;
  status: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  facilities?: string[] | null;
  notes?: string | null;
}

interface EvacuationCenterDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  center: EvacCenter | null;
  onUpdate?: () => void;
  onEdit?: () => void;
  readOnly?: boolean;
}

export const EvacuationCenterDetailsModal = ({ 
  isOpen, 
  onClose, 
  center,
  onUpdate,
  onEdit,
  readOnly = false
}: EvacuationCenterDetailsModalProps) => {
  const [updating, setUpdating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(center?.status || 'available');
  const [currentOccupancy, setCurrentOccupancy] = useState(center?.occupancy || 0);
  const [inputOccupancy, setInputOccupancy] = useState(center?.occupancy || 0);
  const [updatingOccupancy, setUpdatingOccupancy] = useState(false);

  useEffect(() => {
    setCurrentStatus(center?.status || 'available');
    setCurrentOccupancy(center?.occupancy || 0);
    setInputOccupancy(center?.occupancy || 0);
  }, [center?.status, center?.occupancy]);

  if (!center) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'default';
      case 'full': return 'destructive';
      case 'closed': return 'secondary';
      case 'maintenance': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '✅';
      case 'full': return '🔴';
      case 'closed': return '🚫';
      case 'maintenance': return '🔧';
      default: return '❓';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'full': return 'Full';
      case 'closed': return 'Closed';
      case 'maintenance': return 'Maintenance';
      default: return status;
    }
  };

  const updateCenterStatus = async (status: 'available' | 'full' | 'closed' | 'maintenance') => {
    // Check if trying to change from 'full' when occupancy >= capacity
    if (currentStatus === 'full' && status !== 'full' && currentOccupancy >= center.capacity) {
      toast({
        title: "Cannot Change Status",
        description: "Center is at full capacity. Reduce occupancy first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('evacuation_centers')
        .update({ status })
        .eq('id', center.id);

      if (error) throw error;
      setCurrentStatus(status);
      toast({ title: "Success", description: "Center status updated" });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update center status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateOccupancy = async (newOccupancy: number) => {
    if (newOccupancy < 0) return;
    if (newOccupancy > center.capacity) {
      toast({
        title: "Cannot Exceed Capacity",
        description: `Maximum capacity is ${center.capacity} people`,
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingOccupancy(true);
      
      // Determine new status based on occupancy
      let newStatus: 'available' | 'full' | 'closed' | 'maintenance' = currentStatus as 'available' | 'full' | 'closed' | 'maintenance';
      if (newOccupancy >= center.capacity && currentStatus !== 'closed' && currentStatus !== 'maintenance') {
        newStatus = 'full';
      } else if (newOccupancy < center.capacity && currentStatus === 'full') {
        newStatus = 'available';
      }

      const { error } = await supabase
        .from('evacuation_centers')
        .update({ 
          occupancy: newOccupancy,
          status: newStatus
        })
        .eq('id', center.id);

      if (error) throw error;
      
      setCurrentOccupancy(newOccupancy);
      setInputOccupancy(newOccupancy);
      setCurrentStatus(newStatus);
      toast({ title: "Success", description: "Occupancy updated" });
      onUpdate?.();
    } catch (error) {
      console.error('Error updating occupancy:', error);
      toast({
        title: "Error",
        description: "Failed to update occupancy",
        variant: "destructive",
      });
    } finally {
      setUpdatingOccupancy(false);
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
        <DialogContent className="sm:max-w-[600px] z-[3000]" style={{ zIndex: 3000 }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon(currentStatus)}</span>
              {center.name}
            </DialogTitle>
            <DialogDescription>
              Evacuation center details and status management
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <Badge variant={getStatusColor(currentStatus) as any}>
                {getStatusLabel(currentStatus)}
              </Badge>
              {!readOnly && (
                <Select 
                  value={currentStatus} 
                  onValueChange={(value: 'available' | 'full' | 'closed' | 'maintenance') => updateCenterStatus(value)}
                  disabled={updating || (currentStatus === 'full' && currentOccupancy >= center.capacity)}
                >
                  <SelectTrigger className="w-auto">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="z-[4000]">
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-1">Address:</h4>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {center.address}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Capacity:</h4>
                <p className="text-sm">
                  {currentOccupancy} / {center.capacity} people
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Current Occupancy:</h4>
              {!readOnly ? (
                <>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateOccupancy(currentOccupancy - 1)}
                      disabled={updatingOccupancy || currentOccupancy <= 0}
                    >
                      -
                    </Button>
                    <Input
                      type="number"
                      value={inputOccupancy}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        setInputOccupancy(value);
                      }}
                      onBlur={() => {
                        if (inputOccupancy >= 0 && inputOccupancy <= center.capacity) {
                          updateOccupancy(inputOccupancy);
                        } else {
                          setInputOccupancy(currentOccupancy); // Reset to current value if invalid
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (inputOccupancy >= 0 && inputOccupancy <= center.capacity) {
                            updateOccupancy(inputOccupancy);
                          } else {
                            setInputOccupancy(currentOccupancy); // Reset to current value if invalid
                          }
                        }
                      }}
                      className="w-[80px] text-center"
                      min="0"
                      max={center.capacity}
                      disabled={updatingOccupancy}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateOccupancy(currentOccupancy + 1)}
                      disabled={updatingOccupancy || currentOccupancy >= center.capacity}
                    >
                      +
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      / {center.capacity} people
                    </span>
                  </div>
                  {currentOccupancy >= center.capacity && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ Center is at full capacity
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm">
                  {currentOccupancy} / {center.capacity} people
                </p>
              )}
            </div>

            {center.facilities && center.facilities.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Facilities:</h4>
                <div className="flex flex-wrap gap-1">
                  {center.facilities.map((facility, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {facility}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {center.contact_person && (
              <div>
                <h4 className="font-semibold mb-1">Contact Person:</h4>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{center.contact_person}</span>
                  {center.contact_phone && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`tel:${center.contact_phone}`)}
                    >
                      <Phone className="h-3 w-3" />
                      {center.contact_phone}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {center.notes && (
              <div>
                <h4 className="font-semibold mb-1">Notes:</h4>
                <p className="text-sm text-muted-foreground">{center.notes}</p>
              </div>
            )}

            {center.latitude && center.longitude && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Coordinates: {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between">
            {onEdit && (
              <Button 
                variant="outline" 
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Center
              </Button>
            )}
            <Button onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <EditEvacuationCenterModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        center={center}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};