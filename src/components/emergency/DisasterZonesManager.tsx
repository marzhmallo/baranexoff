
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Plus, MapPin, Edit, Trash2, AlertTriangle } from "lucide-react";

interface DisasterZone {
  id: string;
  zone_name: string;
  zone_type: 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other';
  polygon_coords: any;
  notes?: string;
  risk_level: string;
  created_at: string;
}

interface ZoneFormData {
  zone_name: string;
  zone_type: 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other' | '';
  notes?: string;
  risk_level: string;
}

const DisasterZonesManager = () => {
  const { userProfile } = useAuth();
  const [zones, setZones] = useState<DisasterZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DisasterZone | null>(null);

  const form = useForm<ZoneFormData>({
    defaultValues: {
      zone_name: "",
      zone_type: '',
      notes: "",
      risk_level: "medium",
    },
  });

  useEffect(() => {
    if (userProfile?.brgyid) {
      fetchZones();
    }
  }, [userProfile?.brgyid]);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('disaster_zones')
        .select('*')
        .eq('brgyid', userProfile?.brgyid)
        .order('zone_name', { ascending: true });

      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching disaster zones:', error);
      toast({
        title: "Error",
        description: "Failed to load disaster zones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ZoneFormData) => {
    if (!userProfile?.id || !userProfile?.brgyid || !data.zone_type) return;

    try {
      // For now, create a simple polygon placeholder
      const defaultPolygon = {
        type: "Polygon",
        coordinates: [[
          [121.0244, 14.5995], // Manila coordinates as example
          [121.0344, 14.5995],
          [121.0344, 14.6095],
          [121.0244, 14.6095],
          [121.0244, 14.5995]
        ]]
      };

      if (editingZone) {
        const { error } = await supabase
          .from('disaster_zones')
          .update({
            zone_name: data.zone_name,
            zone_type: data.zone_type as 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other',
            notes: data.notes || null,
            risk_level: data.risk_level,
          })
          .eq('id', editingZone.id);

        if (error) throw error;
        toast({ title: "Success", description: "Disaster zone updated successfully" });
      } else {
        const { error } = await supabase
          .from('disaster_zones')
          .insert({
            zone_name: data.zone_name,
            zone_type: data.zone_type as 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other',
            polygon_coords: defaultPolygon,
            notes: data.notes || null,
            risk_level: data.risk_level,
            brgyid: userProfile.brgyid,
            created_by: userProfile.id,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Disaster zone added successfully" });
      }

      form.reset();
      setIsDialogOpen(false);
      setEditingZone(null);
      fetchZones();
    } catch (error) {
      console.error('Error saving disaster zone:', error);
      toast({
        title: "Error",
        description: "Failed to save disaster zone",
        variant: "destructive",
      });
    }
  };

  const deleteZone = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this disaster zone?')) return;

    try {
      const { error } = await supabase
        .from('disaster_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Disaster zone deleted successfully" });
      fetchZones();
    } catch (error) {
      console.error('Error deleting disaster zone:', error);
      toast({
        title: "Error",
        description: "Failed to delete disaster zone",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (zone: DisasterZone) => {
    setEditingZone(zone);
    form.reset({
      zone_name: zone.zone_name,
      zone_type: zone.zone_type,
      notes: zone.notes || "",
      risk_level: zone.risk_level,
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingZone(null);
    form.reset();
    setIsDialogOpen(true);
  };

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
        <h3 className="text-lg font-semibold">Disaster Risk Zones ({zones.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Risk Zone
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Edit Disaster Zone' : 'Add Disaster Zone'}
              </DialogTitle>
              <DialogDescription>
                {editingZone ? 'Update the disaster zone information.' : 'Add a new disaster risk zone for your barangay.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="zone_name"
                  rules={{ required: "Zone name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Creek Side Area" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zone_type"
                  rules={{ required: "Zone type is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disaster Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select disaster type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="flood">🌊 Flood Zone</SelectItem>
                          <SelectItem value="fire">🔥 Fire Hazard</SelectItem>
                          <SelectItem value="landslide">⛰️ Landslide Risk</SelectItem>
                          <SelectItem value="earthquake">🌍 Earthquake Fault</SelectItem>
                          <SelectItem value="typhoon">🌀 Typhoon Path</SelectItem>
                          <SelectItem value="other">⚠️ Other Hazard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="risk_level"
                  rules={{ required: "Risk level is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional information about this risk zone"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingZone ? 'Update Zone' : 'Add Zone'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {zones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone) => (
            <Card key={zone.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(zone.zone_type)}</span>
                    <Badge variant={getRiskColor(zone.risk_level) as any}>
                      {zone.risk_level} risk
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(zone)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteZone(zone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{zone.zone_name}</CardTitle>
                <CardDescription className="capitalize">
                  {zone.zone_type.replace('_', ' ')} zone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {zone.notes && (
                  <p className="text-sm text-muted-foreground">{zone.notes}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>Click to view on map (coming soon)</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Risk Zones Mapped</h3>
            <p className="text-muted-foreground mb-4">
              Start by identifying and mapping disaster-prone areas in your barangay.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Zone
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DisasterZonesManager;
