
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, FileImage } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { FeedbackType, FEEDBACK_CATEGORIES } from '@/lib/types/feedback';
import { feedbackAPI } from '@/lib/api/feedback';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editData?: any;
}

interface FormData {
  type: FeedbackType;
  category: string;
  description: string;
  location?: string;
}

interface UploadedFile {
  file: File;
  url?: string;
  uploading?: boolean;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ 
  onSuccess, 
  onCancel,
  editData 
}) => {
  const { userProfile } = useAuth();
  const [selectedType, setSelectedType] = useState<FeedbackType>(editData?.type || 'barangay');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      type: editData?.type || 'barangay',
      category: editData?.category || '',
      description: editData?.description || '',
      location: editData?.location || ''
    }
  });

  const watchedType = watch('type');

  // Load existing attachments if editing
  React.useEffect(() => {
    if (editData?.attachments) {
      const loadExistingAttachments = async () => {
        const existingAttachments = await Promise.all(
          editData.attachments.map(async (fileName: string) => {
            try {
              const { data } = await supabase.storage
                .from('reportfeedback')
                .createSignedUrl(`userreports/${fileName}`, 3600);
              
              return {
                file: null,
                url: data?.signedUrl || null,
                uploading: false
              };
            } catch (error) {
              console.error('Error loading existing attachment:', error);
              return {
                file: null,
                url: null,
                uploading: false
              };
            }
          })
        );
        setAttachments(existingAttachments.filter(att => att.url));
      };
      loadExistingAttachments();
    }
  }, [editData]);

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `userreports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('reportfeedback')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      return fileName;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachments.length + files.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 files allowed",
        variant: "destructive"
      });
      return;
    }

    // Add files to state with uploading status
    const newAttachments = files.map(file => ({
      file,
      uploading: true
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = await uploadFileToStorage(file);
      
      if (fileName) {
        // Get signed URL for immediate preview
        const { data } = await supabase.storage
          .from('reportfeedback')
          .createSignedUrl(`userreports/${fileName}`, 3600);
        
        setAttachments(prev => 
          prev.map((attachment, index) => 
            attachment.file === file 
              ? { ...attachment, url: data?.signedUrl || null, uploading: false }
              : attachment
          )
        );
      } else {
        // Remove failed upload
        setAttachments(prev => prev.filter(attachment => attachment.file !== file));
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}`,
          variant: "destructive"
        });
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleCaptchaVerify = (token: string) => {
    console.log('Captcha verified with token:', token);
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    console.log('Captcha expired');
    setCaptchaToken(null);
  };

  const onSubmit = async (data: FormData) => {
    console.log('Form submission started');
    console.log('User profile:', userProfile);
    
    if (!editData && !captchaToken) {
      toast({
        title: "Captcha required",
        description: "Please complete the captcha verification before submitting.",
        variant: "destructive"
      });
      return;
    }
    
    if (!userProfile?.id) {
      console.error('User profile ID not found');
      toast({
        title: "Error",
        description: "User profile not found. Please log in again.",
        variant: "destructive"
      });
      return;
    }

    if (!userProfile?.brgyid) {
      console.error('User brgyid not found');
      toast({
        title: "Error",
        description: "User barangay ID not found. Please contact administrator.",
        variant: "destructive"
      });
      return;
    }

    // Check if any files are still uploading
    const stillUploading = attachments.some(att => att.uploading);
    if (stillUploading) {
      toast({
        title: "Please wait",
        description: "Files are still uploading. Please wait before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get filenames from uploaded attachments
      const attachmentUrls = attachments
        .filter(att => att.url)
        .map(att => {
          // Extract filename from signed URL or use the original filename approach
          if (att.url?.includes('userreports/')) {
            const urlParts = att.url.split('userreports/')[1];
            return urlParts.split('?')[0]; // Remove query parameters
          }
          return null;
        })
        .filter(Boolean) as string[];

      const reportData = {
        user_id: userProfile.id,
        brgyid: userProfile.brgyid,
        type: data.type,
        category: data.category,
        description: data.description,
        location: data.location || null,
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        status: 'pending' as const
      };

      console.log('Report data to submit:', reportData);

      if (editData) {
        await feedbackAPI.updateReport(editData.id, reportData);
        toast({
          title: "Report updated",
          description: "Your report has been updated successfully"
        });
      } else {
        await feedbackAPI.createReport(reportData);
        toast({
          title: "Report submitted",
          description: "Your report has been submitted successfully"
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: `Failed to submit report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Report Type</Label>
              <Select
                value={selectedType}
                onValueChange={(value: FeedbackType) => {
                  setSelectedType(value);
                  setValue('type', value);
                  setValue('category', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barangay">Barangay Issue</SelectItem>
                  <SelectItem value="system">System Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={watch('category')}
                onValueChange={(value) => setValue('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_CATEGORIES[selectedType].map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-500 mt-1">Category is required</p>
              )}
            </div>
          </div>

          {selectedType === 'barangay' && (
            <div>
              <Label htmlFor="location">Location (Optional)</Label>
              <Input
                {...register('location')}
                placeholder="Specific location or address"
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              {...register('description', { required: 'Description is required' })}
              placeholder="Provide details about the issue..."
              rows={4}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <Label>Attachments (Optional)</Label>
            <div className="mt-2">
              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 min-h-[44px]">
                <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-sm sm:text-base">Upload images (max 5)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              
              {attachments.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="relative group">
                      {attachment.uploading ? (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : attachment.url ? (
                        <div className="relative aspect-square">
                          <img
                            src={attachment.url}
                            alt="Attachment"
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              console.error('Image failed to load:', attachment.url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-full h-full bg-gray-100 rounded-lg absolute top-0 left-0 items-center justify-center">
                            <FileImage className="h-8 w-8 text-gray-400" />
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileImage className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {!editData && (
            <div>
              <Label>Security Verification</Label>
              <div className="mt-2 flex justify-center sm:justify-start">
                <HCaptcha
                  sitekey={import.meta.env.VITE_HCAPTCHA_SITE_KEY}
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="submit" 
              disabled={isSubmitting || attachments.some(att => att.uploading) || (!editData && !captchaToken)}
              className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base"
            >
              {isSubmitting ? 'Submitting...' : (editData ? 'Update Report' : 'Submit Report')}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
                Cancel
              </Button>
            )}
          </div>
    </form>
  );
};
