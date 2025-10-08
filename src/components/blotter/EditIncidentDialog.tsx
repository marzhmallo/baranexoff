
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, User, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EditIncidentDialogProps {
  incident: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  title: string;
  description: string;
  report_type: string;
  status: string;
  location: string;
  reporter_name: string;
  reporter_contact?: string;
}

interface IncidentParty {
  id?: string;
  role: 'complainant' | 'respondent';
  resident_id?: string;
  name: string;
  contact_info?: string;
}

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  mobile_number?: string;
}

const EditIncidentDialog = ({ incident, open, onOpenChange, onSuccess }: EditIncidentDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [parties, setParties] = useState<IncidentParty[]>([]);
  const [newParty, setNewParty] = useState({
    role: '' as 'complainant' | 'respondent' | '',
    resident_id: '',
    name: '',
    contact_info: ''
  });
  
  const form = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      report_type: "",
      status: "",
      location: "",
      reporter_name: "",
      reporter_contact: "",
    },
  });

  // Fetch residents and parties when dialog opens
  const fetchResidents = async () => {
    try {
      const { data, error } = await supabase
        .from('residents')
        .select('id, first_name, last_name, middle_name, mobile_number')
        .eq('brgyid', incident?.brgyid)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setResidents(data || []);
    } catch (error) {
      console.error('Error fetching residents:', error);
    }
  };

  const fetchParties = async () => {
    if (!incident?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('incident_parties')
        .select('*')
        .eq('incident_id', incident.id)
        .order('role', { ascending: true });

      if (error) throw error;
      
      const typedData = (data || []).map(party => ({
        ...party,
        role: party.role as 'complainant' | 'respondent'
      }));
      
      setParties(typedData);
    } catch (error) {
      console.error('Error fetching parties:', error);
    }
  };

  useEffect(() => {
    if (incident && open) {
      form.reset({
        title: incident.title || "",
        description: incident.description || "",
        report_type: incident.report_type || "",
        status: incident.status || "",
        location: incident.location || "",
        reporter_name: incident.reporter_name || "",
        reporter_contact: incident.reporter_contact || "",
      });
      fetchResidents();
      fetchParties();
    }
  }, [incident, form, open]);

  const handleAddParty = async () => {
    if (!newParty.role || ((!newParty.resident_id || newParty.resident_id === 'not_resident') && !newParty.name)) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    let partyData: Omit<IncidentParty, 'id'> = {
      role: newParty.role,
      name: '',
      contact_info: newParty.contact_info || undefined
    };

    if (newParty.resident_id && newParty.resident_id !== 'not_resident') {
      const resident = residents.find(r => r.id === newParty.resident_id);
      partyData.resident_id = newParty.resident_id;
      partyData.name = `${resident?.first_name} ${resident?.middle_name ? resident.middle_name + ' ' : ''}${resident?.last_name}`;
    } else {
      partyData.name = newParty.name;
    }

    try {
      const { data, error } = await supabase
        .from('incident_parties')
        .insert({
          incident_id: incident.id,
          role: partyData.role,
          resident_id: partyData.resident_id || null,
          name: partyData.name,
          contact_info: partyData.contact_info || null
        })
        .select()
        .single();

      if (error) throw error;

      setParties(prev => [...prev, { ...partyData, id: data.id }]);
      setNewParty({ role: '', resident_id: '', name: '', contact_info: '' });

      toast({
        title: "Success",
        description: "Party added to incident",
      });
    } catch (error) {
      console.error('Error adding party:', error);
      toast({
        title: "Error",
        description: "Failed to add party",
        variant: "destructive",
      });
    }
  };

  const handleRemoveParty = async (partyId: string) => {
    try {
      const { error } = await supabase
        .from('incident_parties')
        .delete()
        .eq('id', partyId);

      if (error) throw error;

      setParties(prev => prev.filter(p => p.id !== partyId));

      toast({
        title: "Success",
        description: "Party removed from incident",
      });
    } catch (error) {
      console.error('Error removing party:', error);
      toast({
        title: "Error",
        description: "Failed to remove party",
        variant: "destructive",
      });
    }
  };

  const getSelectedResidentContact = () => {
    if (!newParty.resident_id || newParty.resident_id === 'not_resident') return '';
    const resident = residents.find(r => r.id === newParty.resident_id);
    return resident?.mobile_number || '';
  };

  const onSubmit = async (data: FormData) => {
    if (!incident?.id) return;

    try {
      setSubmitting(true);

      const { error } = await supabase
        .from('incident_reports')
        .update({
          title: data.title,
          description: data.description,
          report_type: data.report_type as any,
          status: data.status as any,
          location: data.location,
          reporter_name: data.reporter_name,
          reporter_contact: data.reporter_contact || null,
        })
        .eq('id', incident.id);

      if (error) {
        console.error('Error updating incident report:', error);
        toast({
          title: "Error",
          description: "Failed to update incident report",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Incident report updated successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const complainants = parties.filter(p => p.role === 'complainant');
  const respondents = parties.filter(p => p.role === 'respondent');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Incident Report</DialogTitle>
          <DialogDescription>
            Update the incident report details and manage involved parties
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Incident Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Incident Details</h3>
              
              <FormField
                control={form.control}
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="report_type"
                  rules={{ required: "Report type is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Theft">Theft</SelectItem>
                          <SelectItem value="Dispute">Dispute</SelectItem>
                          <SelectItem value="Vandalism">Vandalism</SelectItem>
                          <SelectItem value="Curfew">Curfew Violation</SelectItem>
                          <SelectItem value="Others">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  rules={{ required: "Status is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Open">Open</SelectItem>
                          <SelectItem value="Under_Investigation">Under Investigation</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Dismissed">Dismissed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  rules={{ required: "Location is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                rules={{ required: "Description is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reporter_name"
                  rules={{ required: "Reporter name is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reporter Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reporter_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reporter Contact</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Parties Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Parties Involved</h3>
              
              {/* Current Parties Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Complainants */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" />
                      Complainants ({complainants.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {complainants.map((party) => (
                      <div key={party.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="font-medium text-sm">{party.name}</p>
                          {party.contact_info && (
                            <p className="text-xs text-muted-foreground">{party.contact_info}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParty(party.id!)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {complainants.length === 0 && (
                      <p className="text-sm text-muted-foreground">No complainants added</p>
                    )}
                  </CardContent>
                </Card>

                {/* Respondents */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Respondents ({respondents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {respondents.map((party) => (
                      <div key={party.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <p className="font-medium text-sm">{party.name}</p>
                          {party.contact_info && (
                            <p className="text-xs text-muted-foreground">{party.contact_info}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParty(party.id!)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    {respondents.length === 0 && (
                      <p className="text-sm text-muted-foreground">No respondents added</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Add New Party Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Plus className="h-4 w-4" />
                    Add Party
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={newParty.role} 
                        onValueChange={(value: 'complainant' | 'respondent') => 
                          setNewParty(prev => ({ ...prev, role: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="complainant">Complainant</SelectItem>
                          <SelectItem value="respondent">Respondent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="resident">Resident (Optional)</Label>
                      <Select 
                        value={newParty.resident_id} 
                        onValueChange={(value) => 
                          setNewParty(prev => ({ 
                            ...prev, 
                            resident_id: value,
                            name: value === 'not_resident' ? '' : prev.name,
                            contact_info: value === 'not_resident' ? prev.contact_info : getSelectedResidentContact()
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select resident or leave empty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_resident">Not a resident</SelectItem>
                          {residents.map((resident) => (
                            <SelectItem key={resident.id} value={resident.id}>
                              {resident.first_name} {resident.middle_name ? resident.middle_name + ' ' : ''}{resident.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(!newParty.resident_id || newParty.resident_id === 'not_resident') && (
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={newParty.name}
                        onChange={(e) => setNewParty(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter full name"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="contact">Contact Information (Optional)</Label>
                    <Input
                      id="contact"
                      value={newParty.contact_info}
                      onChange={(e) => setNewParty(prev => ({ ...prev, contact_info: e.target.value }))}
                      placeholder="Phone number, email, or address"
                    />
                  </div>

                  <Button 
                    type="button"
                    onClick={handleAddParty} 
                    disabled={!newParty.role || ((!newParty.resident_id || newParty.resident_id === 'not_resident') && !newParty.name)}
                    className="w-full"
                  >
                    Add Party
                  </Button>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Report"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditIncidentDialog;
