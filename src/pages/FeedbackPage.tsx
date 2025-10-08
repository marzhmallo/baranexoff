import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { feedbackAPI } from '@/lib/api/feedback';
import { FeedbackReport, FeedbackType, FeedbackStatus } from '@/lib/types/feedback';
import { FileText, Clock, CheckCircle, Timer, Search, Filter, AlertTriangle, ThumbsUp, Construction, Volume2, ZoomIn, Play, PlusCircle, Upload, Download, BarChart3, Smartphone, Trees, Shield, Users, MessageSquare, User, Mic, Calendar, MapPin, Eye, X, Droplets } from 'lucide-react';
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
const FeedbackPage = () => {
  const {
    userProfile
  } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FeedbackType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | 'all'>('all');
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<FeedbackStatus>('pending');
  const [adminNotes, setAdminNotes] = useState('');
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

  // Filter reports client-side to avoid loading states
  const filteredReports = useMemo(() => {
    if (!allReports) return [];
    return allReports.filter(report => {
      // Type filter
      if (filterType !== 'all' && report.type !== filterType) return false;

      // Status filter
      if (filterStatus !== 'all' && report.status !== filterStatus) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return report.description.toLowerCase().includes(searchLower) || report.category.toLowerCase().includes(searchLower) || report.user_name && report.user_name.toLowerCase().includes(searchLower);
      }
      return true;
    });
  }, [allReports, filterType, filterStatus, searchTerm]);
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      reportId,
      status,
      notes
    }: {
      reportId: string;
      status: FeedbackStatus;
      notes?: string;
    }) => {
      return await feedbackAPI.updateReportStatus(reportId, status, notes);
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Report status has been updated successfully"
      });
      queryClient.invalidateQueries({
        queryKey: ['feedback-reports']
      });
      setShowStatusDialog(false);
      setSelectedReport(null);
      setAdminNotes('');
    },
    onError: error => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  });
  const handleUpdateStatus = (report: FeedbackReport, status: FeedbackStatus) => {
    setSelectedReport(report);
    setNewStatus(status);
    setShowStatusDialog(true);
  };
  const handleViewDetails = (report: FeedbackReport) => {
    setSelectedReport(report);
    setShowDetailsDialog(true);
  };
  const handleStatusSubmit = () => {
    if (!selectedReport) return;
    updateStatusMutation.mutate({
      reportId: selectedReport.id,
      status: newStatus,
      notes: adminNotes
    });
  };
  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterStatus('all');
  };

  // Calculate stats from all reports (not filtered)
  const totalReports = allReports?.length || 0;
  const pendingReports = allReports?.filter(r => r.status === 'pending').length || 0;
  const resolvedReports = allReports?.filter(r => r.status === 'resolved').length || 0;
  const inProgressReports = allReports?.filter(r => r.status === 'in_progress').length || 0;

  // Calculate category stats from all reports
  const categoryStats = allReports?.reduce((acc, report) => {
    const category = report.category;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

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
  return <div className="w-full bg-background p-6 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Barangay Feedback & Reports</h1>
          <p className="text-muted-foreground">Manage community feedback and issue reports efficiently</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Reports</p>
                <p className="text-2xl font-bold text-foreground">{totalReports}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingReports}</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Resolved</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resolvedReports}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">In Progress</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressReports}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <Timer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold text-foreground">Recent Reports & Feedback</h2>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Filter
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
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

              <div className="space-y-4">
                {filteredReports && filteredReports.length > 0 ? filteredReports.map(report => {
                const IconComponent = getCategoryIcon(report.category);
                return <div key={report.id} className="border border-border bg-card rounded-lg p-4 hover:border-border/80 transition-all duration-300">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${report.type === 'barangay' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                              <IconComponent className={`h-5 w-5 ${report.type === 'barangay' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{report.category}</h3>
                              <p className="text-sm text-muted-foreground">{report.location || 'No location specified'}</p>
                            </div>
                          </div>
                          {getStatusBadge(report.status)}
                        </div>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{report.description}</p>
                        {report.attachments && report.attachments.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                            {report.attachments.map((attachment, index) => {
                      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/reportfeedback/userreports/${attachment}`;
                      return <div key={index} className="relative group h-16 w-16 flex-shrink-0 rounded-md overflow-hidden border border-border cursor-pointer" onClick={() => setEnlargedImage(imageUrl)}>
                                  <img src={imageUrl} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }} />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                                    <ZoomIn className="h-4 w-4 text-white scale-0 group-hover:scale-100 transition-all duration-300" />
                                  </div>
                                </div>;
                    })}
                          </div>}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>By: {report.user_name || 'Anonymous'}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{new Date(report.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2">
                            {report.status === 'pending' && <>
                                <Button size="sm" onClick={() => handleUpdateStatus(report, 'in_progress')} className="bg-blue-600 hover:bg-blue-700 text-white">
                                  Assign
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(report, 'rejected')}>
                                  Reject
                                </Button>
                              </>}
                            {report.status === 'in_progress' && <Button size="sm" onClick={() => handleUpdateStatus(report, 'resolved')} className="bg-green-600 hover:bg-green-700 text-white">
                                Mark Resolved
                              </Button>}
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(report)} className="gap-2">
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </div>
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

          <div className="space-y-6">
            

            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Report Categories</h3>
              <div className="space-y-3">
                {Object.entries(categoryStats).length > 0 ? Object.entries(categoryStats).map(([category, count]) => {
                const IconComponent = getCategoryIcon(category);
                return <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <IconComponent className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-foreground font-medium">{category}</span>
                        </div>
                        <span className="text-sm text-muted-foreground bg-background px-2 py-1 rounded">{count}</span>
                      </div>;
              }) : <p className="text-muted-foreground text-sm">No categories to display</p>}
              </div>
            </div>

            
          </div>
        </div>

        {/* Report Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedReport?.type === 'barangay' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                    {selectedReport && (() => {
                    const IconComponent = getCategoryIcon(selectedReport.category);
                    return <IconComponent className={`h-6 w-6 ${selectedReport.type === 'barangay' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />;
                  })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold">
                      {selectedReport?.category}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedReport?.type === 'barangay' ? 'default' : 'secondary'}>
                        {selectedReport?.type === 'barangay' ? 'Barangay Issue' : 'System Issue'}
                      </Badge>
                      {selectedReport && getStatusBadge(selectedReport.status)}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>

            {selectedReport && <div className="space-y-6">
                {/* Report Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Submitted</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedReport.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Reported By</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.user_name || 'Anonymous User'}
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Location</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedReport.location || 'Not specified'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-foreground leading-relaxed">
                      {selectedReport.description}
                    </p>
                  </div>
                </div>

                {/* Attachments */}
                {selectedReport.attachments && selectedReport.attachments.length > 0 && <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Attachments ({selectedReport.attachments.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                    <h3 className="text-lg font-semibold mb-3">Admin Response</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-foreground leading-relaxed">
                        {selectedReport.admin_notes}
                      </p>
                    </div>
                  </div>}

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-end">
                  {selectedReport.status === 'pending' && <>
                      <Button onClick={() => {
                  setShowDetailsDialog(false);
                  handleUpdateStatus(selectedReport, 'in_progress');
                }} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Assign & Start Progress
                      </Button>
                      <Button variant="outline" onClick={() => {
                  setShowDetailsDialog(false);
                  handleUpdateStatus(selectedReport, 'rejected');
                }}>
                        Reject Report
                      </Button>
                    </>}
                  {selectedReport.status === 'in_progress' && <Button onClick={() => {
                setShowDetailsDialog(false);
                handleUpdateStatus(selectedReport, 'resolved');
              }} className="bg-green-600 hover:bg-green-700 text-white">
                      Mark as Resolved
                    </Button>}
                  <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                    Close
                  </Button>
                </div>
              </div>}
          </DialogContent>
        </Dialog>

        {/* Status Update Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Report Status</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New Status</label>
                <Select value={newStatus} onValueChange={(value: FeedbackStatus) => setNewStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add notes about this status change..." rows={3} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusSubmit} disabled={updateStatusMutation.isPending}>
                  {updateStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
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
export default FeedbackPage;