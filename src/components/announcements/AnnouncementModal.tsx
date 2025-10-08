import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
const formSchema = z.object({
  title: z.string().min(5, {
    message: 'Title must be at least 5 characters'
  }).max(100, {
    message: 'Title must be less than 100 characters'
  }),
  content: z.string().min(10, {
    message: 'Content must be at least 10 characters'
  }),
  category: z.string().min(1, {
    message: 'Please select a category'
  }),
  audience: z.string().min(1, {
    message: 'Please select an audience'
  }),
  is_pinned: z.boolean().default(false),
  visibility: z.string().min(1, {
    message: 'Please select visibility'
  }),
  photo_url: z.string().optional(),
  attachment_url: z.string().optional()
});
export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  audience: string;
  is_pinned: boolean;
  visibility?: string;
  photo_url?: string;
  attachment_url?: string;
  created_at: string;
  created_by: string;
  brgyid: string;
}
interface AnnouncementModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  announcement?: Announcement | null;
}
const AnnouncementModal = ({
  mode,
  open,
  onOpenChange,
  onSuccess,
  announcement
}: AnnouncementModalProps) => {
  const {
    userProfile
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
      category: '',
      audience: 'Public',
      is_pinned: false,
      visibility: 'public',
      photo_url: '',
      attachment_url: ''
    }
  });

  // Reset form when modal opens/closes or announcement changes
  useEffect(() => {
    if (open && mode === 'edit' && announcement) {
      form.reset({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        audience: announcement.audience,
        is_pinned: announcement.is_pinned,
        visibility: announcement.visibility || 'public',
        photo_url: announcement.photo_url || '',
        attachment_url: announcement.attachment_url || ''
      });
    } else if (open && mode === 'create') {
      form.reset({
        title: '',
        content: '',
        category: '',
        audience: 'Public',
        is_pinned: false,
        visibility: 'public',
        photo_url: '',
        attachment_url: ''
      });
    }
  }, [open, mode, announcement, form]);
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
    }
  };
  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
    }
  };
  const uploadFile = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${userProfile?.id}/${fileName}`;
    const {
      data,
      error
    } = await supabase.storage.from(bucket).upload(filePath, file);
    if (error) {
      console.error(`Error uploading ${bucket} file:`, error);
      throw error;
    }
    const {
      data: publicUrlData
    } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  };
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);
      let photoUrl = values.photo_url || '';
      let attachmentUrl = values.attachment_url || '';

      // Upload photo if selected (only for create mode)
      if (photoFile && mode === 'create') {
        photoUrl = await uploadFile(photoFile, 'announcements');
      }

      // Upload attachment if selected (only for create mode)
      if (attachmentFile && mode === 'create') {
        attachmentUrl = await uploadFile(attachmentFile, 'announcements');
      }
      const announcementData = {
        title: values.title,
        content: values.content,
        category: values.category,
        audience: values.audience,
        is_pinned: values.is_pinned,
        visibility: values.visibility,
        photo_url: photoUrl || null,
        attachment_url: attachmentUrl || null,
        created_by: userProfile?.id!,
        brgyid: userProfile?.brgyid!
      };
      let error;
      if (mode === 'create') {
        const result = await supabase.from('announcements').insert(announcementData);
        error = result.error;
      } else {
        const {
          created_by,
          brgyid,
          ...updateData
        } = announcementData;
        const result = await supabase.from('announcements').update(updateData).eq('id', announcement?.id);
        error = result.error;
      }
      if (error) {
        console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} announcement:`, error);
        toast({
          title: "Error",
          description: `Failed to ${mode === 'create' ? 'create' : 'update'} announcement. Please try again.`,
          variant: "destructive"
        });
        return;
      }
      toast({
        title: `Announcement ${mode === 'create' ? 'created' : 'updated'}`,
        description: `The announcement has been successfully ${mode === 'create' ? 'created' : 'updated'}.`
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCancel = () => {
    onOpenChange(false);
    setPhotoFile(null);
    setAttachmentFile(null);
  };
  if (mode === 'edit') {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update the announcement details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({
              field
            }) => <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter announcement title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="content" render={({
              field
            }) => <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter announcement content" className="min-h-[150px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({
                field
              }) => <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="News">News</SelectItem>
                          <SelectItem value="Alert">Alert</SelectItem>
                          <SelectItem value="Service">Service</SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="audience" render={({
                field
              }) => <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter target audience (e.g., Public, Officials, SK Members, etc.)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="is_pinned" render={({
                field
              }) => <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Pin Announcement</FormLabel>
                        
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>} />

                <FormField control={form.control} name="visibility" render={({
                field
              }) => <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="users">All Logged-in Users</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Updating...
                    </> : 'Update Announcement'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>;
  }
  return <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
      <Card className="mb-6 border-none shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Create New Announcement</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="title" render={({
              field
            }) => <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter announcement title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="content" render={({
              field
            }) => <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter announcement content" className="min-h-[150px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({
                field
              }) => <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="News">News</SelectItem>
                          <SelectItem value="Alert">Alert</SelectItem>
                          <SelectItem value="Service">Service</SelectItem>
                          <SelectItem value="Health">Health</SelectItem>
                          <SelectItem value="Education">Education</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />

                <FormField control={form.control} name="audience" render={({
                field
              }) => <FormItem>
                      <FormLabel>Target Audience</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter target audience (e.g., Public, Officials, SK Members, etc.)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </div>

              {mode === 'create' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Photo</FormLabel>
                    <Input type="file" accept="image/*" onChange={handlePhotoChange} className="mt-1" />
                    <FormDescription>
                      Optional: Upload an image for this announcement (max 5MB)
                    </FormDescription>
                  </div>

                  <div>
                    <FormLabel>Attachment</FormLabel>
                    <Input type="file" onChange={handleAttachmentChange} className="mt-1" />
                    <FormDescription>
                      Optional: Attach a document (PDF, DOC, etc. - max 10MB)
                    </FormDescription>
                  </div>
                </div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="is_pinned" render={({
                field
              }) => <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Pin Announcement</FormLabel>
                        
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>} />

                <FormField control={form.control} name="visibility" render={({
                field
              }) => <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="users">All Logged-in Users</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
              </div>

              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                      Creating...
                    </> : 'Publish Announcement'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>;
};
export default AnnouncementModal;