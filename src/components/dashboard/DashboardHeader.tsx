
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Home, FileText, BarChart3, Bell, User, Settings, Upload, Eye, X } from "lucide-react";
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import SmartPhotoDisplay from "@/components/ui/SmartPhotoDisplay";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';
import { useLogoutWithLoader } from '@/hooks/useLogoutWithLoader';

const DashboardHeader = () => {
  const { user, userProfile } = useAuth();
  const { isLoggingOut, handleLogout } = useLogoutWithLoader();
  // Get cached background photo synchronously to prevent flash
  const getCachedBackgroundPhoto = (brgyid: string): string | null => {
    try {
      const cached = localStorage.getItem(`dashboardBackground_${brgyid}`);
      return cached || null;
    } catch {
      return null;
    }
  };

  // Initialize with cached data if available
  const [backgroundPhoto, setBackgroundPhoto] = useState<string | null>(() => {
    if (userProfile?.brgyid) {
      const cached = getCachedBackgroundPhoto(userProfile.brgyid);
      return cached === '' ? null : cached; // Empty string means no photo
    }
    return null;
  });
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isLoadingBackground, setIsLoadingBackground] = useState(false);
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const greeting = () => {
    const hour = today.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get display name for the header greeting
  const displayName = userProfile?.firstname || user?.email?.split('@')[0] || 'User';

  // Get username for the dropdown button
  const username = userProfile?.username || userProfile?.firstname || user?.email?.split('@')[0] || 'User';

  // Check if user is admin
  const isAdmin = userProfile?.role === 'admin';

  // Load existing background photo from barangays table only if not cached
  useEffect(() => {
    const loadBackgroundPhoto = async () => {
      if (!userProfile?.brgyid) return;
      
      // Skip if we already have cached data (including empty string which means no photo)
      const cachedPhoto = getCachedBackgroundPhoto(userProfile.brgyid);
      if (cachedPhoto !== null) {
        return; // Already have cached data
      }
      
      // Only fetch if not cached
      setIsLoadingBackground(true);
      try {
        const { data, error } = await supabase
          .from('barangays')
          .select('backgroundurl')
          .eq('id', userProfile.brgyid)
          .single();

        if (!error && data?.backgroundurl) {
          setBackgroundPhoto(data.backgroundurl);
          // Cache the photo URL
          localStorage.setItem(`dashboardBackground_${userProfile.brgyid}`, data.backgroundurl);
        } else {
          // Cache that there's no photo to avoid future fetches
          localStorage.setItem(`dashboardBackground_${userProfile.brgyid}`, '');
        }
      } catch (error) {
        console.error('Error loading background photo:', error);
      } finally {
        setIsLoadingBackground(false);
      }
    };

    loadBackgroundPhoto();
  }, [userProfile?.brgyid]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile?.brgyid) return;

    setUploading(true);
    try {
      // Upload new background photo
      const fileName = `background-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('barangayimgs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('barangayimgs')
        .getPublicUrl(filePath);

      // Update the barangays table with the new background URL
      const { error: updateError } = await supabase
        .from('barangays')
        .update({ backgroundurl: publicUrl })
        .eq('id', userProfile.brgyid);

      if (updateError) throw updateError;

      // Remove old background photo if it exists
      if (backgroundPhoto) {
        try {
          // Extract file path from the old URL
          const oldFilePath = backgroundPhoto.split('/').slice(-2).join('/');
          await supabase.storage
            .from('barangayimgs')
            .remove([oldFilePath]);
        } catch (cleanupError) {
          console.warn('Error cleaning up old background photo:', cleanupError);
        }
      }

      setBackgroundPhoto(publicUrl);
      // Update cache
      localStorage.setItem(`dashboardBackground_${userProfile.brgyid}`, publicUrl);
      setUploadDialogOpen(false);
      toast({
        title: "Success",
        description: "Background photo updated successfully",
      });
    } catch (error) {
      console.error('Error uploading background photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload background photo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeBackgroundPhoto = async () => {
    if (!backgroundPhoto || !userProfile?.brgyid) return;

    try {
      // Extract file path from the URL
      const filePath = backgroundPhoto.split('/').slice(-2).join('/');
      
      const { error: storageError } = await supabase.storage
        .from('barangayimgs')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Update the barangays table to remove the background URL
      const { error: updateError } = await supabase
        .from('barangays')
        .update({ backgroundurl: null })
        .eq('id', userProfile.brgyid);

      if (updateError) throw updateError;

      setBackgroundPhoto(null);
      // Update cache to indicate no photo
      localStorage.setItem(`dashboardBackground_${userProfile.brgyid}`, '');
      toast({
        title: "Success",
        description: "Background photo removed successfully",
      });
    } catch (error) {
      console.error('Error removing background photo:', error);
      toast({
        title: "Error",
        description: "Failed to remove background photo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {isLoggingOut && <GlobalLoadingScreen message="Logging out..." />}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">{greeting()}, {displayName} • {formattedDate}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <NotificationDropdown />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <User className="h-4 w-4" />
                <span className="md:inline">{username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center w-full">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 cursor-pointer">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <Card className="border-none overflow-hidden relative">
        {/* Loading skeleton for background photo */}
        {isLoadingBackground && (
          <div className="absolute inset-0">
            <Skeleton className="w-full h-full" />
          </div>
        )}
        
        {/* Background Photo */}
        {backgroundPhoto && !isLoadingBackground && (
          <div className="absolute inset-0">
            <img
              src={backgroundPhoto}
              alt="Dashboard Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-baranex-primary/40 to-baranex-secondary/40" />
          </div>
        )}
        
        {/* Fallback gradient when no background photo and not loading */}
        {!backgroundPhoto && !isLoadingBackground && (
          <div className="absolute inset-0 bg-gradient-to-r from-baranex-primary to-baranex-secondary" />
        )}

        <CardContent className="relative p-6 text-white">
          {/* Background Photo Upload Button for Admins - Floating at bottom right */}
          {isAdmin && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute bottom-4 right-4 h-10 w-10 p-0 text-white hover:bg-white/20 bg-black/20 backdrop-blur-sm rounded-full"
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Background Photo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {backgroundPhoto && (
                    <div className="space-y-2">
                      <Label>Current Background</Label>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden">
                        <img
                          src={backgroundPhoto}
                          alt="Current Background"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          removeBackgroundPhoto();
                          setUploadDialogOpen(false);
                        }}
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Background
                      </Button>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="background-photo">
                      {backgroundPhoto ? 'Replace Background Photo' : 'Upload Background Photo'}
                    </Label>
                    <Input
                      id="background-photo"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploading}
                    />
                  </div>
                  {uploading && (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <div className="flex flex-col md:flex-row justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Welcome to Baranex</h2>
              </div>
              <p className="text-white/80 max-w-md">
                Your partner in digital barangay management. Access and manage resident data, documents, and community events all in one place.
              </p>
              <div className="pt-2 flex gap-2">
                <Button variant="secondary" size="sm" className="bg-white text-baranex-primary hover:bg-white/90" asChild>
                  <Link to="/guide">
                    <span>View Guide</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent border-white text-white hover:bg-white/20" asChild>
                  <Link to="/announcements/">
                    <span>Post Announcement</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardHeader;
