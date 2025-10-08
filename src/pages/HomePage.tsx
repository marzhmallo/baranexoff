
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useData } from '@/context/DataContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Calendar, MessageSquare, FileText, Users, Clock, AlertTriangle, CheckCircle, XCircle, MoreVertical, Eye, Plus, FileCheck, FileCog, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserBarangayLocationMap from '@/components/user/UserBarangayLocationMap';
import { useIsMobile } from '@/hooks/use-mobile';

const HomePage = () => {
  const { userProfile } = useAuth();
  const { 
    residents, 
    households, 
    upcomingEvents, 
    latestAnnouncements, 
    barangayOfficials, 
    barangayName, 
    loading 
  } = useData();
  
  const [currentDate, setCurrentDate] = useState('');
  const isMobile = useIsMobile();

  // Fetch user's document requests
  const { data: documentRequests } = useQuery({
    queryKey: ['user-document-requests', userProfile?.id],
    queryFn: async () => {
      if (!userProfile?.id) return [];
      
      const { data, error } = await supabase
        .from('docrequests')
        .select('*')
        .eq('resident_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) {
        console.error('Error fetching document requests:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!userProfile?.id
  });

  useEffect(() => {
    // Set current date
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventBorderColor = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'festival':
        return 'border-purple-500';
      case 'health':
        return 'border-blue-500';
      case 'environment':
        return 'border-green-500';
      default:
        return 'border-green-500';
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType?.toLowerCase()) {
      case 'festival':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'health':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'environment':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
  };

  const getAnnouncementBorderColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'alert':
        return 'border-red-200 dark:border-red-800';
      case 'news':
        return 'border-blue-200 dark:border-blue-800';
      default:
        return 'border-blue-200 dark:border-blue-800';
    }
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'request':
        return FileText;
      case 'processing':
        return FileCog;
      case 'ready':
        return CheckCircle;
      case 'released':
        return Package;
      case 'rejected':
      case 'declined':
        return XCircle;
      default:
        return Clock;
    }
  };

  const getDocumentStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'request':
        return {
          containerClass: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
          iconClass: 'bg-yellow-500',
          badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
        };
      case 'processing':
        return {
          containerClass: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
          iconClass: 'bg-blue-500',
          badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
        };
      case 'ready':
        return {
          containerClass: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
          iconClass: 'bg-green-500',
          badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
        };
      case 'released':
        return {
          containerClass: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
          iconClass: 'bg-purple-500',
          badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
        };
      case 'rejected':
      case 'declined':
        return {
          containerClass: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
          iconClass: 'bg-red-500',
          badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
        };
      default:
        return {
          containerClass: 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
          iconClass: 'bg-gray-500',
          badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
        };
    }
  };

  // Show loading state if data is still loading
  if (loading) {
    return (
      <div className="p-6 bg-background min-h-screen">
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded-2xl h-32 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} bg-background min-h-screen`}>
      {/* Header Card */}
      <div className={`relative overflow-hidden rounded-2xl ${isMobile ? 'p-6' : 'p-8'} mb-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-500 dark:via-indigo-600 dark:to-purple-700`}>
        {/* Background decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className={`relative z-10 ${isMobile ? 'flex-col space-y-4' : 'flex justify-between items-start'}`}>
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2 text-white drop-shadow-sm`}>
              Welcome back, {userProfile?.firstname}!
            </h1>
            <p className="text-white/90 drop-shadow-sm">
              Here's what's happening in {barangayName || 'your barangay'} today
            </p>
          </div>
          <div className={`flex items-center space-x-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2 shadow-lg ${isMobile ? 'self-start' : ''}`}>
            <Calendar className="h-4 w-4 text-white" />
            <span className="text-sm text-white font-medium">{currentDate}</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className={`grid grid-cols-1 ${isMobile ? 'gap-4' : 'lg:grid-cols-3 gap-6'}`}>
        {/* Upcoming Events */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-primary flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Upcoming Events
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/hub/calendar" className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    View All Events
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 3).map((event) => (
                <div key={event.id} className={`border-l-4 ${getEventBorderColor(event.event_type)} pl-4 py-2`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-foreground">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.start_time)} • {formatTime(event.start_time)}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.location || 'Barangay Hall'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${getEventBadgeColor(event.event_type)}`}>
                      {event.event_type || 'Event'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No upcoming events scheduled
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Announcements */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-primary flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Latest Announcements
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/hub/announcements" className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    View All Announcements
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAnnouncements.length > 0 ? (
              latestAnnouncements.slice(0, 3).map((announcement) => (
                <div key={announcement.id} className={`border rounded-lg p-3 ${getAnnouncementBorderColor(announcement.category)}`}>
                  <div className="flex items-start space-x-2">
                    {announcement.category === 'Alert' && <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />}
                    <div>
                      <h4 className={`font-medium ${announcement.category === 'Alert' ? 'text-red-800 dark:text-red-200' : 'text-blue-800 dark:text-blue-200'}`}>
                        {announcement.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {announcement.content.length > 100 
                          ? `${announcement.content.substring(0, 100)}...` 
                          : announcement.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Posted by Admin • {formatDate(announcement.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No recent announcements
              </div>
            )}
          </CardContent>
        </Card>

        {/* Your Certificates & Documents */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold text-primary flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Your Certificates & Documents
            </CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/hub/documents" className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    View All Documents
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/hub/documents" className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Request Document
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentRequests && documentRequests.length > 0 ? (
              documentRequests.slice(0, 5).map((request) => {
                const StatusIcon = getDocumentStatusIcon(request.status);
                const statusStyle = getDocumentStatusStyle(request.status);
                
                return (
                  <div key={request.id} className={`flex items-center justify-between p-3 rounded-lg border ${statusStyle.containerClass}`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${statusStyle.iconClass} rounded-full flex items-center justify-center`}>
                        <StatusIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">{request.type}</h4>
                        <p className="text-xs text-muted-foreground">
                          Requested {formatDate(request.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${statusStyle.badgeClass}`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p>No document requests found</p>
                <p className="text-sm mt-1">Request documents to see them here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barangay Officials Section */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold text-primary flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Your Barangay Officials
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/hub/officials" className="flex items-center">
                  <Eye className="mr-2 h-4 w-4" />
                  View All Officials
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4'}`}>
            {barangayOfficials.length > 0 ? (
              barangayOfficials.map((official) => (
                <div key={official.id} className="text-center">
                  <div className="w-20 h-20 bg-muted rounded-lg mx-auto mb-3 overflow-hidden">
                    {official.photo_url ? (
                      <img 
                        src={official.photo_url} 
                        alt={official.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">
                          {official.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm text-foreground">{official.name}</h4>
                  <p className="text-xs text-primary">{official.position}</p>
                  <p className="text-xs text-muted-foreground">
                    Term: {official.term_start ? new Date(official.term_start).getFullYear() : 'N/A'}-
                    {official.term_end ? new Date(official.term_end).getFullYear() : 'Present'}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground py-4">
                No officials data available
              </div>
            )}
          </div>
          
          <div className="text-center mt-6">
            <Link 
              to="/hub/officials" 
              className="text-primary hover:text-primary/80 text-sm font-medium"
            >
              View all barangay officials →
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Barangay Hall Location Map */}
      <div className="mt-6">
        <UserBarangayLocationMap barangayName={barangayName} />
      </div>
    </div>
  );
};

export default HomePage;
