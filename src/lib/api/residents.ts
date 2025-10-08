
import { Resident } from '../types';
import { supabase } from '@/integrations/supabase/client';

export type ResidentStatus = "Permanent" | "Temporary" | "Deceased" | "Relocated";

// Function to get the current user's barangay ID
export const getCurrentUserBarangayId = async (): Promise<string | null> => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    // Get user profile to find brgyid
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('brgyid')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return null;
    }
    
    if (!profileData?.brgyid) {
      // If user profile doesn't have brgyid, try to get it from adminid relationship
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('brgyid')
        .eq('adminid', user.id)
        .maybeSingle();
        
      if (adminError) {
        console.error('Error fetching admin profile:', adminError);
        return null;
      }
      
      return adminProfile?.brgyid || null;
    }
    
    return profileData.brgyid;
  } catch (error) {
    console.error('Error getting current user barangay ID:', error);
    return null;
  }
};

// Function to get the current admin's profile ID
const getCurrentAdminProfileId = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
    
    return profile?.id || null;
  } catch (error) {
    console.error('Error getting current admin profile ID:', error);
    return null;
  }
};

// Function to fetch all residents
export const getResidents = async (): Promise<Resident[]> => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .order('last_name', { ascending: true });

  if (error) throw error;

  // Map database fields to our application model - using snake_case as primary
  return data.map(resident => {
    // Create emergency contact object without default placeholder texts
    const emergencyContact = resident.emname || resident.emrelation || resident.emcontact
      ? {
          name: resident.emname || '',
          relationship: resident.emrelation || '',
          contactNumber: resident.emcontact ? resident.emcontact.toString() : ''
        }
      : undefined;

    return {
      id: resident.id,
      first_name: resident.first_name,
      last_name: resident.last_name,
      middle_name: resident.middle_name || '',
      suffix: resident.suffix || '',
      gender: resident.gender,
      birthdate: resident.birthdate,
      address: resident.address || '',
      mobile_number: resident.mobile_number,
      email: resident.email || '',
      occupation: resident.occupation || '',
      status: resident.status as ResidentStatus,
      civil_status: resident.civil_status,
      monthly_income: resident.monthly_income || 0,
      years_in_barangay: resident.years_in_barangay || 0,
      purok: resident.purok,
      barangaydb: resident.barangaydb,
      municipalitycity: resident.municipalitycity,
      provinze: resident.provinze,
      regional: resident.regional,
      countryph: resident.countryph || '',
      nationality: resident.nationality || '',
      is_voter: resident.is_voter,
      has_philhealth: resident.has_philhealth,
      has_sss: resident.has_sss,
      has_pagibig: resident.has_pagibig,
      has_tin: resident.has_tin,
      classifications: resident.classifications || [],
      remarks: resident.remarks || '',
      photo_url: resident.photo_url || '',
      died_on: resident.died_on || null,
      household_id: resident.household_id || null,
      created_at: resident.created_at || null,
      updated_at: resident.updated_at || null,
      brgyid: resident.brgyid,
      recordedby: resident.recordedby,
      editedby: resident.editedby,
      emname: resident.emname,
      emrelation: resident.emrelation,
      emcontact: resident.emcontact ? resident.emcontact.toString() : undefined,
      emergencyContact,
      // Legacy camelCase for backward compatibility
      firstName: resident.first_name,
      lastName: resident.last_name,
      middleName: resident.middle_name || '',
      birthDate: resident.birthdate,
      contactNumber: resident.mobile_number,
      civilStatus: resident.civil_status,
      yearsInBarangay: resident.years_in_barangay || 0,
      monthlyIncome: resident.monthly_income || 0,
      barangay: resident.barangaydb,
      municipality: resident.municipalitycity,
      province: resident.provinze,
      region: resident.regional,
      country: resident.countryph || '',
      isVoter: resident.is_voter,
      hasPhilhealth: resident.has_philhealth,
      hasSss: resident.has_sss,
      hasPagibig: resident.has_pagibig,
      hasTin: resident.has_tin,
      photoUrl: resident.photo_url || '',
      diedOn: resident.died_on || null,
      householdId: resident.household_id || null
    };
  });
};

