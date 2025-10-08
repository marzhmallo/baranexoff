
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, X, User } from 'lucide-react';

interface ResidentPhotoUploadProps {
  residentId: string | undefined;
  existingPhotoUrl: string | undefined;
  onPhotoUploaded: (url: string) => void;
}

const ResidentPhotoUpload = ({
  residentId,
  existingPhotoUrl,
  onPhotoUploaded
}: ResidentPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);

  // Generate signed URL for display
  const generateSignedUrl = async (url: string) => {
    if (!url) return undefined;

    try {
      // Extract file path from URL (works for both public and signed URLs)
      let filePath = '';
      
      // Check if it's a public URL format
      if (url.includes('/storage/v1/object/public/residentphotos/')) {
        filePath = url.split('/storage/v1/object/public/residentphotos/')[1];
      } else if (url.includes('/storage/v1/object/sign/residentphotos/')) {
        filePath = url.split('/storage/v1/object/sign/residentphotos/')[1].split('?')[0];
      } else {
        // If it's already a file path, use it directly
        filePath = url.startsWith('resident/') ? url : `resident/${url}`;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('residentphotos')
        .createSignedUrl(filePath, 600); // 10 minutes expiration

      if (signedUrlError) {
        console.error('Error generating signed URL:', signedUrlError);
        return undefined;
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return undefined;
    }
  };

  // Generate signed URL when existingPhotoUrl changes
  useEffect(() => {
    if (existingPhotoUrl) {
      generateSignedUrl(existingPhotoUrl).then(signedUrl => {
        setPhotoUrl(signedUrl);
      });
    } else {
      setPhotoUrl(undefined);
    }
  }, [existingPhotoUrl]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${residentId || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `resident/${fileName}`;
      
      setUploading(true);

      const { data, error } = await supabase.storage
        .from('residentphotos')
        .upload(filePath, file, {
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get a signed URL (expires in 10 minutes)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('residentphotos')
        .createSignedUrl(filePath, 600);

      if (signedUrlError) {
        throw signedUrlError;
      }

      const url = signedUrlData.signedUrl;
      setPhotoUrl(url);
      onPhotoUploaded(url);

      toast({
        title: "Photo uploaded",
        description: "Resident photo has been uploaded successfully"
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Error uploading photo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      // Reset the input
      if (event.target) event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl || !existingPhotoUrl) return;

    try {
      // Extract file path from URL using the same logic as generateSignedUrl
      let filePath = '';
      
      // Check if it's a public URL format
      if (existingPhotoUrl.includes('/storage/v1/object/public/residentphotos/')) {
        filePath = existingPhotoUrl.split('/storage/v1/object/public/residentphotos/')[1];
      } else if (existingPhotoUrl.includes('/storage/v1/object/sign/residentphotos/')) {
        filePath = existingPhotoUrl.split('/storage/v1/object/sign/residentphotos/')[1].split('?')[0];
      } else {
        // If it's already a file path, use it directly
        filePath = existingPhotoUrl.startsWith('resident/') ? existingPhotoUrl : `resident/${existingPhotoUrl}`;
      }

      const { error } = await supabase.storage
        .from('residentphotos')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      setPhotoUrl(undefined);
      onPhotoUploaded('');

      toast({
        title: "Photo removed",
        description: "Resident photo has been removed"
      });
    } catch (error: any) {
      console.error('Error removing photo:', error);
      toast({
        title: "Removal failed",
        description: error.message || "Error removing photo",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="mb-4">
        {photoUrl ? (
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoUrl} alt="Resident photo" />
              <AvatarFallback>
                <User className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemovePhoto}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Avatar className="h-24 w-24">
            <AvatarFallback>
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      
      <div className="flex items-center">
        <input
          type="file"
          id="photo-upload"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="photo-upload">
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            className="cursor-pointer"
            asChild
          >
            <span>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Photo"}
            </span>
          </Button>
        </label>
      </div>
    </div>
  );
};

export default ResidentPhotoUpload;
