
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

interface EditFlaggedDialogProps {
  flaggedIndividual: any;
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

const EditFlaggedDialog = ({ flaggedIndividual, open, onOpenChange, onSuccess }: EditFlaggedDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  
  const form = useForm<FormData>({
    defaultValues: {
      full_name: "",
      alias: "",
      reason: "",
      risk_level: "low",
    },
  });

  useEffect(() => {
    if (flaggedIndividual) {
      form.reset({
        full_name: flaggedIndividual.full_name || "",
        alias: flaggedIndividual.alias || "",
        reason: flaggedIndividual.reason || "",
        risk_level: flaggedIndividual.risk_level || "low",
      });
    }
  }, [flaggedIndividual, form]);

  const onSubmit = async (data: FormData) => {
    if (!flaggedIndividual?.id) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('flagged_individuals')
        .update({
          full_name: data.full_name,
          alias: data.alias || null,
          reason: data.reason,
          risk_level: data.risk_level as any,
        })
        .eq('id', flaggedIndividual.id);

      if (error) {
        console.error('Error updating flagged individual:', error);
        toast({
          title: "Error",
          description: "Failed to update flagged individual",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Flagged individual updated successfully",
      });

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
          <DialogTitle>Edit Flagged Individual</DialogTitle>
          <DialogDescription>
            Update the information for this flagged individual
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
                    <Input {...field} />
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
                  <FormLabel>Alias/Nickname</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      <SelectItem value="low">Low Risk</SelectItem>
                      <SelectItem value="moderate">Moderate Risk</SelectItem>
                      <SelectItem value="high">High Risk</SelectItem>
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
                    <Textarea className="min-h-[80px]" {...field} />
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
                {submitting ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditFlaggedDialog;
