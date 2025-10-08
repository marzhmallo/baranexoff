import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseResidentPhotoOptions {
  residentId?: string;
  photoUrl?: string;
  enabled?: boolean;
}

export const useResidentPhoto = ({ residentId, photoUrl, enabled = true }: UseResidentPhotoOptions) => {
  return useQuery({
    queryKey: ['resident-photo', residentId, photoUrl],
    queryFn: async (): Promise<string | null> => {
      if (!photoUrl) return null;

      try {
        // Extract file path from URL (works for both public and signed URLs)
        let filePath = '';
        
        // Check if it's a public URL format
        if (photoUrl.includes('/storage/v1/object/public/residentphotos/')) {
          filePath = photoUrl.split('/storage/v1/object/public/residentphotos/')[1];
        } else if (photoUrl.includes('/storage/v1/object/sign/residentphotos/')) {
          filePath = photoUrl.split('/storage/v1/object/sign/residentphotos/')[1].split('?')[0];
        } else {
          // If it's already a file path, use it directly
          filePath = photoUrl.startsWith('resident/') ? photoUrl : `resident/${photoUrl}`;
        }

        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('residentphotos')
          .createSignedUrl(filePath, 600); // 10 minutes expiration

        if (signedUrlError) {
          console.error('Error generating signed URL:', signedUrlError);
          return null;
        }

        // Test image loading before returning
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(signedUrlData.signedUrl);
          img.onerror = () => {
            console.error('Failed to load resident photo');
            resolve(null);
          };
          img.src = signedUrlData.signedUrl;
        });
      } catch (error) {
        console.error('Error generating signed URL:', error);
        return null;
      }
    },
    enabled: enabled && !!photoUrl && !!residentId,
    staleTime: 8 * 60 * 1000, // 8 minutes (less than signed URL expiry)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};