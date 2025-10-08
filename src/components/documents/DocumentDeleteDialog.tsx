
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
  } | null;
  onDeleteSuccess: () => void;
}

const DocumentDeleteDialog = ({ open, onOpenChange, template, onDeleteSuccess }: DocumentDeleteDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  if (!template) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log("Attempting to delete template with ID:", template.id);
      
      const { error } = await supabase
        .from('document_types')
        .delete()
        .eq('id', template.id);

      if (error) {
        console.error("Supabase delete error:", error);
        throw error;
      }

      console.log("Template deleted successfully");

      toast({
        title: "Template Deleted",
        description: `"${template.name}" template has been successfully deleted.`,
      });

      onDeleteSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error", 
        description: "Failed to delete the template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the "{template.name}" template? This action cannot be undone.
            Any future document requests will no longer be able to use this template.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DocumentDeleteDialog;
