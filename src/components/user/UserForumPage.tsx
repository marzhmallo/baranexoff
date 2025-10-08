
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageSquare, Eye, Users, Search, Filter, Megaphone, ShieldHalf, HeartPulse, Lightbulb, HelpCircle, TriangleAlert, Construction, ChevronRight, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { useBarangaySelection } from '@/hooks/useBarangaySelection';
import CreateForumDialog from '@/components/forum/CreateForumDialog';
import ThreadsView from '@/components/forum/ThreadsView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface Forum {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_public: boolean;
  brgyid: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  viewcount: number;
}

// Icon mapping for different forum categories
const getForumIcon = (category: string) => {
  switch (category) {
    case 'Announcements':
      return {
        icon: Megaphone,
        iconColor: "text-blue-400",
        bgColor: "bg-blue-500/20"
      };
    case 'Peace & Order':
      return {
        icon: ShieldHalf,
        iconColor: "text-green-400",
        bgColor: "bg-green-500/20"
      };
    case 'Health & Wellness':
      return {
        icon: HeartPulse,
        iconColor: "text-red-400",
        bgColor: "bg-red-500/20"
      };
    case 'Suggestions & Feedback':
      return {
        icon: Lightbulb,
        iconColor: "text-yellow-400",
        bgColor: "bg-yellow-500/20"
      };
    case 'General Questions':
      return {
        icon: HelpCircle,
        iconColor: "text-purple-400",
        bgColor: "bg-purple-500/20"
      };
    case 'Emergency Preparedness':
      return {
        icon: TriangleAlert,
        iconColor: "text-orange-400",
        bgColor: "bg-orange-500/20"
      };
    case 'Public Works & Infrastructure':
      return {
        icon: Construction,
        iconColor: "text-indigo-400",
        bgColor: "bg-indigo-500/20"
      };
    default:
      // Default forum appearance
      return {
        icon: HelpCircle,
        iconColor: "text-gray-400",
        bgColor: "bg-gray-500/20"
      };
  }
};

