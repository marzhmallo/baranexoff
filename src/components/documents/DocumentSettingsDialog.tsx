import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";
import { Save, Copy } from "lucide-react";
import PaymentMethodsManager from "./PaymentMethodsManager";
interface DocumentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const DocumentSettingsDialog = ({
  open,
  onOpenChange
}: DocumentSettingsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [requireUpfront, setRequireUpfront] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const {
    toast
  } = useToast();
  const {
    adminProfileId
  } = useCurrentAdmin();

  // Fetch admin profile and barangay policies
  useEffect(() => {
    const fetchData = async () => {
      if (!adminProfileId) return;
      try {
        const {
          data: profile,
          error: profileError
        } = await supabase.from('profiles').select('brgyid').eq('id', adminProfileId).maybeSingle();
        if (profileError) throw profileError;
        setAdminProfile(profile);
        if (profile?.brgyid) {
          const {
            data: brgyRow,
            error: brgyError
          } = await supabase.from('barangays').select('payreq, instructions').eq('id', profile.brgyid).maybeSingle();
          if (brgyError) throw brgyError;
          if (brgyRow) {
            if (brgyRow.payreq !== null) {
              setRequireUpfront(Boolean(brgyRow.payreq));
            } else {
              const keyBase = `docpay:${profile.brgyid}`;
              const upfront = localStorage.getItem(`${keyBase}:requireUpfront`);
              setRequireUpfront(upfront === 'true');
            }
            setCustomInstructions(brgyRow.instructions || "");
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    if (open) {
      fetchData();
    }
  }, [adminProfileId, open]);

  // Policies now persisted in DB (barangays.payreq). Legacy localStorage fallback handled in fetchData.
  // No separate effect needed here to avoid overriding DB values.

  const handleSave = async () => {
    if (!adminProfile?.brgyid) {
      toast({
        title: "Error",
        description: "Admin profile not found",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // Mirror policy to DB (and localStorage for legacy fallback)
      const {
        error
      } = await supabase.from('barangays').update({
        payreq: requireUpfront,
        instructions: customInstructions?.trim() ? customInstructions.trim() : `Payment Instructions:\n- ${instructions()}`
      }).eq('id', adminProfile.brgyid);
      if (error) throw error;
      const keyBase = `docpay:${adminProfile.brgyid}`;
      localStorage.setItem(`${keyBase}:requireUpfront`, String(requireUpfront));
      toast({
        title: "Settings Saved",
        description: "Policies and instructions saved."
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const instructions = () => {
    const steps: string[] = [];
    const enabledProviders = providers?.filter((p: any) => p.enabled) || [];
    if (requireUpfront) {
      steps.push("This barangay requires upfront payment for online requests.");
    } else {
      steps.push("You may pay using any available method below or pay in cash upon pickup.");
    }
    enabledProviders.forEach((p: any) => {
      const title = p.gname || "Payment Method";
      const accountName = p.credz?.account_name || p.credz?.name || "";
      const accountNumber = p.credz?.account_number || p.credz?.number || "";
      const creds = [accountName, accountNumber].filter(Boolean).join(" • ");
      steps.push(`${title}: ${creds || "see QR/notes"}.`);
      if (p.url) steps.push(`Scan the ${title} QR code to pay quickly.`);
    });
    steps.push("If paying online, upload your payment screenshot and reference number in the request form.");
    steps.push("Cash on Pickup: Always available. Settle at the office upon pickup.");
    return steps.join("\n- ");
  };
  const copyInstructions = async () => {
    try {
      const text = (customInstructions?.trim() ? customInstructions : `Payment Instructions:\n- ${instructions()}`);
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Instructions copied to clipboard"
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };
  const gcashMethod = providers.find((p: any) => p?.gname?.toLowerCase?.() === 'gcash');
  const hasExistingQR = Boolean(gcashMethod?.url);
  const isSetupComplete = Boolean(gcashMethod?.enabled && gcashMethod?.url && (gcashMethod?.credz?.name || gcashMethod?.credz?.account_name) && (gcashMethod?.credz?.number || gcashMethod?.credz?.account_number));
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Document Payments Setup</DialogTitle>
        </DialogHeader>

        {/* Status */}
        <div className="space-y-4 py-2">
          {gcashMethod && <div className={`p-3 rounded-lg border ${isSetupComplete ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSetupComplete ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span className={`text-sm font-medium ${isSetupComplete ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  {isSetupComplete ? 'GCash Setup Complete' : 'GCash Setup Incomplete'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isSetupComplete ? 'All GCash payment information has been configured.' : 'Some GCash information is missing. Please complete the setup below.'}
              </p>
              {hasExistingQR && <p className="text-xs text-muted-foreground mt-1">QR Code: Already uploaded</p>}
            </div>}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="instructions">Instructions</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-5 pt-4">
            <PaymentMethodsManager brgyId={adminProfile?.brgyid} onChange={setProviders} />
            
          </TabsContent>

          <TabsContent value="policies" className="space-y-5 pt-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Require upfront payment</p>
                <p className="text-xs text-muted-foreground">When enabled, users must select GCash and upload proof of payment for online requests.</p>
              </div>
              <Switch checked={requireUpfront} onCheckedChange={setRequireUpfront} />
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Pricing is per-document and should be managed in the Document Types library.
            </p>
          </TabsContent>

          <TabsContent value="instructions" className="space-y-3 pt-4">
            <div className="rounded-lg border border-border p-3 bg-muted/20">
              <p className="text-sm font-medium mb-2 text-foreground">Edit Instructions</p>
              <Textarea
                rows={8}
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder={`Payment Instructions:\n- ${instructions()}`}
                className="border-border bg-background text-foreground"
              />
              <div className="flex justify-end mt-2">
                <Button type="button" variant="outline" onClick={copyInstructions}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="border-border text-foreground hover:bg-accent">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default DocumentSettingsDialog;