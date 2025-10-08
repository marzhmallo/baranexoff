import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ZoomIn, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface SmartPhotoDisplayProps {
  // Required props
  bucketName: string;
  filePath?: string;
  isPublic: boolean;
  
  // Optional display props
  className?: string;
  fallbackContent?: React.ReactNode;
  alt?: string;
  enableZoom?: boolean;
  
  // Avatar-specific props
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SmartPhotoDisplay = ({
  bucketName,
  filePath,
  isPublic,
  className = "w-24 h-24",
  fallbackContent,
  alt = "Photo",
  enableZoom = true,
  size
}: SmartPhotoDisplayProps) => {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);
  const [showFullPhoto, setShowFullPhoto] = useState(false);

  // Generate signed URL for private images or public URL for public images
  const generatePhotoUrl = async (path: string) => {
    if (!path) return undefined;

    try {
      // Extract clean file path
      let cleanFilePath = '';
      
      if (path.includes('/storage/v1/object/public/')) {
        cleanFilePath = path.split(`/storage/v1/object/public/${bucketName}/`)[1];
      } else if (path.includes('/storage/v1/object/sign/')) {
        cleanFilePath = path.split(`/storage/v1/object/sign/${bucketName}/`)[1].split('?')[0];
      } else {
        // If it's already a clean file path, use it directly
        cleanFilePath = path;
      }

      if (isPublic) {
        // For public buckets, get public URL
        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(cleanFilePath);
        
        return publicUrlData.publicUrl;
      } else {
        // For private buckets, create signed URL with 5-minute expiration
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(cleanFilePath, 300); // 5 minutes expiration

        if (signedUrlError) {
          console.error('Error generating signed URL:', signedUrlError);
          return undefined;
        }

        return signedUrlData.signedUrl;
      }
    } catch (error) {
      console.error('Error generating photo URL:', error);
      return undefined;
    }
  };

  // Generate photo URL when filePath changes
  useEffect(() => {
    if (filePath) {
      setIsLoadingPhoto(true);
      setPhotoUrl(undefined); // Clear old image immediately
      
      generatePhotoUrl(filePath).then(url => {
        if (url) {
          // Create image element to handle loading
          const img = new Image();
          img.onload = () => {
            setPhotoUrl(url);
            setIsLoadingPhoto(false);
          };
          img.onerror = () => {
            console.error('Failed to load photo from:', url);
            setIsLoadingPhoto(false);
          };
          img.src = url;
        } else {
          setIsLoadingPhoto(false);
        }
      });
    } else {
      setPhotoUrl(undefined);
      setIsLoadingPhoto(false);
    }
  }, [filePath, bucketName, isPublic]);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16", 
    lg: "w-24 h-24",
    xl: "w-32 h-32"
  };

  const avatarSize = size ? sizeClasses[size] : className;
  
  // For full-size photos, we want to preserve natural dimensions
  const isFullSizePhoto = className && className.includes('w-full');
  const containerClass = isFullSizePhoto 
    ? className.replace('h-auto', '').trim() // Remove any height auto and let it flow naturally
    : avatarSize;

  return (
    <>
      <div className={`relative ${containerClass} border rounded-lg overflow-hidden bg-muted ${isFullSizePhoto ? '' : 'aspect-square'}`}>
        {/* Placeholder/Fallback (Only visible when no photo is loaded) */}
        {!photoUrl && (
          <div className={`w-full ${isFullSizePhoto ? 'h-32' : 'h-full'} flex items-center justify-center text-muted-foreground`}>
            {fallbackContent || alt.charAt(0).toUpperCase()}
          </div>
        )}
        
        {/* Loading Spinner Overlay */}
        {isLoadingPhoto && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-t-white border-gray-400 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* The Actual Image (with smooth fade-in) */}
        {photoUrl && (
          <div 
            className={`${isFullSizePhoto ? 'relative' : 'absolute inset-0'} ${enableZoom ? 'cursor-pointer group' : ''}`}
            onClick={enableZoom ? () => setShowFullPhoto(true) : undefined}
          >
            <img 
              src={photoUrl} 
              alt={alt}
              className={`w-full ${isFullSizePhoto ? 'h-auto' : 'h-full object-cover'} transition-opacity duration-300 ${photoUrl ? 'opacity-100' : 'opacity-0'}`}
            />
            {enableZoom && (
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <ZoomIn className="text-white h-8 w-8" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Full screen photo dialog */}
      {enableZoom && photoUrl && (
        <Dialog open={showFullPhoto} onOpenChange={setShowFullPhoto}>
          <DialogContent 
            className="sm:max-w-[95vw] md:max-w-[90vw] max-h-[95vh] p-0 bg-transparent border-0 shadow-none flex items-center justify-center"
            hideCloseButton={true}
          >
            <div 
              className="relative w-full h-full flex items-center justify-center bg-black/80 p-4 rounded-lg"
              onClick={() => setShowFullPhoto(false)}
            >
              <img 
                src={photoUrl} 
                alt={alt} 
                className="max-h-[90vh] max-w-full object-contain rounded shadow-2xl" 
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 bg-black/40 hover:bg-black/60 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullPhoto(false);
                }}
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default SmartPhotoDisplay;