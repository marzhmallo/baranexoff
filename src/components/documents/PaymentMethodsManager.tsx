import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface PayMethodRow {
  id?: string;
  gname: string;
  url: string | null;
  enabled: boolean;
  credz: { account_name?: string; account_number?: string; [k: string]: any };
  // local-only helpers
  _tempFile?: File | null;
  _isNew?: boolean;
}

interface PaymentMethodsManagerProps {
  brgyId?: string | null;
  onChange?: (providers: PayMethodRow[]) => void;
}

export default function PaymentMethodsManager({ brgyId, onChange }: PaymentMethodsManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [methods, setMethods] = useState<PayMethodRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchMethods = async () => {
    if (!brgyId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payme")
        .select("id, gname, url, enabled, credz")
        .eq("brgyid", brgyId)
        .order("gname", { ascending: true });
      if (error) throw error;
      const rows: PayMethodRow[] = (data || []).map((r: any) => ({
        id: String(r.id),
        gname: r.gname,
        url: r.url,
        enabled: !!r.enabled,
        credz: r.credz || {},
      }));
      setMethods(rows);
      onChange?.(rows);
    } catch (e) {
      console.error("Failed to load payment methods", e);
      toast({ title: "Error", description: "Failed to load payment methods", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brgyId]);

  const addMethod = () => {
    const newId = `new-${Date.now()}`;
    const newRow: PayMethodRow = {
      id: newId,
      gname: "",
      url: null,
      enabled: true,
      credz: { account_name: "", account_number: "" },
      _isNew: true,
    };
    setMethods((prev) => [...prev, newRow]);
    setEditingId(newId);
  };

  const updateLocal = (id: string | undefined, patch: Partial<PayMethodRow>) => {
    setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMethod = async (id?: string) => {
    if (!id) return;
    // New unsaved rows can just be removed locally
    if (id.startsWith("new-")) {
      setMethods((prev) => prev.filter((m) => m.id !== id));
      if (editingId === id) setEditingId(null);
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("payme").delete().eq("id", id as any);
      if (error) throw error;
      toast({ title: "Removed", description: "Payment method deleted" });
      if (editingId === id) setEditingId(null);
      await fetchMethods();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to delete method", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveMethod = async (row: PayMethodRow) => {
    if (!brgyId) {
      toast({ title: "Missing barangay", description: "Please try again later", variant: "destructive" });
      return;
    }
    if (!row.gname?.trim()) {
      toast({ title: "Name required", description: "Enter a payment method name" });
      return;
    }

    setLoading(true);
    try {
      // Handle QR upload if any
      let url = row.url || null;
      if (row._tempFile) {
        const ext = row._tempFile.name.split(".").pop();
        const safeName = row.gname.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        const path = `${brgyId}/${safeName}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("cashqr")
          .upload(path, row._tempFile, { upsert: true });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("cashqr").getPublicUrl(path);
        url = data.publicUrl;
      }

      const payload = {
        brgyid: brgyId,
        gname: row.gname,
        enabled: !!row.enabled,
        url,
        credz: {
          account_name: row.credz?.account_name || row.credz?.name || "",
          account_number: row.credz?.account_number || row.credz?.number || "",
        },
      } as const;

      if (row.id && !row.id.startsWith("new-")) {
        const { error } = await supabase.from("payme").update(payload).eq("id", row.id as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payme").insert([payload]);
        if (error) throw error;
      }

      toast({ title: "Saved", description: `${row.gname} updated` });
      await fetchMethods();
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to save method", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const enabledCount = useMemo(() => methods.filter((m) => m.enabled).length, [methods]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Payment Methods ({enabledCount} enabled)</p>
          <p className="text-xs text-muted-foreground">Manage QR and credentials for each method. Cash on Pickup is always available.</p>
        </div>
        <Button size="sm" onClick={addMethod} disabled={loading}>Add Payment Method</Button>
      </div>

      <div className="space-y-3">
        {methods.map((m) => (
          <div key={m.id} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{m.gname || "Untitled method"}</span>
                {m.url && <span className="text-xs text-muted-foreground">QR uploaded</span>}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Enabled</span>
                  <Switch
                    checked={!!m.enabled}
                    onCheckedChange={async (v) => {
                      updateLocal(m.id, { enabled: v });
                      // Persist toggle immediately if row exists
                      if (m.id && !m.id.startsWith("new-")) {
                        try {
                          await supabase.from("payme").update({ enabled: v }).eq("id", m.id as any);
                          fetchMethods();
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                  />
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingId(editingId === m.id ? null : m.id)}>
                  {editingId === m.id ? "Close" : "Edit"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeMethod(m.id)} disabled={loading}>
                  Delete
                </Button>
              </div>
            </div>

            {editingId === m.id && (
              <div className="border-t border-border p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-foreground">Name</Label>
                    <Input
                      value={m.gname}
                      onChange={(e) => updateLocal(m.id, { gname: e.target.value })}
                      placeholder="e.g., GCash, Maya"
                      className="border-border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-foreground">Account Name</Label>
                    <Input
                      value={m.credz?.account_name || ""}
                      onChange={(e) => updateLocal(m.id, { credz: { ...m.credz, account_name: e.target.value } })}
                      placeholder="Juan Dela Cruz"
                      className="border-border bg-background text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-foreground">Account Number</Label>
                    <Input
                      value={m.credz?.account_number || ""}
                      onChange={(e) => updateLocal(m.id, { credz: { ...m.credz, account_number: e.target.value } })}
                      placeholder="09XXXXXXXXX / 1234XXXX"
                      className="border-border bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-foreground">QR Code Image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateLocal(m.id, { _tempFile: e.target.files?.[0] || null })}
                      className="border-border bg-background text-foreground"
                    />
                    {m.url && (
                      <img
                        src={m.url}
                        alt={`${m.gname} QR`}
                        className="mt-2 w-32 h-32 object-contain border rounded"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="flex md:items-end">
                    <Button size="sm" onClick={() => saveMethod(m)} disabled={loading} className="w-full md:w-auto">
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {methods.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">No payment methods yet. Click "Add Payment Method" to create one.</p>
        )}
      </div>
    </div>
  );
}