// Function to fetch a single resident by ID
export const getResidentById = async (id: string): Promise<Resident | null> => {
  const { data, error } = await supabase
    .from('residents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Create emergency contact without default placeholder texts
  const emergencyContact = data.emname || data.emrelation || data.emcontact
    ? {
        name: data.emname || '',
        relationship: data.emrelation || '',
        contactNumber: data.emcontact ? data.emcontact.toString() : ''
      }
    : undefined;

  // Map database fields to our application model - using snake_case as primary
  return {
    id: data.id,
    first_name: data.first_name,
    last_name: data.last_name,
    middle_name: data.middle_name || '',
    suffix: data.suffix || '',
    gender: data.gender,
    birthdate: data.birthdate,
    address: data.address || '',
    mobile_number: data.mobile_number,
    email: data.email || '',
    occupation: data.occupation || '',
    status: data.status as ResidentStatus,
    civil_status: data.civil_status,
    monthly_income: data.monthly_income || 0,
    years_in_barangay: data.years_in_barangay || 0,
    purok: data.purok,
    barangaydb: data.barangaydb,
    municipalitycity: data.municipalitycity,
    provinze: data.provinze,
    regional: data.regional,
    countryph: data.countryph || '',
    nationality: data.nationality || '',
    is_voter: data.is_voter,
    has_philhealth: data.has_philhealth,
    has_sss: data.has_sss,
    has_pagibig: data.has_pagibig,
    has_tin: data.has_tin,
    classifications: data.classifications || [],
    remarks: data.remarks || '',
    photo_url: data.photo_url || '',
    died_on: data.died_on || null,
    household_id: data.household_id || null,
    created_at: data.created_at || null,
    updated_at: data.updated_at || null,
    brgyid: data.brgyid,
    recordedby: data.recordedby,
    editedby: data.editedby,
    emname: data.emname,
    emrelation: data.emrelation,
    emcontact: data.emcontact ? data.emcontact.toString() : undefined,
    emergencyContact,
    // Legacy camelCase for backward compatibility
    firstName: data.first_name,
    lastName: data.last_name,
    middleName: data.middle_name || '',
    birthDate: data.birthdate,
    contactNumber: data.mobile_number,
    civilStatus: data.civil_status,
    yearsInBarangay: data.years_in_barangay || 0,
    monthlyIncome: data.monthly_income || 0,
    barangay: data.barangaydb,
    municipality: data.municipalitycity,
    province: data.provinze,
    region: data.regional,
    country: data.countryph || '',
    isVoter: data.is_voter,
    hasPhilhealth: data.has_philhealth,
    hasSss: data.has_sss,
    hasPagibig: data.has_pagibig,
    hasTin: data.has_tin,
    photoUrl: data.photo_url || '',
    diedOn: data.died_on || null,
    householdId: data.household_id || null
  };
};

// Function to save (create or update) a resident
export const saveResident = async (residentData: Partial<Resident>) => {
  try {
    console.log("saveResident called with:", residentData);
    
    // Get the brgyid of the currently logged in user
    const brgyid = await getCurrentUserBarangayId();
    console.log("Current user's brgyid:", brgyid);
    
    if (!brgyid) {
      console.error("Failed to get current user's barangay ID");
      return { success: false, error: "User's barangay ID not found" };
    }

    // Get the current admin's profile ID
    const adminProfileId = await getCurrentAdminProfileId();
    console.log("Current admin's profile ID:", adminProfileId);
    
    if (!adminProfileId) {
      console.error("Failed to get current admin's profile ID");
      return { success: false, error: "Admin's profile ID not found" };
    }
    
    // Define the expected database schema fields for Supabase
    interface ResidentDatabaseFields {
      first_name?: string;
      middle_name?: string | null;
      last_name?: string;
      birthdate?: string;
      gender?: string;
      civil_status?: string;
      mobile_number?: string | null;
      email?: string | null;
      address?: string | null;
      purok?: string | null;
      occupation?: string | null;
      monthly_income?: number;
      years_in_barangay?: number;
      is_voter?: boolean;
      has_philhealth?: boolean;
      has_sss?: boolean;
      has_pagibig?: boolean;
      has_tin?: boolean;
      nationality?: string | null;
      remarks?: string | null;
      status?: string;
      classifications?: string[];
      barangaydb?: string;
      municipalitycity?: string;
      regional?: string;
      provinze?: string;
      countryph?: string;
      emname?: string | null;
      emrelation?: string | null;
      emcontact?: number | null;
      suffix?: string | null;
      updated_at?: string;
      died_on?: string | null;
      brgyid?: string | null;
      photo_url?: string | null;
      recordedby?: string | null;
      editedby?: string | null;
    }
    
    // Map from our application model to database model
    const databaseFields: ResidentDatabaseFields = {
      first_name: residentData.firstName?.trim(),
      middle_name: residentData.middleName?.trim() || null,
      last_name: residentData.lastName?.trim(),
      birthdate: residentData.birthDate,
      gender: residentData.gender,
      civil_status: residentData.civilStatus,
      mobile_number: residentData.contactNumber?.trim() || null,
      email: residentData.email?.trim() || null,
      // Always ensure there's a value for the address field
      address: residentData.address?.trim() || "No detailed address provided",
      purok: residentData.purok?.trim() || null,
      occupation: residentData.occupation?.trim() || null,
      monthly_income: residentData.monthlyIncome,
      years_in_barangay: residentData.yearsInBarangay,
      is_voter: residentData.isVoter,
      has_philhealth: residentData.hasPhilhealth,
      has_sss: residentData.hasSss,
      has_pagibig: residentData.hasPagibig,
      has_tin: residentData.hasTin,
      nationality: residentData.nationality?.trim() || null,
      remarks: residentData.remarks?.trim() || null,
      status: residentData.status,
      classifications: residentData.classifications,
      // Address fields with special names - provide required defaults
      barangaydb: residentData.barangay?.trim() || "Unknown",
      municipalitycity: residentData.municipality?.trim() || "Unknown",
      regional: residentData.region?.trim() || "Unknown",
      provinze: residentData.province?.trim() || "Unknown",
      countryph: residentData.country?.trim() || "Philippines",
      
      // Handle emergency contact - if emergencyContact is null, set all fields to null
      // This ensures we properly send null to the database when all fields are empty
      emname: residentData.emergencyContact ? residentData.emergencyContact.name?.trim() || null : null,
      emrelation: residentData.emergencyContact ? residentData.emergencyContact.relationship?.trim() || null : null,
      emcontact: null, // Will be set below if there's valid contact info
      
      // Handle died_on date properly - ensure it's explicitly set to null if not provided
      died_on: residentData.diedOn || null,
      
      // Add the brgyid of the currently logged in user
      brgyid: brgyid,
      
      // Add photo URL
      photo_url: residentData.photoUrl || null,
    };
    
    // Log emergency contact handling
    console.log("Emergency contact from form:", residentData.emergencyContact);
    console.log("Emergency contact fields for database:", {
      emname: databaseFields.emname,
      emrelation: databaseFields.emrelation
    });
    
    // Convert emergency contact number to numeric format if provided
    if (residentData.emergencyContact && residentData.emergencyContact.contactNumber) {
      // Remove non-numeric characters
      const numericValue = residentData.emergencyContact.contactNumber.replace(/\D/g, '');
      databaseFields.emcontact = numericValue.length > 0 ? parseFloat(numericValue) : null;
    } else {
      databaseFields.emcontact = null;
    }

    // For existing residents, update
    if (residentData.id) {
      console.log("Updating existing resident:", residentData.id);
      // Only set updated_at and editedby when updating existing residents
      databaseFields.updated_at = new Date().toISOString();
      databaseFields.editedby = adminProfileId; // Set editedby to current admin's profile ID
      
      // Log the died_on value before sending to Supabase
      console.log("died_on value being sent to Supabase:", databaseFields.died_on);
      console.log("Emergency contact fields being sent to Supabase:", {
        emname: databaseFields.emname,
        emrelation: databaseFields.emrelation,
        emcontact: databaseFields.emcontact
      });
      
      const { data, error } = await supabase
        .from('residents')
        .update(databaseFields)
        .eq('id', residentData.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating resident:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { success: false, error: error.message };
      }

      console.log("Resident updated successfully:", data);
      return { success: true, data };
    } 
    // For new residents, create
    else {
      console.log("Creating new resident");
      // Add required fields for new residents
      const newId = crypto.randomUUID();
      
      // Create a complete database record with required fields
      // For new residents, DO NOT set updated_at or editedby - only created_at and recordedby
      const completeRecord = {
        id: newId,
        created_at: new Date().toISOString(),
        // DO NOT set updated_at for new residents
        first_name: databaseFields.first_name || "Unknown",
        last_name: databaseFields.last_name || "Unknown",
        birthdate: databaseFields.birthdate || new Date().toISOString().split('T')[0],
        gender: databaseFields.gender || "Not Specified",
        civil_status: databaseFields.civil_status || "Single",
        barangaydb: databaseFields.barangaydb || "Unknown",
        municipalitycity: databaseFields.municipalitycity || "Unknown",
        provinze: databaseFields.provinze || "Unknown",
        regional: databaseFields.regional || "Unknown",
        countryph: databaseFields.countryph || "Philippines",
        purok: databaseFields.purok || "Unknown",
        address: databaseFields.address || "No address provided", // Ensure address is never null
        status: databaseFields.status || "Temporary",
        nationality: databaseFields.nationality || "Filipino",  // Add missing required field
        brgyid: brgyid, // Add the barangay ID of the currently logged in user
        photo_url: databaseFields.photo_url || null, // Add photo URL
        recordedby: adminProfileId, // Set recordedby to current admin's profile ID
        // DO NOT set editedby for new residents
        // Include all other fields from databaseFields
        middle_name: databaseFields.middle_name,
        suffix: databaseFields.suffix,
        mobile_number: databaseFields.mobile_number,
        email: databaseFields.email,
        occupation: databaseFields.occupation,
        monthly_income: databaseFields.monthly_income,
        years_in_barangay: databaseFields.years_in_barangay,
        is_voter: databaseFields.is_voter || false,
        has_philhealth: databaseFields.has_philhealth || false,
        has_sss: databaseFields.has_sss || false,
        has_pagibig: databaseFields.has_pagibig || false,
        has_tin: databaseFields.has_tin || false,
        classifications: databaseFields.classifications || [],
        remarks: databaseFields.remarks,
        emname: databaseFields.emname,
        emrelation: databaseFields.emrelation,
        emcontact: databaseFields.emcontact,
        died_on: databaseFields.died_on,
      };
      
      console.log("Creating resident with data:", completeRecord);
      
      const { data, error } = await supabase
        .from('residents')
        .insert(completeRecord)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating resident:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return { success: false, error: error.message };
      }

      console.log("Resident created successfully:", data);
      return { success: true, data };
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

// Function to create a resident (legacy function, use saveResident instead)
export const createResident = async (residentData: any): Promise<{ success: boolean; error: any }> => {
  try {
    console.log("Legacy createResident function called, consider using saveResident instead");
    const { error } = await supabase
      .from('residents')
      .insert(residentData);
    
    if (error) {
      console.error("Error creating resident:", error);
      return { success: false, error };
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Exception creating resident:", error);
    return { success: false, error };
  }
};

// Function to delete a resident by ID
export const deleteResident = async (id: string): Promise<{success: boolean, error?: string}> => {
  try {
    console.log("Deleting resident with ID:", id);
    
    const { error } = await supabase
      .from('residents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting resident:', error);
      return { success: false, error: error.message };
    }

    console.log("Resident deleted successfully");
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error deleting resident:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
