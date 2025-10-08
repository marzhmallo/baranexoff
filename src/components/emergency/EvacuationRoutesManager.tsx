
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Plus, Navigation, Edit, Trash2, MapPin, Clock } from "lucide-react";

interface EvacuationRoute {
  id: string;
  route_name: string;
  start_point: any;
  end_point: any;
  route_coords: any;
  distance_km?: number;
  estimated_time_minutes?: number;
  created_at: string;
}

interface RouteFormData {
  route_name: string;
  start_description: string;
  end_description: string;
  distance_km?: number;
  estimated_time_minutes?: number;
}

const EvacuationRoutesManager = () => {
  const { userProfile } = useAuth();
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<EvacuationRoute | null>(null);

  const form = useForm<RouteFormData>({
    defaultValues: {
      route_name: "",
      start_description: "",
      end_description: "",
      distance_km: 0,
      estimated_time_minutes: 0,
    },
  });

  useEffect(() => {
    if (userProfile?.brgyid) {
      fetchRoutes();
    }
  }, [userProfile?.brgyid]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('evacuation_routes')
        .select('*')
        .eq('brgyid', userProfile?.brgyid)
        .order('route_name', { ascending: true });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching evacuation routes:', error);
      toast({
        title: "Error",
        description: "Failed to load evacuation routes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RouteFormData) => {
    if (!userProfile?.id || !userProfile?.brgyid) return;

    try {
      // Create simple start and end points
      const startPoint = {
        lat: 14.5995, // Default Manila coordinates
        lng: 121.0244,
        description: data.start_description
      };

      const endPoint = {
        lat: 14.6095,
        lng: 121.0344,
        description: data.end_description
      };

      // Simple route coordinates (straight line for now)
      const routeCoords = [
        [startPoint.lng, startPoint.lat],
        [endPoint.lng, endPoint.lat]
      ];

      if (editingRoute) {
        const { error } = await supabase
          .from('evacuation_routes')
          .update({
            route_name: data.route_name,
            start_point: startPoint,
            end_point: endPoint,
            route_coords: routeCoords,
            distance_km: data.distance_km || null,
            estimated_time_minutes: data.estimated_time_minutes || null,
          })
          .eq('id', editingRoute.id);

        if (error) throw error;
        toast({ title: "Success", description: "Evacuation route updated successfully" });
      } else {
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
      }

      form.reset();
      setIsDialogOpen(false);
      setEditingRoute(null);
      fetchRoutes();
    } catch (error) {
      console.error('Error saving evacuation route:', error);
      toast({
        title: "Error",
        description: "Failed to save evacuation route",
        variant: "destructive",
      });
    }
  };

  const deleteRoute = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this evacuation route?')) return;

    try {
      const { error } = await supabase
        .from('evacuation_routes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Evacuation route deleted successfully" });
      fetchRoutes();
    } catch (error) {
      console.error('Error deleting evacuation route:', error);
      toast({
        title: "Error",
        description: "Failed to delete evacuation route",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (route: EvacuationRoute) => {
    setEditingRoute(route);
    form.reset({
      route_name: route.route_name,
      start_description: route.start_point?.description || "",
      end_description: route.end_point?.description || "",
      distance_km: route.distance_km || 0,
      estimated_time_minutes: route.estimated_time_minutes || 0,
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingRoute(null);
    form.reset();
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Evacuation Routes ({routes.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingRoute ? 'Edit Evacuation Route' : 'Add Evacuation Route'}
              </DialogTitle>
              <DialogDescription>
                {editingRoute ? 'Update the evacuation route information.' : 'Add a new evacuation route for your barangay.'}
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRoute ? 'Update Route' : 'Add Route'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {routes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routes.map((route) => (
            <Card key={route.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-blue-600" />
                    <Badge variant="outline">Route</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(route)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRoute(route.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{route.route_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">
                      <strong>Start:</strong> {route.start_point?.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm">
                      <strong>End:</strong> {route.end_point?.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  {route.distance_km && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{route.distance_km} km</span>
                    </div>
                  )}
                  {route.estimated_time_minutes && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{route.estimated_time_minutes} min</span>
                    </div>
                  )}
                </div>

                <Button variant="outline" className="w-full">
                  <MapPin className="h-4 w-4 mr-2" />
                  View on Map (coming soon)
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Navigation className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Evacuation Routes</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding evacuation routes for your barangay.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Route
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EvacuationRoutesManager;
