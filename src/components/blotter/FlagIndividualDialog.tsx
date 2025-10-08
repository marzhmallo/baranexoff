
import { useState } from "react";
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

interface FlagIndividualDialogProps {
  incident: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  full_name: string;
  alias?: string;
  reason: string;
  risk_level: string;
}

const FlagIndividualDialog = ({ incident, open, onOpenChange, onSuccess }: FlagIndividualDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const { userProfile } = useAuth();
  
  const form = useForm<FormData>({
    defaultValues: {
      full_name: "",
      alias: "",
      reason: "",
      risk_level: "Low",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!userProfile?.id || !userProfile?.brgyid || !incident?.id) {
      toast({
        title: "Error",
        description: "Missing required information",
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
          linked_report_id: incident.id,
          brgyid: userProfile.brgyid,
          created_by: userProfile.id,
        });

      if (error) {
        console.error('Error flagging individual:', error);
        toast({
          title: "Error",
          description: "Failed to flag individual",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Individual has been added to the watchlist",
      });

      form.reset();
      onSuccess();
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
          <DialogTitle>Flag Individual</DialogTitle>
          <DialogDescription>
            Add an individual to the watchlist related to this incident: "{incident?.title}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {submitting ? "Flagging..." : "Flag Individual"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FlagIndividualDialog;
