import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { FilePlus, Pencil, Trash2, Upload, Image as ImageIcon } from "lucide-react";

interface DocxRecord {
  id: string;
  resid: string;
  document_type: string;
  notes: string | null;
  file_path: string; // e.g. dis/{residentId}/{uuid}.jpg
  created_at: string | null;
}

interface ResidentIDsManagerProps {
  residentId: string;
}

const bucket = "residentphotos";
const ID_TYPES = [
  "National ID",
  "Passport",
  "Driver's License",
  "Voter's ID",
  "Postal ID",
  "SSS ID",
  "GSIS ID",
  "PhilHealth ID",
  "Senior Citizen ID",
  "PWD ID",
  "Student ID",
  "PRC ID",
  "Barangay ID",
  "Company ID",
  "Other"
];

const ResidentIDsManager: React.FC<ResidentIDsManagerProps> = ({ residentId }) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<DocxRecord | null>(null);

  const [idType, setIdType] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: ids, isLoading, refetch } = useQuery<{ rows: DocxRecord[]; urls: Record<string, string> }>(
    {
      queryKey: ["resident-docx", residentId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("docx")
          .select("id,resid,document_type,notes,file_path,created_at")
          .eq("resid", residentId)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const rows = (data || []) as DocxRecord[];
        const urls: Record<string, string> = {};
        await Promise.all(
          rows.map(async (r) => {
            if (!r.file_path) return;
            const { data: signed, error: signErr } = await supabase.storage
              .from(bucket)
              .createSignedUrl(r.file_path, 600);
            if (!signErr && signed?.signedUrl) {
              urls[r.id] = signed.signedUrl;
            }
          })
        );
        return { rows, urls };
      },
      enabled: !!residentId,
      staleTime: 5 * 60 * 1000,
    }
  );

  const resetForm = () => {
    setIdType("");
    setNotes("");
    setFile(null);
    setEditing(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (rec: DocxRecord) => {
    setEditing(rec);
    setIdType(rec.document_type || "");
    setNotes(rec.notes || "");
    setFile(null);
    setIsEditOpen(true);
  };

  const handleUploadPath = (filename: string) => `dis/${residentId}/${filename}`;

  const handleAdd = async () => {
    try {
      if (!idType.trim()) {
        toast({ title: "ID type required", description: "Please enter the identification type." });
        return;
      }
      if (!file) {
        toast({ title: "Photo required", description: "Please upload the ID photo." });
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const objectName = `${uuidv4()}.${ext}`;
      const filePath = handleUploadPath(objectName);

      const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("docx").insert({
        resid: residentId,
        document_type: idType.trim(),
        notes: notes.trim() || null,
        file_path: filePath,
      });
      if (insErr) throw insErr;

      toast({ title: "ID added", description: "Resident identification saved." });
      setIsAddOpen(false);
      resetForm();
      refetch();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to add ID", description: e.message || "Please try again." });
    }
  };

  const handleEditSave = async () => {
    if (!editing) return;
    try {
      let newPath = editing.file_path;
      let oldPathToDelete: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const objectName = `${uuidv4()}.${ext}`;
        const filePath = handleUploadPath(objectName);
        const { error: upErr } = await supabase.storage.from(bucket).upload(filePath, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (upErr) throw upErr;
        oldPathToDelete = editing.file_path;
        newPath = filePath;
      }

      const { error: updErr } = await supabase
        .from("docx")
        .update({
          document_type: idType.trim(),
          notes: notes.trim() || null,
          file_path: newPath,
        })
        .eq("id", editing.id);
      if (updErr) throw updErr;

      if (oldPathToDelete) {
        await supabase.storage.from(bucket).remove([oldPathToDelete]);
      }

      toast({ title: "ID updated" });
      setIsEditOpen(false);
      resetForm();
      refetch();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to update", description: e.message || "Please try again." });
    }
  };

  const handleDelete = async (rec: DocxRecord) => {
    try {
      const { error: delErr } = await supabase.from("docx").delete().eq("id", rec.id);
      if (delErr) throw delErr;
      if (rec.file_path) {
        await supabase.storage.from(bucket).remove([rec.file_path]);
      }
      toast({ title: "ID deleted" });
      refetch();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to delete", description: e.message || "Please try again." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resident Identifications</h3>
          <p className="text-sm text-muted-foreground">Upload and manage ID photos and types linked to this resident.</p>
        </div>
        <Button onClick={openAdd}>
          <FilePlus className="mr-2 h-4 w-4" /> Add ID
        </Button>
      </div>

      <Separator />

      <ScrollArea className="max-h-[60vh] pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">Loading IDs…</CardContent>
            </Card>
          )}

          {!isLoading && ids && ids.rows.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">No IDs uploaded yet.</CardContent>
            </Card>
          )}

          {ids?.rows.map((rec) => (
            <Card key={rec.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{rec.document_type || "Untitled ID"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-square w-full rounded-md bg-muted flex items-center justify-center overflow-hidden">
{ids?.urls?.[rec.id] ? (
                    <button
                      type="button"
                      className="w-full h-full"
                      onClick={() => {
                        setPreviewUrl(ids?.urls?.[rec.id] || null);
                        setIsPreviewOpen(true);
                      }}
                    >
                      <img
                        src={ids.urls[rec.id]}
                        alt={`${rec.document_type} - resident ID photo`}
                        className="w-full h-full object-cover cursor-zoom-in"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-1" />
                      <span className="text-xs">No preview</span>
                    </div>
                  )}
                </div>
                {rec.notes && (
                  <p className="text-sm text-muted-foreground">{rec.notes}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(rec)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(rec)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold">Add Resident ID</h4>
              <p className="text-sm text-muted-foreground">Store privately under residentphotos/dis/{"{residentId}"}</p>
            </div>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="idType">Identification type</Label>
                <Select value={idType} onValueChange={setIdType}>
                  <SelectTrigger id="idType" aria-label="Identification type">
                    <SelectValue placeholder="Select identification type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any relevant details…" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="photo">ID Photo</Label>
                <Input id="photo" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>
                <Upload className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <div className="space-y-4">
            <div>
              <h4 className="text-lg font-semibold">Edit Resident ID</h4>
              <p className="text-sm text-muted-foreground">Update details or replace the photo.</p>
            </div>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="eidType">Identification type</Label>
                <Select value={idType} onValueChange={setIdType}>
                  <SelectTrigger id="eidType" aria-label="Identification type">
                    <SelectValue placeholder="Select identification type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ID_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="enotes">Notes (optional)</Label>
                <Textarea id="enotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ephoto">Replace photo (optional)</Label>
                <Input id="ephoto" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave}>
                <Upload className="mr-2 h-4 w-4" /> Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] max-h-[90vh] p-0 bg-transparent border-0 shadow-none">
          <div className="relative w-full h-full flex items-center justify-center bg-black/80 p-2 rounded-lg">
            {previewUrl && (
              <img src={previewUrl} alt="Identification preview" className="max-h-[85vh] max-w-full object-contain rounded" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentIDsManager;
