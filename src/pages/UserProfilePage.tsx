import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Edit, Save, X, Camera, Search, Eye, Lock, User, Key, Activity, Settings, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { MFAManagementModal } from "@/components/security/MFAManagementModal";
import ProfilePictureUpload from "@/components/profile/ProfilePictureUpload";

interface Barangay {
  id: string;
  barangayname: string;
  municipality: string;
  province: string;
  region: string;
  country: string;
  created_at: string;
}

const UserProfilePage = () => {
  const { user, userProfile } = useAuth();
  const [barangay, setBarangay] = useState<Barangay | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'barangay' | 'security'>('personal');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [editData, setEditData] = useState({
    firstname: userProfile?.firstname || "",
    middlename: userProfile?.middlename || "",
    lastname: userProfile?.lastname || "",
    phone: userProfile?.phone || "",
    bio: userProfile?.bio || "",
  });

  // Generate initials from name
  const getInitials = () => {
    const first = userProfile?.firstname || "";
    const last = userProfile?.lastname || "";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "AD";
  };

  // Cache utilities
  const getCacheKey = (key: string) => `profile_${user?.id}_${key}`;
  const getCachedData = (key: string, maxAge: number = 300000) => { // 5 minutes default
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
      console.error('Error reading cache:', error);
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
      console.error('Error setting cache:', error);
    }
  };

  const clearProfileCache = () => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`profile_${user?.id}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  // Fetch profile photo from storage with caching
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (userProfile?.profile_picture) {
        // Check cache first
        const cachedPhoto = getCachedData('profile_photo', 3300000); // 55 minutes (less than token expiry)
        if (cachedPhoto) {
          setProfilePhotoUrl(cachedPhoto);
          return;
        }

        setPhotoLoading(true);
        try {
          const { data } = await supabase.storage
            .from('profilepictures')
            .createSignedUrl(userProfile.profile_picture, 3600);
          
          if (data?.signedUrl) {
            setProfilePhotoUrl(data.signedUrl);
            setCachedData('profile_photo', data.signedUrl);
          }
        } catch (error) {
          console.error('Error fetching profile photo:', error);
        } finally {
          setPhotoLoading(false);
        }
      }
    };

    if (userProfile) {
      fetchProfilePhoto();
    }
  }, [userProfile]);

  // Fetch barangay data when component mounts with caching
  useEffect(() => {
    const fetchBarangayData = async () => {
      if (userProfile?.brgyid) {
        // Check cache first
        const cachedBarangay = getCachedData('barangay', 600000); // 10 minutes
        if (cachedBarangay) {
          setBarangay(cachedBarangay);
          setLoading(false);
          return;
        }

        try {
          const { data, error } = await supabase
            .from("barangays")
            .select("*")
            .eq("id", userProfile.brgyid)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setBarangay(data);
            setCachedData('barangay', data);
          }
        } catch (error) {
          console.error("Error fetching barangay data:", error);
          toast({
            title: "Error",
            description: "Failed to load barangay information",
            variant: "destructive",
          });
        }
      }
      setLoading(false);
    };

    if (userProfile) {
      setEditData({
        firstname: userProfile.firstname || "",
        middlename: userProfile.middlename || "",
        lastname: userProfile.lastname || "",
        phone: userProfile.phone || "",
        bio: userProfile.bio || "",
      });
      
      fetchBarangayData();
    } else {
      setLoading(false);
    }
  }, [userProfile]);

  const handlePhotoUploaded = async (filePath: string) => {
    try {
      // Generate signed URL for the new photo
      const { data } = await supabase.storage
        .from('profilepictures')
        .createSignedUrl(filePath, 3600);

      if (data?.signedUrl) {
        setProfilePhotoUrl(data.signedUrl);
        setCachedData('profile_photo', data.signedUrl);
      }
    } catch (error) {
      console.error('Error generating signed URL:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          firstname: editData.firstname,
          middlename: editData.middlename,
          lastname: editData.lastname,
          phone: editData.phone,
          bio: editData.bio,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Clear profile cache since data was updated
      clearProfileCache();
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
      
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating your profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      firstname: userProfile?.firstname || "",
      middlename: userProfile?.middlename || "",
      lastname: userProfile.lastname || "",
      phone: userProfile?.phone || "",
      bio: userProfile?.bio || "",
    });
    setEditing(false);
  };

  // Password change functionality
  const handlePasswordChange = async () => {
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);
    try {
      // If current password is provided, reauthenticate first
      if (passwordData.currentPassword) {
        const { error: reauthError } = await supabase.auth.reauthenticate();
        
        if (reauthError) {
          toast({
            title: "Error",
            description: "Current password is incorrect",
            variant: "destructive",
          });
          return;
        }
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl">
        {/* Main Profile Header Card */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36">
              <ProfilePictureUpload
                userId={user?.id || ''}
                currentPhotoUrl={profilePhotoUrl}
                onPhotoUploaded={handlePhotoUploaded}
                userInitials={getInitials()}
                previewMode="circle"
                size="144px"
                showOverlay={editing}
                onViewPhoto={() => setShowPhotoModal(true)}
                className="mx-auto"
              />
            </div>
            
            <div className="flex-grow text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                {userProfile?.firstname} {userProfile?.lastname}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
                {userProfile?.username} &middot; <span className="font-semibold text-primary">{userProfile?.role?.charAt(0).toUpperCase() + userProfile?.role?.slice(1) || ""}</span>
              </p>
            </div>

            {/* Action Buttons */}
            {!editing ? (
              <div className="flex-shrink-0 flex flex-col lg:flex-row gap-2 lg:gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setEditing(true)}
                  className="bg-primary hover:bg-primary/80 text-primary-foreground px-3 py-2 sm:px-2 md:px-3 lg:px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs md:text-sm w-auto"
                >
                  <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Edit Profile
                </button>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 sm:px-2 md:px-3 lg:px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs md:text-sm w-auto"
                >
                  <Key className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Change Password
                </button>
              </div>
            ) : (
              <div className="flex-shrink-0 flex flex-col lg:flex-row gap-2 lg:gap-3 w-full md:w-auto">
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 sm:px-2 md:px-3 lg:px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs md:text-sm w-auto"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                  Save Changes
                </button>
                <button 
                  onClick={handleCancel}
                  className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-3 py-2 sm:px-2 md:px-3 lg:px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 text-xs md:text-sm w-auto"
                >
                  <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border mb-4 sm:mb-6 md:mb-8">
          <nav className="flex -mb-px space-x-3 sm:space-x-4 md:space-x-6 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('personal')}
              className={`py-2 px-3 sm:py-3 sm:px-4 md:px-6 cursor-pointer border-b-2 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'personal' 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <span className="sm:hidden">Personal</span>
              <span className="hidden sm:inline">Personal Information</span>
            </button>
            <button 
              onClick={() => setActiveTab('barangay')}
              className={`py-2 px-3 sm:py-3 sm:px-4 md:px-6 cursor-pointer border-b-2 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'barangay' 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <span className="sm:hidden">Barangay</span>
              <span className="hidden sm:inline">Barangay Information</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`py-2 px-3 sm:py-3 sm:px-4 md:px-6 cursor-pointer border-b-2 font-semibold transition-all whitespace-nowrap text-sm sm:text-base ${
                activeTab === 'security' 
                  ? 'text-primary border-primary' 
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              Security
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Personal Information Panel */}
          {activeTab === 'personal' && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Your Account Information</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Username</span>
                  <span className="text-sm sm:text-base font-semibold text-foreground">{userProfile?.username || "Not set"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Email</span>
                  <span className="text-sm sm:text-base font-semibold text-foreground break-all">{user?.email}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">First Name</span>
                  {editing ? (
                    <input 
                      type="text"
                      name="firstname"
                      value={editData.firstname}
                      onChange={handleInputChange}
                      className="bg-input border border-border rounded px-2 py-1 sm:px-3 sm:py-1.5 text-sm sm:text-base text-foreground flex-1 max-w-full sm:max-w-[60%]"
                    />
                  ) : (
                    <span className="text-sm sm:text-base font-semibold text-foreground">{userProfile?.firstname || "Not set"}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Last Name</span>
                  {editing ? (
                    <input 
                      type="text"
                      name="lastname"
                      value={editData.lastname}
                      onChange={handleInputChange}
                      className="bg-input border border-border rounded px-2 py-1 sm:px-3 sm:py-1.5 text-sm sm:text-base text-foreground flex-1 max-w-full sm:max-w-[60%]"
                    />
                  ) : (
                    <span className="text-sm sm:text-base font-semibold text-foreground">{userProfile?.lastname || "Not set"}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Middle Name</span>
                  {editing ? (
                    <input 
                      type="text"
                      name="middlename"
                      value={editData.middlename}
                      onChange={handleInputChange}
                      placeholder="Not set"
                      className="bg-input border border-border rounded px-2 py-1 sm:px-3 sm:py-1.5 text-sm sm:text-base text-foreground flex-1 max-w-full sm:max-w-[60%]"
                    />
                  ) : (
                    <span className="text-sm sm:text-base font-semibold text-muted-foreground italic">{userProfile?.middlename || "Not set"}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Phone</span>
                  {editing ? (
                    <input 
                      type="text"
                      name="phone"
                      value={editData.phone}
                      onChange={handleInputChange}
                      placeholder="Not set"
                      className="bg-input border border-border rounded px-2 py-1 sm:px-3 sm:py-1.5 text-sm sm:text-base text-foreground flex-1 max-w-full sm:max-w-[60%]"
                    />
                  ) : (
                    <span className="text-sm sm:text-base font-semibold text-muted-foreground italic">{userProfile?.phone || "Not set"}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Bio</span>
                  {editing ? (
                    <textarea 
                      name="bio"
                      value={editData.bio}
                      onChange={handleInputChange}
                      placeholder="Write something about yourself..."
                      rows={3}
                      className="bg-input border border-border rounded px-2 py-1 sm:px-3 sm:py-1.5 text-sm sm:text-base text-foreground flex-1 max-w-full sm:max-w-[60%] resize-none"
                    />
                  ) : (
                    <span className="text-sm sm:text-base font-semibold text-muted-foreground italic flex-1 max-w-full sm:max-w-[60%] text-left sm:text-right">
                      {userProfile?.bio || "Not set"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                  <span className="text-sm sm:text-base font-semibold text-green-500">{userProfile?.status?.charAt(0).toUpperCase() + userProfile?.status?.slice(1) || ""}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4">
                  <span className="text-xs sm:text-sm text-muted-foreground">Role</span>
                  <span className="text-sm sm:text-base font-semibold text-primary">{userProfile?.role?.charAt(0).toUpperCase() + userProfile?.role?.slice(1) || ""}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4">
                  <span className="text-xs sm:text-sm text-muted-foreground">Account Created</span>
                  <span className="text-sm sm:text-base font-semibold text-foreground">
                    {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : "Not available"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Barangay Information Panel */}
          {activeTab === 'barangay' && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Your Assigned Barangay Details</h2>
              {barangay ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                    <span className="text-xs sm:text-sm text-muted-foreground">Barangay Name</span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{barangay.barangayname}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                    <span className="text-xs sm:text-sm text-muted-foreground">Municipality</span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{barangay.municipality}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                    <span className="text-xs sm:text-sm text-muted-foreground">Province</span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{barangay.province}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                    <span className="text-xs sm:text-sm text-muted-foreground">Region</span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{barangay.region}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4">
                    <span className="text-xs sm:text-sm text-muted-foreground">Country</span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{barangay.country}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4">
                    <span className="text-xs sm:text-sm text-muted-foreground">Barangay Onboarded</span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">{new Date(barangay.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic">No barangay information available</div>
              )}
            </div>
          )}

          {/* Security Panel */}
          {activeTab === 'security' && (
            <div className="bg-card border border-border rounded-xl p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Security Settings</h2>
              <div className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <p className="text-sm sm:text-base font-semibold text-foreground">Multi-Factor Authentication</p>
                  <button 
                    onClick={() => setShowMFAModal(true)}
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-2 py-1 sm:px-3 rounded text-xs sm:text-sm font-semibold transition-colors"
                  >
                    Manage
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4 border-b border-border">
                  <p className="text-sm sm:text-base font-semibold text-foreground">Active Sessions</p>
                  <Link to={userProfile?.role === 'user' ? '/hub/view-sessions' : '/view-sessions'} className="text-xs sm:text-sm text-primary hover:underline font-semibold">View Sessions</Link>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-0 py-3 sm:py-4">
                  <p className="text-sm sm:text-base font-semibold text-foreground">Activity Log</p>
                  <Link to={userProfile?.role === 'user' ? '/hub/activitylog' : '/activitylog'} className="text-xs sm:text-sm text-primary hover:underline font-semibold">View Log</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {showPhotoModal && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowPhotoModal(false);
              }}
              className="absolute -top-2 -right-2 bg-background hover:bg-accent text-foreground rounded-full p-2 shadow-lg transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={profilePhotoUrl || `https://placehold.co/400x400/3B82F6/FFFFFF?text=${getInitials()}`}
              alt="Full size profile picture"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password (Optional)</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  currentPassword: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  newPassword: e.target.value
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handlePasswordChange}
                disabled={passwordLoading}
                className="flex-1"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: ""
                  });
                }}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MFA Management Modal */}
      <MFAManagementModal
        open={showMFAModal}
        onOpenChange={setShowMFAModal}
      />
    </div>
  );
};

export default UserProfilePage;