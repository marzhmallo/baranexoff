import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, Form as FormProvider } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from "@/components/ui/scroll-area";
import { saveResident } from "@/lib/api/residents";
import { logActivity } from '@/lib/api/activityLogs';
import { useAuth } from '@/components/AuthProvider';
import { Resident } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ResidentPhotoUpload from "./ResidentPhotoUpload";
import { useAutoFillAddress } from "@/hooks/useAutoFillAddress";

// Available resident classifications with capitalized labels
const residentClassifications = [{
  id: "Indigent",
  label: "Indigent"
}, {
  id: "Student",
  label: "Student"
}, {
  id: "OFW",
  label: "OFW"
}, {
  id: "PWD",
  label: "PWD"
}, {
  id: "Illiterate",
  label: "Illiterate"
}, {
  id: "Solo Parent",
  label: "Solo Parent"
}];

// Form schema using zod
const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  middleName: z.string().optional(),
  suffix: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date in YYYY-MM-DD format"),
  purok: z.string().min(1, "Purok is required"),
  barangay: z.string().min(1, "Barangay is required"),
  municipality: z.string().min(1, "Municipality is required"),
  province: z.string().min(1, "Province is required"),
  region: z.string().min(1, "Region is required"),
  country: z.string().min(1, "Country is required"),
  contactNumber: z.string().regex(/^09\d{9}$/, "Phone number must be in the format 09XXXXXXXXX").optional().or(z.literal('')),
  email: z.string().email("Invalid email format").optional().or(z.literal('')),
  occupation: z.string().optional(),
  civilStatus: z.enum(["Single", "Married", "Widowed", "Divorced", "Separated"]),
  monthlyIncome: z.number().nonnegative().optional(),
  yearsInBarangay: z.number().int().nonnegative().optional(),
  nationality: z.string().default(""),
  isVoter: z.boolean().default(false),
  hasPhilhealth: z.boolean().default(false),
  hasSss: z.boolean().default(false),
  hasPagibig: z.boolean().default(false),
  hasTin: z.boolean().default(false),
  classifications: z.array(z.string()).default([]),
  emergencyContactName: z.string().optional().or(z.literal('')),
  emergencyContactRelationship: z.string().optional().or(z.literal('')),
  emergencyContactNumber: z.string().optional().or(z.literal('')),
  status: z.enum(["Permanent", "Temporary", "Deceased", "Relocated", "Missing"]),
  diedOn: z.date().optional().nullable(),
  remarks: z.string().optional(),
  photoUrl: z.string().optional()
});

// Define the type for form values based on the schema
type ResidentFormValues = z.infer<typeof formSchema>;
interface ResidentFormProps {
  onSubmit: () => void;
  resident?: Resident;
}

// Map database status to form status
const mapDBStatusToForm = (dbStatus: string): "Permanent" | "Temporary" | "Deceased" | "Relocated" | "Missing" => {
  switch (dbStatus) {
    case 'Permanent':
      return 'Permanent';
    case 'Temporary':
      return 'Temporary';
    case 'Deceased':
      return 'Deceased';
    case 'Relocated':
      return 'Relocated';
    case 'Missing':
      return 'Missing';
    default:
      return 'Temporary';
    // Default fallback
  }
};

// Map form status to database format
const mapFormStatusToDB = (formStatus: string): "Permanent" | "Temporary" | "Deceased" | "Relocated" | "Missing" => {
  switch (formStatus) {
    case 'Permanent':
      return 'Permanent';
    case 'Temporary':
      return 'Temporary';
    case 'Deceased':
      return 'Deceased';
    case 'Relocated':
      return 'Relocated';
    case 'Missing':
      return 'Missing';
    default:
      return 'Temporary';
    // Default fallback
  }
};
const ResidentForm = ({
  onSubmit,
  resident
}: ResidentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { userProfile } = useAuth();
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(resident?.photoUrl);
  const {
    getAutoFillData,
    isAutoFillEnabled
  } = useAutoFillAddress();

  // Transform resident data for the form
  const transformResidentForForm = (resident: Resident): ResidentFormValues => {
    console.log("Transforming resident for form:", resident);

    // Handle died_on date if present
    let diedOnDate = null;
    if (resident.diedOn) {
      try {
        diedOnDate = new Date(resident.diedOn);
        console.log("Parsed diedOn date:", diedOnDate);
      } catch (error) {
        console.error("Error parsing diedOn date:", error);
      }
    }

    // Modified to use empty strings instead of placeholder text for emergency contact fields
    return {
      // Personal Info
      firstName: resident.firstName,
      lastName: resident.lastName,
      middleName: resident.middleName ?? "",
      suffix: resident.suffix ?? "",
      gender: resident.gender as "Male" | "Female",
      birthDate: resident.birthDate,
      // Photo
      photoUrl: resident.photoUrl ?? "",
      // Address
      purok: resident.purok ?? "",
      barangay: resident.barangay ?? "",
      municipality: resident.municipality ?? "",
      province: resident.province ?? "",
      region: resident.region ?? "",
      country: resident.country ?? "",
      // Contact
      contactNumber: resident.contactNumber ?? "",
      email: resident.email ?? "",
      // Civil Status
      civilStatus: resident.civilStatus as "Single" | "Married" | "Widowed" | "Divorced" | "Separated",
      status: mapDBStatusToForm(resident.status),
      // Economic
      occupation: resident.occupation ?? "",
      monthlyIncome: resident.monthlyIncome ?? 0,
      yearsInBarangay: resident.yearsInBarangay ?? 0,
      // Documents
      isVoter: resident.isVoter ?? false,
      hasPhilhealth: resident.hasPhilhealth ?? false,
      hasSss: resident.hasSss ?? false,
      hasPagibig: resident.hasPagibig ?? false,
      hasTin: resident.hasTin ?? false,
      // Other
      nationality: resident.nationality ?? "",
      classifications: resident.classifications ?? [],
      remarks: resident.remarks ?? "",
      // Emergency Contact - Changed to use empty strings instead of placeholder text
      emergencyContactName: resident.emergencyContact?.name === "Emergency contact not set" ? "" : resident.emergencyContact?.name ?? "",
      emergencyContactRelationship: resident.emergencyContact?.relationship === "Not specified" ? "" : resident.emergencyContact?.relationship ?? "",
      emergencyContactNumber: resident.emergencyContact?.contactNumber === "Not specified" ? "" : resident.emergencyContact?.contactNumber ?? "",
      // Death date
      diedOn: diedOnDate
    };
  };
  const defaultValues: ResidentFormValues = resident ? transformResidentForForm(resident) : {
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "",
    gender: "Male",
    birthDate: "",
    photoUrl: "",
    purok: "",
    barangay: "",
    municipality: "",
    province: "",
    region: "",
    country: "",
    contactNumber: "",
    email: "",
    occupation: "",
    civilStatus: "Single",
    monthlyIncome: 0,
    yearsInBarangay: 0,
    nationality: "",
    isVoter: false,
    hasPhilhealth: false,
    hasSss: false,
    hasPagibig: false,
    hasTin: false,
    classifications: [],
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
    status: "Temporary",
    diedOn: null,
    remarks: ""
  };
  const form = useForm<ResidentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange"
  });

  // Auto-fill address fields when auto-fill is enabled (for both new residents and edits)
  useEffect(() => {
    if (isAutoFillEnabled) {
      const autoFillData = getAutoFillData();
      if (autoFillData) {
        console.log('Auto-filling address fields with admin barangay data:', autoFillData);
        // Override existing values with admin's barangay data
        form.setValue('barangay', autoFillData.barangayname);
        form.setValue('municipality', autoFillData.municipality);
        form.setValue('province', autoFillData.province);
        form.setValue('region', autoFillData.region);
        form.setValue('country', autoFillData.country);
      }
    }
  }, [getAutoFillData, form, isAutoFillEnabled]);

  // Log form validation state changes
  useEffect(() => {
    const subscription = form.watch(() => {
      if (form.formState.isSubmitSuccessful) {
        console.log("Form was successfully submitted");
      }
      if (Object.keys(form.formState.errors).length > 0) {
        console.log("Form has validation errors:", form.formState.errors);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Watch for status changes to show/hide the death date picker
  const status = form.watch("status");
  const handlePhotoUploaded = (url: string) => {
    setPhotoUrl(url);
    form.setValue("photoUrl", url);
  };
  const handleSubmit = async (values: ResidentFormValues) => {
    console.log("Form submitted with values:", values);
    setIsSubmitting(true);
    try {
      // If auto-fill is enabled, ensure we use the admin's barangay data for address fields
      let finalValues = {
        ...values
      };
      if (isAutoFillEnabled) {
        const autoFillData = getAutoFillData();
        if (autoFillData) {
          console.log('Overriding address fields with admin barangay data during save:', autoFillData);
          finalValues = {
            ...finalValues,
            barangay: autoFillData.barangayname,
            municipality: autoFillData.municipality,
            province: autoFillData.province,
            region: autoFillData.region,
            country: autoFillData.country
          };
        }
      }

      // Construct address string from individual components
      const addressString = `Purok ${finalValues.purok}, ${finalValues.barangay}, ${finalValues.municipality}, ${finalValues.province}, ${finalValues.region}`;

      // Create the resident data object based on form values
      const residentToSave: Partial<Resident> = {
        id: resident?.id,
        firstName: finalValues.firstName,
        lastName: finalValues.lastName,
        middleName: finalValues.middleName,
        suffix: finalValues.suffix,
        gender: finalValues.gender,
        birthDate: finalValues.birthDate,
        // Setting composite address string to ensure the address field is filled
        address: addressString,
        contactNumber: finalValues.contactNumber,
        email: finalValues.email,
        occupation: finalValues.occupation,
        civilStatus: finalValues.civilStatus,
        monthlyIncome: finalValues.monthlyIncome,
        yearsInBarangay: finalValues.yearsInBarangay,
        purok: finalValues.purok,
        barangay: finalValues.barangay,
        municipality: finalValues.municipality,
        province: finalValues.province,
        region: finalValues.region,
        country: finalValues.country,
        nationality: finalValues.nationality,
        isVoter: finalValues.isVoter,
        hasPhilhealth: finalValues.hasPhilhealth,
        hasSss: finalValues.hasSss,
        hasPagibig: finalValues.hasPagibig,
        hasTin: finalValues.hasTin,
        classifications: finalValues.classifications,
        remarks: finalValues.remarks,
        status: mapFormStatusToDB(finalValues.status),
        photoUrl: finalValues.photoUrl,
        // Emergency contact handling:
        // Only include if any of the fields have content, otherwise set to null
        // This ensures we send null to the database when all fields are empty
        emergencyContact: finalValues.emergencyContactName || finalValues.emergencyContactRelationship || finalValues.emergencyContactNumber ? {
          name: finalValues.emergencyContactName || "",
          relationship: finalValues.emergencyContactRelationship || "",
          contactNumber: finalValues.emergencyContactNumber || ""
        } : null,
        // Add died_on date if status is Deceased and a date was selected
        // Otherwise explicitly set to null
        diedOn: finalValues.status === "Deceased" && finalValues.diedOn ? format(finalValues.diedOn, 'yyyy-MM-dd') : null
      };
      console.log("Sending to saveResident:", residentToSave);
      console.log("Emergency contact being saved:", residentToSave.emergencyContact);
      console.log("Death date being saved:", residentToSave.diedOn);

      // Use the saveResident function
      const result = await saveResident(residentToSave);
      console.log("saveResident result:", result);
      if (!result.success) {
        console.error("Error in saveResident:", result.error);
        throw new Error(result.error);
      }

      // Log the activity
      if (userProfile?.id && userProfile?.brgyid) {
        const isEditing = !!resident;
        const action = isEditing ? 'resident_updated' : 'resident_added';
        const residentName = `${finalValues.firstName} ${finalValues.middleName ? finalValues.middleName + ' ' : ''}${finalValues.lastName}${finalValues.suffix ? ' ' + finalValues.suffix : ''}`;
        
        await logActivity({
          user_id: userProfile.id,
          brgyid: userProfile.brgyid,
          action,
          details: {
            resident_name: residentName,
            resident_id: result.data?.id || residentToSave.id,
            operation: isEditing ? 'update' : 'create',
            changes: isEditing ? 'Resident information updated' : 'New resident created',
            purok: finalValues.purok,
            status: finalValues.status,
            classifications: finalValues.classifications,
            method: 'modal_form',
            reason: isEditing ? 'Data correction/update' : 'New resident registration'
          }
        });
      }

      // Show success toast
      toast({
        title: resident ? "Resident updated successfully" : "Resident added successfully",
        description: `${finalValues.firstName} ${finalValues.lastName} has been ${resident ? 'updated in' : 'added to'} the database.`
      });

      // Invalidate residents query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['residents']
      });

      // Invalidate individual resident query for details page
      queryClient.invalidateQueries({
        queryKey: ['resident']
      });

      // Invalidate resident photo cache to ensure fresh photos are loaded
      queryClient.invalidateQueries({
        queryKey: ['resident-photo']
      });

      // Close the dialog
      onSubmit();
    } catch (error: any) {
      console.error('Error saving resident:', error);
      toast({
        title: "Error saving resident",
        description: error.message || "There was a problem saving the resident.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle cancel button click
  const handleCancel = () => {
    // Reset form values
    form.reset();
    // Close dialog by calling onSubmit (which executes handleCloseDialog from parent)
    onSubmit();
  };

  // Log when the component is rendered with certain props
  useEffect(() => {
    if (resident) {
      console.log("ResidentForm rendered with resident ID:", resident.id);
      console.log("Resident status:", resident.status);
      console.log("Resident died_on:", resident.diedOn);
    } else {
      console.log("ResidentForm rendered for new resident creation");
    }
  }, [resident]);
  return <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <ScrollArea className="pr-4 h-[calc(85vh-180px)]">
          <div className="pr-4 space-y-6">
            <h3 className="text-lg font-medium mb-4">Personal Information</h3>
            
            {/* Photo upload component removed - now handled by EditResidentModal */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({
              field
            }) => <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Alan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="lastName" render={({
              field
            }) => <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Cenas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="middleName" render={({
              field
            }) => <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Cabalan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="suffix" render={({
              field
            }) => <FormItem>
                    <FormLabel>Suffix</FormLabel>
                    <FormControl>
                      <Input placeholder="Jr., Sr., III" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="gender" render={({
              field
            }) => <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="birthDate" render={({
              field
            }) => <FormItem>
                    <FormLabel>Birth Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="civilStatus" render={({
              field
            }) => <FormItem>
                    <FormLabel>Civil Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Separated">Separated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="nationality" render={({
              field
            }) => <FormItem>
                    <FormLabel>Nationality *</FormLabel>
                    <FormControl>
                      <Input placeholder="Japanese" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>

            <h3 className="text-lg font-medium mb-4 pt-4 border-t">Address</h3>
            
            {isAutoFillEnabled && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">📍 Address fields are automatically filled and are read-only for security.</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="purok" render={({
              field
            }) => <FormItem>
                    <FormLabel>Purok *</FormLabel>
                    <FormControl>
                      <Input placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="barangay" render={({
              field
            }) => <FormItem>
                    <FormLabel>Barangay *</FormLabel>
                    <FormControl>
                      <Input placeholder="Seriac" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="municipality" render={({
              field
            }) => <FormItem>
                    <FormLabel>Municipality/City *</FormLabel>
                    <FormControl>
                      <Input placeholder="Siayan" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="province" render={({
              field
            }) => <FormItem>
                    <FormLabel>Province *</FormLabel>
                    <FormControl>
                      <Input placeholder="Zamboanga Del Norte" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="region" render={({
              field
            }) => <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <FormControl>
                      <Input placeholder="IX" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="country" render={({
              field
            }) => <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input placeholder="Philippines" {...field} readOnly={isAutoFillEnabled} className={isAutoFillEnabled ? "bg-muted text-muted-foreground cursor-not-allowed" : ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="yearsInBarangay" render={({
              field
            }) => <FormItem>
                    <FormLabel>Years in Barangay</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="5" onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value === undefined ? '' : field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>


             <h3 className="text-lg font-medium mb-4 pt-4 border-t">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="contactNumber" render={({
              field
            }) => <FormItem>
                    <FormLabel>Contact Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormDescription>
                      Format: 09XXXXXXXXX
                    </FormDescription>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="email" render={({
              field
            }) => <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="alancenas@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>

            <h3 className="text-lg font-medium mb-4 pt-4 border-t">Resident Classifications</h3>
            <div>
              <FormField control={form.control} name="classifications" render={() => <FormItem>
                    <div className="mb-4">
                      <FormLabel>Classifications</FormLabel>
                      <FormDescription className="mt-1">
                        Select all that apply to this resident
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {residentClassifications.map(classification => <FormField key={classification.id} control={form.control} name="classifications" render={({
                  field
                }) => {
                  return <FormItem key={classification.id} className="flex flex-row items-center space-x-3 space-y-0 p-2 border rounded-md hover:bg-accent">
                                <FormControl>
                                  <Checkbox checked={field.value?.includes(classification.id)} onCheckedChange={checked => {
                        const currentValues = [...(field.value || [])];
                        if (checked) {
                          field.onChange([...currentValues, classification.id]);
                        } else {
                          field.onChange(currentValues.filter(value => value !== classification.id));
                        }
                      }} />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {classification.label}
                                </FormLabel>
                              </FormItem>;
                }} />)}
                    </div>
                    <FormMessage />
                  </FormItem>} />
            </div>

            <h3 className="text-lg font-medium mb-4 pt-4 border-t">Other Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="occupation" render={({
              field
            }) => <FormItem>
                    <FormLabel>Occupation</FormLabel>
                    <FormControl>
                      <Input placeholder="Teacher" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="monthlyIncome" render={({
              field
            }) => <FormItem>
                    <FormLabel>Monthly Income</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="20000" onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} value={field.value === undefined ? '' : field.value} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>

            <h3 className="text-md font-medium mb-2 pt-2">Government IDs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="isVoter" render={({
              field
            }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Voter</FormLabel>
                    </div>
                  </FormItem>} />
              
              <FormField control={form.control} name="hasPhilhealth" render={({
              field
            }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>PhilHealth</FormLabel>
                    </div>
                  </FormItem>} />

              <FormField control={form.control} name="hasSss" render={({
              field
            }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>SSS</FormLabel>
                    </div>
                  </FormItem>} />

              <FormField control={form.control} name="hasPagibig" render={({
              field
            }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Pag-IBIG</FormLabel>
                    </div>
                  </FormItem>} />

              <FormField control={form.control} name="hasTin" render={({
              field
            }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>TIN</FormLabel>
                    </div>
                  </FormItem>} />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Emergency Contact Information <span className="text-sm font-normal text-muted-foreground">(Optional)</span></h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="emergencyContactName" render={({
                field
              }) => <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Maria Dela Cruz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="emergencyContactRelationship" render={({
                field
              }) => <FormItem>
                      <FormLabel>Relationship</FormLabel>
                      <FormControl>
                        <Input placeholder="Spouse" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="emergencyContactNumber" render={({
                field
              }) => <FormItem>
                      <FormLabel>Contact Number</FormLabel>
                      <FormControl>
                        <Input placeholder="09123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
            </div>
    
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Resident Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({
                field
              }) => <FormItem>
                      <FormLabel>Resident Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Permanent">Permanent</SelectItem>
                          <SelectItem value="Temporary">Temporary</SelectItem>
                          <SelectItem value="Deceased">Deceased</SelectItem>
                          <SelectItem value="Relocated">Relocated</SelectItem>
                          <SelectItem value="Missing">Missing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                {status === "Deceased" && <FormField control={form.control} name="diedOn" render={({
                field
              }) => <FormItem className="flex flex-col">
                        <FormLabel>Date of Death</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "MMMM d, yyyy") : <span>Select date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={date => date > new Date()} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Select the date when the resident passed away
                        </FormDescription>
                        <FormMessage />
                      </FormItem>} />}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-4">Additional Notes</h3>
              <div className="grid grid-cols-1 gap-4">
                <FormField control={form.control} name="remarks" render={({
                field
              }) => <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes about this resident" className="resize-none min-h-[150px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="flex justify-end space-x-4 pt-4 border-t mt-6">
          <Button variant="outline" type="button" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : resident ? "Update Resident" : "Save Resident"}
          </Button>
        </div>
      </form>
    </FormProvider>;
};
export default ResidentForm;
