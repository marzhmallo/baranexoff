
import { supabase } from '@/integrations/supabase/client';
import { Household } from '@/lib/types';

// Get all households with head of family names
export const getHouseholds = async () => {
  try {
    const { data, error } = await supabase
      .from('households')
      .select(`
        *,
        head_of_family_resident:residents!households_head_of_family_fkey(
          id,
          first_name,
          middle_name,
          last_name,
          suffix
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    // Transform the data to include the head of family name
    const transformedData = data.map(household => ({
      ...household,
      head_of_family_name: household.head_of_family_resident 
        ? `${household.head_of_family_resident.first_name} ${household.head_of_family_resident.middle_name ? household.head_of_family_resident.middle_name + ' ' : ''}${household.head_of_family_resident.last_name}${household.head_of_family_resident.suffix ? ' ' + household.head_of_family_resident.suffix : ''}`
        : household.headname || null
    }));

    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error('Error fetching households:', error);
    return { success: false, error: error.message, data: [] };
  }
};

// Search residents for head of family selection
export const searchResidents = async (searchTerm: string) => {
  try {
    if (!searchTerm || searchTerm.length < 2) {
      return { success: true, data: [] };
    }

    // Make search case-insensitive and search across all name parts
    const searchQuery = searchTerm.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('residents')
      .select('id, first_name, middle_name, last_name, suffix, purok')
      .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,middle_name.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      throw new Error(error.message);
    }

    // Transform data to include full name and filter results that match any part of the search
    const transformedData = data
      .map(resident => ({
        ...resident,
        full_name: `${resident.first_name} ${resident.middle_name ? resident.middle_name + ' ' : ''}${resident.last_name}${resident.suffix ? ' ' + resident.suffix : ''}`
      }))
      .filter(resident => {
        // Additional client-side filtering to match any word in the search term
        const fullNameLower = resident.full_name.toLowerCase();
        const searchWords = searchQuery.split(' ').filter(word => word.length > 0);
        
        // Check if all search words are found in the full name
        return searchWords.every(word => fullNameLower.includes(word));
      });

    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error('Error searching residents:', error);
    return { success: false, error: error.message, data: [] };
  }
};

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

// Function to sync head of family as household member
const syncHeadOfFamilyAsMember = async (householdId: string, headOfFamilyId: string | null) => {
  try {
    if (!headOfFamilyId) {
      console.log('No head of family to sync for household:', householdId);
      return { success: true };
    }

    console.log('Syncing head of family as member:', { householdId, headOfFamilyId });

    // Update the resident's household_id to match the household
    const { error } = await supabase
      .from('residents')
      .update({ household_id: householdId })
      .eq('id', headOfFamilyId);

    if (error) {
      console.error('Error syncing head of family as member:', error);
      return { success: false, error: error.message };
    }

    console.log('Successfully synced head of family as household member');
    return { success: true };
  } catch (error: any) {
    console.error('Error in syncHeadOfFamilyAsMember:', error);
    return { success: false, error: error.message };
  }
};

// Alias for getHouseholds for consistency with existing code
export const fetchHouseholds = getHouseholds;

// Get a single household by ID
export const getHouseholdById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('households')
      .select(`
        *,
        head_of_family_resident:residents!households_head_of_family_fkey(
          id,
          first_name,
          middle_name,
          last_name,
          suffix
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Transform the data to include the head of family name
    const transformedData = {
      ...data,
      head_of_family_name: data.head_of_family_resident 
        ? `${data.head_of_family_resident.first_name} ${data.head_of_family_resident.middle_name ? data.head_of_family_resident.middle_name + ' ' : ''}${data.head_of_family_resident.last_name}${data.head_of_family_resident.suffix ? ' ' + data.head_of_family_resident.suffix : ''}`
        : data.headname || null
    };

    return { success: true, data: transformedData };
  } catch (error: any) {
    console.error(`Error fetching household with ID ${id}:`, error);
    return { success: false, error: error.message, data: null };
  }
};

// Save household (create or update) with automatic head of family sync
export const saveHousehold = async (household: Partial<Household>) => {
  try {
    // Ensure required fields are present
    if (!household.name || !household.purok || !household.status) {
      throw new Error('Missing required fields for household');
    }

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

    // Create a fallback address from the new address fields
    const fallbackAddress = [
      household.barangayname,
      household.municipality,
      household.province,
      household.purok ? `Purok ${household.purok}` : null
    ].filter(Boolean).join(', ') || 'Address not specified';

    let result;
    
    if (household.id) {
      // Update existing household - make sure to set updated_at to current timestamp
      const { data, error } = await supabase
        .from('households')
        .update({
          name: household.name,
          address: fallbackAddress, // Keep for database compatibility
          barangayname: household.barangayname,
          municipality: household.municipality,
          province: household.province,
          region: household.region,
          country: household.country,
          purok: household.purok,
          head_of_family: household.head_of_family,
          headname: household.headname,
          contact_number: household.contact_number,
          year_established: household.year_established,
          status: household.status,
          monthly_income: household.monthly_income,
          property_type: household.property_type,
          house_type: household.house_type,
          water_source: household.water_source,
          electricity_source: household.electricity_source,
          toilet_type: household.toilet_type,
          garbage_disposal: household.garbage_disposal,
          remarks: household.remarks,
          updated_at: new Date().toISOString(), // Set current timestamp
          updatedby: adminProfileId, // Set updatedby to current admin's profile ID
        })
        .eq('id', household.id)
        .select();
      
      if (error) throw new Error(error.message);
      result = data;

      // Sync head of family as household member after successful update
      if (household.head_of_family) {
        await syncHeadOfFamilyAsMember(household.id, household.head_of_family);
      }
    } else {
      // Create new household with UUID generated on the client side
      const newHouseholdId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('households')
        .insert({
          id: newHouseholdId,
          name: household.name,
          address: fallbackAddress, // Keep for database compatibility
          barangayname: household.barangayname || null,
          municipality: household.municipality || null,
          province: household.province || null,
          region: household.region || null,
          country: household.country || null,
          purok: household.purok,
          status: household.status,
          head_of_family: household.head_of_family || null,
          headname: household.headname || null,
          contact_number: household.contact_number || null,
          year_established: household.year_established || null,
          monthly_income: household.monthly_income || null,
          property_type: household.property_type || null,
          house_type: household.house_type || null,
          water_source: household.water_source || null,
          electricity_source: household.electricity_source || null,
          toilet_type: household.toilet_type || null,
          garbage_disposal: household.garbage_disposal || null,
          remarks: household.remarks || null,
          brgyid: brgyid,
          recordedby: adminProfileId, // Set recordedby to current admin's profile ID
        })
        .select();
      
      if (error) throw new Error(error.message);
      result = data;

      // Sync head of family as household member after successful creation
      if (household.head_of_family) {
        await syncHeadOfFamilyAsMember(newHouseholdId, household.head_of_family);
      }
    }
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error saving household:', error);
    return { success: false, error: error.message };
  }
};

// Function to sync all existing households and ensure heads of family are members
export const syncAllHouseholdsHeadOfFamily = async () => {
  try {
    console.log('Starting sync of all household heads of family...');

    // Get all households that have a head_of_family set
    const { data: households, error: householdError } = await supabase
      .from('households')
      .select('id, head_of_family')
      .not('head_of_family', 'is', null);

    if (householdError) {
      throw new Error(householdError.message);
    }

    if (!households || households.length === 0) {
      console.log('No households with head of family found');
      return { success: true, synced: 0 };
    }

    console.log(`Found ${households.length} households with head of family to sync`);

    let syncedCount = 0;
    const errors = [];

    // Process each household
    for (const household of households) {
      try {
        const syncResult = await syncHeadOfFamilyAsMember(household.id, household.head_of_family);
        if (syncResult.success) {
          syncedCount++;
        } else {
          errors.push(`Household ${household.id}: ${syncResult.error}`);
        }
      } catch (error: any) {
        errors.push(`Household ${household.id}: ${error.message}`);
      }
    }

    console.log(`Sync completed. Synced: ${syncedCount}, Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.error('Sync errors:', errors);
    }

    return { 
      success: true, 
      synced: syncedCount, 
      errors: errors.length > 0 ? errors : undefined 
    };
  } catch (error: any) {
    console.error('Error in syncAllHouseholdsHeadOfFamily:', error);
    return { success: false, error: error.message };
  }
};

// Delete a household
export const deleteHousehold = async (id: string) => {
  try {
    const { error } = await supabase
      .from('households')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting household with ID ${id}:`, error);
    return { success: false, error: error.message };
  }
};
