import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { logUserSignIn, logUserSignOut } from "@/lib/api/activityLogs";

interface UserProfile {
  id: string;
  brgyid?: string;
  email?: string;
  role?: string;
  username?: string;
  firstname?: string;
  lastname?: string;
  middlename?: string;
  phone?: string;
  bio?: string;
  status?: string;
  adminid?: string;
  created_at?: string;
  superior_admin?: boolean;
  purok?: string;
  online?: boolean;
  last_login?: string;
  profile_picture?: string | null;
  chatbot_enabled?: boolean;
  chatbot_mode?: string;
  padlock?: boolean;
}

interface UserSettings {
  chatbot_enabled: boolean;
  chatbot_mode: string;
  auto_fill_address_from_admin_barangay: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  userSettings: UserSettings | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  userSettings: null,
  loading: true,
  signOut: async () => {},
  refreshSettings: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasHandledInitialAuth, setHasHandledInitialAuth] = useState(false);
  const [hasLoggedSignIn, setHasLoggedSignIn] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);
  const navigate = useNavigate();
  const location = useLocation();

  // Update user online status
  const updateUserOnlineStatus = async (userId: string, isOnline: boolean) => {
    try {
      console.log(`Updating user ${userId} online status to: ${isOnline}`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ online: isOnline })
        .eq('id', userId);

      if (error) {
        console.error('Error updating online status:', error);
      } else {
        console.log(`User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
      }
    } catch (err) {
      console.error('Error in updateUserOnlineStatus:', err);
    }
  };

  // Fetch user settings from settings table
  const fetchUserSettings = async (userId: string) => {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('key, value')
        .eq('userid', userId)
        .in('key', ['chatbot_enabled', 'chatbot_mode', 'auto_fill_address_from_admin_barangay']);

      if (error) {
        console.error('Error loading settings:', error);
        // Set defaults on error
        setUserSettings({
          chatbot_enabled: true,
          chatbot_mode: 'offline',
          auto_fill_address_from_admin_barangay: true,
        });
        return;
      }

      // Process settings data
      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      setUserSettings({
        chatbot_enabled: settingsMap.chatbot_enabled === 'true' || settingsMap.chatbot_enabled === undefined,
        chatbot_mode: settingsMap.chatbot_mode || 'offline',
        auto_fill_address_from_admin_barangay: settingsMap.auto_fill_address_from_admin_barangay === 'true' || settingsMap.auto_fill_address_from_admin_barangay === undefined,
      });
    } catch (error) {
      console.error('Error in fetchUserSettings:', error);
      // Set defaults on error
      setUserSettings({
        chatbot_enabled: true,
        chatbot_mode: 'offline',
        auto_fill_address_from_admin_barangay: true,
      });
    }
  };

  const refreshSettings = async () => {
    if (user?.id) {
      await fetchUserSettings(user.id);
    }
  };

  // Fetch user profile data from profiles table - NO REDIRECTS HERE
  const fetchUserProfile = async (userId: string) => {
    console.log('Fetching user profile for:', userId);
    try {
      const { data: profileData, error: profileError } = await supabase
        .rpc('get_my_profile' as any)
        .single() as { data: any, error: any };

      if (profileError) {
        console.error('Error fetching from profiles table:', profileError);
        toast({
          title: "Database Error",
          description: "Could not fetch user profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (profileData) {
        console.log('User found in profiles table:', profileData);
        
        // Fetch user roles from user_roles table
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId);
        
        // Get primary role (first role found, or 'user' as default)
        const primaryRole = rolesData && rolesData.length > 0 ? rolesData[0].role : 'user';
        console.log('User roles from user_roles table:', rolesData, 'Primary role:', primaryRole);
        
        // Add role to profile data
        const profileWithRole = {
          ...profileData,
          role: primaryRole
        };
        
        // CRITICAL: Check padlock status FIRST - if true, require password reset and stay on login
        // EXCEPT allow access to update-password page
        if (profileData.padlock === true) {
          console.log('User has padlock=true, checking current route');
          
          // Allow access to update-password page for users with padlock=true
          if (window.location.pathname !== '/update-password') {
            console.log('User has padlock=true, preventing access to:', window.location.pathname);
            await signOut();
            toast({
              title: "Password Reset Required",
              description: "Please reset your password to continue logging in.",
              variant: "destructive"
            });
            navigate("/login");
            return;
          }
        }
        
        // SECOND: Check user status - only approved users can proceed
        if (profileData.status !== 'approved') {
          console.log('User status not approved:', profileData.status);
          await signOut();
          
          const status = profileData.status;
          const notes = profileData.notes;
          let rejectionReason = "";
          
          // Extract rejection reason from notes if available
          if (notes && typeof notes === 'object' && !Array.isArray(notes)) {
            rejectionReason = (notes as any).rejection_reason || "";
          }

          switch (status) {
            case 'banned':
              toast({
                title: "Account Suspended",
                description: `Your account access has been suspended. Please contact the barangay administration for more information.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
                variant: "destructive"
              });
              break;
            case 'rejected':
              toast({
                title: "Registration Not Approved",
                description: `Your registration has not been approved. Please check your email for details or contact your barangay administrator.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
                variant: "destructive"
              });
              break;
            case 'pending':
              toast({
                title: "Account Pending Approval",
                description: "Your account is still pending approval from the barangay administrator. Please wait for approval or contact them for updates.",
                variant: "destructive"
              });
              break;
            default:
              toast({
                title: "Login Failed",
                description: "An unexpected error occurred. Please try again later or contact support if the problem persists.",
                variant: "destructive"
              });
              break;
          }
          
          // Force redirect to login page
          navigate("/login");
          return;
        }
        
        // Check barangay approval for all roles: if barangay is not approved (is_custom = false), block login
        if (profileData.brgyid) {
          const { data: barangayData, error: barangayError } = await supabase
            .from('barangays')
            .select('is_custom')
            .eq('id', profileData.brgyid)
            .single();

          if (barangayError) {
            console.error('Error checking barangay approval status:', barangayError);
          } else if (barangayData && !barangayData.is_custom) {
            await signOut();
            toast({
              title: "Barangay Not Yet Approved",
              description: "Your barangay is still pending approval. Login is disabled until approval.",
              variant: "destructive",
            });
            navigate("/login");
            return;
          }
        }
        
        // Set user to ONLINE when successfully fetching profile (login)
        await updateUserOnlineStatus(userId, true);
        setUserProfile(profileWithRole as UserProfile);
        
        // Pre-fetch document processing stats for admin/staff users
        if (primaryRole === 'admin' || primaryRole === 'staff') {
          try {
            console.log('Pre-fetching document processing stats...');
            const { data: docData, error: docError } = await supabase
              .from('docrequests')
              .select('status, created_at, updated_at')
              .eq('brgyid', profileData.brgyid);
            
            if (!docError && docData) {
              // Process the data to calculate statistics (case insensitive matching)
              const stats = {
                readyForPickup: docData.filter(doc => doc.status?.toLowerCase() === 'ready').length,
                processing: docData.filter(doc => doc.status?.toLowerCase() === 'processing').length,
                pending: docData.filter(doc => doc.status?.toLowerCase() === 'pending').length,
                released: docData.filter(doc => doc.status?.toLowerCase() === 'released').length,
                rejected: docData.filter(doc => doc.status?.toLowerCase() === 'rejected').length,
                avgProcessingTime: null
              };
              
              console.log('Pre-fetched document processing stats:', stats);
              localStorage.setItem('preloadedProcessingStats', JSON.stringify(stats));
            }
            
            // Pre-fetch document request stats
            const { data: requestData, error: requestError } = await supabase
              .from('docrequests')
              .select('status, issued_at')
              .eq('brgyid', profileData.brgyid);
            
            if (!requestError && requestData) {
              const totalCount = requestData.length;
              const pendingCount = requestData.filter(doc => doc.status === 'pending').length;
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const issuedTodayCount = requestData.filter(doc => {
                if (!doc.issued_at) return false;
                const issuedDate = new Date(doc.issued_at);
                issuedDate.setHours(0, 0, 0, 0);
                return issuedDate.getTime() === today.getTime();
              }).length;
              
              const requestStats = {
                total: totalCount || 0,
                pending: pendingCount || 0,
                issuedToday: issuedTodayCount || 0
              };
              
              console.log('Pre-fetched document request stats:', requestStats);
              localStorage.setItem('preloadedDocumentStats', JSON.stringify(requestStats));
            }

            // Pre-fetch residents data
            console.log('Pre-fetching residents data...');
            const { data: residentsData, error: residentsError } = await supabase
              .from('residents')
              .select('*')
              .eq('brgyid', profileData.brgyid)
              .order('last_name', { ascending: true });

            if (!residentsError && residentsData) {
              // Store residents data
              localStorage.setItem('preloadedResidentsData', JSON.stringify(residentsData));

              // Calculate status counts
              const permanentCount = residentsData.filter(r => r.status === 'Permanent').length;
              const temporaryCount = residentsData.filter(r => r.status === 'Temporary').length;
              const deceasedCount = residentsData.filter(r => r.status === 'Deceased').length;
              const relocatedCount = residentsData.filter(r => r.status === 'Relocated').length;

              // Calculate classification counts
              const getClassificationCount = (classification: string) => {
                return residentsData.filter(resident => 
                  resident.classifications && Array.isArray(resident.classifications) && 
                  resident.classifications.includes(classification)
                ).length;
              };

              const indigentCount = getClassificationCount('Indigent');
              const studentCount = getClassificationCount('Student');
              const ofwCount = getClassificationCount('OFW');
              const pwdCount = getClassificationCount('PWD');
              const missingCount = getClassificationCount('Missing');

              const residentStats = {
                total: residentsData.length,
                permanentCount,
                temporaryCount, 
                deceasedCount,
                relocatedCount,
                indigentCount,
                studentCount,
                ofwCount,
                pwdCount,
                missingCount
              };

              localStorage.setItem('preloadedResidentStats', JSON.stringify(residentStats));
              console.log('Pre-fetched residents stats:', residentStats);
            }

          } catch (err) {
            console.error('Error pre-fetching data:', err);
          }
        }
        
        // Fetch user settings after profile is loaded
        await fetchUserSettings(userId);
        
        if (profileData.brgyid) {
          fetchBarangayData(profileData.brgyid);
        }
        return;
      }

      console.log('No user profile found in profiles table for user ID:', userId);
      toast({
        title: "Profile Not Found",
        description: "Could not find your user profile. Please contact an administrator.",
        variant: "destructive",
      });
      
      await signOut();
      
    } catch (err) {
      console.error('Error in fetchUserProfile:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching your profile.",
        variant: "destructive",
      });
    }
  };
  
  // Fetch barangay information if needed
  const fetchBarangayData = async (brgyId: string) => {
    try {
      const { data, error } = await supabase
        .from('barangays')
        .select('*')
        .eq('id', brgyId)
        .single();
      
      if (error) {
        console.error('Error fetching barangay data:', error);
        return;
      }
      
      if (data) {
        console.log('Barangay data loaded:', data);
      }
    } catch (err) {
      console.error('Error in fetchBarangayData:', err);
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Store current user ID and profile before clearing state
      const currentUserId = user?.id;
      const currentUserProfile = userProfile;
      
      // Log the sign out activity before clearing state (non-blocking)
      if (currentUserId && currentUserProfile) {
        console.log('Logging sign out activity...');
        logUserSignOut(currentUserId, currentUserProfile).catch(error => {
          console.error('Non-blocking sign-out activity logging error:', error);
        });
      }
      
      // Clear local state FIRST to prevent any UI issues
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setUserSettings(null);
      setHasHandledInitialAuth(false);
      setHasLoggedSignIn(false);
      
      // Update user to OFFLINE status if we have a user ID
      if (currentUserId) {
        console.log('Setting user offline before logout:', currentUserId);
        await updateUserOnlineStatus(currentUserId, false);
      }

      // Force sign out from Supabase and clear all local storage
      console.log('Clearing Supabase session...');
      await supabase.auth.signOut({ scope: 'global' });
      
      // Additional cleanup - clear any remaining auth data
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      console.log('Sign out completed successfully');
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully",
      });
      
      // Navigate to login
      navigate("/login");
      
    } catch (error: any) {
      console.error("Sign out error:", error);
      
      // Even if signout fails, clear local state and redirect
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setUserSettings(null);
      setHasHandledInitialAuth(false);
      setHasLoggedSignIn(false);
      
      // Force clear storage
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      toast({
        title: "Signed out locally",
        description: "You have been signed out from this device.",
      });
      
      navigate("/login");
    }
  };

  // Handle page refresh/close to set user offline
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user?.id) {
        try {
          await updateUserOnlineStatus(user.id, false);
        } catch (error) {
          console.error('Error updating offline status on page close:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  // Handle visibility changes to prevent redirects when switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      console.log('Visibility changed:', isVisible ? 'visible' : 'hidden');
      setIsPageVisible(isVisible);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    console.log("Auth provider initialized");
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change:", event, currentSession?.user?.id, "Path:", location.pathname, "Visibility:", isPageVisible);
      
      if (!mounted) return;
      
      // Handle all auth events but NEVER redirect except for initial sign-in from login page
      if (event === 'SIGNED_OUT') {
        console.log('User signed out event - clearing state');
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setUserSettings(null);
        setHasHandledInitialAuth(false);
        setHasLoggedSignIn(false);
        setLoading(false);
        return;
      }
      
      // Update session and user for all events
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Check if this is a password recovery session
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const recoveryType = hashParams.get('type');
      const isPasswordRecovery = recoveryType === 'recovery';
      
      // ONLY handle redirects for SIGNED_IN event from login page AND only if we haven't already handled initial auth AND page is visible AND NOT password recovery
      if (event === 'SIGNED_IN' && 
          location.pathname === '/login' && 
          !hasHandledInitialAuth && 
          isPageVisible &&
          currentSession?.user &&
          !isPasswordRecovery) {
        
        console.log('Processing SIGNED_IN event from login page - will redirect');
        setHasHandledInitialAuth(true);
        setHasLoggedSignIn(true); // Mark that we've logged this sign-in
        
        setTimeout(async () => {
          if (mounted) {
            await fetchUserProfile(currentSession.user.id);
            
            // Log the sign in activity ONLY for actual SIGNED_IN events
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .maybeSingle();
            
            if (profileData) {
              console.log('Logging sign in activity for actual SIGNED_IN event:', currentSession.user.id);
              // Make activity logging non-blocking for better performance
              logUserSignIn(currentSession.user.id, profileData).catch(error => {
                console.error('Non-blocking sign-in activity logging error:', error);
              });
            }
            
            if (profileData) {
              // Only redirect if account is approved, not padlocked, and barangay is approved
              const isLocked = profileData.padlock === true;
              const isApproved = profileData.status === 'approved';
              let isBarangayApproved = true;
              if (profileData.brgyid) {
                const { data: bData, error: bErr } = await supabase
                  .from('barangays')
                  .select('is_custom')
                  .eq('id', profileData.brgyid)
                  .single();
                if (bErr) {
                  console.error('Error checking barangay approval status:', bErr);
                } else if (bData && bData.is_custom === false) {
                  isBarangayApproved = false;
                }
              }
              if (!isLocked && isApproved && isBarangayApproved) {
                // Fetch primary role from user_roles table
                const { data: rolesData } = await supabase
                  .from('user_roles')
                  .select('role')
                  .eq('user_id', currentSession.user.id);
                
                const primaryRole = rolesData && rolesData.length > 0 ? rolesData[0].role : 'user';
                console.log('Redirecting based on role from user_roles:', primaryRole);
                const smartPending = localStorage.getItem('smartLoginPending') === '1';
                
                // Check MFA status - get current user info to check AAL
                const { data: { user: currentUser } } = await supabase.auth.getUser();
                const currentAAL = (currentUser as any)?.aal;
                
                // If user has MFA enabled but only AAL1, redirect back to login for MFA verification
                if (currentAAL === 'aal1' && !smartPending) {
                  console.log('User has MFA enabled but not verified (AAL1), redirecting to login');
                  navigate('/login');
                  return;
                }
                
                if (!smartPending && (currentAAL === 'aal2' || currentAAL === null)) {
                  if (primaryRole === "user") {
                    navigate("/hub");
                  } else if (primaryRole === "admin" || primaryRole === "staff") {
                    navigate("/dashboard");
                  } else if (primaryRole === "glyph") {
                    navigate("/echelon");
                  } else if (primaryRole === "overseer") {
                    navigate("/plaza");
                  }
                } else {
                  console.log('Smart login pending; skipping auto-redirect');
                }
              } else {
                console.log('User not approved, padlocked, or barangay not approved; skipping redirect');
              }
            }
            
            // After profile and prefetch complete, lift the global loading gate
            setLoading(false);
          }
        }, 100);
      } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        console.log(`${event} event - updating profile silently, NO REDIRECTS`);
        
        // Only update profile data, never redirect on token refresh or initial session
        if (currentSession?.user && mounted) {
          setTimeout(async () => {
            if (mounted) {
              await fetchUserProfile(currentSession.user.id);
              setLoading(false);
            }
          }, 100);
        }
      } else if (event === 'SIGNED_IN') {
        console.log('SIGNED_IN event ignored - not from login page or already handled initial auth');
      }
      
      // Defer setLoading(false) until profile/data fetch completes
    });

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error("Error getting session:", error);
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
        setLoading(false);
        return;
      }
      
      console.log("Got initial session:", initialSession?.user?.id);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      
      if (initialSession?.user) {
        await fetchUserProfile(initialSession.user.id);
        
        // ONLY redirect on initial load if on login or root page AND haven't handled initial auth
        // Check if this is a password recovery session
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const recoveryType = hashParams.get('type');
        const isPasswordRecovery = recoveryType === 'recovery';
        
        if ((location.pathname === "/login" || location.pathname === "/") && !hasHandledInitialAuth && !isPasswordRecovery) {
          console.log('Initial load from login/root, checking for redirect...');
          setHasHandledInitialAuth(true);
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .maybeSingle();
          
          if (profileData) {
            // Only redirect if approved, not padlocked, and barangay is approved
            const isLocked = profileData.padlock === true;
            const isApproved = profileData.status === 'approved';
            let isBarangayApproved = true;
            if (profileData.brgyid) {
              const { data: bData, error: bErr } = await supabase
                .from('barangays')
                .select('is_custom')
                .eq('id', profileData.brgyid)
                .single();
              if (bErr) {
                console.error('Error checking barangay approval status:', bErr);
              } else if (bData && bData.is_custom === false) {
                isBarangayApproved = false;
              }
            }
            if (!isLocked && isApproved && isBarangayApproved) {
              // Fetch primary role from user_roles table
              const { data: rolesData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', initialSession.user.id);
              
              const primaryRole = rolesData && rolesData.length > 0 ? rolesData[0].role : 'user';
              console.log('Redirecting based on role from user_roles:', primaryRole);
              
              // Check MFA status - get current user info to check AAL
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              const currentAAL = (currentUser as any)?.aal;
              
              // If user has MFA enabled but only AAL1, redirect back to login for MFA verification
              if (currentAAL === 'aal1') {
                console.log('User has MFA enabled but not verified (AAL1), redirecting to login');
                navigate('/login');
                return;
              }
              
              // Only redirect if fully authenticated (AAL2) or no MFA (null)
              if (currentAAL === 'aal2' || currentAAL === null) {
                if (primaryRole === "user") {
                  navigate("/hub");
                } else if (primaryRole === "admin" || primaryRole === "staff") {
                  navigate("/dashboard");
                } else if (primaryRole === "glyph") {
                  navigate("/echelon");
                } else if (primaryRole === "overseer") {
                  navigate("/plaza");
                }
              }
            } else {
              console.log('User not approved, padlocked, or barangay not approved; skipping redirect on initial session');
            }
          }
        } else {
          console.log('Already on valid page or already handled auth, no redirect needed. Current path:', location.pathname);
        }
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [location.pathname, isPageVisible]); // Include dependencies for proper tracking

  // Global status monitoring effect - constantly check user status
  useEffect(() => {
    if (!user?.id || !userProfile || location.pathname === '/login') {
      return;
    }

    const statusCheckInterval = setInterval(async () => {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('status, notes')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking user status:', error);
          return;
        }

        // If user status is no longer approved, immediately sign them out and redirect
        if (profileData && profileData.status !== 'approved') {
          console.log('User status changed to non-approved:', profileData.status);
          
          clearInterval(statusCheckInterval);
          
          const status = profileData.status;
          const notes = profileData.notes;
          let rejectionReason = "";
          
          if (notes && typeof notes === 'object' && !Array.isArray(notes)) {
            rejectionReason = (notes as any).rejection_reason || "";
          }

          // Clear auth state immediately
          setUser(null);
          setSession(null);
          setUserProfile(null);
          setUserSettings(null);
          
          // Sign out from Supabase
          await supabase.auth.signOut();
          
          // Show appropriate message based on status
          switch (status) {
            case 'banned':
              toast({
                title: "Account Suspended",
                description: `Your account access has been suspended. Please contact the barangay administration for more information.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
                variant: "destructive"
              });
              break;
            case 'rejected':
              toast({
                title: "Registration Not Approved",
                description: `Your registration has not been approved. Please check your email for details or contact your barangay administrator.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
                variant: "destructive"
              });
              break;
            case 'pending':
              toast({
                title: "Account Pending Approval",
                description: "Your account is still pending approval from the barangay administrator. Please wait for approval or contact them for updates.",
                variant: "destructive"
              });
              break;
            default:
              toast({
                title: "Login Failed",
                description: "An unexpected error occurred. Please try again later or contact support if the problem persists.",
                variant: "destructive"
              });
              break;
          }
          
          // Force redirect to login
          navigate("/login");
        }
      } catch (error) {
        console.error('Error in status check interval:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(statusCheckInterval);
  }, [user?.id, userProfile, location.pathname, navigate]);

  return (
    <AuthContext.Provider value={{ user, session, userProfile, userSettings, loading, signOut, refreshSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
