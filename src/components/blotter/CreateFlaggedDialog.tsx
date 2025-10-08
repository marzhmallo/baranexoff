
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

interface CreateFlaggedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  full_name: string;
  alias?: string;
  reason: string;
  risk_level: string;
  linked_report_id: string;
  residentname?: string;
}

interface IncidentReport {
  id: string;
  title: string;
  date_reported: string;
}

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
}

const CreateFlaggedDialog = ({ open, onOpenChange }: CreateFlaggedDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const { userProfile } = useAuth();
  
  const form = useForm<FormData>({
    defaultValues: {
      full_name: "",
      alias: "",
      reason: "",
      risk_level: "Low",
      linked_report_id: "",
      residentname: "not_resident",
    },
  });

  useEffect(() => {
    if (open && userProfile?.brgyid) {
      fetchIncidents();
      fetchResidents();
    }
  }, [open, userProfile?.brgyid]);

  const fetchIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('id, title, date_reported')
        .eq('brgyid', userProfile?.brgyid)
        .order('date_reported', { ascending: false });

      if (error) {
        console.error('Error fetching incidents:', error);
        return;
      }

      setIncidents(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('id, first_name, last_name, middle_name')
        .eq('brgyid', userProfile?.brgyid)
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error fetching residents:', error);
        return;
      }

      setResidents(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!userProfile?.id || !userProfile?.brgyid) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('flagged_individuals')
        .insert({
          full_name: data.full_name,
          alias: data.alias || null,
          reason: data.reason,
          risk_level: data.risk_level as any,
          linked_report_id: data.linked_report_id,
          residentname: data.residentname === "not_resident" ? null : data.residentname,
          brgyid: userProfile.brgyid,
          created_by: userProfile.id,
        });

      if (error) {
        console.error('Error flagging individual:', error);
        toast({
          title: "Error",
          description: "Failed to add individual to watchlist",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Individual has been added to the watchlist",
      });

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Individual to Watchlist</DialogTitle>
          <DialogDescription>
            Flag an individual and link them to an existing incident report
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="linked_report_id"
              rules={{ required: "Related incident report is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Incident Report</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incident report" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incidents.map((incident) => (
                        <SelectItem key={incident.id} value={incident.id}>
                          {incident.title} - {new Date(incident.date_reported).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residentname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select resident if applicable" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="not_resident">Not a registered resident</SelectItem>
                      {residents.map((resident) => (
                        <SelectItem key={resident.id} value={resident.id}>
                          {resident.first_name} {resident.middle_name ? resident.middle_name + ' ' : ''}{resident.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              rules={{ required: "Full name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Complete name of the individual" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="alias"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alias/Nickname (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Known aliases or nicknames" {...field} />
                  </FormControl>
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
                      <SelectItem value="Low">Low Risk</SelectItem>
                      <SelectItem value="Moderate">Moderate Risk</SelectItem>
                      <SelectItem value="High">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              rules={{ required: "Reason is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Flagging</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Explain why this individual is being flagged"
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Adding..." : "Add to Watchlist"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFlaggedDialog;
