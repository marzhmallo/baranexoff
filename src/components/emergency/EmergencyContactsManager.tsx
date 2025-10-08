import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Plus, Phone, Edit, Trash2, Mail } from "lucide-react";
interface EmergencyContact {
  id: string;
  type: 'fire' | 'police' | 'medical' | 'disaster' | 'rescue';
  name: string;
  phone_number: string;
  email?: string;
  description?: string;
  created_at: string;
}
interface ContactFormData {
  type: 'Fire' | 'Police' | 'Medical' | 'Disaster' | 'Rescue' | '';
  name: string;
  phone_number: string;
  email?: string;
  description?: string;
}

// Type conversion functions
const capitalizeToLowercase = (type: string): 'fire' | 'police' | 'medical' | 'disaster' | 'rescue' => {
  const mapping: Record<string, 'fire' | 'police' | 'medical' | 'disaster' | 'rescue'> = {
    'Fire': 'fire',
    'Police': 'police',
    'Medical': 'medical',
    'Disaster': 'disaster',
    'Rescue': 'rescue'
  };
  return mapping[type] || 'fire';
};
const lowercaseToCapitalize = (type: string): string => {
  const mapping: Record<string, string> = {
    'fire': 'Fire',
    'police': 'Police',
    'medical': 'Medical',
    'disaster': 'Disaster',
    'rescue': 'Rescue'
  };
  return mapping[type] || type;
};

interface EmergencyContactsManagerProps {
  readOnly?: boolean;
}

