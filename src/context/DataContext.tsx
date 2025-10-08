
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface Resident {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  gender: string;
  birthdate: string;
  civil_status: string;
  occupation?: string;
  address: string;
  purok: string;
  email?: string;
  mobile_number?: string;
  nationality: string;
  status: string;
  brgyid: string;
  household_id?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

interface Household {
  id: string;
  name: string;
  address: string;
  purok: string;
  head_of_family?: string;
  headname?: string;
  status: string;
  brgyid: string;
  contact_number?: string;
  monthly_income?: string;
  year_established?: number;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string;
  event_type: string;
  target_audience: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  created_by: string;
}

interface OfficialWithPosition {
  id: string;
  name: string;
  photo_url: string;
  position: string;
  term_start: string;
  term_end: string;
}

interface DataContextType {
  residents: Resident[];
  households: Household[];
  upcomingEvents: Event[];
  latestAnnouncements: Announcement[];
  barangayOfficials: OfficialWithPosition[];
  barangayName: string;
  loading: boolean;
  refetchData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [latestAnnouncements, setLatestAnnouncements] = useState<Announcement[]>([]);
  const [barangayOfficials, setBarangayOfficials] = useState<OfficialWithPosition[]>([]);
  const [barangayName, setBarangayName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const fetchData = async (silent = false) => {
    if (!userProfile?.brgyid) {
      return;
    }

    if (!silent) setLoading(true);
    
    try {
      // Fetch residents
      const { data: residentsData, error: residentsError } = await supabase
        .from('residents')
        .select('*')
        .eq('brgyid', userProfile.brgyid)
        .order('created_at', { ascending: false });

      if (residentsError) {
        console.error('Error fetching residents:', residentsError);
      } else {
        setResidents(residentsData || []);
      }

      // Fetch households
      const { data: householdsData, error: householdsError } = await supabase
        .from('households')
        .select('*')
        .eq('brgyid', userProfile.brgyid)
        .order('created_at', { ascending: false });

      if (householdsError) {
        console.error('Error fetching households:', householdsError);
      } else {
        setHouseholds(householdsData || []);
      }

      // Fetch barangay name
      const { data: barangayData, error: barangayError } = await supabase
        .from('public_barangays')
        .select('barangayname')
        .eq('id', userProfile.brgyid)
        .single();
      
      if (barangayData && !barangayError) {
        setBarangayName(barangayData.barangayname);
      }

      // Fetch upcoming events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('brgyid', userProfile.brgyid)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(3);
      
      if (eventsData && !eventsError) {
        setUpcomingEvents(eventsData);
      }

      // Fetch latest announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('*')
        .eq('brgyid', userProfile.brgyid)
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (announcementsData && !announcementsError) {
        setLatestAnnouncements(announcementsData);
      }

      // Fetch barangay officials with positions
      const { data: officialsData, error: officialsError } = await supabase
        .from('officials')
        .select(`
          id,
          name,
          photo_url,
          officialPositions:official_positions(*)
        `)
        .eq('brgyid', userProfile.brgyid)
        .limit(5);
      
      if (officialsData && !officialsError) {
        // Transform the data to match our interface - only include officials with current positions
        const currentDate = new Date();
        const officialsWithPositions: OfficialWithPosition[] = officialsData
          .filter(official => {
            // Must have positions
            if (!official.officialPositions || official.officialPositions.length === 0) {
              return false;
            }
            
            // Find current position (term_end is in the future)
            const currentPosition = official.officialPositions.find(pos => 
              pos.term_end && new Date(pos.term_end) > currentDate
            );
            
            return currentPosition !== undefined;
          })
          .map(official => {
            // Get the current position (term_end in the future)
            const currentPosition = official.officialPositions.find(pos => 
              pos.term_end && new Date(pos.term_end) > currentDate
            );
            
            return {
              id: official.id,
              name: official.name,
              photo_url: official.photo_url,
              position: currentPosition?.position || 'Official',
              term_start: currentPosition?.term_start || '',
              term_end: currentPosition?.term_end || ''
            };
          });
        
        setBarangayOfficials(officialsWithPositions);
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.brgyid) {
      try {
        const cachedRaw = localStorage.getItem(`preloadedDashboardContext_${userProfile.brgyid}`);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          setResidents(cached.residents || []);
          setHouseholds(cached.households || []);
          setUpcomingEvents(cached.upcomingEvents || []);
          setLatestAnnouncements(cached.latestAnnouncements || []);
          setBarangayOfficials(cached.barangayOfficials || []);
          setBarangayName(cached.barangayName || '');
          // Silent refresh in background without toggling loading
          fetchData(true);
        } else {
          fetchData();
        }
      } catch {
        fetchData();
      }
      
      // Set up real-time subscriptions for instant updates
      const residentsChannel = supabase
        .channel('residents-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'residents',
            filter: `brgyid=eq.${userProfile.brgyid}`
          },
          (payload) => {
            console.log('Real-time resident change:', payload);
            
            if (payload.eventType === 'INSERT') {
              setResidents(prev => [payload.new as Resident, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setResidents(prev => 
                prev.map(resident => 
                  resident.id === payload.new.id ? payload.new as Resident : resident
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setResidents(prev => 
                prev.filter(resident => resident.id !== payload.old.id)
              );
            }
            
            // Clear dashboard cache when residents change
            const cacheKey = `dashboardData_${userProfile.brgyid}`;
            const timestampKey = `dashboardData_timestamp_${userProfile.brgyid}`;
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
          }
        )
        .subscribe();

      const householdsChannel = supabase
        .channel('households-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'households',
            filter: `brgyid=eq.${userProfile.brgyid}`
          },
          (payload) => {
            console.log('Real-time household change:', payload);
            
            if (payload.eventType === 'INSERT') {
              setHouseholds(prev => [payload.new as Household, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setHouseholds(prev => 
                prev.map(household => 
                  household.id === payload.new.id ? payload.new as Household : household
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setHouseholds(prev => 
                prev.filter(household => household.id !== payload.old.id)
              );
            }
            
            // Clear dashboard cache when households change
            const cacheKey = `dashboardData_${userProfile.brgyid}`;
            const timestampKey = `dashboardData_timestamp_${userProfile.brgyid}`;
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(timestampKey);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(residentsChannel);
        supabase.removeChannel(householdsChannel);
      };
    }
  }, [userProfile?.brgyid]);

  const value: DataContextType = {
    residents,
    households,
    upcomingEvents,
    latestAnnouncements,
    barangayOfficials,
    barangayName,
    loading,
    refetchData: fetchData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
