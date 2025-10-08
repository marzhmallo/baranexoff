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
import { Plus, Users, Edit, Trash2, Phone, MapPin } from "lucide-react";

interface EvacuationCenter {
  id: string;
  name: string;
  address: string;
  capacity: number;
  occupancy: number;
  status: 'available' | 'full' | 'closed' | 'maintenance';
  contact_person?: string;
  contact_phone?: string;
  facilities?: string[];
  notes?: string;
  created_at: string;
}

interface CenterFormData {
  name: string;
  address: string;
  capacity: number;
  contact_person?: string;
  contact_phone?: string;
  facilities?: string;
  notes?: string;
}

const EvacuationCentersManager = () => {
  const { userProfile } = useAuth();
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<EvacuationCenter | null>(null);

  const form = useForm<CenterFormData>({
    defaultValues: {
      name: "",
      address: "",
      capacity: 0,
      contact_person: "",
      contact_phone: "",
      facilities: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (userProfile?.brgyid) {
      fetchCenters();
    }
  }, [userProfile?.brgyid]);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('evacuation_centers')
        .select('*')
        .eq('brgyid', userProfile?.brgyid)
        .order('name', { ascending: true });

      if (error) throw error;
      setCenters(data || []);
    } catch (error) {
      console.error('Error fetching evacuation centers:', error);
      toast({
        title: "Error",
        description: "Failed to load evacuation centers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CenterFormData) => {
    if (!userProfile?.brgyid) return;

    try {
      const facilitiesArray = data.facilities 
        ? data.facilities.split(',').map(f => f.trim()).filter(f => f.length > 0)
        : [];

      if (editingCenter) {
        const { error } = await supabase
          .from('evacuation_centers')
          .update({
            name: data.name,
            address: data.address,
            capacity: data.capacity,
            contact_person: data.contact_person || null,
            contact_phone: data.contact_phone || null,
            facilities: facilitiesArray,
            notes: data.notes || null,
          })
          .eq('id', editingCenter.id);

        if (error) throw error;
        toast({ title: "Success", description: "Evacuation center updated successfully" });
      } else {
        const { error } = await supabase
          .from('evacuation_centers')
          .insert({
            name: data.name,
            address: data.address,
            capacity: data.capacity,
            contact_person: data.contact_person || null,
            contact_phone: data.contact_phone || null,
            facilities: facilitiesArray,
            notes: data.notes || null,
            brgyid: userProfile.brgyid,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Evacuation center added successfully" });
      }

      form.reset();
      setIsDialogOpen(false);
      setEditingCenter(null);
      fetchCenters();
    } catch (error) {
      console.error('Error saving evacuation center:', error);
      toast({
        title: "Error",
        description: "Failed to save evacuation center",
        variant: "destructive",
      });
    }
  };

  const updateCenterStatus = async (id: string, status: 'available' | 'full' | 'closed' | 'maintenance') => {
    try {
      const { error } = await supabase
        .from('evacuation_centers')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Center status updated" });
      fetchCenters();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update center status",
        variant: "destructive",
      });
    }
  };

  const deleteCenter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this evacuation center?')) return;

    try {
      const { error } = await supabase
        .from('evacuation_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Success", description: "Evacuation center deleted successfully" });
      fetchCenters();
    } catch (error) {
      console.error('Error deleting evacuation center:', error);
      toast({
        title: "Error",
        description: "Failed to delete evacuation center",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (center: EvacuationCenter) => {
    setEditingCenter(center);
    form.reset({
      name: center.name,
      address: center.address,
      capacity: center.capacity,
      contact_person: center.contact_person || "",
      contact_phone: center.contact_phone || "",
      facilities: center.facilities?.join(', ') || "",
      notes: center.notes || "",
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingCenter(null);
    form.reset();
    setIsDialogOpen(true);
  };

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
        <h3 className="text-lg font-semibold">Evacuation Centers ({centers.length})</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Center
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingCenter ? 'Edit Evacuation Center' : 'Add Evacuation Center'}
              </DialogTitle>
              <DialogDescription>
                {editingCenter ? 'Update the evacuation center information.' : 'Add a new evacuation center for your barangay.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: "Center name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Center Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Barangay Gymnasium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  rules={{ required: "Address is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Full address of the center" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="capacity"
                  rules={{ 
                    required: "Capacity is required",
                    min: { value: 1, message: "Capacity must be at least 1" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (Number of People)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g., 100" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Name of responsible person" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facilities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facilities (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Kitchen, Toilets, First Aid (comma-separated)" 
                          {...field} 
                        />
                      </FormControl>
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
                          placeholder="Additional information about this center"
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
                    {editingCenter ? 'Update Center' : 'Add Center'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {centers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {centers.map((center) => (
            <Card key={center.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getStatusIcon(center.status)}</span>
                    <Badge variant={getStatusColor(center.status) as any}>
                      {getStatusLabel(center.status)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Select 
                      value={center.status} 
                      onValueChange={(value: 'available' | 'full' | 'closed' | 'maintenance') => updateCenterStatus(center.id, value)}
                    >
                      <SelectTrigger className="w-auto h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(center)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCenter(center.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg">{center.name}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {center.address}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Capacity:</span>
                  <span className="font-medium">
                    {center.occupancy || 0} / {center.capacity} people
                  </span>
                </div>
                
                {center.facilities && center.facilities.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Facilities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {center.facilities.map((facility, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {center.contact_person && (
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
                      </Button>
                    )}
                  </div>
                )}

                {center.notes && (
                  <p className="text-sm text-muted-foreground">{center.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Evacuation Centers</h3>
            <p className="text-muted-foreground mb-4">
              Start by adding evacuation centers for your barangay.
            </p>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Center
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EvacuationCentersManager;