const EmergencyContactsManager = ({ readOnly = false }: EmergencyContactsManagerProps) => {
  const {
    userProfile
  } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const form = useForm<ContactFormData>({
    defaultValues: {
      type: '',
      name: "",
      phone_number: "",
      email: "",
      description: ""
    }
  });
  useEffect(() => {
    if (userProfile?.brgyid) {
      fetchContacts();
    }
  }, [userProfile?.brgyid]);
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('emergency_contacts').select('*').eq('brgyid', userProfile?.brgyid).order('type', {
        ascending: true
      });
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load emergency contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const onSubmit = async (data: ContactFormData) => {
    if (!userProfile?.id || !userProfile?.brgyid || !data.type) return;
    try {
      if (editingContact) {
        const {
          error
        } = await supabase.from('emergency_contacts').update({
          type: capitalizeToLowercase(data.type),
          name: data.name,
          phone_number: data.phone_number,
          email: data.email || null,
          description: data.description || null
        }).eq('id', editingContact.id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Emergency contact updated successfully"
        });
      } else {
        const {
          error
        } = await supabase.from('emergency_contacts').insert({
          type: capitalizeToLowercase(data.type),
          name: data.name,
          phone_number: data.phone_number,
          email: data.email || null,
          description: data.description || null,
          brgyid: userProfile.brgyid,
          created_by: userProfile.id
        });
        if (error) throw error;
        toast({
          title: "Success",
          description: "Emergency contact added successfully"
        });
      }
      form.reset();
      setIsDialogOpen(false);
      setEditingContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({
        title: "Error",
        description: "Failed to save emergency contact",
        variant: "destructive"
      });
    }
  };
  const deleteContact = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this emergency contact?')) return;
    try {
      const {
        error
      } = await supabase.from('emergency_contacts').delete().eq('id', id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Emergency contact deleted successfully"
      });
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: "Error",
        description: "Failed to delete emergency contact",
        variant: "destructive"
      });
    }
  };
  const openEditDialog = (contact: EmergencyContact) => {
    setEditingContact(contact);
    form.reset({
      type: lowercaseToCapitalize(contact.type) as 'Fire' | 'Police' | 'Medical' | 'Disaster' | 'Rescue',
      name: contact.name,
      phone_number: contact.phone_number,
      email: contact.email || "",
      description: contact.description || ""
    });
    setIsDialogOpen(true);
  };
  const openAddDialog = () => {
    setEditingContact(null);
    form.reset();
    setIsDialogOpen(true);
  };
  const callContact = (phoneNumber: string, name: string) => {
    if (window.confirm(`Call ${name} at ${phoneNumber}?`)) {
      window.open(`tel:${phoneNumber}`);
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'fire':
        return 'destructive';
      case 'police':
        return 'default';
      case 'medical':
        return 'secondary';
      case 'disaster':
        return 'outline';
      case 'rescue':
        return 'default';
      default:
        return 'outline';
    }
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return '🔥';
      case 'police':
        return '👮';
      case 'medical':
        return '🚑';
      case 'disaster':
        return '⛑️';
      case 'rescue':
        return '🚁';
      default:
        return '📞';
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-red-500/20 rounded-full">
            <Phone className="h-5 w-5 md:h-6 md:w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-200">Emergency Contacts</h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{contacts.length} contacts available</p>
          </div>
        </div>
        {!readOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={openAddDialog}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-10 md:h-11 text-xs md:text-sm"
              >
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                <span className="hidden sm:inline">Add Contact</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                {editingContact ? 'Update the emergency contact information.' : 'Add a new emergency contact for your barangay.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="type" rules={{
                required: "Contact type is required"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Contact Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Fire">🔥 Fire Department</SelectItem>
                          <SelectItem value="Police">👮 Police</SelectItem>
                          <SelectItem value="Medical">🚑 Medical/Ambulance</SelectItem>
                          <SelectItem value="Disaster">⛑️ Disaster Response</SelectItem>
                          <SelectItem value="Rescue">🚁 Rescue Services</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="name" rules={{
                required: "Contact name is required"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Contact Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Barangay Fire Station" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="phone_number" rules={{
                required: "Phone number is required"
              }} render={({
                field
              }) => <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., +63 123 456 7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="email" render={({
                field
              }) => <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="description" render={({
                field
              }) => <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional information about this contact" className="min-h-[80px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                <DialogFooter className="gap-2 pt-6">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-gray-300 dark:border-gray-600">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {contacts.length > 0 ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {contacts.map(contact => <Card key={contact.id} className="group border-0 shadow-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-2xl transition-all duration-300 md:hover:scale-[1.02] overflow-hidden">
              <CardHeader className="pb-2 md:pb-3 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 border-b border-gray-200/50 dark:border-gray-600/50 p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="text-xl md:text-2xl p-1.5 md:p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {getTypeIcon(contact.type)}
                    </div>
                    <Badge variant={getTypeColor(contact.type) as any} className="px-2 md:px-3 py-0.5 md:py-1 font-medium shadow-sm group-hover:shadow-md transition-shadow duration-200 text-[10px] md:text-xs">
                      {lowercaseToCapitalize(contact.type)}
                    </Badge>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(contact)} className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full">
                        <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteContact(contact.id)} className="h-7 w-7 md:h-8 md:w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full">
                        <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  )}
                </div>
                <CardTitle className="text-base md:text-lg text-gray-800 dark:text-gray-200 mt-2">{contact.name}</CardTitle>
                {contact.description && <CardDescription className="text-xs md:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{contact.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-2.5 md:space-y-3 p-3 md:p-4">
                <Button variant="outline" className="w-full justify-start h-10 md:h-11 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-700 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/50 dark:hover:to-emerald-900/50 hover:shadow-md transition-all duration-200 text-xs md:text-sm" onClick={() => callContact(contact.phone_number, contact.name)}>
                  <div className="p-1 bg-green-500/20 rounded-full mr-2 md:mr-3">
                    <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="font-medium truncate">{contact.phone_number}</span>
                </Button>
                {contact.email && <Button variant="ghost" className="w-full justify-start h-10 md:h-11 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:shadow-sm transition-all duration-200 text-xs md:text-sm" onClick={() => window.open(`mailto:${contact.email}`)}>
                    <div className="p-1 bg-blue-500/20 rounded-full mr-2 md:mr-3">
                      <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 truncate">{contact.email}</span>
                  </Button>}
              </CardContent>
            </Card>)}
        </div> : <Card className="border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <CardContent className="text-center py-8 md:py-12 p-4 md:p-6">
            <div className="p-3 md:p-4 bg-red-500/10 rounded-full w-fit mx-auto mb-4 md:mb-6">
              <Phone className="h-10 w-10 md:h-12 md:w-12 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-gray-800 dark:text-gray-200">No Emergency Contacts</h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4 md:mb-6 max-w-sm mx-auto">
              {readOnly 
                ? "No emergency contacts have been added yet. Contact your barangay administrator to add emergency contacts."
                : "Start by adding emergency contacts for your barangay to ensure quick access during emergencies."
              }
            </p>
            {!readOnly && (
              <Button onClick={openAddDialog} className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-10 md:h-11 text-xs md:text-sm">
                <Plus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Add First Contact
              </Button>
            )}
          </CardContent>
        </Card>}
    </div>;
};
export default EmergencyContactsManager;