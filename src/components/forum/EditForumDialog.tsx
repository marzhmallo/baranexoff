import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, ShieldHalf, HeartPulse, Lightbulb, HelpCircle, AlertTriangle, Construction } from "lucide-react";

interface Forum {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_public: boolean;
  brgyid: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  viewcount: number;
}

interface EditForumDialogProps {
  forum: Forum;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryOptions = [
  { value: "Announcements", label: "Announcements", icon: Megaphone },
  { value: "Peace & Order", label: "Peace & Order", icon: ShieldHalf },
  { value: "Health & Wellness", label: "Health & Wellness", icon: HeartPulse },
  { value: "Suggestions & Feedback", label: "Suggestions & Feedback", icon: Lightbulb },
  { value: "General Questions", label: "General Questions", icon: HelpCircle },
  { value: "Emergency Preparedness", label: "Emergency Preparedness", icon: AlertTriangle },
  { value: "Public Works & Infrastructure", label: "Public Works & Infrastructure", icon: Construction },
];

export function EditForumDialog({ forum, open, onOpenChange }: EditForumDialogProps) {
  const [title, setTitle] = useState(forum.title);
  const [description, setDescription] = useState(forum.description || "");
  const [category, setCategory] = useState(forum.category);
  const [isPublic, setIsPublic] = useState(forum.is_public);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("forums")
        .update({
          title,
          description: description || null,
          category,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", forum.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Forum updated successfully!",
      });

      queryClient.invalidateQueries({ queryKey: ["forums"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating forum:", error);
      toast({
        title: "Error",
        description: "Failed to update forum. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Forum</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={isPublic}
              onCheckedChange={(checked) => setIsPublic(checked as boolean)}
            />
            <Label htmlFor="isPublic">Make this forum public</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Forum"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}