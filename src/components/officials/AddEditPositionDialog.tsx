import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { OfficialPosition } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCurrentAdmin } from '@/hooks/useCurrentAdmin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const positionSchema = z.object({
  position: z.string().min(1, 'Position is required'),
  committee: z.string().optional(),
  term_start: z.string().min(1, 'Start date is required'),
  term_end: z.string().optional(),
  sk: z.boolean().optional(),
  description: z.string().optional(),
  position_no: z.number().min(1, 'Position number must be at least 1').optional(),
  tenure: z.string().optional()
});
type PositionFormValues = z.infer<typeof positionSchema>;
interface AddEditPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: OfficialPosition | null;
  officialId: string | null;
  onSuccess: () => void;
}

// Common position rankings
const POSITION_RANKINGS = [{
  value: 1,
  label: "1 - Barangay Captain"
}, {
  value: 2,
  label: "2 - Vice Captain"
}, {
  value: 3,
  label: "3 - Secretary"
}, {
  value: 4,
  label: "4 - Treasurer"
}, {
  value: 5,
  label: "5 - Kagawad 1"
}, {
  value: 6,
  label: "6 - Kagawad 2"
}, {
  value: 7,
  label: "7 - Kagawad 3"
}, {
  value: 8,
  label: "8 - Kagawad 4"
}, {
  value: 9,
  label: "9 - Kagawad 5"
}, {
  value: 10,
  label: "10 - Kagawad 6"
}, {
  value: 11,
  label: "11 - Kagawad 7"
}, {
  value: 12,
  label: "12 - SK Chairperson"
}, {
  value: 13,
  label: "13 - SK Secretary"
}, {
  value: 14,
  label: "14 - SK Treasurer"
}, {
  value: 15,
  label: "15 - SK Kagawad 1"
}, {
  value: 16,
  label: "16 - SK Kagawad 2"
}, {
  value: 17,
  label: "17 - SK Kagawad 3"
}, {
  value: 18,
  label: "18 - SK Kagawad 4"
}, {
  value: 19,
  label: "19 - SK Kagawad 5"
}, {
  value: 20,
  label: "20 - SK Kagawad 6"
}, {
  value: 21,
  label: "21 - SK Kagawad 7"
}];
export function AddEditPositionDialog({
  open,
  onOpenChange,
  position,
  officialId,
  onSuccess
}: AddEditPositionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { adminProfileId } = useCurrentAdmin();
  const isEditMode = !!position;
  const form = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      position: '',
      committee: '',
      term_start: '',
      term_end: '',
      sk: false,
      description: '',
      position_no: undefined,
      tenure: 'Elected'
    }
  });

  // Update form values when position changes or dialog opens
  useEffect(() => {
    if (position && open) {
      // Format dates for input fields (YYYY-MM-DD)
      const formatDateForInput = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };
      form.reset({
        position: position.position || '',
        committee: position.committee || '',
        term_start: formatDateForInput(position.term_start),
        term_end: formatDateForInput(position.term_end),
        sk: position.sk || false,
        description: position.description || '',
        position_no: position.position_no || undefined,
        tenure: position.tenure || 'Elected'
      });
    } else if (!position && open) {
      // Clear form when adding a new position
      form.reset({
        position: '',
        committee: '',
        term_start: '',
        term_end: '',
        sk: false,
        description: '',
        position_no: undefined,
        tenure: 'Elected'
      });
    }
  }, [position, open, form]);
  const onSubmit = async (data: PositionFormValues) => {
    if (!officialId) return;
    try {
      setIsSubmitting(true);

      // Ensure term_start is always provided (required by the database)
      const formattedData = {
        official_id: officialId,
        sk: !!data.sk,
        term_end: data.term_end || new Date().toISOString().split('T')[0],
        position: data.position,
        term_start: data.term_start,
        description: data.description || null,
        committee: data.committee || null,
        tenure: data.tenure || "N/A", // Required field with default
        position_no: data.position_no || null
      };
      let result;
      if (isEditMode && position) {
        // Update existing position
        result = await supabase.from('official_positions').update(formattedData).eq('id', position.id);
      } else {
        // Insert new position
        result = await supabase.from('official_positions').insert(formattedData);
      }
      if (result.error) {
        throw result.error;
      }

      // Update the officials table with the same position_no and editedby
      if (data.position_no !== undefined || adminProfileId) {
        const updateData: any = {};
        if (data.position_no !== undefined) {
          updateData.position_no = data.position_no;
        }
        if (adminProfileId) {
          updateData.editedby = adminProfileId;
        }
        
        const { error: officialError } = await supabase
          .from('officials')
          .update(updateData)
          .eq('id', officialId);
          
        if (officialError) {
          console.error('Error updating official:', officialError);
          // Don't throw here as the position was already saved successfully
        }
      }
      toast({
        title: `Position ${isEditMode ? 'updated' : 'added'} successfully`,
        description: `The position has been ${isEditMode ? 'updated' : 'added'} successfully.`
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving position:', error);
      toast({
        title: 'Error',
        description: `Failed to ${isEditMode ? 'update' : 'add'} position. Please try again.`,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Position' : 'Add Position'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="position" render={({
            field
          }) => <FormItem>
                  <FormLabel>Position</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Barangay Captain" {...field} className="bg-input border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="position_no" render={({
            field
          }) => <FormItem>
                  <FormLabel>Position Rank (optional)</FormLabel>
                  <FormControl>
                    <Select value={field.value?.toString() || ""} onValueChange={value => field.onChange(value ? Number(value) : undefined)}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select position rank" />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITION_RANKINGS.map(rank => <SelectItem key={rank.value} value={rank.value.toString()}>
                            {rank.label}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <div className="text-xs text-muted-foreground mt-1">Lower numbers appear first (1 = highest priority).</div>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="tenure" render={({
            field
          }) => <FormItem>
                  <FormLabel>Tenure</FormLabel>
                  <FormControl>
                    <Select value={field.value || "Elected"} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select tenure type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Elected">Elected</SelectItem>
                        <SelectItem value="Appointed">Appointed</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            
            <FormField control={form.control} name="committee" render={({
            field
          }) => <FormItem>
                  <FormLabel>Committee (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Peace & Order" {...field} className="bg-input border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="term_start" render={({
              field
            }) => <FormItem>
                    <FormLabel>Term Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-input border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="term_end" render={({
              field
            }) => <FormItem>
                    <FormLabel>Term End Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="bg-input border-border" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <FormField control={form.control} name="sk" render={({
            field
          }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-muted/50">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Is SK</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Check if this is a Sangguniang Kabataan (SK) position
                    </p>
                  </div>
                </FormItem>} />
            
            <FormField control={form.control} name="description" render={({
            field
          }) => <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of the role" {...field} className="bg-input border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
}