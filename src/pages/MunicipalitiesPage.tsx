import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Mail, User, Lock, Building, MapPin, ArrowLeft, Plus } from 'lucide-react';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import { supabase } from '@/integrations/supabase/client';
import { EcheSidebar } from '@/components/layout/EcheSidebar';

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstname: z.string().min(2, "First name is required"),
  lastname: z.string().min(2, "Last name is required"),
  middlename: z.string().optional(),
  username: z.string().min(3, "Username must be at least 3 characters long"),
  phone: z.string().min(10, "Please enter a valid phone number").optional(),
  gender: z.enum(["Male", "Female", "Other"], {
    required_error: "Please select a gender"
  }),
  purok: z.string().min(1, "Please enter your purok"),
  bday: z.string().min(1, "Please enter your date of birth"),
  role: z.enum(["admin", "staff", "user"]),
  barangayId: z.string().refine(val => val !== "", {
    message: "Please select a barangay or choose to register a new one"
  }),
  barangayname: z.string().optional(),
  municipality: z.string().optional(),
  province: z.string().optional(),
  region: z.string().optional(),
  country: z.string().default("Philippines").optional()
}).refine(data => {
  if (data.barangayId === "new-barangay" && (data.role === "admin" || data.role === "staff")) {
    return !!data.barangayname && !!data.municipality && !!data.province;
  }
  return true;
}, {
  message: "Required barangay information is missing",
  path: ["barangayname"]
});

type SignupFormValues = z.infer<typeof signupSchema>;

const MunicipalitiesPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [municipalities, setMunicipalities] = useState<{
    id: string;
    municipality: string;
    province: string;
    region: string;
    barangay: string;
  }[]>([]);
  const [municipalitySearch, setMunicipalitySearch] = useState("");
  const [showMunicipalitySuggestions, setShowMunicipalitySuggestions] = useState(false);
  const [filteredMunicipalities, setFilteredMunicipalities] = useState<{
    id: string;
    municipality: string;
    province: string;
    region: string;
    barangay: string;
  }[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const captchaRef = useRef<HCaptcha>(null);
  const hcaptchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "a002bff6-3d98-4db2-8406-166e106c1958";

  // Fetch municipalities from plaza table
  useEffect(() => {
    const fetchMunicipalities = async () => {
      try {
        setDataLoading(true);
        const { data, error } = await supabase
          .from('plaza')
          .select('id, municipality, province, region, barangay')
          .order('province')
          .order('municipality');
        
        if (error) {
          console.error('Error fetching municipalities:', error);
          toast({
            title: "Error fetching municipalities",
            description: error.message,
            variant: "destructive",
          });
          return;
        }
        
        if (data) {
          setMunicipalities(data);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch municipalities",
          variant: "destructive",
        });
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchMunicipalities();
  }, []);

  // Filter municipalities based on search
  useEffect(() => {
    if (municipalitySearch.trim() === "") {
      setFilteredMunicipalities([]);
      setShowMunicipalitySuggestions(false);
      return;
    }
    
    const filtered = municipalities.filter(municipality => 
      municipality.municipality.toLowerCase().includes(municipalitySearch.toLowerCase()) ||
      municipality.province.toLowerCase().includes(municipalitySearch.toLowerCase()) ||
      municipality.region.toLowerCase().includes(municipalitySearch.toLowerCase())
    );
    
    setFilteredMunicipalities(filtered.slice(0, 10));
    setShowMunicipalitySuggestions(true);
  }, [municipalitySearch, municipalities]);

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstname: "",
      lastname: "",
      middlename: "",
      username: "",
      phone: "",
      gender: undefined,
      purok: "",
      bday: "",
      role: "admin",
      barangayId: "",
      barangayname: "",
      municipality: "",
      province: "",
      region: "",
      country: "Philippines"
    }
  });

  const selectedBarangayId = signupForm.watch("barangayId");
  const isNewBarangay = selectedBarangayId === "new-barangay";

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
    if (token) {
      console.log("Captcha verified successfully");
    }
  };

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
      let municipalityId: string | null = null;
      
      // For municipality registration, always register as new municipality
      if (values.barangayId === "new-barangay") {
        // Check if municipality already exists in plaza table
        const { data: existingMunicipality, error: plazaCheckError } = await supabase
          .from('plaza')
          .select('id')
          .eq('municipality', values.municipality?.trim() || '')
          .eq('province', values.province?.trim() || '')
          .single();

        if (plazaCheckError && plazaCheckError.code !== 'PGRST116') {
          toast({
            title: "Database Error",
            description: plazaCheckError.message,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        if (existingMunicipality) {
          toast({
            title: "Municipality Already Exists",
            description: "This municipality is already registered in our system.",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // Generate municipality ID
        municipalityId = crypto.randomUUID();
        
        // Create municipality entry in plaza table
        const { error: plazaError } = await supabase
          .from('plaza')
          .insert({
            id: municipalityId,
            barangay: values.barangayname?.trim() || '',
            municipality: values.municipality?.trim() || '',
            province: values.province?.trim() || '',
            region: values.region?.trim() || '',
            country: values.country || 'Philippines'
          });

        if (plazaError) {
          toast({
            title: "Municipality Registration Error",
            description: plazaError.message,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
      }

      // Create user auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          captchaToken,
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            firstname: values.firstname,
            lastname: values.lastname
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
        // Insert into profiles table with overseer role and null brgyid
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            adminid: authData.user.id,
            brgyid: null, // Municipality admin has no barangay
            mid: municipalityId, // Link to the municipality in plaza table
            username: values.username,
            firstname: values.firstname,
            middlename: values.middlename || null,
            lastname: values.lastname,
            email: values.email,
            phone: values.phone || null,
            gender: values.gender,
            purok: values.purok,
            bday: values.bday,
            role: 'overseer', // Municipality admin role
            status: 'active',
            superior_admin: true,
            created_at: new Date().toISOString()
          });

        if (profileError) {
          toast({
            title: "Profile Error",
            description: profileError.message,
            variant: "destructive"
          });
          console.error("Profile creation error:", profileError);
        } else {
          toast({
            title: "Account created",
            description: "Municipality overseer account created successfully!"
          });
          
          signupForm.reset();
          setIsModalOpen(false);
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

  const handleMunicipalitySelect = (municipality: {
    id: string;
    municipality: string;
    province: string;
    region: string;
    barangay: string;
  }) => {
    signupForm.setValue("barangayId", municipality.id);
    setMunicipalitySearch(`${municipality.municipality}, ${municipality.province}`);
    setShowMunicipalitySuggestions(false);
  };

  const handleNewMunicipalitySelect = () => {
    signupForm.setValue("barangayId", "new-barangay");
    setMunicipalitySearch("Register New Municipality");
    setShowMunicipalitySuggestions(false);
  };

  const handleMunicipalitySearchChange = (value: string) => {
    setMunicipalitySearch(value);
    if (value === "") {
      signupForm.setValue("barangayId", "");
    }
  };


  return (
    <div className="w-full bg-background min-h-screen flex">
      <EcheSidebar activeRoute="municipalities" />

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {dataLoading ? (
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading municipalities...</p>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-background">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-foreground">Municipalities</h1>
                
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Register New Municipality</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Register Municipality Admin</DialogTitle>
                    <DialogDescription>
                      Create a new municipality administrator account
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Form {...signupForm}>
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                      {/* Personal Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="firstname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="Robelyn"
                                    className="pl-10"
                                    disabled={isLoading}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={signupForm.control}
                          name="lastname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="Biol"
                                    className="pl-10"
                                    disabled={isLoading}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={signupForm.control}
                        name="middlename"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="Tubada"
                                  className="pl-10"
                                  disabled={isLoading}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Account Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="robelynbiol"
                                    className="pl-10"
                                    disabled={isLoading}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="robelynbiol@municipality.gov.ph"
                                    className="pl-10"
                                    disabled={isLoading}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={signupForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="pl-10 pr-10"
                                  disabled={isLoading}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Personal Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Male">Male</SelectItem>
                                  <SelectItem value="Female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signupForm.control}
                          name="bday"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="date"
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={signupForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="tel"
                                  placeholder="+63 912 345 6789"
                                  disabled={isLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signupForm.control}
                          name="purok"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Purok/Address</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="1"
                                    className="pl-10"
                                    disabled={isLoading}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Municipality Selection */}
                      <FormField
                        control={signupForm.control}
                        name="barangayId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select or Register Municipality</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                                <Input
                                  value={municipalitySearch}
                                  onChange={(e) => handleMunicipalitySearchChange(e.target.value)}
                                  placeholder="Search for a municipality or register a new one..."
                                  className="pl-10"
                                  disabled={isLoading}
                                  onFocus={() => municipalitySearch && setShowMunicipalitySuggestions(true)}
                                />
                                {showMunicipalitySuggestions && (
                                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                                    {filteredMunicipalities.map((municipality) => (
                                      <button
                                        key={municipality.id}
                                        type="button"
                                        onClick={() => handleMunicipalitySelect(municipality)}
                                        className="w-full text-left px-4 py-2 hover:bg-muted border-b border-border last:border-b-0"
                                      >
                                        <div className="font-medium text-foreground">{municipality.municipality}</div>
                                        <div className="text-sm text-muted-foreground">{municipality.province}, {municipality.region}</div>
                                      </button>
                                    ))}
                                    <button
                                      type="button"
                                      onClick={handleNewMunicipalitySelect}
                                      className="w-full text-left px-4 py-2 hover:bg-accent text-accent-foreground font-medium border-t border-border"
                                    >
                                      + Register New Municipality
                                    </button>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* New Municipality Fields */}
                      {isNewBarangay && (
                         <div className="space-y-4 p-4 bg-background/50 rounded-lg border border-border dark:bg-muted/30 dark:border-muted-foreground/20">
                           <h4 className="font-medium text-foreground">New Municipality Registration</h4>
                           
                           <FormField
                             control={signupForm.control}
                             name="barangayname"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Barangay Name</FormLabel>
                                 <FormControl>
                                   <Input
                                     {...field}
                                     type="text"
                                     placeholder="Poblacion"
                                     disabled={isLoading}
                                   />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />

                           <FormField
                             control={signupForm.control}
                             name="municipality"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel>Municipality Name</FormLabel>
                                 <FormControl>
                                   <Input
                                     {...field}
                                     type="text"
                                     placeholder="Sindangan"
                                     disabled={isLoading}
                                   />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={signupForm.control}
                              name="province"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Province</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="text"
                                      placeholder="Zamboanga Del Norte"
                                      disabled={isLoading}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={signupForm.control}
                              name="region"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Region</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="text"
                                      placeholder="XI"
                                      disabled={isLoading}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {/* CAPTCHA */}
                      <div className="flex justify-center">
                        <HCaptcha
                          ref={captchaRef}
                          sitekey={hcaptchaSiteKey}
                          onVerify={handleCaptchaChange}
                        />
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading || !captchaToken}
                      >
                        {isLoading ? "Creating Account..." : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </div>

            {/* Municipalities List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {municipalities.map((municipality) => (
                <Card key={municipality.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building className="h-5 w-5" />
                      <span>{municipality.municipality}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{municipality.barangay}</span>
                      </div>
                      <div>Province: {municipality.province}</div>
                      <div>Region: {municipality.region}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {municipalities.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">No municipalities found</h3>
                  <p className="text-gray-500 mb-4">Register the first municipality to get started.</p>
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MunicipalitiesPage;