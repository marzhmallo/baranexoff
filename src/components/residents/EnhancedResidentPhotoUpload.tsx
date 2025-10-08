import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import ReactCrop, { Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, Camera, X, User, Edit3, RotateCcw, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import 'react-image-crop/dist/ReactCrop.css';

interface EnhancedResidentPhotoUploadProps {
  residentId: string | undefined;
  existingPhotoUrl: string | undefined;
  onPhotoUploaded: (url: string) => void;
}

const EnhancedResidentPhotoUpload = ({
  residentId,
  existingPhotoUrl,
  onPhotoUploaded
}: EnhancedResidentPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null); // Separate canvas for cropping
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null); // Separate canvas for camera capture
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Generate signed URL for display
  const generateSignedUrl = async (url: string) => {
    if (!url) return undefined;

    try {
      let filePath = '';
      
      if (url.includes('/storage/v1/object/public/residentphotos/')) {
        filePath = url.split('/storage/v1/object/public/residentphotos/')[1];
      } else if (url.includes('/storage/v1/object/sign/residentphotos/')) {
        filePath = url.split('/storage/v1/object/sign/residentphotos/')[1].split('?')[0];
      } else {
        filePath = url.startsWith('resident/') ? url : `resident/${url}`;
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('residentphotos')
        .createSignedUrl(filePath, 600);

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

  useEffect(() => {
    if (existingPhotoUrl) {
      generateSignedUrl(existingPhotoUrl).then(signedUrl => {
        setPhotoUrl(signedUrl);
      });
    } else {
      setPhotoUrl(undefined);
    }
  }, [existingPhotoUrl]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height,
    );
    setCrop(crop);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '');
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for next tick to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          const handleLoadedMetadata = () => {
            if (videoRef.current) {
              videoRef.current.play().catch(console.error);
            }
          };
          
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  // FIXED: Capture photo function with separate canvas and improved error handling
  const capturePhoto = () => {
    console.log('capturePhoto: Starting photo capture...');
    
    if (!videoRef.current || !cameraCanvasRef.current) {
      console.error('capturePhoto: Missing video or camera canvas element');
      toast({
        title: "Capture Error",
        description: "Camera elements not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const video = videoRef.current;
    const canvas = cameraCanvasRef.current;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('capturePhoto: Failed to get canvas context');
        toast({
          title: "Capture Error", 
          description: "Failed to initialize canvas. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      console.log('capturePhoto: Canvas dimensions set to', canvas.width, 'x', canvas.height);
      
      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob to avoid data URL length issues
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('capturePhoto: Failed to create blob from canvas');
          toast({
            title: "Capture Error",
            description: "Failed to process captured image. Please try again.",
            variant: "destructive"
          });
          return;
        }

        console.log('capturePhoto: Successfully created blob, size:', blob.size);
        
        // Convert blob to data URL for cropping
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          console.log('capturePhoto: Data URL created, length:', dataUrl.length);
          setImageSrc(dataUrl);
          setShowCropModal(true);
          stopCamera();
        };
        reader.onerror = () => {
          console.error('capturePhoto: FileReader error');
          toast({
            title: "Capture Error",
            description: "Failed to process captured image. Please try again.",
            variant: "destructive"
          });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      console.error('capturePhoto: Error during capture:', error);
      toast({
        title: "Capture Error",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // FIXED: Improved crop function with separate canvas and better error handling
  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    console.log('getCroppedImg: Starting crop operation...');
    
    if (!completedCrop || !imgRef.current || !cropCanvasRef.current) {
      console.error('getCroppedImg: Missing required elements - completedCrop:', !!completedCrop, 'imgRef:', !!imgRef.current, 'cropCanvasRef:', !!cropCanvasRef.current);
      return null;
    }

    const image = imgRef.current;
    const canvas = cropCanvasRef.current;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('getCroppedImg: Failed to get canvas context');
        return null;
      }

      // Validate image is loaded
      if (!image.complete || image.naturalWidth === 0) {
        console.error('getCroppedImg: Image not fully loaded');
        return null;
      }

      console.log('getCroppedImg: Image dimensions - natural:', image.naturalWidth, 'x', image.naturalHeight, 'display:', image.width, 'x', image.height);
      console.log('getCroppedImg: Crop dimensions:', completedCrop);

      // Calculate scale factors
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      console.log('getCroppedImg: Scale factors - X:', scaleX, 'Y:', scaleY);

      // Set canvas dimensions to crop size
      const pixelRatio = window.devicePixelRatio || 1;
      const canvasWidth = Math.floor(completedCrop.width * scaleX * pixelRatio);
      const canvasHeight = Math.floor(completedCrop.height * scaleY * pixelRatio);
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      console.log('getCroppedImg: Canvas dimensions set to', canvasWidth, 'x', canvasHeight);

      // Reset canvas transform and set high quality
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      console.log('getCroppedImg: Crop coordinates - X:', cropX, 'Y:', cropY, 'Width:', cropWidth, 'Height:', cropHeight);

      // Clear canvas first
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Check for canvas taint before drawing
      try {
        // Test if we can read the canvas (will throw if tainted)
        ctx.getImageData(0, 0, 1, 1);
      } catch (taintError) {
        console.error('getCroppedImg: Canvas is tainted (CORS issue):', taintError);
        return null;
      }
      
      // Draw the cropped portion
      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      console.log('getCroppedImg: Image drawn to canvas successfully');

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('getCroppedImg: Blob created successfully, size:', blob.size);
          } else {
            console.error('getCroppedImg: Failed to create blob from canvas');
          }
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    } catch (error) {
      console.error('getCroppedImg: Error during crop operation:', error);
      
      // Check for specific canvas taint errors
      if (error instanceof DOMException && error.name === 'SecurityError') {
        console.error('getCroppedImg: Security error - likely canvas taint issue');
        toast({
          title: "Crop Error",
          description: "Image security error. Please try uploading the image again.",
          variant: "destructive"
        });
      }
      
      return null;
    }
  }, [completedCrop]);

  const handleCropSave = async () => {
    try {
      if (!completedCrop) {
        toast({
          title: "Crop Error",
          description: "Please select an area to crop first.",
          variant: "destructive"
        });
        return;
      }

      const croppedBlob = await getCroppedImg();
      
      if (!croppedBlob) {
        toast({
          title: "Crop Error",
          description: "Failed to process the cropped image. Please try again.",
          variant: "destructive"
        });
        return;
      }

      await uploadFile(croppedBlob);
      setShowCropModal(false);
      setImageSrc('');
      
    } catch (error) {
      console.error('Error in handleCropSave:', error);
      toast({
        title: "Crop Error",
        description: `Failed to save cropped image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const uploadFile = async (file: File | Blob) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const fileExt = 'jpg'; // Always use jpg for camera photos
      const fileName = `${residentId || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `resident/${fileName}`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from('residentphotos')
        .upload(filePath, file, { upsert: true });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) throw error;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('residentphotos')
        .createSignedUrl(filePath, 600);

      if (signedUrlError) throw signedUrlError;

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
      setUploadProgress(0);
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl || !existingPhotoUrl) return;

    try {
      let filePath = '';
      
      if (existingPhotoUrl.includes('/storage/v1/object/public/residentphotos/')) {
        filePath = existingPhotoUrl.split('/storage/v1/object/public/residentphotos/')[1];
      } else if (existingPhotoUrl.includes('/storage/v1/object/sign/residentphotos/')) {
        filePath = existingPhotoUrl.split('/storage/v1/object/sign/residentphotos/')[1].split('?')[0];
      } else {
        filePath = existingPhotoUrl.startsWith('resident/') ? existingPhotoUrl : `resident/${existingPhotoUrl}`;
      }

      const { error } = await supabase.storage
        .from('residentphotos')
        .remove([filePath]);

      if (error) throw error;

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
    <>
      <div className="flex flex-col items-center space-y-4">
        {/* Profile Picture Display */}
        <div className="relative">
          <Avatar className="h-32 w-32 border-4 border-border">
            <AvatarImage src={photoUrl} alt="Resident photo" />
            <AvatarFallback className="bg-muted">
              <User className="h-12 w-12 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          {photoUrl && (
            <>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                onClick={handleRemovePhoto}
              >
                <X className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-lg bg-background"
                onClick={async () => {
                  try {
                    const response = await fetch(photoUrl);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onload = () => {
                      setImageSrc(reader.result as string);
                      setShowCropModal(true);
                    };
                    reader.readAsDataURL(blob);
                  } catch (error) {
                    console.error('Error preparing image for crop:', error);
                    toast({
                      title: "Error",
                      description: "Failed to load image for editing",
                      variant: "destructive"
                    });
                  }
                }}
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="w-full max-w-xs">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1 text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Upload Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xs">
          <div
            {...getRootProps()}
            className={`
              flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary hover:bg-accent/5'
              }
              ${uploading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} disabled={uploading} />
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-xs text-center text-muted-foreground">
              {isDragActive ? 'Drop here' : 'Upload'}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="flex flex-col items-center justify-center p-4 h-auto"
            onClick={startCamera}
            disabled={uploading}
          >
            <Camera className="h-5 w-5 mb-1" />
            <span className="text-xs">Camera</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Drag & drop an image, upload from files, or use your camera
        </p>
      </div>

      {/* Camera Modal */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              width={320}
              height={240}
              className="w-full max-w-sm rounded-lg bg-muted border"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(console.error);
                }
              }}
            />
            <canvas ref={cameraCanvasRef} className="hidden" />
            <div className="flex space-x-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
              <Button onClick={stopCamera} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={setShowCropModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Crop Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imageSrc && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imageSrc}
                    onLoad={onImageLoad}
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                  />
                </ReactCrop>
              </div>
            )}
            <canvas ref={cropCanvasRef} className="hidden" />
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setShowCropModal(false)} variant="outline">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleCropSave}>
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedResidentPhotoUpload;
