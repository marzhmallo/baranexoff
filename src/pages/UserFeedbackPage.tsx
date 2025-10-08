import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { feedbackAPI } from '@/lib/api/feedback';
import { FeedbackReport, FeedbackType, FeedbackStatus } from '@/lib/types/feedback';
import { FileText, Clock, CheckCircle, Timer, Search, Filter, AlertTriangle, ThumbsUp, Construction, Volume2, ZoomIn, Play, PlusCircle, Upload, Download, BarChart3, Smartphone, Trees, Shield, Users, MessageSquare, User, Mic, Calendar, MapPin, Eye, X, Droplets, Plus } from 'lucide-react';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
const SUPABASE_URL = "https://dssjspakagyerrmtaakm.supabase.co";
const UserFeedbackPage = () => {
  const {
    userProfile
  } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Fetch all reports without filters - we'll filter client-side
  const {
    data: allReports,
    isLoading: isInitialLoading,
    refetch
  } = useQuery({
    queryKey: ['feedback-reports', userProfile?.brgyid],
    queryFn: async () => {
      if (!userProfile?.brgyid) return [];
      return await feedbackAPI.getAllReports(userProfile.brgyid);
    },
    enabled: !!userProfile?.brgyid
  });

  // Filter reports client-side - show only user's own reports
  const filteredReports = useMemo(() => {
    if (!allReports || !userProfile?.id) return [];
    return allReports.filter(report => {
      // Only show user's own reports
      if (report.user_id !== userProfile.id) return false;

      // Type filter
      if (filterType !== 'all' && report.type !== filterType) return false;

      // Status filter
      if (filterStatus !== 'all' && report.status !== filterStatus) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return report.description.toLowerCase().includes(searchLower) || report.category.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [allReports, filterType, filterStatus, searchTerm, userProfile?.id]);
  const handleViewDetails = (report: FeedbackReport) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
  };

  const handleSubmitSuccess = () => {
    setShowSubmitDialog(false);
    queryClient.invalidateQueries({ queryKey: ['feedback-reports'] });
    toast({
      title: "Success",
      description: "Your feedback has been submitted successfully"
    });
  };
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  };

  // Calculate stats from user's own reports only
  const userReports = allReports?.filter(r => r.user_id === userProfile?.id) || [];
  const totalReports = userReports.length;
  const pendingReports = userReports.filter(r => r.status === 'pending').length;
  const resolvedReports = userReports.filter(r => r.status === 'resolved').length;
  const inProgressReports = userReports.filter(r => r.status === 'in_progress').length;

  // Calculate category stats from user's own reports
  const categoryStats = userReports.reduce((acc, report) => {
    const category = report.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Chart data based on real data
  const categoryData = Object.entries(categoryStats).map(([name, value]) => ({
    name,
    value,
    color: name === 'Road Maintenance' ? '#EF4444' : name === 'Garbage Collection' ? '#10B981' : name === 'Street Lighting' ? '#3B82F6' : name === 'Water Supply' ? '#8B5CF6' : name === 'Drainage Issues' ? '#F59E0B' : name === 'Public Safety' ? '#EF4444' : name === 'Noise Complaints' ? '#8B5CF6' : '#6B7280'
  }));
  const monthlyData = [{
    month: 'Jan',
    reports: 35,
    resolved: 25
  }, {
    month: 'Feb',
    reports: 41,
    resolved: 31
  }, {
    month: 'Mar',
    reports: 36,
    resolved: 31
  }, {
    month: 'Apr',
    reports: 26,
    resolved: 24
  }, {
    month: 'May',
    reports: 45,
    resolved: 32
  }, {
    month: 'Jun',
    reports: 48,
    resolved: 39
  }, {
    month: 'Jul',
    reports: 52,
    resolved: 42
  }, {
    month: 'Aug',
    reports: 53,
    resolved: 39
  }, {
    month: 'Sep',
    reports: 41,
    resolved: 35
  }, {
    month: 'Oct',
    reports: 30,
    resolved: 30
  }, {
    month: 'Nov',
    reports: 32,
    resolved: 28
  }, {
    month: 'Dec',
    reports: 34,
    resolved: 29
  }];
  const resolutionTimeData = [{
    category: 'Infrastructure',
    days: 4.3
  }, {
    category: 'Environment',
    days: 2.1
  }, {
    category: 'Safety',
    days: 5.8
  }, {
    category: 'Community',
    days: 3.2
  }, {
    category: 'General',
    days: 1.9
  }];
  const sentimentData = [{
    name: 'Positive',
    value: 68,
    color: '#10B981'
  }, {
    name: 'Neutral',
    value: 22,
    color: '#F59E0B'
  }, {
    name: 'Negative',
    value: 10,
    color: '#EF4444'
  }];
  const chartConfig = {
    reports: {
      label: "Reports",
      color: "#3B82F6"
    },
    resolved: {
      label: "Resolved",
      color: "#10B981"
    },
    days: {
      label: "Days",
      color: "#3B82F6"
    }
  };
  const getStatusBadge = (status: FeedbackStatus) => {
    const colors = {
      pending: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    };
    return <span className={`px-3 py-1 text-xs font-medium rounded-full ${colors[status]}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>;
  };
  const getTypeIcon = (type: FeedbackType) => {
    return type === 'barangay' ? AlertTriangle : MessageSquare;
  };
  const getCategoryIcon = (category: string) => {
    if (category.toLowerCase().includes('road') || category.toLowerCase().includes('infrastructure')) return Construction;
    if (category.toLowerCase().includes('garbage') || category.toLowerCase().includes('environment')) return Trees;
    if (category.toLowerCase().includes('light') || category.toLowerCase().includes('street')) return AlertTriangle;
    if (category.toLowerCase().includes('water')) return Droplets;
    if (category.toLowerCase().includes('safety') || category.toLowerCase().includes('security')) return Shield;
    if (category.toLowerCase().includes('noise')) return Volume2;
    if (category.toLowerCase().includes('community')) return Users;
    return MessageSquare;
  };

  // Only show loading for initial data fetch
  if (isInitialLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <div className="w-full bg-background p-3 sm:p-4 md:p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">My Feedback & Reports</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and track your submitted reports</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-card rounded-xl shadow-sm border border-border p-3 sm:p-4 md:p-4 lg:p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs md:text-xs lg:text-sm">Total Reports</p>
                <p className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-foreground">{totalReports}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-2 lg:p-3 rounded-full">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-3 sm:p-4 md:p-4 lg:p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs md:text-xs lg:text-sm">Pending Review</p>
                <p className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingReports}</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 md:p-2 lg:p-3 rounded-full">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-3 sm:p-4 md:p-4 lg:p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs md:text-xs lg:text-sm">Resolved</p>
                <p className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{resolvedReports}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-2 md:p-2 lg:p-3 rounded-full">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-3 sm:p-4 md:p-4 lg:p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-xs md:text-xs lg:text-sm">In Progress</p>
                <p className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressReports}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-2 lg:p-3 rounded-full">
                <Timer className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-5 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">My Submitted Reports</h2>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                        <Filter className="h-4 w-4" />
                        <span className="sm:inline">Filter</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80" align="end">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="search">Search Reports</Label>
                          <div className="relative">
                            <Input id="search" type="text" placeholder="Search by description or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="type-filter">Report Type</Label>
                          <Select value={filterType} onValueChange={(value: FeedbackType | 'all') => setFilterType(value)}>
                            <SelectTrigger id="type-filter">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              <SelectItem value="barangay">Barangay</SelectItem>
                              <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status-filter">Status</Label>
                          <Select value={filterStatus} onValueChange={(value: FeedbackStatus | 'all') => setFilterStatus(value)}>
                            <SelectTrigger id="status-filter">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button variant="outline" onClick={clearFilters} className="flex-1">
                            Clear All
                          </Button>
                          <Button onClick={() => refetch()} className="flex-1">
                            Refresh
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {filteredReports && filteredReports.length > 0 ? filteredReports.map(report => {
                const IconComponent = getCategoryIcon(report.category);
                return <div key={report.id} className="border border-border bg-card rounded-lg p-3 sm:p-4 hover:border-border/80 transition-all duration-300">
                        <div className="flex items-start justify-between mb-3 gap-2">
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full flex items-center justify-center ${report.type === 'barangay' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                              <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${report.type === 'barangay' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm sm:text-base text-foreground truncate">{report.category}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{report.location || 'No location specified'}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(report.status)}
                          </div>
                        </div>
                        <p className="text-muted-foreground text-xs sm:text-sm mb-3 line-clamp-2">{report.description}</p>
                        {report.attachments && report.attachments.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                            {report.attachments.map((attachment, index) => {
                      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/reportfeedback/userreports/${attachment}`;
                      return <div key={index} className="relative group h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 rounded-md overflow-hidden border border-border cursor-pointer" onClick={() => setEnlargedImage(imageUrl)}>
                                  <img src={imageUrl} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }} />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                                    <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4 text-white scale-0 group-hover:scale-100 transition-all duration-300" />
                                  </div>
                                </div>;
                    })}
                          </div>}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-2 sm:gap-4">
                          <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleViewDetails(report)} className="hover:bg-accent w-full sm:w-auto text-xs sm:text-sm min-h-[44px] sm:min-h-0">
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>;
              }) : <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-foreground">No reports found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || filterType !== 'all' || filterStatus !== 'all' ? 'Try adjusting your search or filters' : 'No feedback reports have been submitted yet'}
                    </p>
                  </div>}
              </div>
            </div>
          </div>

          {/* Sidebar - Hidden on mobile/tablet, visible on desktop */}
          <div className="hidden lg:block space-y-4 sm:space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-5 md:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Submit New Report</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-4 sm:mb-6">
                Report a barangay issue or system problem
              </p>
              <Button onClick={() => setShowSubmitDialog(true)} className="w-full gap-2 min-h-[44px] text-sm sm:text-base">
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                New Report
              </Button>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-5 md:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-3 sm:mb-4">Report Categories</h2>
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(categoryStats).length > 0 ? Object.entries(categoryStats).slice(0, 5).map(([category, count]) => {
                const IconComponent = getCategoryIcon(category);
                return <div key={category} className="flex items-center justify-between p-2 sm:p-3 bg-background rounded-lg">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                          <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-foreground truncate">{category}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-primary flex-shrink-0 ml-2">{count}</span>
                    </div>;
              }) : <p className="text-muted-foreground text-sm">No categories to display</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Action Button - visible on mobile/tablet only */}
        <button
          onClick={() => setShowSubmitDialog(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
          aria-label="Submit new report"
        >
          <Plus className="h-6 w-6 md:h-7 md:w-7" />
        </button>

        {/* Report Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 rounded-full flex items-center justify-center ${selectedReport?.type === 'barangay' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                  {selectedReport && (() => {
                  const IconComponent = getCategoryIcon(selectedReport.category);
                  return <IconComponent className={`h-5 w-5 sm:h-6 sm:w-6 ${selectedReport.type === 'barangay' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />;
                })()}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-lg sm:text-xl font-semibold mb-2">
                    {selectedReport?.category}
                  </DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={selectedReport?.type === 'barangay' ? 'default' : 'secondary'}>
                      {selectedReport?.type === 'barangay' ? 'Barangay Issue' : 'System Issue'}
                    </Badge>
                    {selectedReport && getStatusBadge(selectedReport.status)}
                  </div>
                </div>
              </div>
            </DialogHeader>

            {selectedReport && <div className="space-y-4 sm:space-y-6">
                {/* Report Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm font-medium">Submitted</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">
                      {new Date(selectedReport.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm font-medium">Reported By</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedReport.user_name || 'Anonymous User'}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm font-medium">Location</span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {selectedReport.location || 'Not specified'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3">Description</h3>
                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedReport.attachments && selectedReport.attachments.length > 0 && <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3">
                      Attachments ({selectedReport.attachments.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {selectedReport.attachments.map((attachment, index) => {
                  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/reportfeedback/userreports/${attachment}`;
                  return <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/50 cursor-pointer" onClick={() => setEnlargedImage(imageUrl)}>
                            <img src={imageUrl} alt={`Attachment ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }} />
                            <div className="hidden w-full h-full bg-muted/50 items-center justify-center flex-col p-4">
                              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                              <span className="text-xs text-muted-foreground text-center break-all">
                                {attachment}
                              </span>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                              <ZoomIn className="h-6 w-6 text-white scale-0 group-hover:scale-100 transition-all duration-300" />
                            </div>
                          </div>;
                })}
                    </div>
                  </div>}

                {/* Admin Notes */}
                {selectedReport.admin_notes && <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3">Admin Response</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed break-words">
                        {selectedReport.admin_notes}
                      </p>
                    </div>
                  </div>}

                  <div className="mt-4 sm:mt-6 space-y-3">                    
                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowDetailsDialog(false)} className="w-full min-h-[44px] text-sm sm:text-base">
                        Close
                      </Button>
                    </div>
                  </div>
              </div>}
          </DialogContent>
        </Dialog>

        {/* Submit Report Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-[calc(100vw-4rem)] sm:max-w-2xl max-h-[90vh] p-0">
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl sm:text-2xl">Submit Feedback Report</DialogTitle>
            </DialogHeader>
            <FeedbackForm 
              onSuccess={handleSubmitSuccess}
              onCancel={() => setShowSubmitDialog(false)}
            />
          </div>
        </DialogContent>
        </Dialog>

        {/* Enlarged Image Modal */}
        <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 bg-transparent border-none">
            <div className="relative">
              <img src={enlargedImage || ''} alt="Enlarged attachment" className="w-full h-auto max-h-[90vh] object-contain rounded-lg" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};
export default UserFeedbackPage;
