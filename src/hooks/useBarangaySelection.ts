import { useState, useEffect } from 'react';

interface SelectedBarangay {
  id: string;
  name: string;
  municipality: string;
  province: string;
}

export const useBarangaySelection = () => {
  const [selectedBarangay, setSelectedBarangay] = useState<SelectedBarangay | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selectedBarangay');
    const bannerDismissed = localStorage.getItem('barangayBannerDismissed');
    
    if (saved) {
      try {
        const barangayData = JSON.parse(saved);
        setSelectedBarangay(barangayData);
        setShowBanner(!bannerDismissed);
      } catch (error) {
        console.error('Error parsing saved barangay data:', error);
        localStorage.removeItem('selectedBarangay');
      }
    }
  }, []);

  const clearSelection = () => {
    localStorage.removeItem('selectedBarangay');
    localStorage.removeItem('barangayBannerDismissed');
    setSelectedBarangay(null);
    setShowBanner(false);
  };

  const dismissBanner = () => {
    localStorage.setItem('barangayBannerDismissed', 'true');
    setShowBanner(false);
  };

  const showBannerAgain = () => {
    localStorage.removeItem('barangayBannerDismissed');
    setShowBanner(true);
  };

  return {
    selectedBarangay,
    showBanner,
    clearSelection,
    dismissBanner,
    showBannerAgain
  };
};