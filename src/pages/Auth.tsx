import { useState, useRef, useEffect } from "react";
import { supabase, setRememberMePreference } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Mail, User, Lock, Building, MapPin, X, AlertCircle, Shield } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/components/theme/ThemeProvider";
import GlobalLoadingScreen from "@/components/ui/GlobalLoadingScreen";
import { clearAuthTransition } from "@/lib/authTransition";
import { v4 as uuidv4 } from "uuid";
const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Please enter your email or username"),
  password: z.string().min(6, "Password must be at least 6 characters long")
});
const ID_TYPES = ["National ID", "Passport", "Driver's License", "Voter's ID", "Postal ID", "SSS ID", "GSIS ID", "PhilHealth ID", "Senior Citizen ID", "PWD ID", "Student ID", "PRC ID", "Barangay ID", "Company ID", "Other"] as const;
const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstname: z.string().min(2, "First name is required"),
  lastname: z.string().min(2, "Last name is required"),
  middlename: z.string().optional(),
  suffix: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  phone: z.string().min(10, "Please enter a valid phone number").optional(),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Please select a gender"
  }),
  purok: z.string().min(1, "Please enter your purok"),
  bday: z.string().min(1, "Please enter your date of birth"),
  idType: z.enum(ID_TYPES, {
    required_error: "Please select an identification type"
  }),
  idFiles: z.any().refine(files => files && typeof files === 'object' && 'length' in files, {
    message: "Please upload 2-5 images of your ID"
  }).refine(files => (files?.length ?? 0) >= 2 && (files?.length ?? 0) <= 5, {
    message: "Please upload between 2 and 5 images"
  }).refine(files => Array.from(files || []).every((f: File) => f.type?.startsWith('image/')), {
    message: "Only image files are allowed"
  }),
  barangayId: z.string().refine(val => val !== "", {
    message: "Please select a barangay or choose to register a new one"
  }),
  barangayname: z.string().optional(),
  municipality: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
  country: z.string().default("Philippines").optional()
}).refine(data => {
  if (data.barangayId === "new-barangay") {
    return !!data.barangayname && !!data.municipality && !!data.province;
  }
  return true;
}, {
  message: "Required barangay information is missing",
  path: ["barangayname"]
});
const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address")
});
const otpVerificationSchema = z.object({
  otp: z.string().min(6, "Please enter the 6-digit code").max(6, "Please enter the 6-digit code")
});
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().min(6, "Please confirm your password")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
type OtpVerificationFormValues = z.infer<typeof otpVerificationSchema>;
const Auth = () => {
  const {
    theme
  } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "forgot-password" | "reset-password">("login");
  const [resetMode, setResetMode] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [smartLoading, setSmartLoading] = useState(false);
  const [barangays, setBarangays] = useState<{
    id: string;
    name: string;
    municipality: string;
    province: string;
  }[]>([]);
  const [barangaySearch, setBarangaySearch] = useState("");
  const [showBarangaySuggestions, setShowBarangaySuggestions] = useState(false);
  const [filteredBarangays, setFilteredBarangays] = useState<{
    id: string;
    name: string;
    municipality: string;
    province: string;
  }[]>([]);
  
  // Email verification modal states
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('rememberMe') === 'true';
  });

  // MFA states - Modal-based MFA flow
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [authStep, setAuthStep] = useState<'password' | 'mfa'>('password');
  
  const captchaRef = useRef<HCaptcha>(null);
  const idFilesInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    clearAuthTransition();
  }, []);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "a002bff6-3d98-4db2-8406-166e106c1958";

  // Fetch available barangays
  useEffect(() => {
    const fetchBarangays = async () => {
      const {
        data,
        error
      } = await supabase.rpc('search_barangays_public', { search_query: '' });
      if (error) {
        console.error('Error fetching barangays:', error);
        return;
      }
      if (data) {
        setBarangays(data.map(b => ({
          id: b.id,
          name: b.barangayname,
          municipality: b.municipality,
          province: b.province
        })));
      }
    };
    fetchBarangays();
  }, []);

  // Add useEffect to filter barangays based on search
  useEffect(() => {
    if (barangaySearch.trim() === "") {
      setFilteredBarangays([]);
      setShowBarangaySuggestions(false);
      return;
    }
    const filtered = barangays.filter(barangay => barangay.name.toLowerCase().includes(barangaySearch.toLowerCase()) || barangay.municipality.toLowerCase().includes(barangaySearch.toLowerCase()) || barangay.province.toLowerCase().includes(barangaySearch.toLowerCase()));
    setFilteredBarangays(filtered.slice(0, 10)); // Limit to 10 suggestions
    setShowBarangaySuggestions(true);
  }, [barangaySearch, barangays]);
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: ""
    }
  });
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstname: "",
      lastname: "",
      middlename: "",
      suffix: "",
      username: "",
      phone: "",
      gender: undefined,
      purok: "",
      bday: "",
      barangayId: "",
      barangayname: "",
      municipality: "",
      province: "",
      region: "",
      country: "Philippines"
    }
  });
  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    }
  });
  const otpForm = useForm<OtpVerificationFormValues>({
    resolver: zodResolver(otpVerificationSchema),
    defaultValues: {
      otp: ""
    }
  });
  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });
  const selectedBarangayId = signupForm.watch("barangayId");
  const isNewBarangay = selectedBarangayId === "new-barangay";
  const selectedRole = 'admin' as const;
  
  // Reset OTP form when MFA modal opens
  useEffect(() => {
    if (showMfaModal) {
      otpForm.reset({ otp: "" });
    }
  }, [showMfaModal, otpForm]);
  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    if (token) {
      console.log("Captcha verified successfully");
    }
  };
  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    if (!captchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the captcha verification",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    // Set the flag BEFORE any authentication attempts to prevent race conditions
    localStorage.setItem('smartLoginPending', '1');
    
    try {
      console.log("Attempting login with:", values.emailOrUsername);

      // First check if it's an email or username
      const isEmail = values.emailOrUsername.includes('@');
      let email = values.emailOrUsername;

      // If it's not an email, look up the email from username using SECURITY DEFINER function
      if (!isEmail) {
        console.log("Looking up email for username:", values.emailOrUsername);
        const {
          data: lookupData,
          error: lookupError
        } = await supabase.rpc('auth_lookup_email_by_username', {
          username_input: values.emailOrUsername
        });
        
        if (lookupError) {
          console.error("Error looking up username:", lookupError);
          toast({
            title: "Error",
            description: "An error occurred while looking up the username",
            variant: "destructive"
          });
          localStorage.removeItem('smartLoginPending'); // Clear flag on error
          setIsLoading(false);
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
          return;
        }
        
        if (lookupData && lookupData.length > 0 && lookupData[0].email) {
          email = lookupData[0].email;
        } else {
          toast({
            title: "User Not Found",
            description: "No user found with that username",
            variant: "destructive"
          });
          localStorage.removeItem('smartLoginPending'); // Clear flag on error
          setIsLoading(false);
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
          return;
        }
      }
      
      // Set remember me preference before login
      setRememberMePreference(rememberMe);
      
      const {
        data: {
          user,
          session
        },
        error
      } = await supabase.auth.signInWithPassword({
        email: email,
        password: values.password,
        options: {
          captchaToken
        }
      });
      if (error) {
        console.error("Login error:", error);
        
        // Check if it's an email not confirmed error
        if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          console.log("Email not confirmed error detected");
          
          // Increment login attempts
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);
          
          // Get user creation time to check 15-minute rule
          try {
            const { data: verificationData } = await supabase.functions.invoke('resend-verification', {
              body: { email, checkOnly: true }
            });
            
            const createdAt = verificationData?.user_created_at;
            const currentTime = new Date().getTime();
            const userCreatedTime = new Date(createdAt).getTime();
            const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
            const timeSinceCreation = currentTime - userCreatedTime;
            
            console.log(`Login attempts: ${newAttempts}, Time since creation: ${timeSinceCreation}ms`);
            
            // Show modal if 3+ attempts or 15+ minutes since signup
            if (newAttempts >= 3 || timeSinceCreation > fifteenMinutes) {
              setUnverifiedEmail(email);
              setUserCreatedAt(createdAt);
              setShowVerificationModal(true);
            } else {
              toast({
                title: "Email Not Verified",
                description: `Please check your email and verify your account before logging in. (Attempt ${newAttempts}/3)`,
                variant: "destructive"
              });
            }
          } catch (err) {
            console.error("Error getting user creation time:", err);
            // Fallback to showing modal after 3 attempts
            if (newAttempts >= 3) {
              setUnverifiedEmail(email);
              setShowVerificationModal(true);
            } else {
              toast({
                title: "Email Not Verified",
                description: `Please check your email and verify your account before logging in. (Attempt ${newAttempts}/3)`,
                variant: "destructive"
              });
            }
          }
        } else {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive"
          });
          localStorage.removeItem('smartLoginPending'); // Clear flag on error
        }
      } else if (user && session) {
        console.log("Login successful, user authenticated");

        // Check if user has MFA enabled using the edge function
        try {
          const { data: mfaStatus, error: mfaError } = await supabase.functions.invoke('mfa-status');
          
          if (mfaError) {
            console.error("Error checking MFA status:", mfaError);
          } else if (mfaStatus?.enabled) {
            console.log("MFA is enabled for this user, requiring verification");
            otpForm.reset(); // Reset the MFA form to clear any existing values
            setShowMfaModal(true); // Show the MFA modal
            setAuthStep('mfa'); // Switch the auth step to MFA
            setIsLoading(false);
            // Keep the smartLoginPending flag set - MFA flow will clear it when complete
            return; // EXIT the function here. Do not proceed to the dashboard.
          }
        } catch (mfaErr) {
          console.error("Error checking MFA status:", mfaErr);
        }

        // Check user status and padlock in profiles table
        const {
          data: userProfile,
          error: profileError
        } = (await supabase.from('profiles').select('status, notes, padlock').eq('id', user.id).maybeSingle()) as {
          data: any;
          error: any;
        };
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          toast({
            title: "Login Failed",
            description: "An unexpected error occurred. Please try again later or contact support if the problem persists.",
            variant: "destructive"
          });
          // Sign out the user
          await supabase.auth.signOut();
          localStorage.removeItem('smartLoginPending'); // Clear flag on error
          return;
        }

        // Check padlock status first - if true, require password reset and stay on login
        if (userProfile?.padlock === true) {
          // Sign out the user but keep them on login page
          await supabase.auth.signOut();
          toast({
            title: "Password Reset Required",
            description: "Please reset your password to continue logging in.",
            variant: "destructive"
          });
          localStorage.removeItem('smartLoginPending'); // Clear flag on error
          setIsLoading(false);
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
          return;
        }

        // Check if user status allows login
        if (userProfile?.status !== 'approved') {
          // Sign out the user since they're not approved
          await supabase.auth.signOut();
          const status = userProfile?.status;
          const notes = userProfile?.notes;
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
          localStorage.removeItem('smartLoginPending'); // Clear flag on error
          return;
        }

        // Reset login attempts on successful login
        setLoginAttempts(0);
        setShowVerificationModal(false);
        
        // User is approved, proceed with Smart Login prefetch
        try {
          // Show full-screen loader and set smart flag to prevent auto-redirects
          setSmartLoading(true);
          localStorage.setItem('smartLoginPending', '1');

          // Fetch essential profile data for routing and scoping
          const {
            data: profileFull
          } = await supabase.from('profiles').select('id, brgyid').eq('id', user.id).maybeSingle();
          const brgyid = profileFull?.brgyid as string | undefined;

          // Fetch role from user_roles table (security-compliant)
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          const role = roleData?.role as string | undefined;

          // Block login if barangay is not yet approved (is_custom = false)
          if (brgyid) {
            const { data: bData, error: bErr } = await supabase
              .from('barangays')
              .select('is_custom')
              .eq('id', brgyid)
              .single();
            if (bErr) {
              console.error('Error checking barangay approval status:', bErr);
            }
            if (bData && bData.is_custom === false) {
              await supabase.auth.signOut();
              toast({
                title: "Barangay Not Yet Approved",
                description: "Your barangay is still pending approval. Login is disabled until approval.",
                variant: "destructive"
              });
              localStorage.removeItem('smartLoginPending');
              setSmartLoading(false);
              return;
            }
          }

          // Prefetch all dashboard data and cache it
          if (brgyid) {
            await prefetchDashboard(brgyid, user.id);
          }
          const dest = role === 'user' ? '/hub' : role === 'admin' || role === 'staff' ? '/dashboard' : role === 'glyph' ? '/echelon' : role === 'overseer' ? '/plaza' : '/hub';

          // Clear smart flag and navigate
          localStorage.removeItem('smartLoginPending');
          setSmartLoading(false);
          navigate(dest, {
            replace: true
          });
        } catch (e) {
          console.error('Smart login prefetch failed:', e);
          localStorage.removeItem('smartLoginPending');
          setSmartLoading(false);
          navigate('/hub', {
            replace: true
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      localStorage.removeItem('smartLoginPending'); // Clear flag on error
      console.error("Authentication error:", error);
    } finally {
      setIsLoading(false);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };

  // New Handler for MFA Verification - Two-step authentication flow
  const handleMfaVerification = async (values: OtpVerificationFormValues) => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('mfa-verify-code', {
        body: { code: values.otp, enable: false }
      });

      if (error) {
        console.error("MFA verification error:", error);
        toast({
          title: "Verification Failed",
          description: "Invalid code. Please try again.",
          variant: "destructive"
        });
        localStorage.removeItem('smartLoginPending'); // Clear flag on error
        otpForm.reset();
        return;
      }

      if (data?.success) {
        console.log("MFA verification successful");
        // Continue with the complete login flow
        await completeMfaLogin();
      } else {
        toast({
          title: "Verification Failed", 
          description: "Invalid code. Please try again.",
          variant: "destructive"
        });
        localStorage.removeItem('smartLoginPending'); // Clear flag on error
        otpForm.reset();
      }
    } catch (error) {
      console.error("MFA verification error:", error);
      toast({
        title: "Error",
        description: "An error occurred during verification",
        variant: "destructive"
      });
      localStorage.removeItem('smartLoginPending'); // Clear flag on error
      otpForm.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const completeMfaLogin = async () => {
    try {
      // Get current user after MFA verification
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user after MFA:", userError);
        toast({
          title: "Login Failed",
          description: "Unable to complete login. Please try again.",
          variant: "destructive"
        });
        setAuthStep('password');
        return;
      }

      // Check user status and padlock in profiles table
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('status, notes, padlock, role, brgyid')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        toast({
          title: "Login Failed",
          description: "An unexpected error occurred. Please try again later or contact support if the problem persists.",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        setAuthStep('password');
        return;
      }

      // Check padlock status first
      if (userProfile?.padlock === true) {
        await supabase.auth.signOut();
        toast({
          title: "Password Reset Required",
          description: "Please reset your password to continue logging in.",
          variant: "destructive"
        });
        setAuthStep('password');
        return;
      }

      // Check if user status allows login
      if (userProfile?.status !== 'approved') {
        await supabase.auth.signOut();
        const status = userProfile?.status;
        const notes = userProfile?.notes;
        let rejectionReason = "";

        if (notes && typeof notes === 'string') {
          const rejectionMatch = notes.match(/Rejection Reason:\s*(.+?)(?:\n|$)/);
          if (rejectionMatch) {
            rejectionReason = rejectionMatch[1].trim();
          }
        }

        switch (status) {
          case 'banned':
            toast({
              title: "Account Banned",
              description: rejectionReason ? `Your account has been banned. Reason: ${rejectionReason}` : "Your account has been banned. Please contact support for assistance.",
              variant: "destructive"
            });
            break;
          case 'rejected':
            toast({
              title: "Account Rejected",
              description: rejectionReason ? `Your account was rejected. Reason: ${rejectionReason}` : "Your account was rejected. Please contact support for assistance.",
              variant: "destructive"
            });
            break;
          case 'pending':
            toast({
              title: "Account Pending Approval",
              description: "Your account is still pending approval. Please wait for an administrator to review your request.",
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: "Account Not Approved",
              description: "Your account is not approved for login. Please contact support for assistance.",
              variant: "destructive"
            });
        }
        setAuthStep('password');
        return;
      }

      // Continue with successful login flow
      setSmartLoading(true);
      localStorage.setItem('smartLoginPending', '1');

      const role = userProfile?.role as string | undefined;
      const brgyid = userProfile?.brgyid as string | undefined;

      // Block login if barangay is not yet approved
      if (brgyid) {
        const { data: bData, error: bErr } = await supabase
          .from('barangays')
          .select('is_custom')
          .eq('id', brgyid)
          .single();
        if (bErr) {
          console.error('Error checking barangay approval status:', bErr);
        }
        if (bData && bData.is_custom === false) {
          await supabase.auth.signOut();
          toast({
            title: "Barangay Not Yet Approved",
            description: "Your barangay is still pending approval. Login is disabled until approval.",
            variant: "destructive"
          });
          localStorage.removeItem('smartLoginPending');
          setSmartLoading(false);
          setAuthStep('password');
          return;
        }
      }

      // Prefetch all dashboard data and cache it
      if (brgyid) {
        await prefetchDashboard(brgyid, user.id);
      }
      const dest = role === 'user' ? '/hub' : 
                   role === 'admin' || role === 'staff' ? '/dashboard' : 
                   role === 'glyph' ? '/echelon' : 
                   role === 'overseer' ? '/plaza' : '/hub';

      // Clear smart flag and navigate
      localStorage.removeItem('smartLoginPending');
      setSmartLoading(false);
      navigate(dest, { replace: true });

    } catch (error) {
      console.error('MFA login completion failed:', error);
      localStorage.removeItem('smartLoginPending');
      setSmartLoading(false);
      setAuthStep('password');
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    
    // Check captcha for resend verification
    if (!captchaToken) {
      toast({
        title: "Captcha Required",
        description: "Please complete the captcha verification.",
        variant: "destructive"
      });
      return;
    }
    
    setIsResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: {
          captchaToken: captchaToken
        }
      });
      
      if (error) {
        console.error('Resend verification error:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to resend verification email",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Verification Email Sent",
          description: "Please check your email for the verification link.",
          variant: "default"
        });
        setShowVerificationModal(false);
        setLoginAttempts(0);
        // Reset captcha after successful resend
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  // Calculate time since signup for display
  const getTimeSinceSignup = () => {
    if (!userCreatedAt) return null;
    
    const currentTime = new Date().getTime();
    const createdTime = new Date(userCreatedAt).getTime();
    const diffMinutes = Math.floor((currentTime - createdTime) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }
  };

  // Smart Login prefetch helpers
  function processMonthlyData(data: Array<{
    created_at: string;
  }>) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyCount: Record<string, number> = {};
    for (let i = 0; i <= currentMonth; i++) monthlyCount[months[i]] = 0;
    data.forEach(item => {
      const d = new Date(item.created_at);
      if (d.getFullYear() === currentYear && d.getMonth() <= currentMonth) {
        const m = months[d.getMonth()];
        if (monthlyCount.hasOwnProperty(m)) monthlyCount[m]++;
      }
    });
    let cumulative = 0;
    return months.slice(0, currentMonth + 1).map(month => ({
      month,
      residents: cumulative += monthlyCount[month] || 0
    }));
  }
  function processGenderDistribution(data: Array<{
    gender: string;
  }>, totalResidents: number) {
    const genderCount: Record<string, number> = {};
    data.forEach(r => {
      let g = (r.gender || 'Unknown').toLowerCase();
      if (g === 'male' || g === 'm') g = 'Male';else if (g === 'female' || g === 'f') g = 'Female';else if (g === 'other' || g === 'o') g = 'Other';else g = 'Unknown';
      genderCount[g] = (genderCount[g] || 0) + 1;
    });
    return Object.entries(genderCount).map(([gender, count]) => ({
      gender,
      count,
      percentage: totalResidents > 0 ? Math.round(count / totalResidents * 100) : 0
    }));
  }
  async function prefetchDashboard(brgyid: string, userId: string) {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfThisWeek = new Date(new Date().setDate(new Date().getDate() - new Date().getDay()));

    // Primary lists in parallel
    const [residentsRes, householdsRes, barangayRes, eventsRes, announcementsRes, officialsRes] = await Promise.all([supabase.from('residents').select('*').eq('brgyid', brgyid).order('created_at', {
      ascending: false
    }), supabase.from('households').select('*').eq('brgyid', brgyid).order('created_at', {
      ascending: false
    }), supabase.from('barangays').select('barangayname').eq('id', brgyid).single(), supabase.from('events').select('*').eq('brgyid', brgyid).gte('start_time', new Date().toISOString()).order('start_time', {
      ascending: true
    }).limit(3), supabase.from('announcements').select('*').eq('brgyid', brgyid).order('created_at', {
      ascending: false
    }).limit(2), supabase.from('officials').select('id, name, photo_url, officialPositions:official_positions(*)').eq('brgyid', brgyid).limit(5)]);
    const residents = residentsRes.data || [];
    const households = householdsRes.data || [];
    const barangayName = (barangayRes.data as any)?.barangayname || '';
    const upcomingEvents = eventsRes.data || [];
    const latestAnnouncements = announcementsRes.data || [];
    const barangayOfficials = (officialsRes.data || []).filter((o: any) => o.officialPositions && o.officialPositions.length > 0).map((o: any) => {
      const current = o.officialPositions.find((p: any) => p.is_current) || o.officialPositions[0];
      return {
        id: o.id,
        name: o.name,
        photo_url: o.photo_url,
        position: current?.position || 'Official',
        term_start: current?.term_start || '',
        term_end: current?.term_end || ''
      };
    });

    // Cache for DataContext
    localStorage.setItem(`preloadedDashboardContext_${brgyid}`, JSON.stringify({
      residents,
      households,
      upcomingEvents,
      latestAnnouncements,
      barangayOfficials,
      barangayName,
      timestamp: Date.now()
    }));

    // Dashboard metrics
    const [residentsCountQ, deceasedCountQ, relocatedCountQ, householdsCountQ, announcementsCountQ, eventsCountQ, newResidentsThisMonthQ, newResidentsLastMonthQ, newHouseholdsThisMonthQ, newHouseholdsLastMonthQ, newAnnouncementsThisWeekQ, nextEventQ, monthlyDataQ, genderDataQ] = await Promise.all([
      supabase.from('residents').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).not('status', 'in', '("Deceased","Relocated")'),
      supabase.from('residents').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).eq('status', 'Deceased'),
      supabase.from('residents').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).eq('status', 'Relocated'),
      supabase.from('households').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid),
      supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).gte('start_time', new Date().toISOString()),
      supabase.from('residents').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).gte('created_at', startOfThisMonth.toISOString()).not('status', 'in', '("Deceased","Relocated")'),
      supabase.from('residents').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).gte('created_at', startOfLastMonth.toISOString()).lt('created_at', startOfThisMonth.toISOString()).not('status', 'in', '("Deceased","Relocated")'),
      supabase.from('households').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).gte('created_at', startOfThisMonth.toISOString()),
      supabase.from('households').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).gte('created_at', startOfLastMonth.toISOString()).lt('created_at', startOfThisMonth.toISOString()),
      supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('brgyid', brgyid).gte('created_at', startOfThisWeek.toISOString()),
      supabase.from('events').select('start_time').eq('brgyid', brgyid).gte('start_time', new Date().toISOString()).order('start_time', { ascending: true }).limit(1).single(),
      supabase.from('residents').select('created_at').eq('brgyid', brgyid).gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()).not('status', 'in', '("Deceased","Relocated")'),
      supabase.from('residents').select('gender').eq('brgyid', brgyid).not('status', 'in', '("Deceased","Relocated")')
    ]);
    const residentsCount = residentsCountQ.count || 0;
    const deceasedCount = deceasedCountQ.count || 0;
    const relocatedCount = relocatedCountQ.count || 0;
    const householdsCount = householdsCountQ.count || 0;
    const announcementsCount = announcementsCountQ.count || 0;
    const eventsCount = eventsCountQ.count || 0;
    const newResidentsThisMonth = newResidentsThisMonthQ.count || 0;
    const newResidentsLastMonth = newResidentsLastMonthQ.count || 0;
    const newHouseholdsThisMonth = newHouseholdsThisMonthQ.count || 0;
    const newHouseholdsLastMonth = newHouseholdsLastMonthQ.count || 0;
    const newAnnouncementsThisWeek = newAnnouncementsThisWeekQ.count || 0;
    let nextEventDays: number | null = null;
    const nextEventData: any = nextEventQ.data;
    if (nextEventData) {
      const eventDate = new Date(nextEventData.start_time);
      const diffTime = eventDate.getTime() - new Date().getTime();
      nextEventDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    const monthlyResidents = processMonthlyData((monthlyDataQ.data || []) as Array<{
      created_at: string;
    }>);
    const genderDistribution = processGenderDistribution((genderDataQ.data || []) as Array<{
      gender: string;
    }>, residentsCount);
    const residentGrowthRate = newResidentsLastMonth > 0 ? (newResidentsThisMonth - newResidentsLastMonth) / (newResidentsLastMonth || 1) * 100 : newResidentsThisMonth > 0 ? 100 : 0;
    const householdGrowthRate = newHouseholdsLastMonth > 0 ? (newHouseholdsThisMonth - newHouseholdsLastMonth) / (newHouseholdsLastMonth || 1) * 100 : newHouseholdsThisMonth > 0 ? 100 : 0;
    const dashboardData = {
      totalResidents: residentsCount,
      totalHouseholds: householdsCount,
      activeAnnouncements: announcementsCount,
      upcomingEvents: eventsCount,
      monthlyResidents,
      genderDistribution,
      residentGrowthRate,
      householdGrowthRate,
      newResidentsThisMonth,
      newHouseholdsThisMonth,
      newAnnouncementsThisWeek,
      nextEventDays,
      totalDeceased: deceasedCount,
      totalRelocated: relocatedCount,
      isLoading: false,
      error: null
    };
    localStorage.setItem(`dashboardData_${brgyid}`, JSON.stringify(dashboardData));
  }
  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);
    if (!captchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the captcha verification",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    try {
      let brgyId: string | null = null;
      let isSuperiorAdmin = false;

      // Process barangay selection or creation
      if (values.barangayId === "new-barangay") {
        const {
          data: existingBarangay,
          error: brgyCheckError
        } = await supabase.from('barangays').select('id').ilike('barangayname', values.barangayname?.trim() || '').eq('municipality', values.municipality?.trim() || '').eq('province', values.province?.trim() || '').single();
        if (brgyCheckError && brgyCheckError.code !== 'PGRST116') {
          toast({
            title: "Database Error",
            description: brgyCheckError.message,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        if (existingBarangay) {
          toast({
            title: "Barangay Already Exists",
            description: "This barangay is already registered in our system. Please select it from the dropdown instead.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        const {
          data: brgyData,
          error: brgyError
        } = await supabase.from('barangays').insert({
          barangayname: values.barangayname?.trim() || '',
          municipality: values.municipality?.trim() || '',
          province: values.province?.trim() || '',
          region: values.region?.trim() || '',
          country: values.country || 'Philippines',
          created_at: new Date().toISOString(),
          is_custom: false
        }).select('id').single();
        if (brgyError) {
          toast({
            title: "Barangay Creation Error",
            description: brgyError.message,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        if (brgyData) {
          brgyId = brgyData.id;
        }
      } else {
        brgyId = values.barangayId || null;
        // If admin/staff is joining existing barangay, they remain regular admin/staff
        isSuperiorAdmin = false;
      }
      const userStatus = "pending";

      // Validate uniqueness of email and phone via Edge Function
      const {
        data: identity,
        error: identityErr
      } = await supabase.functions.invoke('check-identity', {
        body: {
          email: values.email,
          phone: values.phone || undefined
        }
      });
      if (identityErr) {
        toast({
          title: "Validation error",
          description: identityErr.message || "Unable to validate email/phone at the moment.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      const emailTaken = identity?.emailTaken;
      const phoneTaken = identity?.phoneTaken;
      if (emailTaken || phoneTaken) {
        if (emailTaken) {
          signupForm.setError("email", {
            type: "manual",
            message: "This email is already in use."
          });
        }
        if (phoneTaken) {
          signupForm.setError("phone", {
            type: "manual",
            message: "This phone number is already in use."
          });
        }
        toast({
          title: "Duplicate information",
          description: `${emailTaken ? "Email already exists. " : ""}${phoneTaken ? "Phone already exists." : ""}`.trim(),
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Create user auth account
      const {
        data: authData,
        error: authError
      } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          captchaToken,
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: values.username,
            firstname: values.firstname,
            middlename: values.middlename || null,
            lastname: values.lastname,
            suffix: values.suffix || null,
            phone: values.phone || null,
            gender: values.gender,
            purok: values.purok,
            bday: values.bday,
            brgyid: brgyId,
            role: 'user',
            status: userStatus,
            superior_admin: isSuperiorAdmin
          }
        }
      });
      if (authError) {
        toast({
          title: "Error",
          description: authError.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      if (authData.user) {
        // Profile is created by a DB trigger using user_metadata passed at sign up.

        // Immediately upload ID images via Edge Function (no session required)
        try {
          const userId = authData.user.id;

          // If a new barangay was created, set the submitter to the new user's ID via Edge Function (bypass RLS)
          if (values.barangayId === "new-barangay" && brgyId) {
            try {
              const { error: submitterErr } = await supabase.functions.invoke('set-barangay-submitter', {
                body: { barangayId: brgyId, submitterId: userId },
              });
              if (submitterErr) {
                console.error('Failed to set barangay submitter:', submitterErr);
              }
            } catch (e) {
              console.error('Error invoking set-barangay-submitter:', e);
            }
          }

          const files = values.idFiles as unknown as FileList;
          const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string || '').split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const payloadFiles = await Promise.all(Array.from(files).map(async file => ({
            name: file.name,
            type: file.type || 'image/jpeg',
            b64: await toBase64(file)
          })));
          const {
            error: fnError
          } = await supabase.functions.invoke('upload-user-ids', {
            body: {
              userId,
              idType: values.idType,
              files: payloadFiles
            }
          });
          if (fnError) throw fnError;
          toast({
            title: "Account created",
            description: "Your ID images were uploaded. Please confirm your email to sign in."
          });
          setActiveTab("login");
          signupForm.reset();
        } catch (e: any) {
          console.error('ID upload failed:', e);
          toast({
            title: "ID upload failed",
            description: e.message || "Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };
  const handleBarangaySelect = (barangay: {
    id: string;
    name: string;
    municipality: string;
    province: string;
  }) => {
    signupForm.setValue("barangayId", barangay.id);
    setBarangaySearch(`${barangay.name}, ${barangay.municipality}, ${barangay.province}`);
    setShowBarangaySuggestions(false);
  };
  const handleNewBarangaySelect = () => {
    signupForm.setValue("barangayId", "new-barangay");
    setBarangaySearch("Register New Barangay");
    setShowBarangaySuggestions(false);
  };
  const handleBarangaySearchChange = (value: string) => {
    setBarangaySearch(value);
    if (value === "") {
      signupForm.setValue("barangayId", "");
    }
  };
  const handleForgotPassword = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    if (!captchaToken) {
      toast({
        title: "CAPTCHA Required",
        description: "Please complete the captcha verification",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    try {
      // First check if the email exists in profiles table
      const {
        data: profileCheck,
        error: profileError
      } = await supabase.from('profiles').select('email').eq('email', values.email).single();
      if (profileError || !profileCheck) {
        toast({
          title: "Email Not Found",
          description: "No account found with this email address.",
          variant: "destructive"
        });
        setIsLoading(false);
        captchaRef.current?.resetCaptcha();
        setCaptchaToken(null);
        return;
      }
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/update-password`,
        captchaToken
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Reset Code Sent",
          description: "Check your email for a 6-digit reset code.",
          variant: "default"
        });
        setOtpEmail(values.email);
        setShowOtpInput(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      console.error("Forgot password error:", error);
    } finally {
      setIsLoading(false);
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  };
  const handleOtpVerification = async (values: OtpVerificationFormValues) => {
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: values.otp,
        type: 'email'
      });
      if (error) {
        toast({
          title: "Invalid Code",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Code Verified",
          description: "Redirecting to password update page...",
          variant: "default"
        });
        navigate('/update-password');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      console.error("OTP verification error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: values.password
      });
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password Updated",
          description: "Your password has been successfully updated. Please log in with your new password.",
          variant: "default"
        });

        // Sign out the user after password reset to clear recovery session
        await supabase.auth.signOut();
        setResetMode(false);
        setActiveTab("login");
        resetPasswordForm.reset();
        // Clear the URL hash
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      console.error("Reset password error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  if (smartLoading) return <GlobalLoadingScreen />;
  return <div className={`w-full min-h-screen flex flex-col items-center justify-center p-4 overflow-x-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100'}`}>
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Left side - Brand/Info */}
        <div className="hidden lg:block">
          <div className="relative">
            <div className={`absolute -top-4 -left-4 w-72 h-72 rounded-full opacity-60 animate-pulse ${theme === 'dark' ? 'bg-indigo-500/20' : 'bg-blue-300/30'}`}></div>
            <div className={`absolute -bottom-8 -right-8 w-48 h-48 rounded-full opacity-40 animate-pulse delay-1000 ${theme === 'dark' ? 'bg-purple-500/20' : 'bg-indigo-300/30'}`}></div>
            
            <div className={`relative backdrop-blur-sm rounded-3xl p-8 shadow-2xl ${theme === 'dark' ? 'bg-slate-800/80 border border-slate-700/50' : 'bg-white/90 border border-blue-200/50'}`}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
                  <Building className="text-white text-2xl" />
                </div>
                <h1 className={`text-4xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Baranex</h1>
                <p className={`font-semibold ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'}`}>Barangay Next-Gen Management</p>
              </div>
              
              <div className="space-y-6">
                <div className={`flex items-center gap-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200'}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <User className="text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Community Focused</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Empowering barangays with modern tools</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <Lock className="text-white" />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Secure & Reliable</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Your data protected with advanced security</p>
                  </div>
                </div>
                
                <div className={`flex items-center gap-4 p-4 rounded-xl ${theme === 'dark' ? 'bg-gradient-to-r from-green-500/10 to-indigo-500/10 border border-green-500/20' : 'bg-gradient-to-r from-green-50 to-blue-50 border border-green-200'}`}>
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <svg className="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8V12L14 14M12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Efficient Management</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Streamline operations with smart solutions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Auth Form */}
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <div className={`backdrop-blur-sm rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl p-4 sm:p-5 md:p-6 lg:p-8 w-full ${theme === 'dark' ? 'bg-slate-800/90 border border-slate-700/50' : 'bg-white/95 border border-blue-200/50'}`}>
            {/* Mobile header */}
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:hidden">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-2 sm:mb-3 md:mb-4 shadow-lg">
                <Building className="text-white text-base sm:text-lg md:text-2xl" />
              </div>
              <h1 className={`text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Baranex</h1>
              <p className={`font-semibold text-sm sm:text-sm md:text-base ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-600'}`}>Next-Gen Barangay Management</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as "login" | "signup" | "forgot-password" | "reset-password")} className="w-full">
              
              
              {/* Header text */}
              <div className="text-center mb-4 sm:mb-5 md:mb-6">
                <h2 className={`text-lg sm:text-xl md:text-xl lg:text-2xl font-bold mb-1 sm:mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {activeTab === "login" ? "Welcome Back!" : activeTab === "signup" ? "Create an Account" : activeTab === "forgot-password" ? "Reset Password" : "Set New Password"}
                </h2>
                <p className={`text-sm sm:text-sm md:text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {activeTab === "login" ? "Sign in to your dashboard" : activeTab === "signup" ? "Join Baranex to manage your community" : activeTab === "forgot-password" ? "Enter your email to receive a password reset link" : "Enter your new password"}
                </p>
              </div>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={loginForm.control} name="emailOrUsername" render={({
                    field
                  }) => <FormItem>
                          <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Email Address or Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                              <Input placeholder="Enter your email or username" className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                  
                  <FormField control={loginForm.control} name="password" render={({
                    field
                  }) => <FormItem>
                          <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                              <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" className={`w-full pl-11 pr-12 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              <button type="button" className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />

                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className={`w-4 h-4 rounded focus:ring-blue-500 ${theme === 'dark' ? 'text-indigo-600 border-gray-500 bg-slate-700' : 'text-blue-600 border-gray-300 bg-white'}`} 
                      />
                      <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>Remember me</span>
                    </label>
                    <button type="button" onClick={() => setActiveTab("forgot-password")} className={`font-medium transition-colors duration-200 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-500'}`}>Forgot password?</button>
                  </div>
                  
                  <div className="flex justify-center my-3 sm:my-4 w-full overflow-hidden">
                    <div className="transform scale-75 sm:scale-100 w-full flex justify-center max-w-full overflow-hidden">
                      <HCaptcha ref={captchaRef} sitekey={hcaptchaSiteKey} onVerify={handleCaptchaChange} onExpire={() => setCaptchaToken(null)} />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full max-w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2.5 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl" disabled={isLoading || !captchaToken}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
              </TabsContent>

              <TabsContent value="signup">
                <ScrollArea className="h-[400px] pr-4">
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={signupForm.control} name="firstname" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Francis Jay" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                          
                        <FormField control={signupForm.control} name="lastname" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Pon" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                      </div>
                        
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={signupForm.control} name="middlename" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Middle Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Jaugin" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        <FormField control={signupForm.control} name="suffix" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Suffix</FormLabel>
                              <FormControl>
                                <Input placeholder="Jr., Sr., III" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                      </div>
                        
                      <FormField control={signupForm.control} name="username" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm md:text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <Input placeholder="lordjay01" className={`w-full pl-11 pr-4 py-3 md:py-4 text-base rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                        
                      <FormField control={signupForm.control} name="email" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm md:text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Email</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <Input placeholder="francisjaypon@gmail.com" className={`w-full pl-11 pr-4 py-3 md:py-4 text-base rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                        
                      <FormField control={signupForm.control} name="phone" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm md:text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Phone Number (Optional)</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+63 912 345 6789" className={`w-full px-4 py-3 md:py-4 text-base rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={signupForm.control} name="gender" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className={`block text-sm md:text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Gender</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className={`w-full px-4 py-3 md:py-4 text-base rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500'}`}>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>} />

                        <FormField control={signupForm.control} name="purok" render={({
                        field
                      }) => <FormItem>
                              <FormLabel className={`block text-sm md:text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Purok</FormLabel>
                              <FormControl>
                                <Input placeholder="Purok 1" className={`w-full px-4 py-3 md:py-4 text-base rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                      </div>

                      <FormField control={signupForm.control} name="bday" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm md:text-base font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" className={`w-full px-4 py-3 md:py-4 text-base rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500'}`} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                        

                      {/* ID verification section: below DOB, above barangay */}
                      <FormField control={signupForm.control} name="idType" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Identification type</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500'}`}>
                                  <SelectValue placeholder="Select identification type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ID_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />

                      <FormField control={signupForm.control} name="idFiles" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                              Upload ID photos (2-5 images)
                            </FormLabel>
                            <FormDescription>Only image files are allowed. We’ll list filenames below; no image previews.</FormDescription>
                            <FormControl>
                              <>
                                <div className="flex items-center gap-3">
                                  <input
                                    id="id-files-input"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={e => {
                                      const selected = Array.from(e.target.files || []);
                                      const prev = Array.isArray(field.value)
                                        ? field.value
                                        : Array.from(field.value || []);
                                      const merged = [...prev, ...selected];
                                      field.onChange(merged);
                                      if (e.target) e.target.value = '';
                                    }}
                                    ref={idFilesInputRef}
                                    className="hidden"
                                  />
                                  <label htmlFor="id-files-input">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="cursor-pointer bg-muted text-foreground border-input hover:bg-muted/80"
                                      onClick={() => idFilesInputRef.current?.click()}
                                    >
                                      Choose files
                                    </Button>
                                  </label>
                                  {(() => {
                                    const files = Array.isArray(field.value)
                                      ? field.value
                                      : Array.from(field.value || []);
                                    const count = files.length;
                                    const countText = count === 1 ? '1 file chosen' : `${count} files chosen`;
                                    return (
                                      <span className="text-sm text-muted-foreground" aria-live="polite">
                                        {countText}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </>
                            </FormControl>
                            {(() => {
                              const files = Array.isArray(field.value)
                                ? field.value
                                : Array.from(field.value || []);
                              return files.length > 0 ? (
                                <div className="mt-2 space-y-1">
                                  {files.map((f: File, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between gap-3">
                                      <div className="text-sm text-muted-foreground truncate">• {f.name}</div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const next = files.filter((_: File, i: number) => i !== idx);
                                          field.onChange(next);
                                        }}
                                        className="text-destructive hover:opacity-80 transition-opacity"
                                        aria-label={`Remove ${f.name}`}
                                        title="Remove file"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                            <FormMessage />
                          </FormItem>} />

                      <Separator className="my-4" />

                      <FormField control={signupForm.control} name="barangayId" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Barangay</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <div className="relative">
                                  <MapPin className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                  <Input placeholder="Search for your barangay..." value={barangaySearch} onChange={e => handleBarangaySearchChange(e.target.value)} onFocus={() => {
                              if (barangaySearch && filteredBarangays.length > 0) {
                                setShowBarangaySuggestions(true);
                              }
                            }} className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} />
                                </div>
                                
                                {showBarangaySuggestions && <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                                  {filteredBarangays.length > 0 && <>
                                      {filteredBarangays.map(barangay => <button key={barangay.id} type="button" onClick={() => handleBarangaySelect(barangay)} className="w-full text-left px-4 py-2 text-foreground hover:bg-accent hover:text-accent-foreground border-b border-border last:border-b-0">
                                          <div className="font-medium">{barangay.name}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {barangay.municipality}, {barangay.province}
                                          </div>
                                        </button>)}
                                      {(selectedRole === "admin" || selectedRole === "staff") && <>
                                          <div className="border-t border-border my-1"></div>
                                          <button type="button" onClick={handleNewBarangaySelect} className="w-full text-left px-4 py-2 text-primary hover:bg-muted font-medium">
                                            + Register New Barangay
                                          </button>
                                        </>}
                                    </>}
                                  
                                  {filteredBarangays.length === 0 && barangaySearch.trim() !== "" && <div className="px-4 py-2 text-muted-foreground">
                                      <button type="button" onClick={handleNewBarangaySelect} className="w-full text-left text-primary font-medium hover:bg-muted py-2 px-2 rounded">
                                        + Register New Barangay
                                      </button>
                                    </div>}
                                </div>}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                        
                      {/* Click outside to close suggestions */}
                      {showBarangaySuggestions && <div className="fixed inset-0 z-40" onClick={() => setShowBarangaySuggestions(false)} />}
                        
                      {isNewBarangay && <>
                          <FormField control={signupForm.control} name="barangayname" render={({
                        field
                      }) => <FormItem>
                                <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Barangay Name</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Building className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <Input placeholder="Poblacion" className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={signupForm.control} name="municipality" render={({
                          field
                        }) => <FormItem>
                                  <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Municipality/City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Sindangan" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>} />
                            
                            <FormField control={signupForm.control} name="province" render={({
                          field
                        }) => <FormItem>
                                  <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Province</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Zamboanga Del Norte" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField control={signupForm.control} name="region" render={({
                          field
                        }) => <FormItem>
                                  <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Region (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="IX" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>} />
                            
                            <FormField control={signupForm.control} name="country" render={({
                          field
                        }) => <FormItem>
                                  <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Country</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Philippines" defaultValue="Philippines" className={`w-full px-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>} />
                          </div>
                        
                          
                        </>}
                        
                      <FormField control={signupForm.control} name="password" render={({
                      field
                    }) => <FormItem>
                            <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <Input type={showPassword ? "text" : "password"} placeholder="Create a secure password" className={`w-full pl-11 pr-12 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                                <button type="button" className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setShowPassword(!showPassword)}>
                                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      
                      
                      
                      <div className="flex justify-center my-4">
                        <HCaptcha ref={captchaRef} sitekey={hcaptchaSiteKey} onVerify={handleCaptchaChange} onExpire={() => setCaptchaToken(null)} />
                      </div>
                      
                      <Button type="submit" className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-3 rounded-xl font-semibold hover:from-primary-600 hover:to-primary-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl" disabled={isLoading || !captchaToken}>
                        {isLoading ? "Creating Account..." : "Create Account"}
                      </Button>
                      
                      <p className="text-xs text-center text-gray-500 mt-4">
                        By clicking "Create Account", you agree to our{" "}
                        <a href="#" className="underline text-blue-600">Terms of Service</a> and{" "}
                        <a href="#" className="underline text-blue-600">Privacy Policy</a>.
                      </p>
                    </form>
                  </Form>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="forgot-password">
                {!showOtpInput ? <Form {...forgotPasswordForm}>
                    <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
                      <FormField control={forgotPasswordForm.control} name="email" render={({
                    field
                  }) => <FormItem>
                            <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                              Email Address
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                                <Input placeholder="Enter your email address" className={`w-full pl-11 pr-4 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      
                      <div className="flex justify-center my-4">
                        <HCaptcha ref={captchaRef} sitekey={hcaptchaSiteKey} onVerify={handleCaptchaChange} onExpire={() => setCaptchaToken(null)} />
                      </div>
                      
                      <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl" disabled={isLoading || !captchaToken}>
                        {isLoading ? "Sending Code..." : "Send Verification Code"}
                      </Button>
                      
                      <div className="text-center">
                        <button type="button" onClick={() => setActiveTab("login")} className={`text-sm font-medium transition-colors duration-200 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-500'}`}>
                          Back to Login
                        </button>
                      </div>
                    </form>
                  </Form> : <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(handleOtpVerification)} className="space-y-4">
                      <div className="text-center mb-4">
                        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                          Enter Verification Code
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                          We sent a 6-digit code to {otpEmail}
                        </p>
                      </div>

                      <FormField control={otpForm.control} name="otp" render={({
                    field
                  }) => <FormItem>
                            <FormLabel className={`block text-sm font-medium mb-2 text-center ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                              Verification Code
                            </FormLabel>
                            <FormControl>
                              <div className="flex justify-center">
                                <InputOTP maxLength={6} {...field}>
                                  <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                  </InputOTPGroup>
                                </InputOTP>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      
                      <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl" disabled={isLoading}>
                        {isLoading ? "Verifying..." : "Verify Code"}
                      </Button>
                      
                      <div className="text-center space-y-2">
                        <button type="button" onClick={() => {
                      setShowOtpInput(false);
                      setOtpEmail("");
                      otpForm.reset();
                    }} className={`text-sm font-medium transition-colors duration-200 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-500'}`}>
                          Try Different Email
                        </button>
                      </div>
                    </form>
                  </Form>}
              </TabsContent>

              <TabsContent value="reset-password">
                <Form {...resetPasswordForm}>
                  <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                    <FormField control={resetPasswordForm.control} name="password" render={({
                    field
                  }) => <FormItem>
                          <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                            New Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                              <Input type={showPassword ? "text" : "password"} placeholder="Enter your new password" className={`w-full pl-11 pr-12 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                              <button type="button" className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    
                    <FormField control={resetPasswordForm.control} name="confirmPassword" render={({
                    field
                  }) => <FormItem>
                          <FormLabel className={`block text-sm font-medium mb-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                            Confirm New Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                              <Input type={showPassword ? "text" : "password"} placeholder="Confirm your new password" className={`w-full pl-11 pr-12 py-3 rounded-xl transition-all duration-200 ${theme === 'dark' ? 'border-slate-600 bg-slate-700/50 text-white focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400' : 'border-blue-200 bg-white text-gray-800 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500'}`} {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>} />
                    
                    <Button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl" disabled={isLoading}>
                      {isLoading ? "Updating Password..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            
            <div className={`mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 md:pt-6 ${theme === 'dark' ? 'border-t border-slate-700' : 'border-t border-blue-200'}`}>
              <div className="text-center space-y-2 sm:space-y-3">
                <Button onClick={() => navigate('/')} variant="ghost" size="sm" className={`text-xs sm:text-sm transition-all duration-200 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'}`}>
                  ← Back to Home
                </Button>
                
                <p className={`text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {activeTab === "login" ? <>
                      New to Baranex?{" "}
                      <button onClick={() => setActiveTab("signup")} className={`font-medium hover:underline transition-all duration-200 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-500'}`}>
                        Sign up
                      </button>
                    </> : activeTab === "signup" ? <>
                      Already have an account?{" "}
                      <button onClick={() => setActiveTab("login")} className={`font-medium hover:underline transition-all duration-200 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-500'}`}>
                        Sign in
                      </button>
                    </> : activeTab === "forgot-password" ? <>
                      Remember your password?{" "}
                      <button onClick={() => setActiveTab("login")} className={`font-medium hover:underline transition-all duration-200 ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-500'}`}>
                        Sign in
                      </button>
                    </> : null}
                </p>
              </div>
            </div>
            
            <div className={`mt-3 sm:mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <span className="flex items-center gap-1">
                <Lock className={`h-3 w-3 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
                SSL Secured
              </span>
              <span className="flex items-center gap-1">
                <svg className={`h-3 w-3 sm:h-4 sm:w-4 ${theme === 'dark' ? 'text-indigo-400' : 'text-blue-500'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Gov Certified
              </span>
            </div>
          </div>
          
          <div className={`mt-3 sm:mt-4 md:mt-6 text-center text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>© 2025 Baranex. Empowering Filipino Communities.</p>
          </div>
        </div>
      </div>

      {/* Email Verification Modal */}
      <Dialog open={showVerificationModal} onOpenChange={setShowVerificationModal}>
        <DialogContent className={`max-w-[calc(100vw-1rem)] sm:max-w-md p-4 sm:p-6 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
          <DialogHeader className="text-center space-y-2">
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
                <AlertCircle className={`h-5 w-5 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
              </div>
              <DialogTitle className={`text-base md:text-lg font-semibold text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Email Verification Required
              </DialogTitle>
            </div>
            <DialogDescription className={`text-xs md:text-sm leading-relaxed text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Your account email hasn't been verified yet. We've detected multiple login attempts 
              {userCreatedAt && getTimeSinceSignup() && (
                <> or it's been {getTimeSinceSignup()} since you signed up</>
              )}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
            <div className={`p-2.5 md:p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex flex-col items-center gap-2 mb-2 text-center">
                <Mail className={`h-4 w-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`text-xs md:text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Verification Email
                </span>
              </div>
              <p className={`text-xs md:text-sm text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                Check your email{' '}
                <span className={`font-medium break-all ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {unverifiedEmail}
                </span>{' '}
                for a verification link. If you can't find it, check your spam folder.
              </p>
            </div>

            {/* Captcha for resend verification */}
            <div className="flex justify-center overflow-x-auto">
              <div className="max-w-full">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={hcaptchaSiteKey}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => setCaptchaToken(null)}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 h-11 text-sm md:text-base"
                onClick={() => {
                  setShowVerificationModal(false);
                  setLoginAttempts(0);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResendVerification}
                disabled={isResendingVerification}
                className="flex-1 h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-sm md:text-base"
              >
                {isResendingVerification ? "Sending..." : "Resend Link"}
              </Button>
            </div>

            <div className={`text-xs md:text-sm text-center px-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Still having trouble? Contact your barangay administrator for assistance.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MFA Modal */}
      <Dialog open={showMfaModal} onOpenChange={(open) => {
        if (!open) {
          setShowMfaModal(false);
          setAuthStep('password');
          localStorage.removeItem('smartLoginPending');
          loginForm.reset();
          otpForm.reset();
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-primary" />
            </div>
            <DialogTitle className="text-center">Two-Factor Authentication</DialogTitle>
            <DialogDescription className="text-center">
              Please enter the 6-digit code from your authenticator app to complete your login.
            </DialogDescription>
          </DialogHeader>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(handleMfaVerification)} className="space-y-6">
              <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Verification Code</FormLabel>
                    <FormControl>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          {...field}
                          autoFocus
                          autoComplete="off"
                          data-form-type="other"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowMfaModal(false);
                    setAuthStep('password');
                    localStorage.removeItem('smartLoginPending');
                    loginForm.reset();
                    otpForm.reset();
                    captchaRef.current?.resetCaptcha();
                    setCaptchaToken(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify Code"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>;
};

export default Auth;