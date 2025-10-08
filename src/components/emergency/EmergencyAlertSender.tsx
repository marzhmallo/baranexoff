import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, MessageSquare, Users, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useUserRoles } from '@/hooks/useUserRoles';

interface Recipient {
  id: string;
  name: string;
  phone: string;
  type: 'admin' | 'resident';
}

interface EmergencyAlertSenderProps {
  brgyid: string;
}

const EmergencyAlertSender = ({ brgyid }: EmergencyAlertSenderProps) => {
  const { toast } = useToast();
  const { data: roles } = useUserRoles();
  const isAdmin = roles?.includes('admin');

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendMode, setSendMode] = useState<'all' | 'selected'>('all');
  
  // Recipients
  const [allRecipients, setAllRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const MAX_CHARACTERS = 160;

  // Fetch all recipients when modal opens
  useEffect(() => {
    if (showRecipientModal && allRecipients.length === 0) {
      fetchAllRecipients();
    }
  }, [showRecipientModal]);

  const fetchAllRecipients = async () => {
    setLoadingRecipients(true);
    try {
      // Fetch admins/staff from profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, firstname, lastname, phone')
        .eq('brgyid', brgyid)
        .not('phone', 'is', null);

      if (profileError) throw profileError;

      // Fetch residents
      const { data: residents, error: residentError } = await supabase
        .from('residents')
        .select('id, first_name, last_name, mobile_number')
        .eq('brgyid', brgyid)
        .not('mobile_number', 'is', null);

      if (residentError) throw residentError;

      const adminRecipients: Recipient[] = (profiles || []).map(p => ({
        id: `profile-${p.id}`,
        name: `${p.firstname} ${p.lastname}`,
        phone: p.phone!,
        type: 'admin' as const
      }));

      const residentRecipients: Recipient[] = (residents || []).map(r => ({
        id: `resident-${r.id}`,
        name: `${r.first_name} ${r.last_name}`,
        phone: r.mobile_number!,
        type: 'resident' as const
      }));

      setAllRecipients([...adminRecipients, ...residentRecipients]);
    } catch (error: any) {
      toast({
        title: "Error Loading Recipients",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleSendToAll = () => {
    setSendMode('all');
    setShowConfirmDialog(true);
  };

  const handleSelectRecipients = () => {
    setShowRecipientModal(true);
  };

  const handleRecipientToggle = (recipientId: string) => {
    setSelectedRecipients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recipientId)) {
        newSet.delete(recipientId);
      } else {
        newSet.add(recipientId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (type: 'admin' | 'resident') => {
    const typeRecipients = filteredRecipients.filter(r => r.type === type);
    const allSelected = typeRecipients.every(r => selectedRecipients.has(r.id));
    
    setSelectedRecipients(prev => {
      const newSet = new Set(prev);
      typeRecipients.forEach(r => {
        if (allSelected) {
          newSet.delete(r.id);
        } else {
          newSet.add(r.id);
        }
      });
      return newSet;
    });
  };

  const handleConfirmSelection = () => {
    if (selectedRecipients.size === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one recipient.",
        variant: "destructive",
      });
      return;
    }
    setSendMode('selected');
    setShowRecipientModal(false);
    setShowConfirmDialog(true);
  };

  const handleSendAlert = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setShowConfirmDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('send-emergency-alert', {
        body: {
          brgyid: brgyid,
          message: message.trim(),
          recipient_ids: sendMode === 'selected' ? Array.from(selectedRecipients) : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: "Alert Sent Successfully",
        description: data.message,
      });
      
      // Reset form
      setMessage('');
      setSelectedRecipients(new Set());
    } catch (error: any) {
      toast({
        title: "Failed to Send Alert",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter recipients based on search
  const filteredRecipients = allRecipients.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.phone.includes(searchQuery)
  );

  const adminRecipients = filteredRecipients.filter(r => r.type === 'admin');
  const residentRecipients = filteredRecipients.filter(r => r.type === 'resident');

  const recipientCount = sendMode === 'all' 
    ? allRecipients.length 
    : selectedRecipients.size;

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only administrators can send emergency mass SMS alerts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="max-w-2xl mx-auto border-0 shadow-xl bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-t-lg border-b border-red-200/30 dark:border-red-700/30">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <MessageSquare className="h-6 w-6 text-red-600 dark:text-red-400" />
            Emergency Mass SMS Alert
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Send urgent SMS alerts to residents and admins in your barangay
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your emergency alert message here... (e.g., 'TYPHOON WARNING: Evacuation order effective immediately. Proceed to nearest evacuation center.')"
                className="min-h-[120px] resize-none"
                maxLength={MAX_CHARACTERS}
                disabled={isLoading}
              />
              <div className="flex justify-between items-center mt-2 text-sm">
                <p className="text-muted-foreground">
                  This will be sent via SMS to all recipients.
                </p>
                <p className={message.length > MAX_CHARACTERS - 20 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                  {message.length} / {MAX_CHARACTERS}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSendToAll}
                disabled={isLoading || !message.trim()}
                variant="destructive"
                className="flex-1 h-12"
              >
                {isLoading && sendMode === 'all' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending to All...
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" />
                    Send to All
                  </>
                )}
              </Button>

              <Button
                onClick={handleSelectRecipients}
                disabled={isLoading || !message.trim()}
                variant="outline"
                className="flex-1 h-12 border-2"
              >
                <Users className="mr-2 h-4 w-4" />
                Select Recipients
                {selectedRecipients.size > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedRecipients.size}
                  </Badge>
                )}
              </Button>
            </div>

            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> Use this feature only for genuine emergencies. 
                Each SMS may incur charges and all alerts are logged for audit purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipient Selection Modal */}
      <Dialog open={showRecipientModal} onOpenChange={setShowRecipientModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Recipients</DialogTitle>
            <DialogDescription>
              Choose who should receive the emergency alert
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Search by name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            {loadingRecipients ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="residents" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="residents">
                    Residents ({residentRecipients.length})
                  </TabsTrigger>
                  <TabsTrigger value="admins">
                    Admins/Staff ({adminRecipients.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="residents" className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Checkbox
                      checked={residentRecipients.length > 0 && residentRecipients.every(r => selectedRecipients.has(r.id))}
                      onCheckedChange={() => handleSelectAll('resident')}
                    />
                    <span className="text-sm font-medium ml-2 flex-1">Select All Residents</span>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    {residentRecipients.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No residents found</p>
                    ) : (
                      <div className="space-y-2">
                        {residentRecipients.map(recipient => (
                          <div key={recipient.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                            <Checkbox
                              checked={selectedRecipients.has(recipient.id)}
                              onCheckedChange={() => handleRecipientToggle(recipient.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{recipient.name}</p>
                              <p className="text-sm text-muted-foreground">{recipient.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="admins" className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Checkbox
                      checked={adminRecipients.length > 0 && adminRecipients.every(r => selectedRecipients.has(r.id))}
                      onCheckedChange={() => handleSelectAll('admin')}
                    />
                    <span className="text-sm font-medium ml-2 flex-1">Select All Admins/Staff</span>
                  </div>
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    {adminRecipients.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No admins/staff found</p>
                    ) : (
                      <div className="space-y-2">
                        {adminRecipients.map(recipient => (
                          <div key={recipient.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                            <Checkbox
                              checked={selectedRecipients.has(recipient.id)}
                              onCheckedChange={() => handleRecipientToggle(recipient.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{recipient.name}</p>
                              <p className="text-sm text-muted-foreground">{recipient.phone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecipientModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmSelection} disabled={selectedRecipients.size === 0}>
              Continue ({selectedRecipients.size} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Emergency Alert
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <div>
                <strong>Recipients:</strong> {recipientCount} {recipientCount === 1 ? 'person' : 'people'}
              </div>
              <div>
                <strong>Message Preview:</strong>
                <p className="mt-1 p-2 bg-muted rounded text-sm">
                  {message.length > 100 ? `${message.substring(0, 100)}...` : message}
                </p>
              </div>
              <div className="text-yellow-600 dark:text-yellow-500 font-semibold">
                ⚠️ This action cannot be undone. The SMS will be sent immediately.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendAlert}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Emergency Alert'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmergencyAlertSender;
