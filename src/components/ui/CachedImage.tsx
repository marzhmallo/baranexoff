import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  cacheKey?: string;
  className?: string;
}

const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt,
  fallbackSrc,
  cacheKey,
  className,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate cache key based on URL
  const getCacheKey = (url: string) => {
    if (cacheKey) return `cached_image_${cacheKey}`;
    return `cached_image_${btoa(url).replace(/[^a-zA-Z0-9]/g, '')}`;
  };

  // Check if image is cached in localStorage
  const getCachedImage = (url: string): string | null => {
    try {
      const key = getCacheKey(url);
      const cached = localStorage.getItem(key);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache expires after 24 hours
        const CACHE_DURATION = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error reading cached image:', error);
    }
    return null;
  };

  // Cache image in localStorage
  const cacheImage = (url: string, dataUrl: string) => {
    try {
      const key = getCacheKey(url);
      const cacheData = {
        data: dataUrl,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error caching image:', error);
    }
  };

  // Convert image to base64 for caching
  const convertToDataUrl = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Check cache first
    const cachedSrc = getCachedImage(src);
    if (cachedSrc) {
      setImageSrc(cachedSrc);
      setIsLoading(false);
      return;
    }

    // If not cached, load and cache the image
    const loadAndCacheImage = async () => {
      try {
        // First, verify the image loads
        const img = new Image();
        img.onload = async () => {
          setImageSrc(src);
          setIsLoading(false);
          
          // Cache the image asynchronously
          try {
            const dataUrl = await convertToDataUrl(src);
            cacheImage(src, dataUrl);
          } catch (cacheError) {
            console.warn('Failed to cache image:', cacheError);
          }
        };
        img.onerror = () => {
          setHasError(true);
          setIsLoading(false);
          if (fallbackSrc) {
            setImageSrc(fallbackSrc);
          }
        };
        img.src = src;
      } catch (error) {
        console.error('Error loading image:', error);
        setHasError(true);
        setIsLoading(false);
        if (fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      }
    };

    loadAndCacheImage();
  }, [src, fallbackSrc]);

  if (isLoading) {
    return (
      <div 
        className={cn(
          "animate-pulse bg-muted rounded",
          className
        )}
        style={{ minHeight: '200px', width: '100%' }}
      />
    );
  }

  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={cn(
          "bg-muted rounded flex items-center justify-center text-muted-foreground",
          className
        )}
        style={{ minHeight: '200px', width: '100%' }}
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <img 
      src={imageSrc}
      alt={alt}
      className={className}
      {...props}
      onError={() => {
        setHasError(true);
        if (fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
      }}
    />
  );
};

export default CachedImage;