import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import OfficialCard from '@/components/officials/OfficialCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RefreshCw, LayoutGrid, Users, Search, Calendar } from 'lucide-react';
import { Official, OfficialPosition } from '@/lib/types';
import { OrganizationalChart } from '@/components/officials/OrganizationalChart';
import { useIsMobile } from '@/hooks/use-mobile';

const UserOfficialsPage = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('current');
  const [activeSKTab, setActiveSKTab] = useState('current');
  const [viewMode, setViewMode] = useState<'cards' | 'organizational'>('cards');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [termStartYear, setTermStartYear] = useState('');
  const [termEndYear, setTermEndYear] = useState('');
  const isMobile = useIsMobile();

  // Get barangay ID from URL params (for public access) or user profile (for authenticated users)
  const barangayId = searchParams.get('barangay') || userProfile?.brgyid;

  // Fetch officials data from Supabase with positions and ranks with real-time updates
  const {
    data: officialsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['officials-with-positions', barangayId],
    queryFn: async () => {
      if (!barangayId) {
        return [];
      }

      // First, fetch all officials
      const {
        data: officials,
        error: officialsError
      } = await supabase.from('officials').select('*').eq('brgyid', barangayId);
      if (officialsError) throw officialsError;

      // Then fetch all positions with position_no
      const {
        data: positions,
        error: positionsError
      } = await supabase.from('official_positions').select('*').order('term_start', {
        ascending: false
      });
      if (positionsError) throw positionsError;

      // Fetch official ranks
      const {
        data: officialRanks,
        error: ranksError
      } = await supabase
        .from('officialranks')
        .select('*')
        .not('officialid', 'is', null);
      if (ranksError) throw ranksError;

      // Group positions by official
      const officialsWithPositions: Official[] = officials.map(official => {
        // Get all positions for this official
        const officialPositions = positions.filter(position => position.official_id === official.id);

        // Use the most recent position (latest term_start date)
        let latestPosition = officialPositions.length > 0 ? officialPositions[0] : null;
        if (officialPositions.length > 1) {
          latestPosition = officialPositions.reduce((latest, current) => {
            // If either position has no term_end, compare carefully
            if (!latest.term_end) return latest; // Latest has no end date, keep it
            if (!current.term_end) return current; // Current has no end date, it's ongoing

            // Otherwise compare end dates
            return new Date(current.term_end) > new Date(latest.term_end) ? current : latest;
          }, officialPositions[0]);
        }

        // Find rank information for this official
        const officialRank = officialRanks.find(rank => rank.officialid === official.id);

        return {
          ...official,
          // Keep is_sk as array to match the Official interface  
          is_sk: (official as any).is_sk || [],
          // Update with position data if we have it
          position: latestPosition?.position || '',
          term_start: latestPosition?.term_start || official.term_start,
          term_end: latestPosition?.term_end || official.term_end,
          // Add rank information from officialranks table as string
          rank_number: officialRank?.rankno || null,
          rank_label: officialRank?.ranklabel || null,
          // Store the positions for potential use in components
          officialPositions: officialPositions,
          // Add position_no from the current position for sorting
          position_no: latestPosition?.position_no || null
        };
      });
      return officialsWithPositions;
    },
    enabled: !!barangayId
  });

  // Get barangay info for all users
  const { data: barangayInfo } = useQuery({
    queryKey: ['barangay-info', barangayId],
    queryFn: async () => {
      if (!barangayId) return null;
      
      const { data, error } = await supabase
        .from('barangays')
        .select('barangayname, municipality, province')
        .eq('id', barangayId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!barangayId
  });

  // Set up real-time subscription for officials and ranks
  useEffect(() => {
    const channel = supabase
      .channel('officials-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'officialranks'
        },
        () => {
          // Invalidate officials query when ranks change
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'officials'
        },
        () => {
          // Invalidate officials query when officials change
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'official_positions'
        },
        () => {
          // Invalidate officials query when positions change
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Filter and sort officials based on the active tab, search query, and term dates
  const allFilteredOfficials = officialsData ? officialsData.filter(official => {
    const now = new Date();
    
    // Get all positions for this official
    const allPositions = official.officialPositions || [];
    const skPositions = allPositions.filter(pos => pos.sk === true);
    const nonSkPositions = allPositions.filter(pos => pos.sk === false || pos.sk === null);
    
    // Check current positions (term hasn't ended)
    const hasCurrentSkPosition = skPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    const hasCurrentNonSkPosition = nonSkPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    
    // Check if has any SK positions at all (past or present)
    const hasAnySkPosition = skPositions.length > 0;
    
    // Check if had SK positions that ended
    const hadSkPositionThatEnded = skPositions.some(pos => pos.term_end && new Date(pos.term_end) < now);
    
    // Tab-based filtering
    let passesTabFilter = false;
    if (activeTab === 'current') {
      // Show officials with current non-SK positions, excluding those with current SK positions
      passesTabFilter = hasCurrentNonSkPosition && !hasCurrentSkPosition;
    } else if (activeTab === 'sk') {
      if (activeSKTab === 'current') {
        // Show officials with current SK positions
        passesTabFilter = hasCurrentSkPosition;
      } else if (activeSKTab === 'previous') {
        // Show officials who had SK positions that ended and either:
        // 1. Have no current positions at all, OR
        // 2. Have current non-SK positions (but not current SK positions)
        passesTabFilter = hadSkPositionThatEnded && !hasCurrentSkPosition;
      }
      if (!passesTabFilter) passesTabFilter = hasAnySkPosition;
    } else if (activeTab === 'previous') {
      // Show officials who had non-SK positions that ended and no current positions
      const hadNonSkPositionThatEnded = nonSkPositions.some(pos => pos.term_end && new Date(pos.term_end) < now);
      passesTabFilter = hadNonSkPositionThatEnded && !hasCurrentSkPosition && !hasCurrentNonSkPosition;
    }

    if (!passesTabFilter) return false;

    // Search query filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = (official.name || '').toLowerCase().includes(query);
      const positionMatch = allPositions.some(pos => 
        (pos.position || '').toLowerCase().includes(query) ||
        (pos.committee || '').toLowerCase().includes(query)
      );
      
      if (!nameMatch && !positionMatch) return false;
    }

    // Term date filtering
    if (termStartYear || termEndYear) {
      const hasMatchingTerm = allPositions.some(pos => {
        if (!pos.term_start) return false;
        
        const termStart = new Date(pos.term_start);
        const termEnd = pos.term_end ? new Date(pos.term_end) : new Date();
        
        let passesTermFilter = true;
        
        if (termStartYear) {
          const startYear = parseInt(termStartYear);
          if (isNaN(startYear) || termStart.getFullYear() < startYear) {
            passesTermFilter = false;
          }
        }
        
        if (termEndYear && passesTermFilter) {
          const endYear = parseInt(termEndYear);
          if (isNaN(endYear) || termEnd.getFullYear() > endYear) {
            passesTermFilter = false;
          }
        }
        
        return passesTermFilter;
      });
      
      if (!hasMatchingTerm) return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort by position_no if available, otherwise put at the end
    const aPos = a.position_no || 999999; // Put unranked officials at the end
    const bPos = b.position_no || 999999;
    return aPos - bPos;
  }) : [];

  // Use all filtered officials directly without pagination
  const filteredOfficials = allFilteredOfficials;


  // Count for each category using the same logic as filtering
  const currentCount = officialsData ? officialsData.filter(o => {
    const now = new Date();
    const allPositions = o.officialPositions || [];
    const skPositions = allPositions.filter(pos => pos.sk === true);
    const nonSkPositions = allPositions.filter(pos => pos.sk === false || pos.sk === null);
    const hasCurrentSkPosition = skPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    const hasCurrentNonSkPosition = nonSkPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    return hasCurrentNonSkPosition && !hasCurrentSkPosition;
  }).length : 0;
  
  const skCurrentCount = officialsData ? officialsData.filter(o => {
    const now = new Date();
    const allPositions = o.officialPositions || [];
    const skPositions = allPositions.filter(pos => pos.sk === true);
    const hasCurrentSkPosition = skPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    return hasCurrentSkPosition;
  }).length : 0;
  
  const skPreviousCount = officialsData ? officialsData.filter(o => {
    const now = new Date();
    const allPositions = o.officialPositions || [];
    const skPositions = allPositions.filter(pos => pos.sk === true);
    const hasCurrentSkPosition = skPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    const hadSkPositionThatEnded = skPositions.some(pos => pos.term_end && new Date(pos.term_end) < now);
    return hadSkPositionThatEnded && !hasCurrentSkPosition;
  }).length : 0;
  
  const skCount = skCurrentCount + skPreviousCount;
  
  const previousCount = officialsData ? officialsData.filter(o => {
    const now = new Date();
    const allPositions = o.officialPositions || [];
    const nonSkPositions = allPositions.filter(pos => pos.sk === false || pos.sk === null);
    const skPositions = allPositions.filter(pos => pos.sk === true);
    const hasCurrentSkPosition = skPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    const hasCurrentNonSkPosition = nonSkPositions.some(pos => !pos.term_end || new Date(pos.term_end) > now);
    const hadNonSkPositionThatEnded = nonSkPositions.some(pos => pos.term_end && new Date(pos.term_end) < now);
    return hadNonSkPositionThatEnded && !hasCurrentSkPosition && !hasCurrentNonSkPosition;
  }).length : 0;

  const handleRefreshTerms = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'p-4' : 'p-5 lg:p-6'}`}>
      {/* Header with title, subtitle, and action buttons */}
      <div className={`${isMobile ? 'flex-col space-y-4' : 'flex justify-between items-start'} mb-6 lg:mb-8`}>
        <div>
          <div className="flex items-center gap-2 mb-1 mx-0">
            <Button variant="ghost" className="p-0 hover:bg-transparent">
              
            </Button>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-2xl md:text-3xl lg:text-4xl'} font-bold text-foreground mx-0`}>
              {barangayInfo 
                ? `Officials of ${barangayInfo.barangayname}, ${barangayInfo.municipality}`
                : 'Barangay Officials'
              }
            </h1>
          </div>
          <p className="text-sm md:text-base text-muted-foreground mx-[10px]">Meet the elected officials serving our barangay</p>
        </div>
        <div className={`flex ${isMobile ? 'flex-col w-full space-y-2' : 'gap-2 lg:gap-3'}`}>
          <div className={`flex gap-1 bg-muted p-1 md:p-1.5 rounded-lg ${isMobile ? 'w-full' : ''}`}>
            <Button
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 ${isMobile ? 'flex-1' : ''}`}
            >
              <LayoutGrid className="h-4 w-4" />
              {!isMobile && 'Cards'}
            </Button>
            <Button
              variant={viewMode === 'organizational' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('organizational')}
              className={`flex items-center gap-2 ${isMobile ? 'flex-1' : ''}`}
            >
              <Users className="h-4 w-4" />
              {!isMobile && 'Organization'}
            </Button>
          </div>
          <Button 
            variant="outline" 
            className={`border-border text-foreground hover:bg-accent ${isMobile ? 'w-full' : ''}`} 
            onClick={handleRefreshTerms} 
            disabled={isRefreshing}
            size={isMobile ? 'sm' : 'default'}
          >
            <RefreshCw className={`h-4 w-4 ${isMobile ? '' : 'mr-2'} ${isRefreshing ? 'animate-spin' : ''}`} /> 
            {!isMobile && (isRefreshing ? 'Refreshing...' : 'Refresh Terms')}
          </Button>
        </div>
      </div>

      {/* Search and Filter Section - only show in cards view */}
      {viewMode === 'cards' && (
        <div className={`bg-secondary/50 rounded-lg ${isMobile ? 'p-3' : 'p-3.5 lg:p-4'} mb-4 lg:mb-6 border border-border/50`}>
          <div className={`grid grid-cols-1 ${isMobile ? 'gap-3' : 'md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4'}`}>
            {/* Search Bar */}
            <div className={isMobile ? 'col-span-1' : 'lg:col-span-2'}>
              <label className="block text-sm font-medium text-foreground mb-2">
                Search Officials
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search by name, position, or committee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Term Start Year */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Term Start Year
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="number"
                  placeholder="e.g., 2022"
                  value={termStartYear}
                  onChange={(e) => setTermStartYear(e.target.value)}
                  className="pl-10"
                  min="1900"
                  max="2100"
                />
              </div>
            </div>

            {/* Term End Year */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Term End Year
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="number"
                  placeholder="e.g., 2025"
                  value={termEndYear}
                  onChange={(e) => setTermEndYear(e.target.value)}
                  className="pl-10"
                  min="1900"
                  max="2100"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || termStartYear || termEndYear) && (
            <div className={`${isMobile ? 'mt-3' : 'mt-4'} flex justify-end`}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setTermStartYear('');
                  setTermEndYear('');
                }}
                className={isMobile ? 'w-full' : ''}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main tabbed navigation - only show in cards view */}
      {viewMode === 'cards' && (
        <div className={`mx-auto ${isMobile ? 'max-w-full' : 'max-w-2xl lg:max-w-3xl'} mb-4 lg:mb-6 bg-card rounded-full p-1 border`}>
          <div className="flex justify-center">
            <div className={`flex-1 ${isMobile ? 'text-xs px-2' : 'max-w-[33%] px-3 lg:px-4 text-sm lg:text-base'} text-center py-2 rounded-full cursor-pointer transition-all ${activeTab === 'current' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('current')}>
              {isMobile ? `Current (${currentCount})` : `Current Officials (${currentCount})`}
            </div>
            <div className={`flex-1 ${isMobile ? 'text-xs px-2' : 'max-w-[33%] px-3 lg:px-4 text-sm lg:text-base'} text-center py-2 rounded-full cursor-pointer transition-all ${activeTab === 'sk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('sk')}>
              {isMobile ? `SK (${skCount})` : `SK Officials (${skCount})`}
            </div>
            <div className={`flex-1 ${isMobile ? 'text-xs px-2' : 'max-w-[33%] px-3 lg:px-4 text-sm lg:text-base'} text-center py-2 rounded-full cursor-pointer transition-all ${activeTab === 'previous' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('previous')}>
              {isMobile ? `Previous (${previousCount})` : `Previous Officials (${previousCount})`}
            </div>
          </div>
        </div>
      )}

      {/* SK Tab sub-navigation - only show in cards view */}
      {viewMode === 'cards' && activeTab === 'sk' && (
        <div className={`mx-auto ${isMobile ? 'max-w-full' : 'max-w-lg lg:max-w-xl'} mb-4 lg:mb-6 bg-card rounded-full p-1 border`}>
          <div className="flex justify-center">
            <div className={`flex-1 ${isMobile ? 'text-xs px-2' : 'max-w-[50%] px-3 lg:px-4 text-sm lg:text-base'} text-center py-2 rounded-full cursor-pointer transition-all ${activeSKTab === 'current' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveSKTab('current')}>
              {isMobile ? `Current (${skCurrentCount})` : `Current SK (${skCurrentCount})`}
            </div>
            <div className={`flex-1 ${isMobile ? 'text-xs px-2' : 'max-w-[50%] px-3 lg:px-4 text-sm lg:text-base'} text-center py-2 rounded-full cursor-pointer transition-all ${activeSKTab === 'previous' ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveSKTab('previous')}>
              {isMobile ? `Previous (${skPreviousCount})` : `Previous SK (${skPreviousCount})`}
            </div>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'organizational' ? (
        <div>
          <OrganizationalChart officials={officialsData || []} isLoading={isLoading} error={error} isMobile={isMobile} />
        </div>
      ) : (
        <div>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 lg:gap-8'}`}>
            {isLoading ?
              // Show skeleton loaders while loading
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg overflow-hidden border h-[700px]">
                  <Skeleton className="w-full h-80 bg-muted" />
                  <div className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2 bg-muted" />
                    <Skeleton className="h-4 w-1/2 mb-4 bg-muted" />
                    <Skeleton className="h-20 w-full mb-4 bg-muted" />
                    <Skeleton className="h-4 w-full mb-2 bg-muted" />
                    <Skeleton className="h-4 w-full mb-4 bg-muted" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-1/3 bg-muted" />
                      <Skeleton className="h-8 w-20 bg-muted" />
                    </div>
                  </div>
                </div>
              )) : error ? (
                <div className="col-span-full p-6 text-destructive bg-card rounded-lg border">
                  Error loading officials: {error.message}
                </div>
              ) : filteredOfficials.length === 0 ? (
                <div className={`col-span-full p-6 text-center text-muted-foreground bg-card rounded-lg border ${isMobile ? '' : 'mx-[240px]'}`}>
                  No {activeTab === 'current' ? 'current' : activeTab === 'sk' ? activeSKTab === 'current' ? 'current SK' : 'previous SK' : 'previous'} officials found.
                </div>
              ) : filteredOfficials.map(official => (
                <OfficialCard 
                  key={official.id}
                  official={official} 
                  currentTab={activeTab}
                  currentSKTab={activeSKTab}
                  isMobile={isMobile}
                />
              ))
            }
          </div>
        </div>
      )}

    </div>
  );
};

export default UserOfficialsPage;
