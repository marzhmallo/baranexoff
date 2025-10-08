import { useForm } from "react-hook-form";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

interface RouteFormData {
  route_name: string;
  start_description: string;
  end_description: string;
  distance_km?: number;
  estimated_time_minutes?: number;
}

interface AddEvacuationRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates?: [number, number][];
  onSuccess?: () => void;
}

export const AddEvacuationRouteModal = ({ 
  isOpen, 
  onClose, 
  coordinates,
  onSuccess 
}: AddEvacuationRouteModalProps) => {
  const { userProfile } = useAuth();

  const form = useForm<RouteFormData>({
    defaultValues: {
      route_name: "",
      start_description: "",
      end_description: "",
      distance_km: 0,
      estimated_time_minutes: 0,
    },
  });

  const onSubmit = async (data: RouteFormData) => {
    if (!userProfile?.id || !userProfile?.brgyid) return;

    try {
      let startPoint, endPoint, routeCoords;

      if (coordinates && coordinates.length >= 2) {
        // Use actual coordinates from drawn polyline
        startPoint = {
          lat: coordinates[0][0],
          lng: coordinates[0][1],
          description: data.start_description
        };
        
        endPoint = {
          lat: coordinates[coordinates.length - 1][0],
          lng: coordinates[coordinates.length - 1][1],
          description: data.end_description
        };

        routeCoords = coordinates;
      } else {
        // Fallback to default coordinates
        startPoint = {
          lat: 14.5995,
          lng: 121.0244,
          description: data.start_description
        };

        endPoint = {
          lat: 14.6095,
          lng: 121.0344,
          description: data.end_description
        };

        routeCoords = [
          [startPoint.lng, startPoint.lat],
          [endPoint.lng, endPoint.lat]
        ];
      }

      const { error } = await supabase
        .from('evacuation_routes')
        .insert({
          route_name: data.route_name,
          start_point: startPoint,
          end_point: endPoint,
          route_coords: routeCoords,
          distance_km: data.distance_km || null,
          estimated_time_minutes: data.estimated_time_minutes || null,
          brgyid: userProfile.brgyid,
          created_by: userProfile.id,
        });

      if (error) throw error;
      
      toast({ title: "Success", description: "Evacuation route added successfully" });
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving evacuation route:', error);
      toast({
        title: "Error",
        description: "Failed to save evacuation route",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] z-[3000]" style={{ zIndex: 3000 }}>
        <DialogHeader>
          <DialogTitle>Add Evacuation Route</DialogTitle>
          <DialogDescription>
            Add a new evacuation route for your barangay.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="route_name"
              rules={{ required: "Route name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Street to Gym" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="start_description"
              rules={{ required: "Start point description is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Point</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Barangay Plaza" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_description"
              rules={{ required: "End point description is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Point (Evacuation Center)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Community Gymnasium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km) - Optional</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="e.g., 1.5" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (minutes) - Optional</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 15" 
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">
                Add Route
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};