
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, ShieldHalf, HeartPulse, Lightbulb, HelpCircle, TriangleAlert, Construction } from 'lucide-react';

interface CreateForumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onForumCreated: () => void;
}

const CreateForumDialog = ({ open, onOpenChange, onForumCreated }: CreateForumDialogProps) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General Questions');
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'Announcements', label: 'Announcements', icon: Megaphone },
    { value: 'Peace & Order', label: 'Peace & Order', icon: ShieldHalf },
    { value: 'Health & Wellness', label: 'Health & Wellness', icon: HeartPulse },
    { value: 'Suggestions & Feedback', label: 'Suggestions & Feedback', icon: Lightbulb },
    { value: 'General Questions', label: 'General Questions', icon: HelpCircle },
    { value: 'Emergency Preparedness', label: 'Emergency Preparedness', icon: TriangleAlert },
    { value: 'Public Works & Infrastructure', label: 'Public Works & Infrastructure', icon: Construction },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Forum title is required",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile?.brgyid) {
      toast({
        title: "Error",
        description: "Your user profile is missing barangay information",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('forums')
        .insert({
          title,
          description: description.trim() || null,
          category,
          is_public: isPublic,
          brgyid: userProfile.brgyid,
          created_by: userProfile.id,
        })
        .select();

      if (error) throw error;
      
      onForumCreated();
      setTitle('');
      setDescription('');
      setCategory('General Questions');
      setIsPublic(false);
    } catch (error: any) {
      console.error('Error creating forum:', error);
      toast({
        title: "Error",
        description: "Failed to create forum: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Forum</DialogTitle>
            <DialogDescription>
              Create a forum for discussion within your barangay. Public forums can be viewed by others.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Forum Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter forum title"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter forum description"
                rows={3}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="public" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Make Forum Public
              </Label>
              <Switch
                id="public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Forum"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateForumDialog;
