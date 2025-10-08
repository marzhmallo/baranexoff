import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveHousehold } from "@/lib/api/households";
import { Household } from "@/lib/types";
import { useAutoFillAddress } from "@/hooks/useAutoFillAddress";

// Define status values as a constant for reuse
const HOUSEHOLD_STATUSES = ["Permanent", "Temporary", "Relocated", "Abandoned"] as const;
type HouseholdStatus = typeof HOUSEHOLD_STATUSES[number];

// Define form schema with new address fields
const householdFormSchema = z.object({
  name: z.string().min(1, {
    message: "Household name is required"
  }),
  barangayname: z.string().min(1, {
    message: "Barangay name is required"
  }),
  municipality: z.string().min(1, {
    message: "Municipality is required"
  }),
  province: z.string().min(1, {
    message: "Province is required"
  }),
  region: z.string().min(1, {
    message: "Region is required"
  }),
  country: z.string().min(1, {
    message: "Country is required"
  }),
  purok: z.string().min(1, {
    message: "Purok is required"
  }),
  contact_number: z.string().optional(),
  year_established: z.coerce.number().int().optional(),
  status: z.enum(HOUSEHOLD_STATUSES),
  monthly_income: z.string().optional(),
  property_type: z.string().optional(),
  house_type: z.string().optional(),
  water_source: z.string().optional(),
  electricity_source: z.string().optional(),
  toilet_type: z.string().optional(),
  garbage_disposal: z.string().optional(),
  remarks: z.string().optional()
});
type HouseholdFormValues = z.infer<typeof householdFormSchema>;
interface HouseholdFormProps {
  onSubmit: () => void;
  household?: Household;
}
const HouseholdForm: React.FC<HouseholdFormProps> = ({
  onSubmit,
  household
}) => {
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const {
    isAutoFillEnabled,
    getAutoFillData
  } = useAutoFillAddress();

  // Helper function to handle database errors with specific toast messages
  const handleDatabaseError = (error: any) => {
    console.error('Database error:', error);
    
    // Check for specific constraint violations
    if (error.message && error.message.includes('households_head_of_family_key')) {
      toast({
        title: "Head of Family Already Assigned",
        description: "This resident is already the head of another household. Please select a different person or clear the current head of family assignment.",
        variant: "destructive",
      });
      return;
    }
    
    // Default error handling
    toast({
      title: "Error saving household",
      description: error.message || "There was a problem saving the household.",
      variant: "destructive"
    });
  };

  // Transform household data for the form
  const defaultValues: HouseholdFormValues = household ? {
    name: household.name,
    barangayname: household.barangayname || "",
    municipality: household.municipality || "",
    province: household.province || "",
    region: household.region || "",
    country: household.country || "",
    purok: household.purok,
    contact_number: household.contact_number || "",
    year_established: household.year_established || undefined,
    status: household.status as HouseholdStatus,
    monthly_income: household.monthly_income || "",
    property_type: household.property_type || "",
    house_type: household.house_type || "",
    water_source: household.water_source || "",
    electricity_source: household.electricity_source || "",
    toilet_type: household.toilet_type || "",
    garbage_disposal: household.garbage_disposal || "",
    remarks: household.remarks || ""
  } : {
    name: "",
    barangayname: "",
    municipality: "",
    province: "",
    region: "",
    country: "",
    purok: "",
    contact_number: "",
    year_established: undefined,
    status: "Temporary" as HouseholdStatus,
    monthly_income: "",
    property_type: "",
    house_type: "",
    water_source: "",
    electricity_source: "",
    toilet_type: "",
    garbage_disposal: "",
    remarks: ""
  };
  const form = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdFormSchema),
    defaultValues
  });

  // Override address fields when auto-fill is enabled
  useEffect(() => {
    const autoFillData = getAutoFillData();
    if (autoFillData && isAutoFillEnabled) {
      // Override address fields with admin's data, regardless of existing values
      form.setValue('barangayname', autoFillData.barangayname);
      form.setValue('municipality', autoFillData.municipality);
      form.setValue('province', autoFillData.province);
      form.setValue('region', autoFillData.region);
      form.setValue('country', autoFillData.country);
    }
  }, [getAutoFillData, form, isAutoFillEnabled]);

  // Function to handle cancel button click
  const handleCancel = () => {
    // Reset form values
    form.reset();
    // Close dialog
    onSubmit();
  };

  const handleSubmit = async (values: HouseholdFormValues) => {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);
    try {
      // Create the household data object based on form values
      const householdToSave: Partial<Household> = {
        id: household?.id,
        name: values.name,
        barangayname: values.barangayname,
        municipality: values.municipality,
        province: values.province,
        region: values.region,
        country: values.country,
        purok: values.purok,
        contact_number: values.contact_number || null,
        year_established: values.year_established || null,
        status: values.status,
        monthly_income: values.monthly_income || null,
        property_type: values.property_type || null,
        house_type: values.house_type || null,
        water_source: values.water_source || null,
        electricity_source: values.electricity_source || null,
        toilet_type: values.toilet_type || null,
        garbage_disposal: values.garbage_disposal || null,
        remarks: values.remarks || null
      };
      console.log("Sending to saveHousehold:", householdToSave);

      // Use the saveHousehold function
      const result = await saveHousehold(householdToSave);
      console.log("saveHousehold result:", result);
      if (!result.success) {
        console.error("Error in saveHousehold:", result.error);
        throw new Error(result.error);
      }

      // Show success toast
      toast({
        title: household ? "Household updated successfully" : "Household added successfully",
        description: `${values.name} has been ${household ? 'updated in' : 'added to'} the database.`
      });

      // Invalidate households query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['households']
      });

      // Close the dialog
      onSubmit();
    } catch (error: any) {
      handleDatabaseError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <ScrollArea className="pr-4 h-[calc(85vh-180px)]">
          <div className="pr-4 space-y-6">
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({
              field
            }) => <FormItem>
                    <FormLabel>Household Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dafun Family" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="status" render={({
              field
            }) => <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                        <SelectItem value="Temporary">Temporary</SelectItem>
                        <SelectItem value="Relocated">Relocated</SelectItem>
                        <SelectItem value="Abandoned">Abandoned</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <h3 className="text-lg font-medium mb-4 pt-4 border-t">Address Information</h3>
            
            {isAutoFillEnabled && <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">📍 Address fields are automatically filled and are read-only for security.</p>
              </div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="barangayname" render={({
              field
            }) => <FormItem>
                    <FormLabel>Barangay *</FormLabel>
                    <FormControl>
                      <Input placeholder="Barangay Mabuhay" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="municipality" render={({
              field
            }) => <FormItem>
                    <FormLabel>Municipality *</FormLabel>
                    <FormControl>
                      <Input placeholder="Liloy" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="province" render={({
              field
            }) => <FormItem>
                    <FormLabel>Province *</FormLabel>
                    <FormControl>
                      <Input placeholder="Zamboanga del Norte" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="region" render={({
              field
            }) => <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <FormControl>
                      <Input placeholder="Region IX" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="country" render={({
              field
            }) => <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input placeholder="Philippines" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="purok" render={({
              field
            }) => <FormItem>
                    <FormLabel>Purok *</FormLabel>
                    <FormControl>
                      <Input placeholder="Purok 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            
            <FormField control={form.control} name="contact_number" render={({
              field
            }) => <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            
            <FormField control={form.control} name="year_established" render={({
            field
          }) => <FormItem>
                  <FormLabel>Year Established</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="2010" {...field} value={field.value === undefined ? '' : field.value} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            
            <FormField control={form.control} name="monthly_income" render={({
            field
          }) => <FormItem>
                  <FormLabel>Monthly Income</FormLabel>
                  <FormControl>
                    <Input placeholder="20000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            
            <h3 className="text-lg font-medium mb-4 pt-4 border-t">Property Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="property_type" render={({
              field
            }) => <FormItem>
                    <FormLabel>Property Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Property Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Owned">Owned</SelectItem>
                        <SelectItem value="Rented">Rented</SelectItem>
                        <SelectItem value="Shared">Shared</SelectItem>
                        <SelectItem value="Informal Settler">Informal Settler</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
            
              <FormField control={form.control} name="house_type" render={({
              field
            }) => <FormItem>
                    <FormLabel>House Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Property Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Concrete">Concrete</SelectItem>
                        <SelectItem value="Semi-Concrete">Semi-Concrete</SelectItem>
                        <SelectItem value="Wood">Wood</SelectItem>
                        <SelectItem value="Nipa">Nipa</SelectItem>
                        <SelectItem value="Makeshift">Makeshift</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="water_source" render={({
              field
            }) => <FormItem>
                    <FormLabel>Water Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Water Source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pump">Water Pump</SelectItem>
                        <SelectItem value="Well">Well</SelectItem>
                        <SelectItem value="Barangay">Barangay Water System</SelectItem>
                        <SelectItem value="Natural">Natural Source</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="electricity_source" render={({
              field
            }) => <FormItem>
                    <FormLabel>Electricity Source</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Electricity Source" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Grid">Main Electric Grid</SelectItem>
                        <SelectItem value="Generator">Generator</SelectItem>
                        <SelectItem value="Shared">Shared</SelectItem>
                        <SelectItem value="Solar">Solar</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="toilet_type" render={({
              field
            }) => <FormItem>
                    <FormLabel>Toilet Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Toilet Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Water Sealed">Water Sealed</SelectItem>
                        <SelectItem value="Shared">Shared</SelectItem>
                        <SelectItem value="Antipolo">Antipolo</SelectItem>
                        <SelectItem value="Portable">Portable Toilet</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
              
              <FormField control={form.control} name="garbage_disposal" render={({
              field
            }) => <FormItem>
                    <FormLabel>Garbage Disposal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Garbage Disposal Method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Collected">Collected</SelectItem>
                        <SelectItem value="Burned">Burned</SelectItem>
                        <SelectItem value="Composted">Composted</SelectItem>
                        <SelectItem value="Buried">Buried</SelectItem>
                        <SelectItem value="Dumped">Dumped</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />
            </div>
            
            <h3 className="text-lg font-medium mb-4 pt-4 border-t">Additional Information</h3>
            <FormField control={form.control} name="remarks" render={({
            field
          }) => <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes about this household" className="resize-none min-h-[150px]" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
          </div>
        </ScrollArea>
        
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
          <Button variant="outline" type="button" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : household ? "Update Household" : "Save Household"}
          </Button>
        </div>
      </form>
    </Form>;
};
export default HouseholdForm;
