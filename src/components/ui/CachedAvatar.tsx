import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface CachedAvatarProps {
  userId: string;
  profilePicture?: string;
  fallback: string;
  className?: string;
  bucketName?: string; // Add bucket name parameter
}

const CachedAvatar = ({ userId, profilePicture, fallback, className, bucketName = 'profilepictures' }: CachedAvatarProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Cache utilities
  const getCacheKey = (key: string) => `avatar_${userId}_${key}`;
  const getCachedData = (key: string, maxAge: number = 480000) => { // 8 minutes default (slightly less than signed URL expiry)
    try {
      const cached = localStorage.getItem(getCacheKey(key));
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < maxAge) {
          return data.value;
        }
        localStorage.removeItem(getCacheKey(key));
      }
    } catch (error) {
      console.error('Error reading avatar cache:', error);
    }
    return null;
  };

  const setCachedData = (key: string, value: any) => {
    try {
      localStorage.setItem(getCacheKey(key), JSON.stringify({
        value,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error setting avatar cache:', error);
    }
  };

  const clearCachedData = (key: string) => {
    try {
      localStorage.removeItem(getCacheKey(key));
    } catch (error) {
      console.error('Error clearing avatar cache:', error);
    }
  };

  // Extract file path from possible full URLs
  const extractFilePath = (urlOrPath: string) => {
    if (!urlOrPath) return '';
    if (urlOrPath.includes(`/storage/v1/object/public/${bucketName}/`)) {
      return urlOrPath.split(`/storage/v1/object/public/${bucketName}/`)[1];
    }
    if (urlOrPath.includes(`/storage/v1/object/sign/${bucketName}/`)) {
      return urlOrPath.split(`/storage/v1/object/sign/${bucketName}/`)[1].split('?')[0];
    }
    // If it already looks like a path, return as-is
    return urlOrPath;
  };

  // Generate URL for display (handles full URLs and file paths)
  const generateSignedUrl = async (inputUrl: string) => {
    if (!inputUrl) return undefined;

    const filePath = extractFilePath(inputUrl);

    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 600); // 10 minutes expiration

      if (!signedUrlError && signedUrlData?.signedUrl) {
        return signedUrlData.signedUrl;
      }

      // Fallback to public URL if bucket is public
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }

      if (signedUrlError) {
        console.error('Error generating signed URL:', signedUrlError);
      }
      return undefined;
    } catch (error) {
      console.error('Error generating avatar URL:', error);
      return undefined;
    }
  };

  useEffect(() => {
    if (profilePicture) {
      // Check cache first (cache lifetime < signed URL expiry)
      const cacheKey = `signed_url_${profilePicture}`;
      const cachedUrl = getCachedData(cacheKey, 480000);
      if (cachedUrl) {
        setAvatarUrl(cachedUrl);
        return;
      }

      generateSignedUrl(profilePicture).then(url => {
        if (url) {
          setAvatarUrl(url);
          setCachedData(cacheKey, url);
        } else {
          setAvatarUrl(undefined);
        }
      });
    } else {
      setAvatarUrl(undefined);
    }
  }, [profilePicture, userId]);

  return (
    <Avatar className={className}>
      {avatarUrl && (
        <AvatarImage 
          src={avatarUrl} 
          alt="Profile picture" 
          onError={() => {
            console.error('Failed to load avatar image:', avatarUrl);
            const cacheKey = `signed_url_${profilePicture || ''}`;
            clearCachedData(cacheKey);
            if (profilePicture) {
              generateSignedUrl(profilePicture).then((newUrl) => {
                if (newUrl) {
                  setAvatarUrl(newUrl);
                  setCachedData(cacheKey, newUrl);
                } else {
                  setAvatarUrl(undefined);
                }
              });
            } else {
              setAvatarUrl(undefined);
            }
          }}
        />
      )}
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};

export default CachedAvatar;