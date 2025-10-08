import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/components/AuthProvider";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
interface DocumentTemplateFormProps {
  template?: any;
  onClose: () => void;
  onSuccess?: () => void;
}
const DocumentTemplateForm = ({
  template,
  onClose,
  onSuccess
}: DocumentTemplateFormProps) => {
  const [content, setContent] = useState(template?.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    toast
  } = useToast();
  const {
    userProfile
  } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control
  } = useForm({
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      fee: template?.fee || 0,
      validity_days: template?.validity_days || null,
      type: template?.type || "",
      other_type: ""
    }
  });
  const selectedType = watch("type");
  useEffect(() => {
    if (template) {
      const known = [
        "certificate","clearance","permit","identification","endorsement","residency","indigency",
        "business","building","sanitation","summons","referral","report","ordinance","misc","other"
      ];
      const t = (template.type || "").toLowerCase();
      const isKnown = t && known.includes(t);
      reset({
        name: template.name,
        description: template.description,
        fee: template.fee,
        validity_days: template.validity_days,
        type: isKnown ? t : (t ? "other" : ""),
        other_type: isKnown ? "" : (template.type || "")
      });
      setContent(template.content || "");
    }
  }, [template, reset]);
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const resolvedType = data.type === "other" ? (data.other_type?.trim() || "Other") : data.type;
      const templateData = {
        name: data.name,
        description: data.description,
        template: content,
        content: content,
        type: resolvedType,
        fee: Number(data.fee),
        validity_days: data.validity_days ? Number(data.validity_days) : null,
        required_fields: {},
        brgyid: userProfile?.brgyid || "00000000-0000-0000-0000-000000000000"
      };
      let result;
      if (template?.id) {
        // Update existing template
        result = await supabase.from('document_types').update(templateData).eq('id', template.id);
      } else {
        // Create new template
        result = await supabase.from('document_types').insert([templateData]);
      }
      if (result.error) throw result.error;
      toast({
        title: template?.id ? "Template Updated" : "Template Created",
        description: `Document template has been ${template?.id ? 'updated' : 'created'} successfully.`
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Failed to save the template. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <>
      <DialogHeader>
        <DialogTitle>{template?.id ? 'Edit' : 'Create'} Document Template</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input id="name" {...register("name", {
            required: "Template name is required"
          })} placeholder="e.g., Barangay Clearance" />
            {errors.name && <p className="text-sm text-red-600 mt-1">{String(errors.name.message)}</p>}
          </div>

          <div>
            <Label htmlFor="fee">Fee (₱)</Label>
            <Input id="fee" type="number" step="0.01" min="0" {...register("fee")} placeholder="0.00" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Document Type *</Label>
          <Controller
            name="type"
            control={control}
            rules={{ required: "Document type is required" }}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="certificate">Certificate</SelectItem>
                  <SelectItem value="clearance">Clearance</SelectItem>
                  <SelectItem value="permit">Permit</SelectItem>
                  <SelectItem value="identification">Identification</SelectItem>
                  <SelectItem value="endorsement">Endorsement</SelectItem>
                  <SelectItem value="residency">Residency</SelectItem>
                  <SelectItem value="indigency">Indigency</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="building">Building</SelectItem>
                  <SelectItem value="sanitation">Sanitation</SelectItem>
                  <SelectItem value="summons">Summons</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="ordinance">Ordinance</SelectItem>
                  <SelectItem value="misc">Misc</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-sm text-red-600 mt-1">{String((errors as any).type.message)}</p>}
        </div>

        {selectedType === "other" && (
          <div>
            <Label htmlFor="other_type">Specify Type</Label>
            <Input
              id="other_type"
              placeholder="Enter custom document type"
              {...register("other_type", {
                validate: (val: string) =>
                  (selectedType !== "other" || (val && val.trim().length > 0)) || "Please specify a type",
              })}
            />
            {(errors as any).other_type && (
              <p className="text-sm text-red-600 mt-1">{String((errors as any).other_type.message)}</p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" {...register("description")} placeholder="Brief description of this document" rows={3} />
        </div>

        <div>
          <Label htmlFor="validity_days">Validity Period (Days)</Label>
          <Input id="validity_days" type="number" min="1" {...register("validity_days")} placeholder="e.g., 365 for 1 year" />
        </div>

        

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
            {isSubmitting ? "Saving..." : template?.id ? "Update Template" : "Create Template"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </>;
};
export default DocumentTemplateForm;