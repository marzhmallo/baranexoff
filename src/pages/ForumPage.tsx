
import React, { useState, useEffect } from 'react';
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

const ForumPage = () => {
  console.log('ForumPage component loaded - updated version');
  const { userProfile } = useAuth();
  const { toast } = useToast();
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
        className="bg-card border border-border rounded-xl p-6 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer group"
        onClick={handleClick}
      >
        <div className="flex items-center space-x-6">
          <div className={`flex-shrink-0 w-16 h-16 ${iconConfig.bgColor} rounded-full flex items-center justify-center`}>
            <IconComponent className={`${iconConfig.iconColor} h-8 w-8`} />
          </div>
          <div className="flex-grow">
            <h2 className="font-bold text-xl text-foreground mb-1">{forum.title}</h2>
            <p className="text-muted-foreground text-sm">
              {forum.description || 'Join the discussion in this community forum.'}
            </p>
          </div>
          <div className="text-right text-muted-foreground hidden sm:block">
            <div className="font-semibold">{stats.threads} Threads</div>
            <div className="text-sm">{stats.posts} Posts</div>
          </div>
          <ChevronRight className="text-muted-foreground group-hover:text-foreground transition-colors h-5 w-5" />
        </div>
      </div>
    );
  };


  return (
    <div className="w-full mx-auto p-6 bg-background min-h-screen relative">
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

      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Community Forums</h1>
            <p className="text-muted-foreground">
              Connect with your community and discuss various topics
            </p>
          </div>
          {userProfile && (
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Forum
            </Button>
          )}
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card border border-border rounded-lg p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search forums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-background text-foreground border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent outline-none transition-all duration-200 placeholder:text-muted-foreground"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <Select value={sortBy} onValueChange={(value: 'all' | 'public' | 'private' | 'category') => setSortBy(value)}>
              <SelectTrigger className="w-32 bg-background">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="all">All Forums</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-background">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse bg-card border border-border">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredForums.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchQuery || sortBy !== 'all' || categoryFilter !== 'all' 
                ? 'No forums found' 
                : 'No forums yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || sortBy !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a forum for your community.'}
            </p>
            {userProfile && searchQuery === '' && sortBy === 'all' && categoryFilter === 'all' && (
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Forum
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
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

export default ForumPage;
