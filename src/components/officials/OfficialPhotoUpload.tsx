
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload, X, Camera, RotateCcw, Check } from 'lucide-react';
import 'react-image-crop/dist/ReactCrop.css';

interface OfficialPhotoUploadProps {
  officialId?: string;
  existingPhotoUrl?: string;
  onPhotoUploaded: (url: string) => void;
}

const OfficialPhotoUpload = ({
  officialId,
  existingPhotoUrl,
  onPhotoUploaded
}: OfficialPhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(existingPhotoUrl);
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  // Sync internal state with prop changes
  useEffect(() => {
    setPhotoUrl(existingPhotoUrl);
  }, [existingPhotoUrl]);

  // Image load callback for cropping
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height,
    );
    setCrop(crop);
  }, []);

  // Camera functionality
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      setStream(mediaStream);
      setShowCamera(true);
      
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

  const capturePhoto = () => {
    if (!videoRef.current || !cameraCanvasRef.current) {
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
        toast({
          title: "Capture Error", 
          description: "Failed to initialize canvas. Please try again.",
          variant: "destructive"
        });
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast({
            title: "Capture Error",
            description: "Failed to process captured image. Please try again.",
            variant: "destructive"
          });
          return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setImageSrc(dataUrl);
          setShowCropModal(true);
          stopCamera();
        };
        reader.onerror = () => {
          toast({
            title: "Capture Error",
            description: "Failed to process captured image. Please try again.",
            variant: "destructive"
          });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.8);
      
    } catch (error) {
      console.error('Error during capture:', error);
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

  // Cropping functionality
  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!completedCrop || !imgRef.current || !cropCanvasRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = cropCanvasRef.current;
    
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      if (!image.complete || image.naturalWidth === 0) {
        return null;
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const pixelRatio = window.devicePixelRatio || 1;
      const canvasWidth = Math.floor(completedCrop.width * scaleX * pixelRatio);
      const canvasHeight = Math.floor(completedCrop.height * scaleY * pixelRatio);
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
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

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    } catch (error) {
      console.error('Error during crop operation:', error);
      
      if (error instanceof DOMException && error.name === 'SecurityError') {
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

  // Enhanced upload function to handle File or Blob
  const uploadFile = async (file: File | Blob) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const fileExt = 'jpg';
      const fileName = `${officialId || 'new'}-${Date.now()}.${fileExt}`;
      const filePath = `official/${fileName}`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from('officials')
        .upload(filePath, file, {
          upsert: true
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        throw error;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('officials')
        .getPublicUrl(filePath);

      const url = publicUrlData.publicUrl;
      setPhotoUrl(url);
      onPhotoUploaded(url);

      toast({
        title: "Photo uploaded",
        description: "Official photo has been uploaded successfully"
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || '');
        setShowCropModal(true);
      });
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Error processing file:', error);
      toast({
        title: "File Error",
        description: error.message || "Error processing selected file",
        variant: "destructive"
      });
    } finally {
      // Reset the input
      if (event.target) event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl || !existingPhotoUrl) return;

    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/');
      const filePath = `official/${urlParts[urlParts.length - 1]}`;

      const { error } = await supabase.storage
        .from('officials')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      setPhotoUrl(undefined);
      onPhotoUploaded('');

      toast({
        title: "Photo removed",
        description: "Official photo has been removed"
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
      <div className="flex flex-col items-center mb-4">
      <div className="mb-4">
        {photoUrl ? (
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoUrl} alt="Official photo" />
              <AvatarFallback>
                {officialId ? officialId.substring(0, 2).toUpperCase() : "OF"}
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
              {officialId ? officialId.substring(0, 2).toUpperCase() : "OF"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <input
          type="file"
          id="official-photo-upload"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
        <label htmlFor="official-photo-upload">
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
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={startCamera}
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mt-4 w-full max-w-xs">
          <Progress value={uploadProgress} className="w-full h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">Uploading...</p>
        </div>
      )}
     </div>
     
     {/* Camera Modal */}
      <Dialog open={showCamera} onOpenChange={stopCamera}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <video
              ref={videoRef}
              className="w-full max-w-sm rounded-lg border"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={cameraCanvasRef} style={{ display: 'none' }} />
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Capture
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Modal */}
      <Dialog open={showCropModal} onOpenChange={() => setShowCropModal(false)}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {imageSrc && (
              <div className="max-w-2xl max-h-96 overflow-auto">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                >
                  <img
                    ref={imgRef}
                    src={imageSrc}
                    alt="Crop preview"
                    onLoad={onImageLoad}
                    className="max-w-full h-auto"
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
              </div>
            )}
            <canvas ref={cropCanvasRef} style={{ display: 'none' }} />
            <div className="flex gap-2">
              <Button onClick={handleCropSave} disabled={uploading}>
                <Check className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCropModal(false);
                  setImageSrc('');
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
         </DialogContent>
       </Dialog>
     </>
   );
 };

export default OfficialPhotoUpload;
