import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getResidentById } from '@/lib/api/residents';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, FileText, UserCheck, MapPin, Mail, Phone, Briefcase, Calendar, Home, Skull, Clock, History, ZoomIn, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import RelationshipManager from '@/components/residents/RelationshipManager';
import HouseholdSelector from '@/components/residents/HouseholdSelector';
import EditResidentModal from '@/components/residents/EditResidentModal';
import ResidentIDsManager from '@/components/residents/ResidentIDsManager';
import ResidentActivityHistory from '@/components/residents/ResidentActivityHistory';
import { supabase } from '@/integrations/supabase/client';
import { useResidentPhoto } from '@/hooks/useResidentPhoto';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Helper function to calculate age
const calculateAge = (birthDate: string) => {
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

// Helper function to generate status badge
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Permanent':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Permanent</Badge>;
    case 'Temporary':
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Temporary</Badge>;
    case 'Deceased':
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Deceased</Badge>;
    case 'Relocated':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Relocated</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Helper function to format dates for display
const formatDate = (dateString?: string) => {
  if (!dateString) return "Not available";
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date:", dateString);
      return "Invalid date";
    }
    
    return date.toLocaleString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Error formatting date:", error, "Date string:", dateString);
    return "Date error";
  }
};

// Simpler date format without time for birthdate and death date
const formatSimpleDate = (dateString?: string) => {
  if (!dateString) return "Not available";
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error("Invalid date for simple format:", dateString);
      return "Invalid date";
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  } catch (error) {
    console.error("Error formatting simple date:", error, "Date string:", dateString);
    return "Date error";
  }
};

