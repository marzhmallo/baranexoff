import { useState, useEffect } from "react";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Edit, Trash2, Search, Plus, Filter, MoreHorizontal, Clock, CheckCircle, AlertCircle, XCircle, Eye, Upload, BarChart3, Settings, FileCheck, TrendingUp, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentTemplateForm from "./DocumentTemplateForm";
import IssueDocumentForm from "./IssueDocumentForm";
import DocumentViewDialog from "./DocumentViewDialog";
import DocumentDeleteDialog from "./DocumentDeleteDialog";
import DocumentSettingsDialog from "./DocumentSettingsDialog";
import DocumentRequestDetailsModal from "./DocumentRequestDetailsModal";

import { useToast } from "@/hooks/use-toast";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";
import { formatDistanceToNow } from "date-fns";
import LocalizedLoadingScreen from "@/components/ui/LocalizedLoadingScreen";
const DocumentsPage = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [trackingSearchQuery, setTrackingSearchQuery] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("All Documents");
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [isIssueDocumentOpen, setIsIssueDocumentOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Document requests state
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [requestsCurrentPage, setRequestsCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  // Document request details modal state (for tracking system only)
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isRequestDetailsOpen, setIsRequestDetailsOpen] = useState(false);

  // Document tracking modals state
  const [selectedTrackingItem, setSelectedTrackingItem] = useState(null);
  const [isTrackingDetailsOpen, setIsTrackingDetailsOpen] = useState(false);
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false);

  // Document tracking state  
  const [documentTracking, setDocumentTracking] = useState<any[]>([]);
  const [trackingCurrentPage, setTrackingCurrentPage] = useState(1);
  const [trackingTotalCount, setTrackingTotalCount] = useState(0);
  const itemsPerPage = 3;
  const trackingItemsPerPage = 5;
  const {
    toast
  } = useToast();
  const {
    adminProfileId
  } = useCurrentAdmin();

  // Initial data fetch with master loading state
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [documentsData, requestsData, trackingData] = await Promise.all([
        // Fetch document types
        supabase.from('document_types').select('*').order('name'),
        // Fetch document requests
        supabase.from('docrequests').select('*', {
          count: 'exact'
        }).ilike('status', 'Request').range((requestsCurrentPage - 1) * itemsPerPage, requestsCurrentPage * itemsPerPage - 1).order('created_at', {
          ascending: false
        }),
        // Fetch document tracking
        supabase.from('docrequests').select('*', {
          count: 'exact'
        }).not('processedby', 'is', null).neq('status', 'Request').range((trackingCurrentPage - 1) * trackingItemsPerPage, trackingCurrentPage * trackingItemsPerPage - 1).order('updated_at', {
          ascending: false
        })]);

        // Process document requests
        const mappedRequests = requestsData.data?.map(doc => {
          let name = 'Unknown';
          if (doc.receiver) {
            try {
              if (typeof doc.receiver === 'object' && doc.receiver !== null && !Array.isArray(doc.receiver)) {
                name = (doc.receiver as any).name || 'Unknown';
              } else if (typeof doc.receiver === 'string') {
                const parsed = JSON.parse(doc.receiver);
                name = parsed.name || 'Unknown';
              }
            } catch {
              name = 'Unknown';
            }
          }
          return {
            id: doc.id,
            name,
            document: doc.type,
            timeAgo: formatDistanceToNow(new Date(doc.created_at), {
              addSuffix: true
            }),
            status: doc.status,
            docnumber: doc.docnumber,
            purpose: doc.purpose,
            amount: doc.amount,
            method: doc.method,
            paydate: doc.paydate,
            paymenturl: doc.paymenturl,
            notes: doc.notes,
            created_at: doc.created_at
          };
        }) || [];

        // Process document tracking
        const mappedTracking = trackingData.data?.map(doc => {
          let requestedBy = 'Unknown';
          if (doc.receiver) {
            try {
              if (typeof doc.receiver === 'object' && doc.receiver !== null && !Array.isArray(doc.receiver)) {
                requestedBy = (doc.receiver as any).name || 'Unknown';
              } else if (typeof doc.receiver === 'string') {
                const parsed = JSON.parse(doc.receiver);
                requestedBy = parsed.name || 'Unknown';
              }
            } catch {
              requestedBy = 'Unknown';
            }
          }
        const getStatusColor = (status: string) => {
          switch (status.toLowerCase()) {
            case 'approved':
            case 'ready':
              return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'rejected':
              return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            case 'pending':
            case 'request':
              return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
            case 'processing':
              return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
            case 'released':
              return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
            default:
              return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
          }
        };
          const getDisplayStatus = (status: string) => {
            switch (status.toLowerCase()) {
              case 'approved':
              case 'ready':
                return 'Ready for Pickup';
              case 'rejected':
                return 'Rejected';
              case 'pending':
                return 'Pending';
              case 'processing':
                return 'Processing';
              case 'released':
                return 'Released';
              default:
                return status;
            }
          };
          return {
            id: doc.docnumber,
            document: doc.type,
            requestedBy,
            status: getDisplayStatus(doc.status),
            statusColor: getStatusColor(doc.status),
            lastUpdate: doc.updated_at ? formatDistanceToNow(new Date(doc.updated_at), {
              addSuffix: true
            }) : 'No updates',
            originalDoc: doc
          };
        }) || [];
        setDocumentRequests(mappedRequests);
        setTotalCount(requestsData.count || 0);
        setDocumentTracking(mappedTracking);
        setTrackingTotalCount(trackingData.count || 0);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchAllData();
  }, [requestsCurrentPage, trackingCurrentPage]);

  // Set up real-time subscriptions after initial load
  useEffect(() => {
    if (!isInitialLoading) {
      const channel = supabase.channel('document-requests-realtime').on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'docrequests'
      }, () => {
        fetchDocumentRequests();
      }).subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isInitialLoading, requestsCurrentPage]);
  const fetchDocumentRequests = async () => {
    try {
      let query = supabase.from('docrequests').select('*', {
        count: 'exact'
      }).ilike('status', 'Request');
      const from = (requestsCurrentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);
      query = query.order('created_at', {
        ascending: false
      });
      const {
        data,
        error,
        count
      } = await query;
      if (error) {
        console.error('Error fetching document requests:', error);
        return;
      }
      const mappedData = data?.map(doc => {
        let name = 'Unknown';
        if (doc.receiver) {
          try {
            if (typeof doc.receiver === 'object' && doc.receiver !== null && !Array.isArray(doc.receiver)) {
              name = (doc.receiver as any).name || 'Unknown';
            } else if (typeof doc.receiver === 'string') {
              const parsed = JSON.parse(doc.receiver);
              name = parsed.name || 'Unknown';
            }
          } catch {
            name = 'Unknown';
          }
        }
        return {
          id: doc.id,
          name,
          document: doc.type,
          timeAgo: formatDistanceToNow(new Date(doc.created_at), {
            addSuffix: true
          }),
          status: doc.status,
          docnumber: doc.docnumber,
          purpose: doc.purpose,
          amount: doc.amount,
          method: doc.method,
          paydate: doc.paydate,
          paymenturl: doc.paymenturl,
          notes: doc.notes,
          created_at: doc.created_at
        };
      }) || [];
      setDocumentRequests(mappedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const {
    data: documentTypes,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments
  } = useQuery({
    queryKey: ['document-types', searchQuery],
    queryFn: async () => {
      let query = supabase.from('document_types').select('*');
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      // Order by type then name (DB-level), then enforce case-insensitive sort client-side
      const {
        data,
        error
      } = await query.order('type', {
        ascending: true
      }).order('name', {
        ascending: true
      });
      if (error) throw error;
      const sorted = (data || []).slice().sort((a: any, b: any) => {
        const at = String(a.type || '').toLowerCase();
        const bt = String(b.type || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        const an = String(a.name || '').toLowerCase();
        const bn = String(b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
      return sorted;
    },
    staleTime: 0,
    refetchOnWindowFocus: false
  });

  // Set up real-time subscription for document types
  useEffect(() => {
    const channel = supabase.channel('document-types-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'document_types'
    }, () => {
      // Refetch document types when changes occur
      refetchDocuments();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchDocuments]);

  // Use pre-loaded document stats from AuthProvider
  const [documentStats, setDocumentStats] = useState(() => {
    try {
      const preloaded = localStorage.getItem('preloadedDocumentStats');
      return preloaded ? JSON.parse(preloaded) : {
        total: 0,
        pending: 0,
        issuedToday: 0
      };
    } catch {
      return {
        total: 0,
        pending: 0,
        issuedToday: 0
      };
    }
  });

  // Use pre-loaded processing stats from AuthProvider
  const [processingStats, setProcessingStats] = useState(() => {
    try {
      const preloaded = localStorage.getItem('preloadedProcessingStats');
      return preloaded ? JSON.parse(preloaded) : {
        readyForPickup: 0,
        processing: 0,
        forReview: 0,
        released: 0,
        rejected: 0,
        avgProcessingTime: null
      };
    } catch {
      return {
        readyForPickup: 0,
        processing: 0,
        forReview: 0,
        released: 0,
        rejected: 0,
        avgProcessingTime: null
      };
    }
  });

  // Calculate filtered stats based on current tracking filter
  const filteredStats = React.useMemo(() => {
    let dataToCount = documentTracking;
    
    // Filter data based on current trackingFilter
    if (trackingFilter !== 'All Documents') {
      dataToCount = documentTracking.filter(doc => {
        const status = doc.status.toLowerCase();
        switch (trackingFilter) {
          case 'Processing':
            return status === 'processing';
          case 'Released':
            return status === 'released';
          case 'Rejected':
            return status === 'rejected';
          case 'Ready':
            return status === 'ready for pickup' || status === 'ready';
          default:
            return true;
        }
      });
    }

    const stats = dataToCount.reduce((acc, doc) => {
      const status = doc.status.toLowerCase();
      if (status === 'ready for pickup' || status === 'ready') {
        acc.readyForPickup++;
      } else if (status === 'processing') {
        acc.processing++;
      } else if (status === 'released') {
        acc.released++;
      } else if (status === 'rejected') {
        acc.rejected++;
      }
      return acc;
    }, {
      readyForPickup: 0,
      processing: 0,
      released: 0,
      rejected: 0
    });

    return stats;
  }, [documentTracking, trackingFilter]);

  // Document templates from document_types table (connected)
  const documents = documentTypes?.map(docType => ({
    id: docType.id,
    name: docType.name,
    type: "template",
    status: "Active",
    size: "Template",
    updatedAt: formatDistanceToNow(new Date(docType.updated_at || docType.created_at), {
      addSuffix: true
    }),
    icon: FileText,
    color: "text-blue-500",
    description: docType.description,
    fee: docType.fee,
    template: docType.template,
    required_fields: docType.required_fields
  })) || [];

  // Mock data for document requests - REPLACED WITH REAL DATA ABOVE
  // const documentRequests = [{...}];

  // Set up real-time subscription for document tracking and refetch on filters/page change
  useEffect(() => {
    if (isInitialLoading) return;

    // Always refetch when dependencies change to make the search/filter line functional
    fetchDocumentTracking();

    // Realtime updates from DB changes
    const channel = supabase.channel('document-tracking-realtime').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'docrequests'
    }, () => {
      fetchDocumentTracking();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInitialLoading, trackingCurrentPage, trackingSearchQuery, trackingFilter]);

  // Reset page when search or filter changes
  useEffect(() => {
    if (trackingCurrentPage !== 1) {
      setTrackingCurrentPage(1);
    }
  }, [trackingSearchQuery, trackingFilter]);
  const fetchDocumentTracking = async () => {
    try {
      let query = supabase.from('docrequests').select('*', {
        count: 'exact'
      }).not('processedby', 'is', null).neq('status', 'Request');

      // Apply search filter
      if (trackingSearchQuery) {
        query = query.or(`docnumber.ilike.%${trackingSearchQuery}%,receiver->>name.ilike.%${trackingSearchQuery}%`);
      }

      // Apply status filter
      if (trackingFilter !== 'All Documents') {
        if (trackingFilter === 'Processing') {
          query = query.in('status', ['processing', 'Processing', 'pending', 'Pending']);
        } else if (trackingFilter === 'Released') {
          query = query.in('status', ['released', 'Released', 'completed', 'Completed']);
        } else if (trackingFilter === 'Rejected') {
          query = query.in('status', ['rejected', 'Rejected']);
        } else if (trackingFilter === 'Ready') {
          query = query.in('status', ['ready', 'Ready', 'approved', 'Approved']);
        }
      }

      // Apply pagination
      const from = (trackingCurrentPage - 1) * trackingItemsPerPage;
      const to = from + trackingItemsPerPage - 1;
      query = query.range(from, to);

      // Order by updated_at desc
      query = query.order('updated_at', {
        ascending: false
      });
      const {
        data,
        error,
        count
      } = await query;
      if (error) {
        console.error('Error fetching document tracking:', error);
        return;
      }

      // Map data to match the expected format
      const mappedData = data?.map(doc => {
        let requestedBy = 'Unknown';
        if (doc.receiver) {
          try {
            if (typeof doc.receiver === 'object' && doc.receiver !== null && !Array.isArray(doc.receiver)) {
              requestedBy = (doc.receiver as any).name || 'Unknown';
            } else if (typeof doc.receiver === 'string') {
              const parsed = JSON.parse(doc.receiver);
              requestedBy = parsed.name || 'Unknown';
            }
          } catch {
            requestedBy = 'Unknown';
          }
        }
        const getStatusColor = (status: string) => {
          switch (status.toLowerCase()) {
            case 'approved':
            case 'ready':
              return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'rejected':
              return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            case 'pending':
            case 'request':
              return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
            case 'processing':
              return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
            case 'released':
              return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
            default:
              return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-700';
          }
        };
        const getDisplayStatus = (status: string) => {
          switch (status.toLowerCase()) {
            case 'approved':
            case 'ready':
              return 'Ready for Pickup';
            case 'rejected':
              return 'Rejected';
            case 'pending':
              return 'Pending';
            case 'processing':
              return 'Processing';
            case 'released':
              return 'Released';
            default:
              return status;
          }
        };
        return {
          id: doc.docnumber,
          document: doc.type,
          requestedBy,
          status: getDisplayStatus(doc.status),
          statusColor: getStatusColor(doc.status),
          lastUpdate: doc.updated_at ? formatDistanceToNow(new Date(doc.updated_at), {
            addSuffix: true
          }) : formatDistanceToNow(new Date(doc.created_at), {
            addSuffix: true
          })
        };
      }) || [];
      setDocumentTracking(mappedData);
      setTrackingTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready":
      case "approved":
        return "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/20 dark:border-emerald-800";
      case "processing":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
      case "review":
      case "pending":
      case "request":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800";
      case "rejected":
        return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
      case "released":
        return "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-900/20 dark:border-purple-800";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-800/20 dark:border-gray-700";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "ready":
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "processing":
        return <Clock className="h-4 w-4" />;
      case "review":
      case "pending":
      case "request":
        return <AlertCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "released":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Fetch recent document status updates from docrequests table
  const {
    data: statusUpdates
  } = useQuery({
    queryKey: ['document-status-updates', adminProfileId],
    queryFn: async () => {
      if (!adminProfileId) return [];

      // Get current admin's brgyid from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('brgyid')
        .eq('id', adminProfileId)
        .single();
      
      if (profileError || !profileData?.brgyid) {
        console.error('Error fetching admin profile:', profileError);
        return [];
      }

      // Query documents using the admin's brgyid
      const {
        data,
        error
      } = await supabase.from('docrequests').select(`
          id,
          docnumber,
          type,
          status,
          updated_at,
          receiver
        `).eq('brgyid', profileData.brgyid).not('status', 'eq', 'Request').order('updated_at', {
        ascending: false
      }).limit(4);
      
      if (error) {
        console.error('Error fetching status updates:', error);
        throw error;
      }
      
      return data?.map(doc => {
        let requesterName = 'Unknown';
        if (doc.receiver) {
          try {
            if (typeof doc.receiver === 'object' && doc.receiver !== null && !Array.isArray(doc.receiver)) {
              requesterName = (doc.receiver as any).name || 'Unknown';
            } else if (typeof doc.receiver === 'string') {
              const parsed = JSON.parse(doc.receiver);
              requesterName = parsed.name || 'Unknown';
            }
          } catch {
            requesterName = 'Unknown';
          }
        }
        const getStatusText = (status: string) => {
          switch (status.toLowerCase()) {
            case 'approved':
            case 'ready':
              return 'Ready for Pickup';
            case 'processing':
              return 'Processing';
            case 'pending':
              return 'For Review';
            case 'rejected':
              return 'Rejected';
            case 'released':
              return 'Released';
            default:
              return status;
          }
        };
        const getDescriptionText = (status: string, type: string, name: string) => {
          switch (status.toLowerCase()) {
            case 'approved':
            case 'ready':
              return `Document for ${name} has been signed and is ready for pickup at the Barangay Hall.`;
            case 'processing':
              return `${name}'s document is being processed. Pending approval from the Barangay Captain.`;
            case 'pending':
              return `${type} application for ${name} has been submitted for review. Pending verification of requirements.`;
            case 'rejected':
              return `${name}'s application for ${type} was rejected. Please contact the office for details.`;
            case 'released':
              return `${type} for ${name} has been successfully released.`;
            default:
              return `${type} for ${name} - Status: ${status}`;
          }
        };
        return {
          id: doc.id,
          title: `${doc.type} - ${getStatusText(doc.status)}`,
          description: getDescriptionText(doc.status, doc.type, requesterName),
          time: formatDistanceToNow(new Date(doc.updated_at), {
            addSuffix: true
          }),
          status: doc.status.toLowerCase(),
          trackingId: doc.docnumber
        };
      }) || [];
    },
    enabled: !!adminProfileId
  });


  // Handler to view request details from document requests
  const handleViewRequestDetails = async (request: any) => {
    try {
      // Fetch full request details using the request ID
      const { data, error } = await supabase
        .from('docrequests')
        .select('*')
        .eq('id', request.id)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch request details",
          variant: "destructive"
        });
        return;
      }

      // Transform data to match expected format
      let name = 'Unknown';
      if (data.receiver) {
        try {
          if (typeof data.receiver === 'object' && data.receiver !== null && !Array.isArray(data.receiver)) {
            name = (data.receiver as any).name || 'Unknown';
          } else if (typeof data.receiver === 'string') {
            const parsed = JSON.parse(data.receiver);
            name = parsed.name || 'Unknown';
          }
        } catch {
          name = 'Unknown';
        }
      }

      const requestData = {
        ...data,
        name
      };

      setSelectedRequest(requestData);
      setIsRequestDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch request details",
        variant: "destructive"
      });
    }
  };

  // Handler to view tracking item details
  const handleViewTrackingDetails = async (trackingItem: any) => {
    try {
      // Fetch full request details using docnumber
      const {
        data,
        error
      } = await supabase.from('docrequests').select('*').eq('docnumber', trackingItem.id).single();
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch request details",
          variant: "destructive"
        });
        return;
      }

      // Transform data to match expected format
      let name = 'Unknown';
      if (data.receiver) {
        try {
          if (typeof data.receiver === 'object' && data.receiver !== null && !Array.isArray(data.receiver)) {
            name = (data.receiver as any).name || 'Unknown';
          } else if (typeof data.receiver === 'string') {
            const parsed = JSON.parse(data.receiver);
            name = parsed.name || 'Unknown';
          }
        } catch {
          name = 'Unknown';
        }
      }
      const requestData = {
        ...data,
        name
      };
      
      // Debug: Log the data to see what fields are available
      console.log('Original Supabase data:', data);
      console.log('Final requestData:', requestData);
      console.log('Email field:', requestData.email);
      console.log('Contact field:', requestData["contact#"]);
      
      setSelectedRequest(requestData);
      setIsRequestDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching tracking details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch request details",
        variant: "destructive"
      });
    }
  };

  // Handler to edit tracking item status
  const handleEditTrackingStatus = (trackingItem: any) => {
    setSelectedTrackingItem(trackingItem);
    setIsEditStatusOpen(true);
  };

  // Handler to update request status
  const handleUpdateStatus = async (docnumber: string, newStatus: string) => {
    if (!adminProfileId) {
      toast({
        title: "Error",
        description: "Admin profile not found",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('docrequests').update({
        status: newStatus,
        processedby: adminProfileId,
        updated_at: new Date().toISOString()
      }).eq('docnumber', docnumber);
      if (error) {
        throw error;
      }
      toast({
        title: "Status Updated",
        description: `Request status updated to ${newStatus}`
      });

      // Refresh tracking data
      fetchDocumentTracking();
      setIsEditStatusOpen(false);
      setSelectedTrackingItem(null);
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive"
      });
    }
  };

  // Real handlers for approve/deny actions
  const handleApproveRequest = async (id: string, name: string) => {
    if (!adminProfileId) {
      toast({
        title: "Error",
        description: "Admin profile not found",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('docrequests').update({
        status: 'Pending',
        processedby: adminProfileId,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      if (error) {
        throw error;
      }
      toast({
        title: "Request Approved",
        description: `Approved request for ${name}`
      });

      // Close modal if open and refresh the list
      setIsRequestDetailsOpen(false);
      setSelectedRequest(null);
      fetchDocumentRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      });
    }
  };
  const handleDenyRequest = async (id: string, name: string) => {
    if (!adminProfileId) {
      toast({
        title: "Error",
        description: "Admin profile not found",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        error
      } = await supabase.from('docrequests').delete().eq('id', id);
      if (error) {
        throw error;
      }
      toast({
        title: "Request Denied",
        description: `Denied and removed request for ${name}`
      });

      // Close modal if open and refresh the list
      setIsRequestDetailsOpen(false);
      setSelectedRequest(null);
      fetchDocumentRequests();
    } catch (error) {
      console.error('Error denying request:', error);
      toast({
        title: "Error",
        description: "Failed to deny request",
        variant: "destructive"
      });
    }
  };
  const handleEditTemplate = template => {
    setEditingTemplate(template);
    setIsAddDocumentOpen(true);
  };
  const handleDeleteClick = template => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };
  const handleDeleteSuccess = () => {
    // Refetch the data instead of reloading the page
    refetchDocuments();
    setSelectedTemplate(null);
  };
  const handleViewTemplate = template => {
    setSelectedTemplate(template);
    setViewDialogOpen(true);
  };
  const handleTemplateSuccess = () => {
    setEditingTemplate(null);
    // Refetch the data instead of reloading the page
    refetchDocuments();
  };
  const handleCloseAddDocument = () => {
    setIsAddDocumentOpen(false);
    setEditingTemplate(null);
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate filtering, sorting and pagination for document types
  const normalize = (s: any) => String(s || '').trim().toLowerCase();
  const knownTypes = ['certificate', 'certificates', 'permit', 'permits', 'clearance', 'clearances', 'ids', 'identification', 'other'];
  const filteredDocumentTypes = (documentTypes || []).filter((dt: any) => {
    const t = normalize(dt.type);
    if (activeTab === 'all') return true;
    if (activeTab === 'certificates') return t === 'certificate' || t === 'certificates';
    if (activeTab === 'permits') return t === 'permit' || t === 'permits';
    if (activeTab === 'clearances') return t === 'clearance' || t === 'clearances';
    if (activeTab === 'ids') return t === 'ids' || t === 'identification';
    if (activeTab === 'other') return t === 'other' || !knownTypes.includes(t);
    return true;
  });
  const sortedDocumentTypes = filteredDocumentTypes.slice().sort((a: any, b: any) => {
    const at = normalize(a.type);
    const bt = normalize(b.type);
    if (at < bt) return -1;
    if (at > bt) return 1;
    const an = normalize(a.name);
    const bn = normalize(b.name);
    if (an < bn) return -1;
    if (an > bn) return 1;
    return 0;
  });
  const totalPages = Math.ceil((sortedDocumentTypes.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocumentTypes = sortedDocumentTypes.slice(startIndex, startIndex + itemsPerPage);

  // Show loading screen on initial page load only
  if (isInitialLoading) {
    return <div className="relative w-full min-h-screen">
        <LocalizedLoadingScreen isLoading={true} />
      </div>;
  }
  return <div className="w-full p-6 bg-background min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Barangay Document Management</h1>
        <p className="text-muted-foreground">Manage official documents, requests, and issuances for the barangay community</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">{filteredStats.readyForPickup + filteredStats.processing + filteredStats.released + filteredStats.rejected}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Document Requests</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalCount || 0}</p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-full">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Issued Today</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{documentStats?.issuedToday || 0}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Templates</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{documentTypes?.length || 0}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-full">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Processing Status */}
      <Card className="mb-8 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              <CardTitle className="text-lg text-foreground">Document Processing Status</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="week">
                <SelectTrigger className="w-32 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready for Pickup</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{filteredStats.readyForPickup}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400" />
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredStats.processing}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Released</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{filteredStats.released}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{filteredStats.rejected}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing Time (Average)</span>
              <span>Updated: Today, 11:30 AM</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full" style={{
              width: '70%'
            }}></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 days</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">1.2 days</span>
              <span>3 days (target)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Requests and Quick Actions Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Document Requests Section with improved buttons */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-background via-background/95 to-muted/20 border border-border/60 shadow-lg backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-foreground font-semibold">Document Requests</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Pending approvals</p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-medium text-primary">{documentRequests.length}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative flex flex-col h-96 pt-0">
            {false ? 
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    <div className="absolute inset-0 w-8 h-8 rounded-full bg-primary/10" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Loading requests...</p>
                </div>
              </div> : 
              <>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {documentRequests.length > 0 ? (
                    <div className="space-y-3 h-full overflow-y-auto pr-2 -mr-2">
                      {documentRequests.map((request, index) => 
                        <div 
                          key={request.id} 
                          className="group relative p-4 bg-gradient-to-r from-card via-card/80 to-card/60 border border-border/60 rounded-xl cursor-pointer hover:border-primary/30 hover:shadow-md hover:bg-gradient-to-r hover:from-accent/20 hover:via-background hover:to-background/80 transition-all duration-300 animate-fade-in backdrop-blur-sm"
                          style={{ animationDelay: `${index * 100}ms` }}
                          onClick={() => handleViewRequestDetails(request)}
                        >
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20 rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                                  <span className="text-sm font-semibold text-primary/80 group-hover:text-primary transition-colors">
                                    {request.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-background shadow-sm animate-pulse" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{request.name}</h4>
                                <p className="text-sm text-muted-foreground/80 font-medium truncate">{request.document}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse" />
                                  <p className="text-xs text-muted-foreground">{request.timeAgo}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={e => {
                                  e.stopPropagation();
                                  handleApproveRequest(request.id, request.name);
                                }} 
                                className="relative overflow-hidden bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border-emerald-200/60 text-emerald-700 hover:text-emerald-800 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all duration-300 dark:from-emerald-950/30 dark:to-green-950/30 dark:hover:from-emerald-900/40 dark:hover:to-green-900/40 dark:border-emerald-800/60 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:border-emerald-700 backdrop-blur-sm"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                                <Check className="h-3.5 w-3.5 mr-1.5 relative z-10" />
                                <span className="relative z-10 font-medium">Approve</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDenyRequest(request.id, request.name);
                                }} 
                                className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border-red-200/60 text-red-700 hover:text-red-800 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-300 dark:from-red-950/30 dark:to-rose-950/30 dark:hover:from-red-900/40 dark:hover:to-rose-900/40 dark:border-red-800/60 dark:text-red-400 dark:hover:text-red-300 dark:hover:border-red-700 backdrop-blur-sm"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-rose-500/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                                <X className="h-3.5 w-3.5 mr-1.5 relative z-10" />
                                <span className="relative z-10 font-medium">Deny</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl flex items-center justify-center mb-4 border border-border/60">
                        <FileCheck className="h-7 w-7 text-muted-foreground/60" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No pending requests</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">New requests will appear here</p>
                    </div>
                  )}
                </div>
                
                {/* Modern Pagination */}
                <div className="mt-4 pt-4 border-t border-gradient-to-r from-transparent via-border/60 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-pulse" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Page {requestsCurrentPage} of {Math.max(Math.ceil(totalCount / itemsPerPage), 1)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setRequestsCurrentPage(prev => Math.max(prev - 1, 1))} 
                        disabled={requestsCurrentPage === 1}
                        className="h-8 w-8 p-0 bg-gradient-to-br from-background to-muted/20 border-border/60 hover:border-primary/30 hover:bg-gradient-to-br hover:from-accent/50 hover:to-background shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-sm backdrop-blur-sm"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setRequestsCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / itemsPerPage)))} 
                        disabled={requestsCurrentPage === Math.ceil(totalCount / itemsPerPage)}
                        className="h-8 w-8 p-0 bg-gradient-to-br from-background to-muted/20 border-border/60 hover:border-primary/30 hover:bg-gradient-to-br hover:from-accent/50 hover:to-background shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:hover:shadow-sm backdrop-blur-sm"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            }
          </CardContent>
        </Card>

        {/* Quick Actions Section */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <CardTitle className="text-foreground">Quick Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <Button className="flex items-center gap-2 justify-start h-auto p-4 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800" onClick={() => setIsIssueDocumentOpen(true)}>
                <Plus className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Issue New Document</div>
                  <div className="text-xs">Create and issue documents</div>
                </div>
              </Button>
              
              <Button className="flex items-center gap-2 justify-start h-auto p-4 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800" onClick={() => setIsAddDocumentOpen(true)}>
                <Upload className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Add Document Template</div>
                  <div className="text-xs">Add new document templates</div>
                </div>
              </Button>
              
              <Button className="flex items-center gap-2 justify-start h-auto p-4 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800">
                <BarChart3 className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">View Reports</div>
                  <div className="text-xs">Document statistics and analytics</div>
                </div>
              </Button>
              
              <Button className="flex items-center gap-2 justify-start h-auto p-4 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800" onClick={() => setIsSettingsDialogOpen(true)}>
                <Settings className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Payment Setup</div>
                  <div className="text-xs">Configure document payment settings</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Tracking System */}
      <Card className="mb-8 border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              <CardTitle className="text-foreground">Document Tracking System</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search by tracking ID..." value={trackingSearchQuery} onChange={e => setTrackingSearchQuery(e.target.value)} className="pl-10 border-border bg-background text-foreground" />
            </div>
            <div className="flex gap-2">
              {["All Documents", "Processing", "Released", "Rejected", "Ready"].map(filter => <Button key={filter} variant={trackingFilter === filter ? "default" : "outline"} size="sm" onClick={() => setTrackingFilter(filter)} className={trackingFilter === filter ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-border text-foreground hover:bg-accent"}>
                  {filter}
                </Button>)}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-foreground">Tracking ID</TableHead>
                <TableHead className="text-foreground">Document</TableHead>
                <TableHead className="text-foreground">Requested By</TableHead>
                <TableHead className="text-foreground">Status</TableHead>
                <TableHead className="text-foreground">Last Update</TableHead>
                <TableHead className="text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentTracking.map(doc => <TableRow key={doc.id} className="border-border hover:bg-accent">
                  <TableCell>
                    <span className="text-purple-600 dark:text-purple-400 font-medium">{doc.id}</span>
                  </TableCell>
                  <TableCell className="text-foreground">{doc.document}</TableCell>
                  <TableCell className="text-foreground">{doc.requestedBy}</TableCell>
                  <TableCell>
                    <Badge className={doc.statusColor}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{doc.lastUpdate}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="hover:bg-accent" onClick={() => handleViewTrackingDetails(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="hover:bg-accent" onClick={() => handleEditTrackingStatus(doc)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min(trackingItemsPerPage, trackingTotalCount)} of {trackingTotalCount} documents requests
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setTrackingCurrentPage(prev => Math.max(prev - 1, 1))} disabled={trackingCurrentPage === 1}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {trackingCurrentPage} of {Math.ceil(trackingTotalCount / trackingItemsPerPage)}
              </span>
              <Button variant="outline" size="sm" onClick={() => setTrackingCurrentPage(prev => Math.min(prev + 1, Math.ceil(trackingTotalCount / trackingItemsPerPage)))} disabled={trackingCurrentPage === Math.ceil(trackingTotalCount / trackingItemsPerPage)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Library */}
        <div className="lg:col-span-2">
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-foreground">Document Library</CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 w-64 border-border bg-background text-foreground" />
                  </div>
                  <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setIsAddDocumentOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-6 border-b border-border">
                  <TabsList className="bg-transparent h-auto p-0">
                    <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-600 dark:data-[state=active]:border-purple-400 rounded-none text-foreground">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="certificates" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-600 dark:data-[state=active]:border-purple-400 rounded-none text-foreground">
                      Certificates
                    </TabsTrigger>
                    <TabsTrigger value="permits" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-600 dark:data-[state=active]:border-purple-400 rounded-none text-foreground">
                      Permits
                    </TabsTrigger>
                    <TabsTrigger value="clearances" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-600 dark:data-[state=active]:border-purple-400 rounded-none text-foreground">
                      Clearances
                    </TabsTrigger>
                    <TabsTrigger value="ids" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-600 dark:data-[state=active]:border-purple-400 rounded-none text-foreground">
                      IDs
                    </TabsTrigger>
                    <TabsTrigger value="other" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-purple-600 dark:data-[state=active]:border-purple-400 rounded-none text-foreground">
                      Other
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value={activeTab} className="mt-0">
                  <div className="p-6">
                    

                    <div className="space-y-3">
                      {isLoadingDocuments ? <div className="text-center py-8 text-muted-foreground">Loading document templates...</div> : paginatedDocumentTypes && paginatedDocumentTypes.length > 0 ? paginatedDocumentTypes.map(doc => <div key={doc.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors">
                            <div className="flex items-center gap-4">
                              <input type="checkbox" className="rounded border-border" />
                              <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/20">
                                <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground">{doc.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {doc.description ? `${doc.description} • ` : ''}
                                  Fee: ₱{doc.fee || 0}
                                  {doc.validity_days ? ` • Valid for ${doc.validity_days} days` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800">
                                Active
                              </Badge>
                              <Button variant="ghost" size="sm" onClick={() => handleViewTemplate(doc)} className="hover:bg-accent">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(doc)} className="hover:bg-accent">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(doc)} className="hover:bg-accent">
                                <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                              </Button>
                            </div>
                          </div>) : <div className="text-center py-8">
                          <p className="text-muted-foreground">No document templates found.</p>
                          <p className="text-sm text-muted-foreground">Add a new template to get started.</p>
                        </div>}
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          Showing {Math.min(paginatedDocumentTypes.length, itemsPerPage)} of {sortedDocumentTypes.length} documents
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious onClick={() => handlePageChange(Math.max(1, currentPage - 1))} className={`${currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-accent"}`} />
                            </PaginationItem>
                            {Array.from({
                            length: totalPages
                          }, (_, i) => i + 1).map(page => <PaginationItem key={page}>
                                <PaginationLink onClick={() => handlePageChange(page)} isActive={currentPage === page} className={`cursor-pointer ${currentPage === page ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                                  {page}
                                </PaginationLink>
                              </PaginationItem>)}
                            <PaginationItem>
                              <PaginationNext onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} className={`${currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer hover:bg-accent"}`} />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Document Status Updates Sidebar */}
        <div>
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <div className="bg-green-100 dark:bg-green-900/20 p-1 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                Document Status Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-0">
                {(statusUpdates || []).map((update, index) => <div key={update.id} className={`p-4 border-b border-border ${index === (statusUpdates || []).length - 1 ? 'border-b-0' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full border-2 ${getStatusColor(update.status)}`}>
                        {getStatusIcon(update.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm">{update.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{update.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{update.time}</span>
                          <Badge variant="outline" className="text-xs px-1 py-0 border-border">
                            {update.trackingId}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>)}
              </div>
              <div className="p-4 border-t border-border">
                {statusUpdates && statusUpdates.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No recent status updates</p>
                    <p className="text-xs text-muted-foreground">Updates will appear when document statuses change</p>
                  </div>
                )}
                {statusUpdates && statusUpdates.length > 0 && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm" className="text-xs w-full justify-center hover:bg-accent">
                      View All Updates
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Document Template Dialog */}
      <Dialog open={isAddDocumentOpen} onOpenChange={setIsAddDocumentOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DocumentTemplateForm template={editingTemplate} onClose={handleCloseAddDocument} onSuccess={handleTemplateSuccess} />
        </DialogContent>
      </Dialog>

      {/* Issue Document Dialog */}
      <Dialog open={isIssueDocumentOpen} onOpenChange={setIsIssueDocumentOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-border">
          <DialogHeader>
            <DialogTitle>Issue New Document</DialogTitle>
          </DialogHeader>
          <IssueDocumentForm onClose={() => setIsIssueDocumentOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* View Document Template Dialog */}
      <DocumentViewDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} template={selectedTemplate} />

      {/* Delete Document Template Dialog */}
      <DocumentDeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} template={selectedTemplate} onDeleteSuccess={handleDeleteSuccess} />

      {/* Document Settings Dialog */}
      <DocumentSettingsDialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} />

      {/* Document Request Details Modal (for tracking system only) */}
      <DocumentRequestDetailsModal isOpen={isRequestDetailsOpen} onClose={() => setIsRequestDetailsOpen(false)} request={selectedRequest} onApprove={handleApproveRequest} onDeny={handleDenyRequest} />


      {/* Edit Status Modal */}
      <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle>Edit Request Status</DialogTitle>
          </DialogHeader>
          {selectedTrackingItem && <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Document: {selectedTrackingItem.document}</p>
                <p className="text-sm text-muted-foreground">Tracking ID: {selectedTrackingItem.id}</p>
                <p className="text-sm text-muted-foreground">Requested by: {selectedTrackingItem.requestedBy}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status:</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleUpdateStatus(selectedTrackingItem.id, 'Processing')} variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:text-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400">
                    Processing
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedTrackingItem.id, 'Ready')} variant="outline" className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:border-green-800 dark:text-green-400">
                    Ready
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedTrackingItem.id, 'Rejected')} variant="outline" className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:border-red-800 dark:text-red-400">
                    Rejected
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedTrackingItem.id, 'Released')} variant="outline" className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:text-purple-800 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:border-purple-800 dark:text-purple-400">
                    Released
                  </Button>
                </div>
              </div>
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default DocumentsPage;