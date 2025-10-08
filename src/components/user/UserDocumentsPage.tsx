import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import LocalizedLoadingScreen from "@/components/ui/LocalizedLoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DocumentIssueForm from "@/components/documents/DocumentIssueForm";
import DocumentRequestModal from "./DocumentRequestModal";
import {
  FileText,
  Clock,
  CheckCircle,
  BarChart3,
  Package,
  Hourglass,
  Eye,
  XCircle,
  TrendingUp,
  Search,
  Plus,
  Filter,
  Download,
  Edit,
  Trash2,
  RefreshCw,
  FileX,
  History,
  PlusCircle,
  Bell,
  Upload,
  ArrowRight,
  Settings,
  MoreHorizontal,
  MessageCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
const UserDocumentsPage = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [requestsCurrentPage, setRequestsCurrentPage] = useState(1);
  const [trackingSearchQuery, setTrackingSearchQuery] = useState("");
  const [trackingFilter, setTrackingFilter] = useState("All Documents");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Auto-refresh data on page visit
  useEffect(() => {
    const refreshData = async () => {
      setIsRefreshing(true);
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["user-document-requests"] }),
          queryClient.invalidateQueries({ queryKey: ["document-types"] }),
        ]);
      } finally {
        setIsRefreshing(false);
      }
    };

    refreshData();
  }, [queryClient]);

  // Define the enriched request type
  type EnrichedDocumentRequest = {
    id: string;
    resident_id: string;
    type: string;
    status: string;
    purpose: string;
    docnumber: string;
    created_at: string;
    updated_at: string;
    amount?: number;
    method?: string;
    notes?: string;
    receiver?: any;
    profiles: {
      id: string;
      firstname: string;
      lastname: string;
    } | null;
  } & Record<string, any>;

  // Initial loading state management
  useEffect(() => {
    if (userProfile?.id) {
      // Only set loading to false once we have a user profile
      setIsInitialLoading(false);
    }
  }, [userProfile?.id]);

  // Reset pagination when tracking filter changes
  useEffect(() => {
    setRequestsCurrentPage(1);
  }, [trackingFilter]);

  // Reset pagination when search query changes
  useEffect(() => {
    setRequestsCurrentPage(1);
  }, [trackingSearchQuery]);

  // Fetch user's document requests from Supabase with real-time updates
  const {
    data: documentRequests = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["user-document-requests", userProfile?.id],
    queryFn: async (): Promise<EnrichedDocumentRequest[]> => {
      if (!userProfile?.id) return [];

      try {
        // Simplified query to fetch all user's document requests without JOIN
        const { data: requests, error: requestsError } = await supabase
          .from("docrequests")
          .select("*")
          .eq("resident_id", userProfile.id)
          .order("created_at", { ascending: false });

        if (requestsError) {
          console.error("Error fetching document requests:", requestsError);
          throw requestsError;
        }

        if (!requests || requests.length === 0) {
          return [];
        }

        // Add profile data from current user context since users can only see their own documents
        const enrichedRequests: EnrichedDocumentRequest[] = requests.map((request) => ({
          ...request,
          profiles: {
            id: userProfile.id,
            firstname: userProfile.firstname || "Unknown",
            lastname: userProfile.lastname || "User",
          },
        }));

        return enrichedRequests;
      } catch (error) {
        console.error("Query function error:", error);
        throw error;
      }
    },
    enabled: !!userProfile?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced for better real-time consistency
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Set up real-time subscription for user document requests
  useEffect(() => {
    if (!userProfile?.id) return;

    console.log("Setting up real-time subscription for user:", userProfile.id);

    const channel = supabase
      .channel(`user-document-requests-${userProfile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "docrequests",
          filter: `resident_id=eq.${userProfile.id}`,
        },
        (payload) => {
          console.log("Real-time update received:", payload.eventType, payload.new || payload.old);
          // Use query invalidation instead of refetch to avoid conflicts
          queryClient.invalidateQueries({
            queryKey: ["user-document-requests", userProfile.id],
          });
        },
      )
      .subscribe();

    return () => {
      console.log("Cleaning up real-time subscription");
      supabase.removeChannel(channel);
    };
  }, [userProfile?.id, queryClient]);

  // Fetch document types from Supabase
  const { data: documentTypes = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["document-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("document_types").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });
  const itemsPerPage = 5;
  const totalPages = Math.ceil(documentTypes.length / itemsPerPage);
  const requestsPerPage = 4;

  // Filter document requests based on tracking filter and search query
  const getFilteredRequests = () => {
    let filteredByStatus = documentRequests;

    // Apply status filter
    if (trackingFilter !== "All Documents") {
      filteredByStatus = documentRequests.filter((request) => {
        const status = request.status.toLowerCase();
        switch (trackingFilter) {
          case "Requests":
            return status === "request" || status === "pending";
          case "Processing":
            return status === "processing" || status === "pending" || status === "for review";
          case "Released":
            return status === "released" || status === "completed";
          case "Rejected":
            return status === "rejected";
          case "Ready":
            return status === "ready for pickup" || status === "ready" || status === "approved";
          default:
            return true;
        }
      });
    }

    // Apply search filter by tracking ID
    if (trackingSearchQuery.trim()) {
      filteredByStatus = filteredByStatus.filter((request) =>
        request.docnumber?.toLowerCase().includes(trackingSearchQuery.toLowerCase()),
      );
    }
    return filteredByStatus;
  };
  const filteredRequests = getFilteredRequests();
  const requestsTotalPages = Math.ceil(filteredRequests.length / requestsPerPage);

  // Calculate paginated data using real Supabase data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTemplates = documentTypes.slice(startIndex, endIndex);

  // Calculate paginated document requests
  const requestsStartIndex = (requestsCurrentPage - 1) * requestsPerPage;
  const requestsEndIndex = requestsStartIndex + requestsPerPage;
  const paginatedRequests = filteredRequests.slice(requestsStartIndex, requestsEndIndex);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  const handleRequestsPageChange = (page: number) => {
    if (page >= 1 && page <= requestsTotalPages) {
      setRequestsCurrentPage(page);
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            Processing
          </Badge>
        );
      case "for review":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
            For Review
          </Badge>
        );
      case "approved":
      case "ready for pickup":
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            Ready for Pickup
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">
            Rejected
          </Badge>
        );
      case "released":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 hover:bg-purple-50">
            Released
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
            {status}
          </Badge>
        );
    }
  };

  // Helper function for case-insensitive status matching
  const matchesStatus = (requestStatus: string, targetStatus: string): boolean => {
    return requestStatus.toLowerCase() === targetStatus.toLowerCase();
  };

  // Helper function for case-insensitive multiple status matching
  const matchesAnyStatus = (requestStatus: string, targetStatuses: string[]): boolean => {
    return targetStatuses.some((status) => matchesStatus(requestStatus, status));
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  if (isInitialLoading) {
    return (
      <div className="w-full p-6 bg-background min-h-screen relative">
        <LocalizedLoadingScreen isLoading={isInitialLoading} />
      </div>
    );
  }
  return (
    <div className="w-full max-w-full overflow-x-hidden px-3 md:px-4 lg:px-6 py-4 lg:py-6 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Mobile-first Header */}
      <div className="mb-8">
        <div className="relative">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Documents
          </h1>
          <div className="absolute -bottom-1 left-0 h-1 w-20 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
        </div>
        <p className="text-muted-foreground hidden md:block mt-3 text-lg">
          Skip the line. Request and monitor your barangay documents from home.
        </p>
      </div>

      {/* Status Cards - Horizontal Scroll on Mobile */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 shadow-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            Status Overview
          </h2>
          <button
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ["user-document-requests"] }),
                  queryClient.invalidateQueries({ queryKey: ["document-types"] }),
                ]);
              } finally {
                setIsRefreshing(false);
              }
            }}
            disabled={isRefreshing}
            className={`p-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl transition-all duration-200 hover:shadow-md ${isRefreshing ? "cursor-not-allowed opacity-75" : ""}`}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Swipeable Status Cards */}
        <div className="w-full -mx-4 px-4 md:mx-0 md:px-0">
          <div className="min-w-0 md:hidden">
            <Swiper
              modules={[FreeMode]}
              slidesPerView="auto"
              spaceBetween={12}
              freeMode={{
                enabled: true,
                momentum: true,
              }}
              className="!pb-4"
            >
              <SwiperSlide className="!w-32 md:!w-36 lg:!w-40">
                <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
                  <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                      <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Requests</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                      {documentRequests.filter((req) => matchesStatus(req.status, "Request")).length}
                    </p>
                  </div>
                </div>
              </SwiperSlide>

              <SwiperSlide className="!w-32 md:!w-36 lg:!w-40">
                <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                      <Hourglass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Processing</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {documentRequests.filter((req) => matchesStatus(req.status, "processing")).length}
                    </p>
                  </div>
                </div>
              </SwiperSlide>

              <SwiperSlide className="!w-32 md:!w-36 lg:!w-40">
                <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
                  <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/50 dark:border-green-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                      <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Ready</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {documentRequests.filter((req) => matchesStatus(req.status, "ready")).length}
                    </p>
                  </div>
                </div>
              </SwiperSlide>

              <SwiperSlide className="!w-32 md:!w-36 lg:!w-40">
                <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
                  <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                      <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Released</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                      {documentRequests.filter((req) => matchesAnyStatus(req.status, ["released", "completed"])).length}
                    </p>
                  </div>
                </div>
              </SwiperSlide>

              <SwiperSlide className="!w-40">
                <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
                  <div className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                    <div className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Rejected</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {documentRequests.filter((req) => matchesStatus(req.status, "rejected")).length}
                    </p>
                  </div>
                </div>
              </SwiperSlide>
            </Swiper>
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid md:grid-cols-5 gap-6">
            <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
              <div className="rounded-2xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/20 border border-yellow-200/50 dark:border-yellow-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/50 dark:to-yellow-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Requests</p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {documentRequests.filter((req) => matchesStatus(req.status, "Request")).length}
                </p>
              </div>
            </div>

            <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
              <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200/50 dark:border-blue-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                  <Hourglass className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Processing</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {documentRequests.filter((req) => matchesStatus(req.status, "processing")).length}
                </p>
              </div>
            </div>

            <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
              <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/50 dark:border-green-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                  <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Ready</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {documentRequests.filter((req) => matchesStatus(req.status, "ready")).length}
                </p>
              </div>
            </div>

            <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
              <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border border-purple-200/50 dark:border-purple-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Released</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {documentRequests.filter((req) => matchesAnyStatus(req.status, ["released", "completed"])).length}
                </p>
              </div>
            </div>

            <div className="group cursor-pointer transition-all duration-300 hover:scale-105">
              <div className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/30 p-5 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm">
                <div className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/30 p-3 rounded-xl mb-4 shadow-inner group-hover:shadow-md transition-shadow duration-300">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {documentRequests.filter((req) => matchesStatus(req.status, "rejected")).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-muted-foreground mt-6 p-4 bg-card/50 rounded-xl border border-border/50 backdrop-blur-sm w-80 ml-0 mr-auto md:w-full md:ml-0 md:mr-0">
          <span className="font-medium">
            Total Documents: <span className="text-primary font-bold">{documentRequests.length}</span>
          </span>
          <span className="hidden md:block">
            Last Updated:{" "}
            {documentRequests.length > 0
              ? formatDate(
                  new Date(
                    Math.max(...documentRequests.map((req) => new Date(req.updated_at || req.created_at).getTime())),
                  ).toISOString(),
                )
              : "No documents"}
          </span>
        </div>
      </div>

      {/* Document Tracking - Mobile Card Layout */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <span className="hidden md:inline">Document Tracking System</span>
            <span className="md:hidden">My Requests</span>
          </h2>
          {/* Desktop Request Button - Hidden on Mobile */}
          <Button
            onClick={() => setShowRequestModal(true)}
            className="hidden md:flex bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Request Document
          </Button>
        </div>

        {/* Mobile-first Search and Filters */}
        <div className="space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-6 mb-6">
          <div className="relative w-80 ml-0 mr-auto md:w-full md:ml-0 md:mr-0">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <input
              type="text"
              placeholder="Search by tracking ID..."
              value={trackingSearchQuery}
              onChange={(e) => setTrackingSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 w-full md:w-2/3 lg:w-1/2 bg-card/50 text-foreground backdrop-blur-sm shadow-sm hover:shadow-md"
            />
          </div>

          {/* Mobile Dropdown Filter */}
          <div className="lg:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-between bg-card/70 border-border/50 hover:bg-accent/50 backdrop-blur-sm shadow-sm hover:shadow-md min-w-fit md:w-48"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {trackingFilter}
                  </span>
                  <div className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-card/95 backdrop-blur-sm border-border/50 shadow-xl z-50">
                {["All Documents", "Requests", "Processing", "Released", "Ready", "Rejected"].map((filter) => (
                  <DropdownMenuItem
                    key={filter}
                    onClick={() => setTrackingFilter(filter)}
                    className={`cursor-pointer hover:bg-accent/50 focus:bg-accent/50 ${
                      trackingFilter === filter ? "bg-primary/10 text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    {filter}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop Horizontal Filters */}
          <div className="hidden lg:flex gap-3 pb-2 md:pb-0">
            {["All Documents", "Requests", "Processing", "Released", "Ready", "Rejected"].map((filter) => (
              <button
                key={filter}
                onClick={() => setTrackingFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all duration-200 font-medium shadow-sm hover:shadow-md ${
                  trackingFilter === filter
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg transform scale-105"
                    : "bg-card/70 text-foreground hover:bg-accent/50 border border-border/50"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Card Feed for Mobile, Table for Desktop */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-3"></div>
              <p>Loading your document requests...</p>
            </div>
          ) : documentRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileX className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No document requests found</p>
            </div>
          ) : (
            paginatedRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-card rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden w-80 ml-0 mr-auto"
              >
                <div className="p-4">
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-primary opacity-80 mb-2 truncate">
                        #{request.docnumber}
                      </div>
                      <div className="text-foreground font-semibold text-xl leading-tight break-words">
                        {request.type}
                      </div>
                    </div>
                    <div className="ml-3 flex-shrink-0">{getStatusBadge(request.status)}</div>
                  </div>

                  {/* Info Section */}
                  <div className="bg-muted/20 rounded-xl p-4 mb-5">
                    <div className="flex flex-col space-y-3">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground font-medium text-sm mb-1">Requested by:</span>
                        <span className="text-foreground font-semibold break-words">
                          {request.profiles?.firstname && request.profiles?.lastname
                            ? `${request.profiles.firstname} ${request.profiles.lastname}`
                            : userProfile?.firstname && userProfile?.lastname
                              ? `${userProfile.firstname} ${userProfile.lastname}`
                              : "You"}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground font-medium text-sm mb-1">Last update:</span>
                        <span className="text-foreground font-semibold">
                          {formatDate(request.updated_at || request.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-border/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowViewDialog(true);
                      }}
                      className="text-primary hover:bg-primary/10 hover:text-primary font-medium transition-all duration-200"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {request.status === "Request" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRequest(request);
                          setShowRequestModal(true);
                        }}
                        className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 font-medium transition-all duration-200"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table - Hidden on Mobile */}
        <div className="hidden md:block bg-gradient-to-br from-card/80 to-card/40 rounded-2xl shadow-lg border border-border/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/30">
              <thead className="bg-gradient-to-r from-muted/50 to-muted/30">
                <tr>
                  <th
                    scope="col"
                    className="px-8 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Tracking ID
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Document
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Requested By
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Last Update
                  </th>
                  <th
                    scope="col"
                    className="px-8 py-4 text-right text-xs font-bold text-muted-foreground uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card/30 divide-y divide-border/20">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-muted-foreground">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-3"></div>
                      <p>Loading your document requests...</p>
                    </td>
                  </tr>
                ) : documentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-muted-foreground">
                      <FileX className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No document requests found</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-accent/30 transition-all duration-200 group">
                      <td className="px-8 py-6 whitespace-nowrap text-sm font-mono text-primary font-bold group-hover:text-primary/80">
                        {request.docnumber}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm text-foreground font-medium">
                        {request.type}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm text-foreground">
                        {request.profiles?.firstname && request.profiles?.lastname
                          ? `${request.profiles.firstname} ${request.profiles.lastname}`
                          : userProfile?.firstname && userProfile?.lastname
                            ? `${userProfile.firstname} ${userProfile.lastname}`
                            : "You"}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap">{getStatusBadge(request.status)}</td>
                      <td className="px-8 py-6 whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(request.updated_at || request.created_at)}
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowViewDialog(true);
                            }}
                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all duration-200 hover:shadow-md"
                            title="View request details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (request.status === "Request") {
                                setEditingRequest(request);
                                setShowRequestModal(true);
                              }
                            }}
                            disabled={request.status !== "Request"}
                            className={`p-2 rounded-xl transition-all duration-200 ${
                              request.status === "Request"
                                ? "text-muted-foreground hover:text-secondary hover:bg-secondary/10 hover:shadow-md"
                                : "text-muted-foreground/30 cursor-not-allowed"
                            }`}
                            title={request.status === "Request" ? "Edit request" : "Cannot edit processed request"}
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {requestsTotalPages > 1 && (
          <div className="mt-4 w-80 ml-0 mr-auto md:w-full md:ml-0 md:mr-0">
            <div className="flex justify-center items-center gap-1">
              <span className="hidden md:block text-sm text-muted-foreground mr-4">
                Showing {requestsStartIndex + 1}-{Math.min(requestsEndIndex, filteredRequests.length)} of{" "}
                {filteredRequests.length} documents
              </span>
              <button
                onClick={() => handleRequestsPageChange(requestsCurrentPage - 1)}
                disabled={requestsCurrentPage === 1}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  requestsCurrentPage === 1
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                Previous
              </button>
              <div className="flex">
                {Array.from({ length: requestsTotalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handleRequestsPageChange(page)}
                    className={`px-3 py-1 text-sm rounded-md font-medium ${
                      requestsCurrentPage === page ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleRequestsPageChange(requestsCurrentPage + 1)}
                disabled={requestsCurrentPage === requestsTotalPages}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  requestsCurrentPage === requestsTotalPages
                    ? "text-muted-foreground cursor-not-allowed"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Library - Mobile Simplified */}
      <div className="md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-6">
        <div className="md:lg:col-span-2">
          <Card className="border-border w-80 ml-0 mr-auto md:w-full md:ml-0 md:mr-0">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg md:text-xl text-foreground">Available Documents</CardTitle>
                <div className="flex items-center gap-3">
                  {/* Mobile search - simplified */}
                  <div className="relative flex-1 md:flex-initial">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 md:w-64 border-border bg-background text-foreground"
                    />
                  </div>
                  {/* Hide desktop request button */}
                  <Button
                    className="hidden md:flex bg-purple-600 hover:bg-purple-700 text-white"
                    onClick={() => setShowRequestModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request Document
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 md:p-6">
                <div className="space-y-3">
                  {isLoadingTemplates ? (
                    <div className="text-center py-8 text-muted-foreground">Loading document templates...</div>
                  ) : paginatedTemplates.length > 0 ? (
                    paginatedTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 md:gap-4 flex-1">
                          {/* Hide checkbox on mobile for cleaner look */}
                          <input type="checkbox" className="hidden md:block rounded border-border" />
                          <div className="p-2 rounded bg-blue-100 dark:bg-blue-900/20 flex-shrink-0">
                            <FileText className="h-4 w-4 md:h-5 md:w-5 text-blue-500 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-foreground text-sm md:text-base truncate">
                              {template.name}
                            </h4>
                            <p className="text-xs md:text-sm text-muted-foreground">
                              <span className="md:hidden">₱{template.fee || 0}</span>
                              <span className="hidden md:inline">
                                {template.description} • Fee: ₱{template.fee || 0}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className="hidden md:block bg-green-500 hover:bg-green-600 text-white">Active</Badge>
                          <button
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowTemplateDialog(true);
                            }}
                            className="p-1.5 md:p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                            title="View template details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No document templates found</div>
                  )}
                </div>

                {/* Mobile-friendly pagination */}
                <div className="flex items-center justify-center mt-6">
                  <div className="hidden md:block text-sm text-muted-foreground mb-4">
                    Showing {startIndex + 1}-{Math.min(endIndex, documentTypes.length)} of {documentTypes.length}{" "}
                    documents
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(currentPage - 1);
                          }}
                          className={`hover:bg-accent cursor-pointer ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(page);
                            }}
                            isActive={currentPage === page}
                            className={`cursor-pointer ${currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(currentPage + 1);
                          }}
                          className={`hover:bg-accent cursor-pointer ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Updates - Hidden on mobile for cleaner view */}
        <div className="hidden md:block space-y-6">
          <div className="mb-6 bg-card rounded-lg shadow-sm overflow-hidden border border-border">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <History className="h-5 w-5" />
                Document Status Updates
              </h2>
            </div>
            <div className="p-0 overflow-visible">
              <div className="relative">
                <div className="p-6 relative z-10 overflow-visible">
                  {/* removed z-index line */}
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading updates...</p>
                    </div>
                  ) : documentRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">No document updates yet</p>
                    </div>
                  ) : (
                    documentRequests
                      .sort(
                        (a, b) =>
                          new Date(b.updated_at || b.created_at).getTime() -
                          new Date(a.updated_at || a.created_at).getTime(),
                      )
                      .slice(0, 4)
                      .map((request, index) => {
                        const isLast = index === Math.min(3, documentRequests.length - 1);

                        // Normalize status for better matching
                        const normalizedStatus = request.status.toLowerCase();

                        // Determine status display and styling
                        let statusInfo;
                        if (matchesAnyStatus(request.status, ["approved", "ready for pickup", "ready"])) {
                          statusInfo = {
                            text: "Ready for Pickup",
                            dotClass: "bg-green-500",
                            bgClass: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                            badgeClass: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200",
                            description: "You can now pick up your document at the barangay office.",
                          };
                        } else if (matchesAnyStatus(request.status, ["completed", "released"])) {
                          statusInfo = {
                            text: "Released",
                            dotClass: "bg-purple-500",
                            bgClass: "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
                            badgeClass: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
                            description: "Your document has been successfully released.",
                          };
                        } else if (matchesStatus(request.status, "processing")) {
                          statusInfo = {
                            text: "Processing",
                            dotClass: "bg-blue-500",
                            bgClass: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
                            badgeClass: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
                            description: "Please wait while we process your request.",
                          };
                        } else if (matchesStatus(request.status, "rejected")) {
                          statusInfo = {
                            text: "Rejected",
                            dotClass: "bg-red-500",
                            bgClass: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                            badgeClass: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
                            description: "Please contact the office for more details.",
                          };
                        } else {
                          statusInfo = {
                            text: "Pending",
                            dotClass: "bg-yellow-500",
                            bgClass: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
                            badgeClass: "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200",
                            description: "Your request is being reviewed.",
                          };
                        }
                        return (
                          <div key={request.id} className={`grid grid-cols-[auto_1fr] gap-4 ${!isLast ? "mb-6" : ""}`}>
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-6 w-6 rounded-full ${statusInfo.dotClass} border-2 border-background shadow-md flex items-center justify-center`}
                              >
                                <div className="h-1.5 w-1.5 bg-background rounded-full"></div>
                              </div>
                              {!isLast && <div className="w-0.5 bg-border flex-1 mt-2"></div>}
                            </div>
                            <div
                              className={`${statusInfo.bgClass} border p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200`}
                            >
                              <div className="mb-3">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-foreground text-sm">{request.type}</h3>
                                  <span
                                    className={`text-xs px-2 py-1 ${statusInfo.badgeClass} rounded-full font-medium`}
                                  >
                                    {statusInfo.text}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono">{request.docnumber}</p>
                              </div>

                              <div className="space-y-2">
                                <p className="text-sm text-foreground">
                                  <span className="font-medium">Purpose:</span> {request.purpose}
                                </p>
                                <p className="text-xs text-muted-foreground">{statusInfo.description}</p>
                                {request.notes && (
                                  <div className="mt-3 p-3 bg-muted rounded-md border-l-4 border-primary">
                                    <p className="text-xs text-muted-foreground font-medium mb-1">ADMIN NOTE</p>
                                    <p className="text-xs text-foreground">{request.notes}</p>
                                  </div>
                                )}
                              </div>

                              <div className="flex justify-end mt-3 pt-2 border-t border-border">
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(request.updated_at || request.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showIssueForm && (
        <div className="fixed inset-0 z-50 overflow-auto bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-border">
            <DocumentIssueForm onClose={() => setShowIssueForm(false)} />
          </div>
        </div>
      )}

      {showRequestModal && (
        <DocumentRequestModal
          onClose={() => {
            setShowRequestModal(false);
            setEditingRequest(null);
          }}
          editingRequest={editingRequest}
        />
      )}

      {/* View Request Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-auto p-4 md:p-6">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Document Request Details</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Complete information about your document request</p>
              </div>
            </div>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Status Banner */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Current Status</h3>
                      <p className="text-sm text-muted-foreground">Track your request progress</p>
                    </div>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                {/* Status Description */}
                <div className="mt-3 p-3 bg-background rounded-md border border-border">
                  <p className="text-sm text-foreground">
                    {selectedRequest.status.toLowerCase() === "pending" &&
                      "Your request is being reviewed by the barangay office."}
                    {selectedRequest.status.toLowerCase() === "processing" &&
                      "Your document is currently being processed."}
                    {(selectedRequest.status.toLowerCase() === "ready" ||
                      selectedRequest.status.toLowerCase() === "approved") &&
                      "Your document is ready for pickup at the barangay office."}
                    {selectedRequest.status.toLowerCase() === "released" &&
                      "Your document has been successfully released."}
                    {selectedRequest.status.toLowerCase() === "rejected" &&
                      "Your request has been rejected. Please check admin notes below."}
                  </p>
                </div>
              </div>

              {/* Request Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Request Information
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Tracking ID</Label>
                      </div>
                      <p className="text-lg font-mono font-semibold text-primary pl-6">{selectedRequest.docnumber}</p>
                    </div>

                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Document Type</Label>
                      </div>
                      <p className="text-sm text-foreground pl-6">{selectedRequest.type}</p>
                    </div>

                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Request Date</Label>
                      </div>
                      <p className="text-sm text-foreground pl-6">{formatDate(selectedRequest.created_at)}</p>
                    </div>

                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <History className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Last Updated</Label>
                      </div>
                      <p className="text-sm text-foreground pl-6">
                        {formatDate(selectedRequest.updated_at || selectedRequest.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Payment & Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Payment & Details
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Amount</Label>
                      </div>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400 pl-6">
                        ₱{selectedRequest.amount || 0}
                      </p>
                    </div>

                    <div className="p-3 border border-border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium text-foreground">Payment Method</Label>
                      </div>
                      <p className="text-sm text-foreground pl-6">{selectedRequest.method || "Not specified"}</p>
                    </div>

                    {selectedRequest.ornumber && (
                      <div className="p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-medium text-foreground">OR Number</Label>
                        </div>
                        <p className="text-sm font-mono text-foreground pl-6">{selectedRequest.ornumber}</p>
                      </div>
                    )}

                    {selectedRequest.paydate && (
                      <div className="p-3 border border-border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-primary" />
                          <Label className="text-sm font-medium text-foreground">Payment Date</Label>
                        </div>
                        <p className="text-sm text-foreground pl-6">{formatDate(selectedRequest.paydate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Purpose Section */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">Purpose</Label>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 pl-6 leading-relaxed">
                  {selectedRequest.purpose}
                </p>
              </div>

              {/* Recipient Information */}
              {selectedRequest.receiver && (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <Label className="text-sm font-medium text-green-800 dark:text-green-200">
                      Recipient Information
                    </Label>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300 pl-6">
                    {typeof selectedRequest.receiver === "object"
                      ? selectedRequest.receiver.name
                      : selectedRequest.receiver}
                  </p>
                </div>
              )}

              {/* Admin Notes */}
              {selectedRequest.notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <Label className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Administrative Notes
                    </Label>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300 pl-6 leading-relaxed">
                    {selectedRequest.notes}
                  </p>
                </div>
              )}

              {/* Contact Information */}
              {(selectedRequest.email || selectedRequest["contact#"]) && (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <Label className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      Contact Information
                    </Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6">
                    {selectedRequest.email && (
                      <div>
                        <Label className="text-xs font-medium text-purple-700 dark:text-purple-300">Email</Label>
                        <p className="text-sm text-purple-600 dark:text-purple-300">{selectedRequest.email}</p>
                      </div>
                    )}
                    {selectedRequest["contact#"] && (
                      <div>
                        <Label className="text-xs font-medium text-purple-700 dark:text-purple-300">
                          Contact Number
                        </Label>
                        <p className="text-sm text-purple-600 dark:text-purple-300">{selectedRequest["contact#"]}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => setShowViewDialog(false)} className="px-6">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Request Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Request</DialogTitle>
          </DialogHeader>
          {editingRequest && (
            <EditRequestForm
              request={editingRequest}
              onSuccess={() => {
                setShowEditDialog(false);
                setEditingRequest(null);
                refetch();
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setEditingRequest(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Template Details Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl p-4 md:p-6">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Document Information</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Complete details about this document template</p>
              </div>
            </div>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              {/* Main Document Info */}
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">{selectedTemplate.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {selectedTemplate.description ||
                        "Official barangay document for various administrative purposes."}
                    </p>
                  </div>
                  <Badge className="bg-green-500 hover:bg-green-500 text-white ml-4">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </div>

              {/* Document Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">Document Type</Label>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {selectedTemplate.type || "Barangay Certificate"}
                    </p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">Processing Time</Label>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {selectedTemplate.processing_time || "1-3 business days"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">Document Fee</Label>
                    </div>
                    <p className="text-lg font-semibold text-foreground pl-6">₱{selectedTemplate.fee || 0}</p>
                  </div>

                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <History className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-medium text-foreground">Validity Period</Label>
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {selectedTemplate.validity_days
                        ? `${selectedTemplate.validity_days} days from issuance`
                        : "Indefinite"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(selectedTemplate.notes || selectedTemplate.usage) && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Label className="text-sm font-medium text-blue-800 dark:text-blue-200">Important Notes</Label>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 pl-6">
                    {selectedTemplate.notes ||
                      selectedTemplate.usage ||
                      "Please ensure all requirements are complete before submitting your request."}
                  </p>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button onClick={() => setShowTemplateDialog(false)} className="px-6">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating Action Button - Mobile Only */}
      <Button
        onClick={() => setShowRequestModal(true)}
        className="md:hidden fixed bottom-6 right-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground shadow-2xl hover:shadow-xl transition-all duration-300 z-50 group animate-pulse-slow hover:animate-none"
        size="icon"
      >
        <Plus className="h-7 w-7 group-hover:rotate-90 transition-transform duration-300" />
      </Button>
    </div>
  );
};

// Edit Request Form Component
const EditRequestForm = ({
  request,
  onSuccess,
  onCancel,
}: {
  request: any;
  onSuccess: () => void;
  onCancel: () => void;
}) => {
  const [purpose, setPurpose] = useState(request.purpose || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const updateRequest = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("docrequests").update(data).eq("id", request.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request updated successfully",
      });
      onSuccess();
    },
    onError: (error) => {
      console.error("Error updating request:", error);
      toast({
        title: "Error",
        description: "Failed to update request",
        variant: "destructive",
      });
    },
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) return;
    setIsSubmitting(true);
    try {
      await updateRequest.mutateAsync({
        purpose: purpose.trim(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Document Type</Label>
        <p className="text-sm text-muted-foreground mt-1">{request.type}</p>
      </div>
      <div>
        <Label htmlFor="purpose" className="text-sm font-medium">
          Purpose *
        </Label>
        <Textarea
          id="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="Enter the purpose for this document..."
          className="mt-2 min-h-[100px]"
          required
        />
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !purpose.trim()}>
          {isSubmitting ? "Updating..." : "Update Request"}
        </Button>
      </div>
    </form>
  );
};
export default UserDocumentsPage;
