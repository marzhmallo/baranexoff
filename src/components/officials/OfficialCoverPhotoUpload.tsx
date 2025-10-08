import { useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OfficialCoverPhotoUploadProps {
  officialId: string;
  currentCoverUrl?: string | null;
  onUploadSuccess: (url: string) => void;
}

export const OfficialCoverPhotoUpload = ({
  officialId,
  currentCoverUrl,
  onUploadSuccess
}: OfficialCoverPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [showUploadButton, setShowUploadButton] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${officialId}-${Date.now()}.${fileExt}`;
      const filePath = `coverphotos/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('officials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('officials')
        .getPublicUrl(filePath);

      // Update official's coverurl in database
      const { error: updateError } = await supabase
        .from('officials')
        .update({ coverurl: publicUrl })
        .eq('id', officialId);

      if (updateError) {
        throw updateError;
      }

      // Delete old cover photo if exists
      if (currentCoverUrl) {
        const oldPath = currentCoverUrl.split('/').slice(-2).join('/');
        await supabase.storage
          .from('officials')
          .remove([oldPath]);
      }

      toast.success('Cover photo updated successfully');
      onUploadSuccess(publicUrl);
      setShowUploadButton(false);
    } catch (error) {
      console.error('Error uploading cover photo:', error);
      toast.error('Failed to upload cover photo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!currentCoverUrl) return;

    setUploading(true);

    try {
      // Remove from storage
      const filePath = currentCoverUrl.split('/').slice(-2).join('/');
      await supabase.storage
        .from('officials')
        .remove([filePath]);

      // Update database
      const { error } = await supabase
        .from('officials')
        .update({ coverurl: null })
        .eq('id', officialId);

      if (error) throw error;

      toast.success('Cover photo removed successfully');
      onUploadSuccess('');
    } catch (error) {
      console.error('Error removing cover photo:', error);
      toast.error('Failed to remove cover photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10">
      {!showUploadButton ? (
        <Button
          onClick={() => setShowUploadButton(true)}
          variant="secondary"
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
          disabled={uploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          {currentCoverUrl ? 'Change Cover' : 'Add Cover'}
        </Button>
      ) : (
        <div className="flex gap-2">
          <label htmlFor="cover-upload" className="cursor-pointer">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
              disabled={uploading}
              asChild
            >
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload'}
              </span>
            </Button>
          </label>
          <input
            id="cover-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          {currentCoverUrl && (
            <Button
              onClick={handleRemoveCover}
              variant="destructive"
              size="sm"
              className="bg-red-500/20 hover:bg-red-500/30 text-white border-red-300/20 backdrop-blur-sm"
              disabled={uploading}
            >
              Remove
            </Button>
          )}
          <Button
            onClick={() => setShowUploadButton(false)}
            variant="ghost"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