const ResidentMoreDetailsPage = () => {
  const { residentId } = useParams<{ residentId: string }>();
  const navigate = useNavigate();
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: resident, isLoading, error, refetch } = useQuery({
    queryKey: ['resident', residentId],
    queryFn: () => getResidentById(residentId as string),
    enabled: !!residentId,
    staleTime: 0, // Always fetch fresh data when query is invalidated
  });

  // Use TanStack Query for photo caching
  const { data: signedPhotoUrl, isLoading: isLoadingPhoto } = useResidentPhoto({
    residentId,
    photoUrl: resident?.photo_url,
    enabled: !!resident?.photo_url
  });
  
  // Fetch admin profiles for recordedby and editedby
  const { data: createdByAdmin } = useQuery({
    queryKey: ['admin-profile', resident?.recordedby],
    queryFn: async () => {
      if (!resident?.recordedby) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('firstname, lastname, middlename')
        .eq('id', resident.recordedby)
        .maybeSingle();

      if (error) {
        console.error('Error fetching created by admin:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!resident?.recordedby,
  });

  const { data: updatedByAdmin } = useQuery({
    queryKey: ['admin-profile', resident?.editedby],
    queryFn: async () => {
      if (!resident?.editedby) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('firstname, lastname, middlename')
        .eq('id', resident.editedby)
        .maybeSingle();

      if (error) {
        console.error('Error fetching updated by admin:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!resident?.editedby,
  });

  // Fetch household information if resident has a household_id
  const { data: household } = useQuery({
    queryKey: ['resident-household', resident?.household_id],
    queryFn: async () => {
      if (!resident?.household_id) return null;
      
      const { data, error } = await supabase
        .from('households')
        .select('id, name, address, purok, status, head_of_family, headname')
        .eq('id', resident.household_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!resident?.household_id,
  });
  
  // Log to debug what we're receiving from the API
  console.log("Resident data:", resident);
  console.log("Created by admin:", createdByAdmin);
  console.log("Updated by admin:", updatedByAdmin);
  
  if (isLoading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center mb-8">
          <Button onClick={() => navigate(-1)} variant="ghost" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex items-center mb-8">
          <Button onClick={() => navigate(-1)} variant="ghost" className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Resident Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              The resident information could not be loaded or does not exist.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to format admin name
  const formatAdminName = (admin: any) => {
    if (!admin) return null;
    const firstName = admin.firstname || '';
    const middleName = admin.middlename ? ` ${admin.middlename} ` : ' ';
    const lastName = admin.lastname || '';
    return `${firstName}${middleName}${lastName}`.trim();
  };

  // Generate full address display - removing region from this string
  const fullAddress = resident.purok 
    ? `Purok ${resident.purok}, ${resident.barangaydb}, ${resident.municipalitycity}, ${resident.provinze}` 
    : resident.address || 'Address not provided';

  const residentFullName = `${resident.first_name} ${resident.middle_name ? `${resident.middle_name} ` : ''}${resident.last_name}${resident.suffix ? ` ${resident.suffix}` : ''}`;

  // Navigate to household details page
  const handleViewHousehold = () => {
    if (household) {
      navigate(`/households/${household.id}`);
    }
  };

  const handleHouseholdUpdate = () => {
    refetch();
  };

  const handleEditFormSubmit = () => {
    setIsEditDialogOpen(false);
    refetch();
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center mb-8">
        <Button onClick={() => navigate(-1)} variant="ghost" className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resident Profile</h1>
          <p className="text-muted-foreground mt-1">
            Complete details for {resident.first_name} {resident.last_name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid gap-6 pb-8">
              {/* Header Card */}
              <Card className="border-t-4 border-t-baranex-primary">
                <CardContent className="pt-6 pb-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    {/* Photo/Avatar with loading state */}
                    <div className="relative w-32 h-32">
                      {/* Placeholder with Initials (Always visible underneath) */}
                      <Avatar className="w-32 h-32 border-4 border-gray-100">
                        <AvatarFallback className="text-4xl">
                          {resident.first_name.charAt(0)}{resident.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Loading Spinner Overlay */}
                      {isLoadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-t-white border-gray-400 rounded-full animate-spin"></div>
                        </div>
                      )}
                      
                      {/* The Actual Image (with smooth fade-in) */}
                      {signedPhotoUrl && (
                        <div className="absolute inset-0 cursor-pointer group" onClick={() => setShowFullPhoto(true)}>
                          <Avatar className="w-32 h-32 border-4 border-gray-100">
                            <AvatarImage 
                              src={signedPhotoUrl} 
                              alt={`${resident.first_name} ${resident.last_name}`}
                              className={`transition-opacity duration-300 ${signedPhotoUrl ? 'opacity-100' : 'opacity-0'}`}
                            />
                          </Avatar>
                          <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ZoomIn className="text-white h-8 w-8" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Basic Info */}
                    <div className="space-y-2 text-center md:text-left flex-1">
                      <div className="flex flex-col md:flex-row md:items-center gap-2">
                        <h2 className="text-2xl font-bold">
                          {resident.first_name} {resident.middle_name ? `${resident.middle_name.charAt(0)}. ` : ''}{resident.last_name} {resident.suffix || ''}
                        </h2>
                        <div className="flex items-center">
                          {getStatusBadge(resident.status)}
                          {resident.status === 'Deceased' && (
                            <Skull className="ml-2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col md:flex-row gap-4 text-muted-foreground">
                        <div className="flex items-center">
                          <UserCheck className="mr-2 h-4 w-4" />
                          <span>{resident.gender}, {calculateAge(resident.birthdate)} years old</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="mr-2 h-4 w-4" />
                          <span>Purok {resident.purok || "Unknown"}</span>
                        </div>
                        {resident.occupation && (
                          <div className="flex items-center">
                            <Briefcase className="mr-2 h-4 w-4" />
                            <span>{resident.occupation}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        {resident.classifications?.map((classification, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800 border-blue-100">
                            {classification}
                          </Badge>
                        ))}
                        {resident.is_voter && (
                          <Badge variant="outline" className="bg-green-50 text-green-800 border-green-100">Voter</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Quick actions */}
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="w-full">
                        <FileText className="mr-2 h-4 w-4" />
                        Issue Document
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setIsEditDialogOpen(true)}>
                        Edit Profile
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <UserCheck className="mr-2 h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">First Name</p>
                          <p className="font-medium">{resident.first_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Last Name</p>
                          <p className="font-medium">{resident.last_name}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Middle Name</p>
                          <p className="font-medium">{resident.middle_name || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Suffix</p>
                          <p className="font-medium">{resident.suffix || "None"}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Gender</p>
                          <p className="font-medium">{resident.gender}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Civil Status</p>
                          <p className="font-medium">{resident.civil_status || "Not specified"}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Birth Date</p>
                          <p className="font-medium">{formatSimpleDate(resident.birthdate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Age</p>
                          <p className="font-medium">{calculateAge(resident.birthdate)} years old</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Nationality</p>
                          <p className="font-medium">{resident.nationality || "Filipino"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <div className="flex items-center">
                            <p className="font-medium">{resident.status}</p>
                            {resident.status === 'Deceased' && (
                              <Skull className="ml-2 h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Classifications</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {resident.classifications?.length 
                            ? resident.classifications.map((classification, index) => (
                                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800 border-blue-100">
                                  {classification}
                                </Badge>
                              )) 
                            : <p className="text-muted-foreground">None specified</p>}
                        </div>
                      </div>

                      {/* Display date of death if resident is deceased */}
                      {resident.status === 'Deceased' && (
                        <div>
                          <p className="text-sm text-gray-500">Date of Death <Skull className="inline h-4 w-4 text-red-500 ml-1" /></p>
                          <p className="font-medium">
                            {resident.died_on
                              ? formatSimpleDate(resident.died_on) 
                              : "Date not recorded"}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Address Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <MapPin className="mr-2 h-5 w-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Complete Address</p>
                        <p className="font-medium">{fullAddress}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Purok</p>
                          <p className="font-medium">{resident.purok || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Barangay</p>
                          <p className="font-medium">{resident.barangaydb || "Not specified"}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Municipality/City</p>
                          <p className="font-medium">{resident.municipalitycity || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Province</p>
                          <p className="font-medium">{resident.provinze || "Not specified"}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Region</p>
                          <p className="font-medium">{resident.regional || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Country</p>
                          <p className="font-medium">{resident.countryph || "Philippines"}</p>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Years in Barangay</p>
                        <p className="font-medium">{resident.years_in_barangay || "Not specified"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Contact Information, Emergency Contact & Socioeconomic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Phone className="mr-2 h-5 w-5" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Contact Number</p>
                        <p className="font-medium">{resident.mobile_number || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">{resident.email || "Not provided"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Emergency Contact */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Phone className="mr-2 h-5 w-5" />
                      Emergency Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-medium">{resident.emname || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Relationship</p>
                        <p className="font-medium">{resident.emrelation || "Not provided"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Contact Number</p>
                        <p className="font-medium">{resident.emcontact || "Not provided"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Socioeconomic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <Briefcase className="mr-2 h-5 w-5" />
                      Socioeconomic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Occupation</p>
                        <p className="font-medium">{resident.occupation || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Monthly Income</p>
                        <p className="font-medium">{resident.monthly_income 
                          ? `₱${resident.monthly_income.toLocaleString()}`
                          : "Not specified"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Remarks - New separate card */}
              {resident.remarks && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Remarks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{resident.remarks}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Government Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Government Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Voter Status</p>
                        <p className="font-medium">{resident.is_voter ? "Registered Voter" : "Non-Voter"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">PhilHealth</p>
                        <p className="font-medium">{resident.has_philhealth ? "Member" : "Non-Member"}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">SSS</p>
                        <p className="font-medium">{resident.has_sss ? "Member" : "Non-Member"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pag-IBIG</p>
                        <p className="font-medium">{resident.has_pagibig ? "Member" : "Non-Member"}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">TIN</p>
                      <p className="font-medium">{resident.has_tin ? "Has TIN" : "No TIN"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Family Relationships - New section */}
              <RelationshipManager 
                residentId={resident.id} 
                residentName={residentFullName}
              />

              {/* Household Information - Moved here after family relationships */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center justify-between">
                    <div className="flex items-center">
                      <Home className="mr-2 h-5 w-5" />
                      Family/Household Information
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleViewHousehold} variant="outline" size="sm">
                        View Household Details
                      </Button>
                      <HouseholdSelector
                        residentId={resident.id}
                        residentName={residentFullName}
                        currentHouseholdId={resident.household_id}
                        onHouseholdUpdate={handleHouseholdUpdate}
                      />
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {household ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Household Name</p>
                          <p className="font-medium">{household.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-medium">{household.status}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Address</p>
                          <p className="font-medium">{household.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Purok</p>
                          <p className="font-medium">{household.purok}</p>
                        </div>
                        {household.headname && (
                          <div>
                            <p className="text-sm text-gray-500">Head of Family</p>
                            <p className="font-medium">{household.headname}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">
                        This resident is not currently assigned to any household.
                      </p>
                      <p className="text-sm text-gray-500">
                        Use the "Assign to Household" button above to add this resident to a household.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Record Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <History className="mr-2 h-5 w-5" />
                    Record Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Created</p>
                        <p className="mt-1">
                          {formatDate(resident.created_at)}
                          {createdByAdmin && formatAdminName(createdByAdmin) && (
                            <span className="text-sm text-muted-foreground block">
                              by {formatAdminName(createdByAdmin)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                        <p className="mt-1">
                          {formatDate(resident.updated_at)}
                          {updatedByAdmin && formatAdminName(updatedByAdmin) && (
                            <span className="text-sm text-muted-foreground block">
                              by {formatAdminName(updatedByAdmin)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="documents">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid gap-6 pb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Identifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResidentIDsManager residentId={resident.id} />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid gap-6 pb-8">
              <ResidentActivityHistory residentId={resident.id} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Full screen photo dialog */}
      {signedPhotoUrl && (
        <Dialog open={showFullPhoto} onOpenChange={setShowFullPhoto}>
          <DialogContent 
            className="sm:max-w-[90vw] md:max-w-[80vw] max-h-[90vh] p-0 bg-transparent border-0 shadow-none flex items-center justify-center"
            hideCloseButton={true}
          >
            <div 
              className="relative w-full h-full flex items-center justify-center bg-black/70 p-2 rounded-lg"
              onClick={() => setShowFullPhoto(false)}
            >
              <img 
                src={signedPhotoUrl} 
                alt={`${resident.first_name} ${resident.last_name}`} 
                className="max-h-[85vh] max-w-full object-contain rounded shadow-xl" 
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

      {/* Edit resident modal */}
      <EditResidentModal 
        isOpen={isEditDialogOpen} 
        onClose={() => setIsEditDialogOpen(false)}
        resident={resident}
      />
    </div>
  );
};

export default ResidentMoreDetailsPage;
