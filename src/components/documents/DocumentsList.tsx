
import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  Download, 
  MoreVertical, 
  Printer, 
  X, 
  Eye, 
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentAdmin } from "@/hooks/useCurrentAdmin";
import { toast } from "@/hooks/use-toast";

// Document types
type DocumentStatus = "pending" | "approved" | "rejected";

interface DocumentRequest {
  id: string;
  docnumber: string;
  type: string;
  purpose: string;
  resident_id: string | null;
  status: string;
  processedby: string;
  created_at: string;
  issued_at: string;
  receiver: any;
  notes: string | null;
  brgyid: string;
  updated_at: string | null;
  resident_name?: string;
  paymenturl: any; // Changed from string | null to any to handle Json[] from database
  paydate: string | null;
  method: string | null;
  amount: number | null;
  email?: string | null;
  "contact#"?: number | null;
  ornumber?: string;
}

interface DocumentsListProps {
  status: string;
  searchQuery: string;
}

const DocumentsList = ({ status, searchQuery }: DocumentsListProps) => {
  const [documents, setDocuments] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const { adminProfileId } = useCurrentAdmin();
  
  const itemsPerPage = 5;

  // Fetch documents from Supabase with real-time updates
  useEffect(() => {
    fetchDocuments();
    
    // Set up real-time subscription for documents list
    const channel = supabase
      .channel('documents-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'docrequests'
        },
        () => {
          // Refetch documents when changes occur
          fetchDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [status, searchQuery, currentPage]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from('docrequests')
        .select('*', { count: 'exact' });

      // Apply status filter
      if (status !== "all") {
        query = query.eq('status', status);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`docnumber.ilike.%${searchQuery}%,type.ilike.%${searchQuery}%,purpose.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching documents:', error);
        toast({
          title: "Error",
          description: "Failed to fetch documents",
          variant: "destructive",
        });
        return;
      }

      // Map data to include resident name
      const mappedData = data?.map(doc => {
        console.log('Document payment data:', { 
          id: doc.id, 
          paydate: doc.paydate, 
          paymenturl: doc.paymenturl,
          method: doc.method,
          amount: doc.amount 
        });
        
        let resident_name = 'Unknown';
        if (doc.receiver) {
          try {
            if (typeof doc.receiver === 'object' && doc.receiver !== null && !Array.isArray(doc.receiver)) {
              resident_name = (doc.receiver as any).name || 'Unknown';
            } else if (typeof doc.receiver === 'string') {
              const parsed = JSON.parse(doc.receiver);
              resident_name = parsed.name || 'Unknown';
            }
          } catch {
            resident_name = 'Unknown';
          }
        }
        return {
          ...doc,
          resident_name
        };
      }) || [];

      setDocuments(mappedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId: string) => {
    if (!adminProfileId) {
      toast({
        title: "Error",
        description: "Admin profile not found",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Setting status to processing for document:', docId);
      const { error } = await supabase
        .from('docrequests')
        .update({ 
          status: 'processing',
          processedby: adminProfileId,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) {
        console.error('Error updating document status:', error);
        throw error;
      }

      console.log('Status updated successfully to processing');
      toast({
        title: "Success",
        description: "Document is now being processed",
      });

      // Refresh the list
      fetchDocuments();
    } catch (error) {
      console.error('Error approving document:', error);
      toast({
        title: "Error",
        description: "Failed to approve document",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (docId: string) => {
    if (!adminProfileId) {
      toast({
        title: "Error",
        description: "Admin profile not found",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('docrequests')
        .delete()
        .eq('id', docId);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Document request deleted successfully",
      });

      // Refresh the list
      fetchDocuments();
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast({
        title: "Error",
        description: "Failed to reject document",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">Processing</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Number</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Date Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.docnumber}</TableCell>
                  <TableCell>{doc.resident_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                      {doc.type}
                    </div>
                  </TableCell>
                  <TableCell>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</TableCell>
                  <TableCell>{getStatusBadge(doc.status)}</TableCell>
                  <TableCell>
                    {doc.paydate && doc.paymenturl ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Paid</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{doc.purpose}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View Details</span>
                        </DropdownMenuItem>
                        {doc.status === "pending" && (
                          <>
                            <DropdownMenuItem 
                              className="cursor-pointer text-blue-600"
                              onClick={() => handleApprove(doc.id)}
                            >
                              <Check className="mr-2 h-4 w-4" />
                              <span>Start Processing</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer text-red-600"
                              onClick={() => handleReject(doc.id)}
                            >
                              <X className="mr-2 h-4 w-4" />
                              <span>Delete Request</span>
                            </DropdownMenuItem>
                          </>
                        )}
                        {doc.status === "approved" && (
                          <>
                            <DropdownMenuItem className="cursor-pointer">
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Printer className="mr-2 h-4 w-4" />
                              <span>Print</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsList;
