
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { useAutoFillAddress } from '@/hooks/useAutoFillAddress';
import { useCurrentAdmin } from '@/hooks/useCurrentAdmin';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus } from 'lucide-react';
import { Official, OfficialPosition } from '@/lib/types';
import OfficialPhotoUpload from './OfficialPhotoUpload';

const officialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  bio: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Address is required'),
  birthdate: z.string().optional().or(z.literal('')),
  educ: z.array(z.object({
    value: z.string().optional().or(z.literal(''))
  })),
  achievements: z.array(z.object({
    value: z.string().optional().or(z.literal(''))
  })),
  committees: z.array(z.object({
    value: z.string().optional().or(z.literal(''))
  })),
  position: z.string().optional(),
  committee: z.string().optional().or(z.literal('')),
  term_start: z.string().optional(),
  term_end: z.string().optional().or(z.literal('')),
  is_current: z.boolean().optional(),
  photo_url: z.string().optional().or(z.literal(''))
});

// Create dynamic validation based on editing state
const createValidationSchema = (isEditing: boolean) => {
  if (isEditing) {
    return officialSchema;
  }
  
  // For new officials, position and term_start are required
  return officialSchema.extend({
    position: z.string().min(1, 'Position is required'),
    term_start: z.string().min(1, 'Start date is required')
  });
};

type OfficialFormValues = z.infer<typeof officialSchema>;

interface AddEditOfficialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  official?: Official;
  position?: OfficialPosition | null;
}

