
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Forum } from '@/pages/ForumPage';
import { Thread } from './ThreadsView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Image } from 'lucide-react';

interface CreateThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThreadCreated: () => void;
  forum: Forum;
  editingThread?: Thread | null;
}

const SUGGESTED_TAGS = [
  'Announcement', 'Question', 'Emergency', 'Health', 'Event', 
  'Infrastructure', 'Security', 'Education', 'Environment'
];

const CreateThreadDialog = ({ open, onOpenChange, onThreadCreated, forum, editingThread }: CreateThreadDialogProps) => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const isAdmin = userProfile?.role === 'admin';
  const isEditing = !!editingThread;

  // Populate form when editing or reset when creating new thread
  useEffect(() => {
    if (open) {
      if (editingThread) {
        // Populate form with existing thread data
        setTitle(editingThread.title || '');
        setContent(editingThread.content || '');
        setTags(editingThread.tags || []);
        setIsPinned(editingThread.pinned || false);
        
        // Handle existing photo
        if (editingThread.photo_url) {
          setPhotoPreview(editingThread.photo_url);
          setSelectedPhoto(null); // No new file selected yet
        } else {
          setPhotoPreview(null);
          setSelectedPhoto(null);
        }
      } else {
        // Reset form for new thread
        setTitle('');
        setContent('');
        setTags([]);
        setIsPinned(false);
        setPhotoPreview(null);
        setSelectedPhoto(null);
      }
    }
  }, [editingThread, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTitle('');
      setContent('');
      setTags([]);
      setIsPinned(false);
      setPhotoPreview(null);
      setSelectedPhoto(null);
      setTagInput('');
    }
  }, [open]);

  const handleTagAdd = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleSuggestedTagClick = (tag: string) => {
    if (!tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!selectedPhoto || !userProfile) return null;

    setIsUploadingPhoto(true);
    try {
      const fileExt = selectedPhoto.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const folderName = userProfile.role === 'admin' ? 'officials' : 'user';
      const filePath = `${folderName}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('forum')
        .upload(filePath, selectedPhoto);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('forum')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload photo",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    if (!userProfile) {
      toast({
        title: "Error",
        description: `You must be logged in to ${isEditing ? 'edit' : 'create'} a thread`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Handle photo upload
      let photoUrl = photoPreview; // Keep existing photo if no new one selected
      
      if (selectedPhoto) {
        // New photo selected, upload it
        photoUrl = await uploadPhoto();
        if (!photoUrl && selectedPhoto) {
          // Photo upload failed but was selected
          return;
        }
      } else if (!photoPreview) {
        // No photo selected and no existing photo
        photoUrl = null;
      }

      if (isEditing && editingThread) {
        // Update existing thread
        const { error } = await supabase
          .from('threads')
          .update({
            title: title.trim(),
            content: content.trim(),
            tags,
            pinned: isAdmin ? isPinned : editingThread.pinned,
            photo_url: photoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingThread.id);

        if (error) throw error;
        
        toast({
          title: "Thread Updated",
          description: "Your thread has been updated successfully."
        });
      } else {
        // Create new thread
        const { data, error } = await supabase
          .from('threads')
          .insert({
            forum_id: forum.id,
            brgyid: forum.brgyid,
            title: title.trim(),
            content: content.trim(),
            tags,
            pinned: isAdmin ? isPinned : false,
            created_by: userProfile.id,
            photo_url: photoUrl
          })
          .select();

        if (error) throw error;
        
        toast({
          title: "Thread Created",
          description: "Your thread has been posted successfully."
        });
      }
      
      onThreadCreated();
      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setIsPinned(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
    } catch (error: any) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} thread:`, error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} thread: ` + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Thread' : 'Create New Thread'}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Edit your thread in ${forum.title}` : `Create a new discussion thread in ${forum.title}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Thread Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a clear, specific title"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Share details, ask questions, or start a discussion..."
                rows={6}
                className="resize-y"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="photo">Photo Attachment</Label>
              <div className="space-y-2">
                {!selectedPhoto && (
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo"
                      className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Upload className="h-8 w-8" />
                      <span>Click to upload a photo</span>
                      <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                    </label>
                  </div>
                )}
                
                {photoPreview && (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={removePhoto}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (Max 5)</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => handleTagRemove(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleTagAdd();
                    }
                  }}
                  disabled={tags.length >= 5}
                />
                <Button 
                  type="button" 
                  onClick={handleTagAdd}
                  disabled={!tagInput.trim() || tags.length >= 5}
                >
                  Add
                </Button>
              </div>
              {tags.length < 5 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {SUGGESTED_TAGS.filter(tag => !tags.includes(tag)).slice(0, 5).map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => handleSuggestedTagClick(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            
            {isAdmin && (
              <div className="flex items-center justify-between">
                <Label htmlFor="pinned" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Pin Thread (Admin Only)
                </Label>
                <Switch
                  id="pinned"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                />
              </div>
            )}
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
              {isSubmitting ? (isEditing ? "Updating..." : "Posting...") : (isEditing ? "Update Thread" : "Post Thread")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateThreadDialog;
