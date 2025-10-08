import { useForm } from "react-hook-form";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

interface CenterFormData {
  name: string;
  address: string;
  capacity: number;
  contact_person?: string;
  contact_phone?: string;
  facilities?: string;
  notes?: string;
}

interface AddEvacuationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates?: [number, number];
  onSuccess?: () => void;
}

export const AddEvacuationCenterModal = ({ 
  isOpen, 
  onClose, 
  coordinates,
  onSuccess 
}: AddEvacuationCenterModalProps) => {
  const { userProfile } = useAuth();

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

  const onSubmit = async (data: CenterFormData) => {
    if (!userProfile?.brgyid) return;

    try {
      const facilitiesArray = data.facilities 
        ? data.facilities.split(',').map(f => f.trim()).filter(f => f.length > 0)
        : [];

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
          latitude: coordinates?.[0] || null,
          longitude: coordinates?.[1] || null,
        });

      if (error) throw error;
      
      toast({ title: "Success", description: "Evacuation center added successfully" });
      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving evacuation center:', error);
      toast({
        title: "Error",
        description: "Failed to save evacuation center",
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
          <DialogTitle>Add Evacuation Center</DialogTitle>
          <DialogDescription>
            Add a new evacuation center for your barangay.
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
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">
                Add Center
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};