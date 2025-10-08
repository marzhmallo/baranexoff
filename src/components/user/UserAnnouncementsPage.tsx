
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useBarangaySelection } from '@/hooks/useBarangaySelection';
import { useIsMobile } from '@/hooks/use-mobile';
import AnnouncementsList from '@/components/announcements/AnnouncementsList';
import { Search, Users, FolderOpen, ArrowUpDown, Megaphone, CheckCircle, Calendar, AlertTriangle, Clock, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LocalizedLoadingScreen from "@/components/ui/LocalizedLoadingScreen";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  audience: string;
  is_pinned: boolean;
  visibility?: string;
  photo_url?: string;
  attachment_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  brgyid: string;
  authorName: string;
}

const UserAnnouncementsPage = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { selectedBarangay } = useBarangaySelection();
  const isMobile = useIsMobile();
  
  // Get barangay ID from user's profile (for logged-in users) or URL params/selected barangay (for public access)
  const barangayId = userProfile?.brgyid || searchParams.get('barangay') || selectedBarangay?.id;
  
  // Debug logging for barangay ID resolution
  console.log('Announcements - barangayId resolution:', {
    fromURL: searchParams.get('barangay'),
    fromSelection: selectedBarangay?.id,
    fromProfile: userProfile?.brgyid,
    final: barangayId,
    userProfileLoaded: !!userProfile
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedVisibility, setSelectedVisibility] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'alphabetical' | 'category'>('newest');
  const [openDropdown, setOpenDropdown] = useState<'category' | 'visibility' | 'sort' | null>(null);

  // Visibility options mapping
  const visibilityOptions = [
    { value: '', label: 'All Announcements' },
    { value: 'internal', label: 'Internal' },
    { value: 'users', label: 'Users' },
    { value: 'public', label: 'Public' }
  ];

  const getVisibilityLabel = (value: string) => {
    const option = visibilityOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Announcements';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element)?.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Fetch announcements from Supabase
  const {
    data: announcements,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['announcements', barangayId],
    queryFn: async () => {
      console.log('Announcements query running with barangayId:', barangayId);
      
      if (!barangayId) {
        console.log('No barangayId available, returning empty array');
        return [];
      }
      
      try {
        // Fetch announcements filtered by barangay
        let query = supabase
          .from('announcements')
          .select('*')
          .eq('brgyid', barangayId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
        
        const { data: announcementsData, error: announcementsError } = await query;
        if (announcementsError) throw announcementsError;

        // Fetch user profiles to get author names
        const userIds = [...new Set(announcementsData.map(a => a.created_by))];
        let userMap = {};
        
        if (userIds.length > 0) {
          try {
            const {
              data: profilesData,
              error: profilesError
            } = await supabase.from('profiles').select('id, firstname, lastname').in('id', userIds);
            
            if (profilesError) {
              console.warn('Profiles query error (using fallback):', profilesError);
              // Create fallback userMap with "Unknown User" for all users
              userMap = userIds.reduce((acc, userId) => {
                acc[userId] = 'Unknown User';
                return acc;
              }, {});
            } else if (profilesData) {
              // Create a map of user IDs to names
              userMap = profilesData.reduce((acc, user) => {
                acc[user.id] = `${user.firstname} ${user.lastname}`;
                return acc;
              }, {});
              
              // Fill in any missing users with "Unknown User"
              userIds.forEach(userId => {
                if (!userMap[userId]) {
                  userMap[userId] = 'Unknown User';
                }
              });
            }
          } catch (profilesQueryError) {
            console.warn('Profiles query failed (using fallback):', profilesQueryError);
            // Create fallback userMap with "Unknown User" for all users
            userMap = userIds.reduce((acc, userId) => {
              acc[userId] = 'Unknown User';
              return acc;
            }, {});
          }
        }

        // Add author names to announcements
        const announcementsWithAuthors = announcementsData.map(announcement => ({
          ...announcement,
          authorName: userMap[announcement.created_by] || 'Unknown User'
        }));
        
        console.log('Announcements fetched successfully:', announcementsWithAuthors.length);
        return announcementsWithAuthors;
      } catch (error) {
        console.error('Error fetching announcements:', error);
        throw error;
      }
    },
    // Always try to fetch when authenticated, let the query handle empty barangayId gracefully  
    enabled: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate stats
  const totalAnnouncements = announcements?.length || 0;
  const activeAnnouncements = announcements?.filter(a => a.visibility === 'public')?.length || 0;
  const emergencyAnnouncements = announcements?.filter(a => a.category.toLowerCase() === 'emergency')?.length || 0;
  const pinnedAnnouncements = announcements?.filter(a => a.is_pinned)?.length || 0;

  // Show loading screen while data is being fetched or user profile is not ready
  if (isLoading || (!userProfile && !searchParams.get('barangay') && !selectedBarangay?.id)) {
    return <div className="relative w-full min-h-screen">
        <LocalizedLoadingScreen isLoading={true} icon={Megaphone} loadingText="Loading announcements" />
      </div>;
  }

  return <div className={`w-full min-h-screen bg-gradient-to-br from-background to-secondary/20 ${isMobile ? 'p-3' : 'p-5 lg:p-6'}`}>
      <div className="max-w-7xl mx-auto">
        <div className={`${isMobile ? 'mb-4' : 'mb-6 lg:mb-8'}`}>
          <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl lg:text-4xl'} font-bold text-foreground mb-2`}>Barangay Announcements</h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>Stay updated with community announcements and news</p>
        </div>

        {/* Collapsible Quick Stats for Mobile, Regular for Desktop */}
        <div className={`bg-card border border-border rounded-xl shadow-lg ${isMobile ? 'p-3 mb-4' : 'p-5 mb-6 lg:p-6 lg:mb-8'}`}>
          <div className={`flex items-center justify-between ${isMobile ? 'mb-3 pb-2' : 'mb-5 pb-3 lg:mb-6 lg:pb-4'} border-b border-border`}>
            <h2 className={`${isMobile ? 'text-lg' : 'text-xl lg:text-2xl'} font-bold text-foreground`}>Quick Stats</h2>
          </div>
          
          {/* Mobile: Compact 2x2 Grid, Tablet: 2x2, Desktop: 1x4 */}
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-3.5 lg:gap-6'}`}>
            <div className={`bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'} text-white border border-blue-400/30`}>
              <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
                <div className={isMobile ? 'mb-1' : ''}>
                  <p className={`text-blue-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Total</p>
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl lg:text-3xl'} font-bold`}>{totalAnnouncements}</p>
                </div>
                {!isMobile && (
                  <div className="p-2 bg-blue-400/20 rounded-lg border border-blue-300/30">
                    <Megaphone className={`text-blue-200 h-7 w-7 lg:h-10 lg:w-10`} />
                  </div>
                )}
              </div>
            </div>
            <div className={`bg-gradient-to-r from-green-500 to-green-600 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'} text-white border border-green-400/30`}>
              <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
                <div className={isMobile ? 'mb-1' : ''}>
                  <p className={`text-green-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Active</p>
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl lg:text-3xl'} font-bold`}>{activeAnnouncements}</p>
                </div>
                {!isMobile && (
                  <div className="p-2 bg-green-400/20 rounded-lg border border-green-300/30">
                    <CheckCircle className={`text-green-200 h-7 w-7 lg:h-10 lg:w-10`} />
                  </div>
                )}
              </div>
            </div>
            <div className={`bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'} text-white border border-yellow-400/30`}>
              <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
                <div className={isMobile ? 'mb-1' : ''}>
                  <p className={`text-yellow-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Pinned</p>
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl lg:text-3xl'} font-bold`}>{pinnedAnnouncements}</p>
                </div>
                {!isMobile && (
                  <div className="p-2 bg-yellow-400/20 rounded-lg border border-yellow-300/30">
                    <Calendar className={`text-yellow-200 h-7 w-7 lg:h-10 lg:w-10`} />
                  </div>
                )}
              </div>
            </div>
            <div className={`bg-gradient-to-r from-red-500 to-red-600 rounded-lg ${isMobile ? 'p-3' : 'p-4 lg:p-6'} text-white border border-red-400/30`}>
              <div className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'}`}>
                <div className={isMobile ? 'mb-1' : ''}>
                  <p className={`text-red-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Emergency</p>
                  <p className={`${isMobile ? 'text-xl' : 'text-2xl lg:text-3xl'} font-bold`}>{emergencyAnnouncements}</p>
                </div>
                {!isMobile && (
                  <div className="p-2 bg-red-400/20 rounded-lg border border-red-300/30">
                    <AlertTriangle className={`text-red-200 h-7 w-7 lg:h-10 lg:w-10`} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-card border border-border rounded-xl shadow-lg ${isMobile ? 'p-3' : 'p-5 lg:p-6'}`}>
          <div className={`flex flex-col ${isMobile ? 'gap-3' : 'lg:flex-row gap-3.5 lg:gap-4'} items-start lg:items-center justify-between ${isMobile ? 'mb-4' : 'mb-5 lg:mb-6'}`}>
            <div className={`${isMobile ? 'w-full' : 'flex-1 max-w-md'}`}>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
                <input 
                  type="text" 
                  placeholder="Search announcements..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className={`w-full ${isMobile ? 'pl-9 pr-3 py-2 text-sm' : 'pl-10 pr-4 py-2.5 lg:py-3'} border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200`} 
                />
              </div>
            </div>
            
            <div className={`flex ${isMobile ? 'w-full justify-between gap-2' : 'flex-wrap gap-2.5 lg:gap-3'}`}>
              {/* Category Filter */}
              <div className="relative dropdown-container">
                <button onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')} className={`bg-secondary hover:bg-secondary/80 text-secondary-foreground ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-2 lg:px-4 text-sm lg:text-base'} rounded-lg cursor-pointer transition-colors duration-200 flex items-center gap-2 border border-border`}>
                  <FolderOpen className={`text-secondary-foreground ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  {isMobile ? 'Cat.' : 'Category'} {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                  <span className="text-muted-foreground">▼</span>
                </button>
                {openDropdown === 'category' && <div className="absolute top-full left-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[150px]">
                    <div className="p-2">
                      {['Emergency', 'Event', 'Health', 'Service', 'News'].map(category => <label key={category} className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer border-b border-border/50 last:border-b-0">
                          <input type="checkbox" className="rounded" checked={selectedCategories.includes(category)} onChange={e => {
                      if (e.target.checked) {
                        setSelectedCategories([...selectedCategories, category]);
                      } else {
                        setSelectedCategories(selectedCategories.filter(c => c !== category));
                      }
                    }} />
                          <span className="text-popover-foreground">{category}</span>
                        </label>)}
                    </div>
                  </div>}
              </div>

              {/* Visibility Filter */}
              <div className="relative dropdown-container">
                <button onClick={() => setOpenDropdown(openDropdown === 'visibility' ? null : 'visibility')} className={`bg-secondary hover:bg-secondary/80 text-secondary-foreground ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-2 lg:px-4 text-sm lg:text-base'} rounded-lg cursor-pointer transition-colors duration-200 flex items-center gap-2 border border-border`}>
                  <Users className={`text-secondary-foreground ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  {isMobile ? 'Vis.' : `Visibility${selectedVisibility ? `: ${getVisibilityLabel(selectedVisibility)}` : ''}`}
                  <span className="text-muted-foreground">▼</span>
                </button>
                {openDropdown === 'visibility' && <div className="absolute top-full left-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[180px]">
                    <div className="p-2">
                      {visibilityOptions.map(visibility => (
                        <button 
                          key={visibility.value}
                          onClick={() => {
                            setSelectedVisibility(visibility.value);
                            setOpenDropdown(null);
                          }}
                          className={`w-full text-left p-2 hover:bg-accent rounded cursor-pointer border-b border-border/50 last:border-b-0 ${selectedVisibility === visibility.value ? 'bg-accent' : ''}`}
                        >
                          <span className="text-popover-foreground">{visibility.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>}
              </div>

              {/* Sort By */}
              <div className="relative dropdown-container">
                <button onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')} className={`bg-secondary hover:bg-secondary/80 text-secondary-foreground ${isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-2 lg:px-4 text-sm lg:text-base'} rounded-lg cursor-pointer transition-colors duration-200 flex items-center gap-2 border border-border`}>
                  <ArrowUpDown className={`text-secondary-foreground ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  {isMobile ? 
                    (sortBy === 'newest' ? 'New' : sortBy === 'oldest' ? 'Old' : sortBy === 'priority' ? 'Pri' : sortBy === 'alphabetical' ? 'A-Z' : 'Cat') :
                    `Sort: ${sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : sortBy === 'priority' ? 'Priority' : sortBy === 'alphabetical' ? 'A-Z' : 'Category'}`
                  }
                  <span className="text-muted-foreground">▼</span>
                </button>
                {openDropdown === 'sort' && <div className="absolute top-full right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-10 min-w-[160px]">
                    <div className="p-2">
                      <button onClick={() => {
                    setSortBy('newest');
                    setOpenDropdown(null);
                  }} className={`w-full text-left p-3 hover:bg-accent text-popover-foreground rounded border-b border-border/50 flex items-center gap-2 ${sortBy === 'newest' ? 'bg-accent' : ''}`}>
                        <ArrowDown className="h-4 w-4" />
                        Newest First
                      </button>
                      <button onClick={() => {
                    setSortBy('oldest');
                    setOpenDropdown(null);
                  }} className={`w-full text-left p-3 hover:bg-accent text-popover-foreground rounded border-b border-border/50 flex items-center gap-2 ${sortBy === 'oldest' ? 'bg-accent' : ''}`}>
                        <ArrowUp className="h-4 w-4" />
                        Oldest First
                      </button>
                      <button onClick={() => {
                    setSortBy('priority');
                    setOpenDropdown(null);
                  }} className={`w-full text-left p-3 hover:bg-accent text-popover-foreground rounded border-b border-border/50 flex items-center gap-2 ${sortBy === 'priority' ? 'bg-accent' : ''}`}>
                        <AlertTriangle className="h-4 w-4" />
                        Priority
                      </button>
                      <button onClick={() => {
                    setSortBy('alphabetical');
                    setOpenDropdown(null);
                  }} className={`w-full text-left p-3 hover:bg-accent text-popover-foreground rounded border-b border-border/50 flex items-center gap-2 ${sortBy === 'alphabetical' ? 'bg-accent' : ''}`}>
                        <Filter className="h-4 w-4" />
                        Alphabetical
                      </button>
                      <button onClick={() => {
                    setSortBy('category');
                    setOpenDropdown(null);
                  }} className={`w-full text-left p-3 hover:bg-accent text-popover-foreground rounded ${sortBy === 'category' ? 'bg-accent' : ''} flex items-center gap-2`}>
                        <FolderOpen className="h-4 w-4" />
                        Category
                      </button>
                    </div>
                  </div>}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6 border border-destructive/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Loading Announcements</AlertTitle>
              <AlertDescription>
                Unable to load announcements. Please check your connection and try again.
                <button 
                  onClick={() => refetch()} 
                  className="ml-2 underline hover:no-underline font-medium"
                >
                  Retry
                </button>
              </AlertDescription>
            </Alert>
          )}
          
          {!barangayId && !error && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Barangay Selected</AlertTitle>
              <AlertDescription>
                Please select a barangay to view announcements.
              </AlertDescription>
            </Alert>
          )}

          <AnnouncementsList announcements={announcements || []} isLoading={isLoading} refetch={refetch} searchQuery={searchQuery} selectedCategories={selectedCategories} selectedVisibility={selectedVisibility} sortBy={sortBy} />
        </div>
      </div>
    </div>;
};

export default UserAnnouncementsPage;
