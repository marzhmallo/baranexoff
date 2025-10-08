import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileCog, Save, UserCheck, X, Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { addDays } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

const issueDocumentSchema = z.object({
  document_type_id: z.string().uuid({
    message: "Please select a document type"
  }),
  resident_id: z.string().optional(),
  purpose: z.string().min(5, {
    message: "Purpose must be at least 5 characters"
  }),
  payment_amount: z.coerce.number().min(0, {
    message: "Payment amount cannot be negative"
  }),
  payment_status: z.string(),
  status: z.string()
});

interface IssueDocumentFormProps {
  onClose?: () => void;
}

const IssueDocumentForm = ({ onClose }: IssueDocumentFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loadingDocTypes, setLoadingDocTypes] = useState(true);
  const [loadingResidents, setLoadingResidents] = useState(true);
  const [selectedDocType, setSelectedDocType] = useState(null);
  const [dynamicFields, setDynamicFields] = useState({});
  const [residentComboOpen, setResidentComboOpen] = useState(false);
  const [residentSearchValue, setResidentSearchValue] = useState("");
  const [nonRegisteredResident, setNonRegisteredResident] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const {
    toast
  } = useToast();

  // Set up form with default values
  const form = useForm({
    resolver: zodResolver(issueDocumentSchema),
    defaultValues: {
      document_type_id: "",
      resident_id: "",
      purpose: "",
      payment_amount: 0,
      payment_status: "pending",
      status: "Pending"
    }
  });

  // Fetch document types and residents on component mount
  useEffect(() => {
    fetchUserProfile();
    fetchDocumentTypes();
    fetchResidents();
  }, []);

  // Fetch user profile to get barangay ID
  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('brgyid')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  // Fetch document types from the database
  const fetchDocumentTypes = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('document_types').select('*').order('name');
      if (error) throw error;
      setDocumentTypes(data || []);
    } catch (error) {
      console.error("Error fetching document types:", error);
      toast({
        title: "Error",
        description: "Failed to load document types.",
        variant: "destructive"
      });
    } finally {
      setLoadingDocTypes(false);
    }
  };

  // Fetch residents from the database
  const fetchResidents = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('residents').select('id, first_name, last_name, middle_name, suffix').order('last_name');
      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error("Error fetching residents:", error);
      toast({
        title: "Error",
        description: "Failed to load residents.",
        variant: "destructive"
      });
    } finally {
      setLoadingResidents(false);
    }
  };

  // Update selected document type and set fee
  const handleDocTypeChange = docTypeId => {
    const docType = documentTypes.find(dt => dt.id === docTypeId);
    setSelectedDocType(docType);
    form.setValue("payment_amount", docType?.fee || 0);

    // Reset dynamic fields
    setDynamicFields({});

    // Initialize dynamic fields if there are required fields
    if (docType?.required_fields && Object.keys(docType.required_fields).length > 0) {
      const initialFields = {};
      Object.keys(docType.required_fields).forEach(key => {
        initialFields[key] = "";
      });
      setDynamicFields(initialFields);
    }
  };

  // Update dynamic field value
  const handleDynamicFieldChange = (field, value) => {
    setDynamicFields(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get resident full name
  const getResidentName = residentId => {
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return "";
    const middleInitial = resident.middle_name ? ` ${resident.middle_name.charAt(0)}.` : "";
    return `${resident.first_name}${middleInitial} ${resident.last_name}${resident.suffix ? ` ${resident.suffix}` : ""}`;
  };

  // Handle resident selection or manual input
  const handleResidentSelection = (value) => {
    const resident = residents.find(r => r.id === value);
    if (resident) {
      form.setValue("resident_id", value);
      setResidentSearchValue(getResidentName(value));
      setNonRegisteredResident(null);
    } else {
      // This is manual input for non-registered resident
      form.setValue("resident_id", "");
      setResidentSearchValue(value);
      setNonRegisteredResident({
        name: value,
        contact: "",
        address: ""
      });
    }
    setResidentComboOpen(false);
  };

  // Filter residents based on search
  const filteredResidents = residents.filter(resident => {
    const fullName = getResidentName(resident.id).toLowerCase();
    return fullName.includes(residentSearchValue.toLowerCase());
  });

  // Handle form submission
  const onSubmit = async data => {
    setIsSubmitting(true);
    try {
      // Generate a unique document number
      const documentNumber = `DOC-${format(new Date(), "yyyyMMdd")}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate expiry date if validity days is set
      let expiryDate = null;
      if (selectedDocType?.validity_days) {
        expiryDate = addDays(new Date(), selectedDocType.validity_days);
      }

      // Get logged in user ID (mock for now)
      const userId = uuidv4(); // In a real app, this would come from auth

      // Prepare data for insertion into docrequests table
      const documentData = {
        type: selectedDocType?.name || 'Unknown',
        resident_id: null, // Admin issuing, not resident requesting
        purpose: data.purpose,
        amount: data.payment_amount,
        status: data.status,
        docnumber: documentNumber,
        processedby: userId,
        issued_at: new Date().toISOString(),
        brgyid: userProfile?.brgyid || null,
        receiver: nonRegisteredResident ? {
          name: nonRegisteredResident.name,
          contact: nonRegisteredResident.contact,
          address: nonRegisteredResident.address
        } : data.resident_id ? {
          name: getResidentName(data.resident_id),
          contact: "",
          address: ""
        } : null,
        notes: Object.keys(dynamicFields).length > 0 ? JSON.stringify(dynamicFields) : null
      };

      // Insert the document request
      const {
        data: newDocument,
        error
      } = await supabase.from('docrequests').insert(documentData).select();
      if (error) throw error;

      toast({
        title: "Document Issued",
        description: `Document has been issued successfully with number: ${documentNumber}`
      });

      // Reset form
      form.reset();
      setSelectedDocType(null);
      setDynamicFields({});
      setResidentSearchValue("");
      setNonRegisteredResident(null);
      
      // Close the modal if onClose is provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error issuing document:", error);
      toast({
        title: "Error",
        description: "Failed to issue the document.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render loading skeleton
  if (loadingDocTypes || loadingResidents) {
    return (
      <div className="space-y-4">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="document_type_id" render={({
            field
          }) => <FormItem>
                  <FormLabel>Document Type</FormLabel>
                  <Select onValueChange={value => {
              field.onChange(value);
              handleDocTypeChange(value);
            }} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a document type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {documentTypes.map(docType => <SelectItem key={docType.id} value={docType.id}>
                          {docType.name} {docType.fee > 0 ? `(₱${docType.fee})` : ''}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedDocType?.description && <FormDescription>{selectedDocType.description}</FormDescription>}
                  <FormMessage />
                </FormItem>} />
            
            <FormField control={form.control} name="resident_id" render={({
            field
          }) => <FormItem>
                  <FormLabel>Resident</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="Search resident or enter name..."
                        value={residentSearchValue}
                        onChange={(e) => {
                          setResidentSearchValue(e.target.value);
                          setResidentComboOpen(true);
                        }}
                        onFocus={() => setResidentComboOpen(true)}
                        onBlur={(e) => {
                          // Only close if not clicking within the dropdown
                          if (!e.currentTarget.contains(e.relatedTarget)) {
                            setTimeout(() => setResidentComboOpen(false), 150);
                          }
                        }}
                      />
                    </FormControl>
                     {residentComboOpen && (
                       <div 
                         className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-md shadow-md p-0"
                         onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking dropdown
                       >
                         <Command className="p-0">
                           <CommandList className="p-0">
                             <CommandEmpty className="p-0">
                               <div className="p-2">
                                 <p className="text-sm text-muted-foreground mb-2">No resident found.</p>
                                 <Button 
                                   variant="ghost" 
                                   className="w-full" 
                                   onClick={() => handleResidentSelection(residentSearchValue)}
                                 >
                                   Add "{residentSearchValue}" as non-registered resident
                                 </Button>
                               </div>
                             </CommandEmpty>
                            <CommandGroup>
                              {filteredResidents.map((resident) => (
                                <CommandItem
                                  key={resident.id}
                                  value={resident.id}
                                  onSelect={() => handleResidentSelection(resident.id)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      field.value === resident.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {getResidentName(resident.id)}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>} />
          </div>
          
          <FormField control={form.control} name="purpose" render={({
          field
        }) => <FormItem>
                <FormLabel>Purpose</FormLabel>
                <FormControl>
                  <Textarea placeholder="Enter the purpose for this document" className="resize-none" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
          
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FormField control={form.control} name="payment_amount" render={({
            field
          }) => <FormItem>
                  <FormLabel>Payment Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5">₱</span>
                      <Input type="number" min="0" step="0.01" className="pl-7" readOnly {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            
            <FormField control={form.control} name="payment_status" render={({
            field
          }) => <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="waived">Waived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />
            
            <FormField control={form.control} name="status" render={({
            field
          }) => <FormItem>
                  <FormLabel>Document Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-50">
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Processing">Processing</SelectItem>
                      <SelectItem value="Ready">Ready</SelectItem>
                      <SelectItem value="Released">Released</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />
          </div>
          
          {selectedDocType?.validity_days && <p className="text-sm text-muted-foreground">
              This document will be valid for {selectedDocType.validity_days} days from the date of issuance.
            </p>}
          
          <div className="flex justify-end gap-3">
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? <>Processing...</> : <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Issue Document
                </>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default IssueDocumentForm;
