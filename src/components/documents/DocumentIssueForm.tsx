
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Check, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Form schema
const formSchema = z.object({
  residentId: z.string({
    required_error: "Please enter a resident ID",
  }),
  residentName: z.string({
    required_error: "Please enter the resident's name",
  }),
  documentType: z.string({
    required_error: "Please select a document type",
  }),
  purpose: z.string().min(5, {
    message: "Purpose must be at least 5 characters.",
  }),
  isUrgent: z.boolean().default(false),
  additionalNotes: z.string().optional(),
});

interface DocumentIssueFormProps {
  onClose: () => void;
}

const DocumentIssueForm = ({ onClose }: DocumentIssueFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      residentId: "",
      residentName: "",
      documentType: "",
      purpose: "",
      isUrgent: false,
      additionalNotes: "",
    },
  });

  // Form submission handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      console.log("Document request submitted:", values);
      
      // Success notification
      toast({
        title: "Document Request Submitted",
        description: `${documentTypeLabels[values.documentType as keyof typeof documentTypeLabels]} request for ${values.residentName} has been submitted.`,
        variant: "default",
      });
      
      setIsSubmitting(false);
      form.reset();
      onClose();
    }, 1500);
  }

  // Document type labels for display
  const documentTypeLabels = {
    barangay_clearance: "Barangay Clearance",
    business_permit: "Business Permit",
    certificate_of_residency: "Certificate of Residency",
    indigency_certificate: "Certificate of Indigency",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Issue New Document</h3>
          <p className="text-sm text-muted-foreground">
            Complete the form to issue a new document to a resident
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="residentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident ID</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter resident ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="residentName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resident Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter resident name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="barangay_clearance">Barangay Clearance</SelectItem>
                      <SelectItem value="business_permit">Business Permit</SelectItem>
                      <SelectItem value="certificate_of_residency">Certificate of Residency</SelectItem>
                      <SelectItem value="indigency_certificate">Certificate of Indigency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isUrgent"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Urgent Request
                      {field.value && (
                        <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-100">
                          Urgent
                        </Badge>
                      )}
                    </FormLabel>
                    <FormDescription>
                      Mark this request as urgent for priority processing
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purpose</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter the purpose for this document"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Briefly explain why the resident needs this document
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="additionalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any additional information"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Issue Document
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default DocumentIssueForm;
