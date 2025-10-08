import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
const DocumentTemplatesList = ({
  searchQuery,
  onEdit
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const {
    toast
  } = useToast();
  useEffect(() => {
    fetchTemplates();
    
    // Set up real-time subscription for document templates
    const channel = supabase
      .channel('document-templates-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_types'
        },
        () => {
          // Refetch templates when changes occur
          fetchTemplates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchQuery]);
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase.from('document_types').select('*');
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      const {
        data,
        error
      } = await query.order('name');
      if (error) {
        throw error;
      }
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load document templates.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteClick = template => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    try {
      const {
        error
      } = await supabase.from('document_types').delete().eq('id', templateToDelete.id);
      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      toast({
        title: "Template Deleted",
        description: "Document template has been deleted successfully."
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete the document template.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };
  if (loading) {
    return <div className="space-y-4">
        {[1, 2, 3].map(i => <Card key={i} className="w-full">
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-3/4" /></CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>)}
      </div>;
  }
  if (templates.length === 0) {
    return <Card className="mx-0">
        <CardContent className="">
          <h3 className="text-xl font-semibold mb-2 my-[15px]">No templates found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "Try a different search query" : "Click the 'Add Template' button to create your first document template"}
          </p>
        </CardContent>
      </Card>;
  }
  return <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right">Validity (days)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(template => <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{template.description || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(template.fee || 0)}</TableCell>
                  <TableCell className="text-right">{template.validity_days || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(template)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the "{templateToDelete?.name}" template.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default DocumentTemplatesList;