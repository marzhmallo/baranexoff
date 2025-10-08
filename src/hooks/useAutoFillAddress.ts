
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface BarangayData {
  barangayname: string;
  municipality: string;
  province: string;
  region: string;
  country: string;
}

export const useAutoFillAddress = () => {
  const { userProfile, user } = useAuth();
  const [isAutoFillEnabled, setIsAutoFillEnabled] = useState(true); // Default to true
  const [barangayData, setBarangayData] = useState<BarangayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Fetch the user's auto-fill setting
        const { data: settingData, error } = await supabase
          .from('settings')
          .select('value')
          .eq('userid', user.id)
          .eq('key', 'auto_fill_address_from_admin_barangay')
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        // Default to true if no setting exists
        setIsAutoFillEnabled(settingData?.value === 'true' || !settingData);

        // Fetch barangay data if user has brgyid
        if (userProfile?.brgyid) {
          const { data: brgyData } = await supabase
            .from('public_barangays')
            .select('barangayname, municipality, province, region, country')
            .eq('id', userProfile.brgyid)
            .single();

          if (brgyData) {
            setBarangayData({
              barangayname: brgyData.barangayname || '',
              municipality: brgyData.municipality || '',
              province: brgyData.province || '',
              region: brgyData.region || '',
              country: brgyData.country || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching auto-fill settings:', error);
        // Default to enabled on error
        setIsAutoFillEnabled(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [userProfile, user?.id]);

  const getAutoFillData = () => {
    if (!isAutoFillEnabled || !barangayData) {
      return null;
    }
    return barangayData;
  };

  return {
    isAutoFillEnabled,
    barangayData,
    getAutoFillData,
    isLoading
  };
};
