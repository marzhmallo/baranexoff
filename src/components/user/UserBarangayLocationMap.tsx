import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import L from 'leaflet';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface UserBarangayLocationMapProps {
  barangayName?: string;
}

const UserBarangayLocationMap: React.FC<UserBarangayLocationMapProps> = ({ barangayName }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const { userProfile } = useAuth();

  // Default location (Philippines center)
  const defaultLocation = { lat: 12.8797, lng: 121.7740 };

  // Fetch current location from database
  useEffect(() => {
    if (!userProfile?.brgyid) return;
    fetchCurrentLocation();
  }, [userProfile?.brgyid]);

  // Initialize map only once
  useEffect(() => {
    if (!mapRef.current || mapInitialized) return;

    try {
      const mapCenter = currentLocation || defaultLocation;
      
      // Create the map with read-only settings
      const map = L.map(mapRef.current, {
        center: [mapCenter.lat, mapCenter.lng],
        zoom: currentLocation ? 15 : 6,
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: false,
        keyboard: true,
        dragging: true,
        touchZoom: true
      });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapInitialized(true);

      console.log('Read-only map initialized successfully');
      
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        setMapInitialized(false);
      }
    };
  }, [mapRef.current]); // Only depend on mapRef.current, not currentLocation

  // Update marker when currentLocation changes (but don't reinitialize map)
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInitialized) return;

    updateMarker();
  }, [currentLocation, mapInitialized]);

  const fetchCurrentLocation = async () => {
    if (!userProfile?.brgyid) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('barangays')
        .select('halllat, halllong')
        .eq('id', userProfile.brgyid)
        .single();

      if (error) throw error;

      if (data.halllat && data.halllong) {
        setCurrentLocation({ lat: data.halllat, lng: data.halllong });
      }
    } catch (error) {
      console.error('Error fetching current location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomIcon = () => {
    return L.divIcon({
      html: `
        <div style="
          background-color: #ef4444;
          width: 24px;
          height: 24px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
            position: absolute;
            top: 4px;
            left: 4px;
          "></div>
        </div>
      `,
      className: 'custom-div-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
    });
  };

  const updateMarker = () => {
    if (!mapInstanceRef.current || !currentLocation) return;

    // Remove existing marker if any
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
    }

    // Create new marker at current location (read-only, no dragging)
    const marker = L.marker([currentLocation.lat, currentLocation.lng], { 
      icon: createCustomIcon(),
      draggable: false  // Make marker non-draggable for users
    }).addTo(mapInstanceRef.current);
    
    markerRef.current = marker;

    // Add popup to marker
    marker.bindPopup(`${barangayName || 'Barangay'} Hall Location`);

    // Center map on marker if it's the first time
    if (mapInstanceRef.current.getZoom() === 6) {
      mapInstanceRef.current.setView([currentLocation.lat, currentLocation.lng], 15);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Barangay Hall Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Barangay Hall Location
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Find your way to the barangay hall
        </p>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef} 
          className="w-full h-[400px] rounded-lg border border-border bg-gray-100 relative z-10"
          style={{ minHeight: '400px' }}
        />
        {currentLocation && (
          <div className="mt-3 text-sm text-muted-foreground">
            Location: {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserBarangayLocationMap;