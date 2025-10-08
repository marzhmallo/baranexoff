import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

interface SafeRoute {
  id: string;
  route_name: string;
  route_coords: [number, number][];
  start_point: { lat: number; lng: number };
  end_point: { lat: number; lng: number };
  distance_km?: number | null;
  estimated_time_minutes?: number | null;
}

interface RouteFormData {
  route_name: string;
  distance_km?: number;
  estimated_time_minutes?: number;
}

interface EditEvacuationRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: SafeRoute | null;
  onSuccess?: () => void;
}

export const EditEvacuationRouteModal = ({ 
  isOpen, 
  onClose, 
  route,
  onSuccess 
}: EditEvacuationRouteModalProps) => {
  const { userProfile } = useAuth();
  const [updating, setUpdating] = useState(false);

  const form = useForm<RouteFormData>({
    defaultValues: {
      route_name: "",
      distance_km: 0,
      estimated_time_minutes: 0,
    },
  });

  useEffect(() => {
    if (route && isOpen) {
      form.reset({
        route_name: route.route_name,
        distance_km: route.distance_km || 0,
        estimated_time_minutes: route.estimated_time_minutes || 0,
      });
    }
  }, [route, isOpen, form]);

  const onSubmit = async (data: RouteFormData) => {
    if (!userProfile?.brgyid || !route) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('evacuation_routes')
        .update({
          route_name: data.route_name,
          distance_km: data.distance_km || null,
          estimated_time_minutes: data.estimated_time_minutes || null,
        })
        .eq('id', route.id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Evacuation route updated successfully" });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating evacuation route:', error);
      toast({
        title: "Error",
        description: "Failed to update evacuation route",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
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
          <DialogTitle>Edit Evacuation Route</DialogTitle>
          <DialogDescription>
            Update the evacuation route information.
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
                    <Input placeholder="e.g., Main Road to Evacuation Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      placeholder="e.g., 2.5" 
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
                  <FormLabel>Estimated Time (minutes) - Optional</FormLabel>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Updating...' : 'Update Route'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};