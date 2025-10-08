
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/components/AuthProvider";

const DocumentLogsList = ({
  searchQuery
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    fetchLogs();
    
    // Set up real-time subscription for document logs
    const channel = supabase
      .channel('document-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_logs'
        },
        () => {
          // Refetch logs when changes occur
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchQuery]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Simplified query - just get document logs for the barangay
      const { data, error } = await supabase
        .from('document_logs')
        .select('*')
        .eq('brgyid', userProfile?.brgyid)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Filter by search query if provided
      let filteredLogs = data || [];
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log => {
          // Check action
          if (log.action?.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          // Check document ID
          if (log.document_id?.toLowerCase().includes(lowerQuery)) {
            return true;
          }
          // Check details
          if (log.details && typeof log.details === 'object') {
            const detailsString = JSON.stringify(log.details).toLowerCase();
            if (detailsString.includes(lowerQuery)) {
              return true;
            }
          }
          return false;
        });
      }
      setLogs(filteredLogs);
    } catch (error) {
      console.error("Error fetching document logs:", error);
      toast({
        title: "Error",
        description: "Failed to load document logs.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = log => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const getActionColor = action => {
    switch (action) {
      case 'issued':
        return 'bg-green-500 hover:bg-green-600';
      case 'updated':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600';
      case 'reprinted':
        return 'bg-amber-500 hover:bg-amber-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getResidentName = resident => {
    if (!resident) return "—";
    const middleInitial = resident.middle_name ? ` ${resident.middle_name.charAt(0)}.` : "";
    return `${resident.first_name}${middleInitial} ${resident.last_name}${resident.suffix ? ` ${resident.suffix}` : ""}`;
  };

  if (loading) {
    return <div className="space-y-4">
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>;
  }

  if (logs.length === 0) {
    return <Card className="mx-0 px-0">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No document logs found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search query" : "Document activity will appear here"}
          </p>
        </CardContent>
      </Card>;
  }

  return <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    {log.issued_documents?.document_types?.name || "—"}
                    <div className="text-xs text-muted-foreground">
                      {log.issued_documents?.document_number || "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getResidentName(log.issued_documents?.residents)}
                  </TableCell>
                  <TableCell>
                    <Badge className={getActionColor(log.action)}>
                      {log.action?.charAt(0).toUpperCase() + log.action?.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.performed_by || "System"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(log)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && <span>
                  Activity logged on {format(new Date(selectedLog.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </span>}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold">Document</h4>
                  <p className="text-sm">{selectedLog.issued_documents?.document_types?.name || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Document Number</h4>
                  <p className="text-sm">{selectedLog.issued_documents?.document_number || "—"}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Resident</h4>
                  <p className="text-sm">
                    {getResidentName(selectedLog.issued_documents?.residents)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Action</h4>
                  <Badge className={getActionColor(selectedLog.action)}>
                    {selectedLog.action?.charAt(0).toUpperCase() + selectedLog.action?.slice(1)}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Details</h4>
                <Card className="bg-muted">
                  <CardContent className="p-4">
                    <pre className="text-xs overflow-auto whitespace-pre-wrap">
                      {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : "No details recorded"}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>}
          
          <DialogFooter>
            <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};

export default DocumentLogsList;