export function AddEditOfficialDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  official, 
  position 
}: AddEditOfficialDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const { getAutoFillData } = useAutoFillAddress();
  const { adminProfileId } = useCurrentAdmin();
  const autoFillData = getAutoFillData(); // Get this once outside useEffect
  
  const isEditing = !!official;
  
  const form = useForm<OfficialFormValues>({
    resolver: zodResolver(officialSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      bio: '',
      address: '',
      birthdate: '',
      educ: [{ value: '' }],
      achievements: [{ value: '' }],
      committees: [{ value: '' }],
      position: '',
      committee: '',
      term_start: '',
      term_end: '',
      is_current: false,
      photo_url: ''
    }
  });

  // Create field arrays for the dynamic fields
  const {
    fields: educFields,
    append: appendEduc,
    remove: removeEduc
  } = useFieldArray({
    control: form.control,
    name: "educ"
  });
  const {
    fields: achievementFields,
    append: appendAchievement,
    remove: removeAchievement
  } = useFieldArray({
    control: form.control,
    name: "achievements"
  });
  const {
    fields: committeeFields,
    append: appendCommittee,
    remove: removeCommittee
  } = useFieldArray({
    control: form.control,
    name: "committees"
  });

  // Helper function to parse JSONB data from the database
  const parseJsonField = (field: any, defaultValue = [{ value: '' }]) => {
    if (!field) return defaultValue;

    // If it's already an array, format it for our form
    if (Array.isArray(field)) {
      return field.map(item => ({
        value: String(item)
      }));
    }

    // If it's an object, try to extract values
    if (typeof field === 'object') {
      return Object.values(field).map(item => ({
        value: String(item)
      }));
    }

    // If it's a string, try to parse it as JSON
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            value: String(item)
          }));
        } else if (typeof parsed === 'object') {
          return Object.values(parsed).map(item => ({
            value: String(item)
          }));
        }
      } catch {
        // If parsing fails, just use the string itself
        return [{
          value: field
        }];
      }
    }
    return defaultValue;
  };

  // Effect to populate form when editing or auto-fill for new officials
  useEffect(() => {
    if (official && open) {
      console.log("Official data:", official); // Debug log

      // Parse arrays from JSONB data
      const educArray = official.educ ? parseJsonField(official.educ) : [{
        value: ''
      }];
      const achievementsArray = official.achievements ? parseJsonField(official.achievements) : [{
        value: ''
      }];
      const committeesArray = official.committees ? parseJsonField(official.committees) : [{
        value: ''
      }];
      console.log("Parsed achievements:", achievementsArray); // Debug log
      console.log("Parsed committees:", committeesArray); // Debug log

      // Handle address autofill for editing
      let addressToUse = official.address || '';
      
      if (autoFillData) {
        // Use admin's address when autofill is enabled
        addressToUse = `${autoFillData.barangayname}, ${autoFillData.municipality}, ${autoFillData.province}, ${autoFillData.region}, ${autoFillData.country}`;
      }

      // Reset form with official data
      form.reset({
        name: official.name || '',
        email: official.email || '',
        phone: official.phone || '',
        bio: official.bio || '',
        address: addressToUse,
        birthdate: official.birthdate || '',
        educ: educArray,
        achievements: achievementsArray,
        committees: committeesArray,
        photo_url: official.photo_url || ''
      });
    } else if (!official && open && autoFillData) {
      // Auto-fill address for new officials if setting is enabled
      const fullAddress = `${autoFillData.barangayname}, ${autoFillData.municipality}, ${autoFillData.province}, ${autoFillData.region}, ${autoFillData.country}`;
      form.setValue('address', fullAddress);
    }
  }, [official, position, open, form, autoFillData]);
  
  const handleIsCurrentChange = (checked: boolean) => {
    if (checked) {
      form.setValue('term_end', '');
    }
  };
  
  const handlePhotoUploaded = (url: string) => {
    form.setValue('photo_url', url);
  };
  
  const onSubmit = async (data: OfficialFormValues) => {
    try {
      setIsSubmitting(true);

      // Check if user has brgyid
      if (!userProfile?.brgyid) {
        toast({
          title: 'Error',
          description: 'Unable to determine your barangay. Please contact an administrator.',
          variant: 'destructive'
        });
        return;
      }

      // Additional validation for new officials
      if (!isEditing) {
        if (!data.position) {
          toast({
            title: 'Error',
            description: 'Position is required for new officials.',
            variant: 'destructive'
          });
          return;
        }
        if (!data.term_start) {
          toast({
            title: 'Error',
            description: 'Start date is required for new officials.',
            variant: 'destructive'
          });
          return;
        }
      }

      // Format the arrays for JSONB storage - filter out empty values
      const educArray = data.educ.map(item => item.value).filter(Boolean);
      const achievementsArray = data.achievements.map(item => item.value).filter(Boolean);
      const committeesArray = data.committees.map(item => item.value).filter(Boolean);
      
      if (isEditing && official) {
        // Update existing official
        const officialData = {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          bio: data.bio || null,
          address: data.address,
          birthdate: data.birthdate || null,
          educ: educArray.length > 0 ? educArray : null,
          achievements: achievementsArray.length > 0 ? achievementsArray : null,
          committees: committeesArray.length > 0 ? committeesArray : null,
          photo_url: data.photo_url || null,
          editedby: adminProfileId
        };
        
        const { error: officialError } = await supabase
          .from('officials')
          .update(officialData)
          .eq('id', official.id);
        
        if (officialError) throw officialError;
        
        toast({
          title: 'Official updated',
          description: `${data.name} has been updated successfully.`
        });
      } else {
        // Add new official with current user's brgyid
        const officialData = {
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          bio: data.bio || null,
          address: data.address,
          birthdate: data.birthdate || null,
          educ: educArray.length > 0 ? educArray : null,
          achievements: achievementsArray.length > 0 ? achievementsArray : null,
          committees: committeesArray.length > 0 ? committeesArray : null,
          position: data.position, // Add position to satisfy type requirements
          brgyid: userProfile.brgyid, // Use current user's brgyid
          photo_url: data.photo_url || null,
          recordedby: userProfile.id // Add the required recordedby field
        };
        
        const { data: newOfficial, error: officialError } = await supabase
          .from('officials')
          .insert(officialData)
          .select()
          .single();
        
        if (officialError) throw officialError;

        // 2. Insert the position with the new official ID
        const positionData = {
          official_id: newOfficial.id,
          position: data.position,
          committee: data.committee || null,
          term_start: data.term_start,
          term_end: data.is_current ? new Date('9999-12-31').toISOString().split('T')[0] : (data.term_end || new Date().toISOString().split('T')[0]),
          is_current: !!data.is_current,
          description: null,
          tenure: "N/A" // Add required tenure field
        };
        
        const { error: positionError } = await supabase
          .from('official_positions')
          .insert(positionData);
        
        if (positionError) throw positionError;
        
        toast({
          title: 'Official added',
          description: `${data.name} has been added successfully.`
        });
      }
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving official:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save official. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border max-w-2xl max-h-[90vh] overflow-y-auto z-50">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Official' : 'Add New Official'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              
              <OfficialPhotoUpload 
                officialId={official?.id} 
                existingPhotoUrl={official?.photo_url || ''} 
                onPhotoUploaded={handlePhotoUploaded} 
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter full name"
                        {...field}
                        className="bg-input border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                          className="bg-input border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contact number"
                          {...field}
                          className="bg-input border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="birthdate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Birthdate (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="bg-input border-border"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Official's address"
                        {...field}
                        className="bg-input border-border"
                        readOnly={autoFillData !== null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <FormLabel>Education (Optional)</FormLabel>
                  <Button
                    type="button"
                    onClick={() => appendEduc({ value: "" })}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {educFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`educ.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Educational background"
                              className="bg-input border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {educFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full bg-red-900/20 hover:bg-red-900/40 border-red-800/50"
                        onClick={() => removeEduc(index)}
                      >
                        <Minus className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief biography"
                        {...field}
                        className="bg-input border-border min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <FormLabel>Achievements (Optional)</FormLabel>
                  <Button
                    type="button"
                    onClick={() => appendAchievement({ value: "" })}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {achievementFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`achievements.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Notable achievement"
                              className="bg-input border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {achievementFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full bg-red-900/20 hover:bg-red-900/40 border-red-800/50"
                        onClick={() => removeAchievement(index)}
                      >
                        <Minus className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <FormLabel>Committees (Optional)</FormLabel>
                  <Button
                    type="button"
                    onClick={() => appendCommittee({ value: "" })}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {committeeFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`committees.${index}.value`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Committee name"
                              className="bg-input border-border"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {committeeFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full bg-red-900/20 hover:bg-red-900/40 border-red-800/50"
                        onClick={() => removeCommittee(index)}
                      >
                        <Minus className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {!isEditing && (
              <div className="border-t border-border pt-4 mt-6">
                <h3 className="text-lg font-medium mb-4">Position Information</h3>
                
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Barangay Captain"
                          {...field}
                          className="bg-input border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="committee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Committee (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Peace & Order"
                          {...field}
                          className="bg-input border-border"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="term_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term Start Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            className="bg-input border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="term_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            disabled={form.watch('is_current')}
                            className="bg-input border-border"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="is_current"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 bg-muted/50 mt-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleIsCurrentChange(!!checked);
                          }}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Current Position</FormLabel>
                        <p className="text-xs text-gray-400">
                          Check if this is a current position (no end date)
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting
                  ? isEditing
                    ? 'Updating...'
                    : 'Adding...'
                  : isEditing
                  ? 'Update Official'
                  : 'Add Official'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddEditOfficialDialog;
