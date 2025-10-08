import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";

interface DisasterZone {
  id: string;
  zone_name: string;
  zone_type: 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other';
  risk_level: 'low' | 'medium' | 'high';
  notes: string | null;
  polygon_coords: [number, number][];
}

interface ZoneFormData {
  zone_name: string;
  zone_type: 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other' | '';
  notes?: string;
  risk_level: string;
}

interface EditDisasterZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: DisasterZone | null;
  onSuccess?: () => void;
}

export const EditDisasterZoneModal = ({ 
  isOpen, 
  onClose, 
  zone,
  onSuccess 
}: EditDisasterZoneModalProps) => {
  const { userProfile } = useAuth();
  const [updating, setUpdating] = useState(false);

  const form = useForm<ZoneFormData>({
    defaultValues: {
      zone_name: "",
      zone_type: '',
      notes: "",
      risk_level: "medium",
    },
  });

  useEffect(() => {
    if (zone && isOpen) {
      form.reset({
        zone_name: zone.zone_name,
        zone_type: zone.zone_type,
        notes: zone.notes || "",
        risk_level: zone.risk_level,
      });
    }
  }, [zone, isOpen, form]);

  const onSubmit = async (data: ZoneFormData) => {
    if (!userProfile?.id || !userProfile?.brgyid || !data.zone_type || !zone) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from('disaster_zones')
        .update({
          zone_name: data.zone_name,
          zone_type: data.zone_type as 'flood' | 'fire' | 'landslide' | 'earthquake' | 'typhoon' | 'other',
          notes: data.notes || null,
          risk_level: data.risk_level,
        })
        .eq('id', zone.id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Disaster zone updated successfully" });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating disaster zone:', error);
      toast({
        title: "Error",
        description: "Failed to update disaster zone",
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
          <DialogTitle>Edit Disaster Zone</DialogTitle>
          <DialogDescription>
            Update the disaster zone information.
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
                    <SelectContent className="z-[4000]">
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
                    <SelectContent className="z-[4000]">
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                {updating ? 'Updating...' : 'Update Zone'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};