const UserForumPage = () => {
  console.log('UserForumPage component loaded - updated version');
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { selectedBarangay } = useBarangaySelection();
  
  // Get barangay ID from URL params (for public access) or selected barangay (from localStorage)
  const barangayId = searchParams.get('barangay') || selectedBarangay?.id;
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [forumStats, setForumStats] = useState<{[key: string]: {threads: number, posts: number}}>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'all' | 'public' | 'private' | 'category'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const fetchForums = async () => {
    try {
      const { data, error } = await supabase
        .from('forums')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching forums:', error);
      toast({
        title: "Error",
        description: "Failed to load forums: " + error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  const { data: forums, isLoading, error, refetch } = useQuery({
    queryKey: ['forums'],
    queryFn: fetchForums,
    staleTime: 0,
    gcTime: 0,
    enabled: !!userProfile
  });

  console.log('Forum loading state:', { isLoading, forumsCount: forums?.length });

  // Fetch actual thread and comment counts for each forum
  const getForumStats = async (forumId: string) => {
    try {
      // Get thread count
      const { count: threadCount, error: threadError } = await supabase
        .from('threads')
        .select('*', { count: 'exact', head: true })
        .eq('forum_id', forumId);

      if (threadError) throw threadError;

      // Get total comment count for all threads in this forum
      const { data: threads, error: threadsError } = await supabase
        .from('threads')
        .select('id')
        .eq('forum_id', forumId);

      if (threadsError) throw threadsError;

      let totalComments = 0;
      if (threads && threads.length > 0) {
        const threadIds = threads.map(t => t.id);
        const { count: commentCount, error: commentError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .in('thread_id', threadIds);

        if (commentError) throw commentError;
        totalComments = commentCount || 0;
      }

      return {
        threads: threadCount || 0,
        posts: totalComments
      };
    } catch (error) {
      console.error('Error fetching forum stats:', error);
      return {
        threads: 0,
        posts: 0
      };
    }
  };

  useEffect(() => {
    const fetchAllStats = async () => {
      if (!forums || forums.length === 0) return;
      
      setStatsLoading(true);
      const stats: {[key: string]: {threads: number, posts: number}} = {};
      
      for (const forum of forums) {
        stats[forum.id] = await getForumStats(forum.id);
      }
      
      setForumStats(stats);
      setStatsLoading(false);
    };

    fetchAllStats();
  }, [forums]);

  // Filter and search forums
  const filteredForums = forums?.filter(forum => {
    // Search filter
    const matchesSearch = forum.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         forum.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         forum.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Sort/visibility filter
    let matchesSort = true;
    if (sortBy === 'public') {
      matchesSort = forum.is_public;
    } else if (sortBy === 'private') {
      matchesSort = !forum.is_public;
    }
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || forum.category === categoryFilter;
    
    return matchesSearch && matchesSort && matchesCategory;
  }) || [];

  const categoryOptions = [
    'Announcements',
    'Peace & Order', 
    'Health & Wellness',
    'Suggestions & Feedback',
    'General Questions',
    'Emergency Preparedness',
    'Public Works & Infrastructure'
  ];

  const handleForumCreated = () => {
    setShowCreateDialog(false);
    refetch();
    toast({
      title: "Forum Created",
      description: "Your forum has been created successfully."
    });
  };

  const handleForumSelected = (forum: Forum) => {
    setSelectedForum(forum);
  };

  const handleBackToForums = () => {
    setSelectedForum(null);
    refetch(); // Refetch forums in case any were deleted
  };

  const handleForumDeleted = (forumId: string) => {
    setSelectedForum(null);
    refetch(); // Refetch the forum list after deletion
  };

  const isAdmin = userProfile?.role === 'admin';
  
  // Combined loading state - wait for both forums and stats to load
  const isPageLoading = isLoading || statsLoading;

  if (selectedForum) {
    return (
      <ThreadsView 
        forum={selectedForum} 
        onBack={handleBackToForums}
        onDeleteForum={handleForumDeleted}
      />
    );
  }

  const renderForumCard = (forum: Forum) => {
    const stats = forumStats[forum.id] || { threads: 0, posts: 0 };
    const iconConfig = getForumIcon(forum.category);
    const IconComponent = iconConfig.icon;
    
    const handleClick = () => {
      handleForumSelected(forum);
    };

    return (
      <div 
        key={forum.id}
        className="bg-card border border-border rounded-xl p-3 sm:p-4 md:p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer group"
        onClick={handleClick}
      >
        <div className="flex items-center space-x-3 sm:space-x-4 md:space-x-6">
          <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 ${iconConfig.bgColor} rounded-full flex items-center justify-center`}>
            <IconComponent className={`${iconConfig.iconColor} h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8`} />
          </div>
          <div className="flex-grow min-w-0">
            <h2 className="font-bold text-base sm:text-lg md:text-xl text-foreground mb-0.5 sm:mb-1 truncate">{forum.title}</h2>
            <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">
              {forum.description || 'Join the discussion in this community forum.'}
            </p>
          </div>
          <div className="text-right text-muted-foreground hidden sm:block flex-shrink-0">
            <div className="font-semibold text-sm md:text-base">{stats.threads}</div>
            <div className="text-xs md:text-sm hidden md:inline">Threads</div>
            <div className="font-semibold text-sm md:text-base">{stats.posts}</div>
            <div className="text-xs md:text-sm hidden md:inline">Posts</div>
          </div>
          <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
        </div>
      </div>
    );
  };


  return (
    <div className="w-full mx-auto p-3 sm:p-4 md:p-6 bg-background min-h-screen relative">
      {/* Localized loading screen that only covers this div */}
      {isPageLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 h-8 w-8 animate-pulse rounded-full border border-primary/20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Loading forums</p>
              <div className="flex space-x-1 mt-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Community Forums</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Connect with your community and discuss various topics
            </p>
          </div>
          {userProfile && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto h-9 text-sm"
              size="sm"
            >
              <Plus className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Create Forum</span>
            </Button>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col gap-2 sm:gap-3 bg-card border border-border rounded-lg p-3 sm:p-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search forums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 sm:pl-10 pr-4 h-9 sm:h-10 text-sm bg-background text-foreground border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all duration-200 placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="flex gap-2 items-center overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            
            <Select value={sortBy} onValueChange={(value: 'all' | 'public' | 'private' | 'category') => setSortBy(value)}>
              <SelectTrigger className="w-[100px] sm:w-32 bg-background h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="all">All Forums</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px] sm:w-48 bg-background h-9 text-xs sm:text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load forums. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse bg-card border border-border">
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="h-3 sm:h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-2 sm:h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6">
                  <div className="h-2 sm:h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-2 sm:h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredForums.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <MessageSquare className="mx-auto h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">
              {searchQuery || sortBy !== 'all' || categoryFilter !== 'all' 
                ? 'No forums found' 
                : 'No forums yet'}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {searchQuery || sortBy !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a forum for your community.'}
            </p>
            {userProfile && searchQuery === '' && sortBy === 'all' && categoryFilter === 'all' && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Forum
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredForums.map((forum) => renderForumCard(forum))}
          </div>
        )}
      </div>

      {showCreateDialog && (
        <CreateForumDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog} 
          onForumCreated={handleForumCreated}
        />
      )}
    </div>
  );
};

export default UserForumPage;
