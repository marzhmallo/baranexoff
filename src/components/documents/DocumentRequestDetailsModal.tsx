import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SmartPhotoDisplay from "@/components/ui/SmartPhotoDisplay";
import { 
  User, 
  FileText, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  BarChart3,
  History,
  MessageCircle,
  Bell,
  Eye,
  Shield
} from "lucide-react";

interface DocumentRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any;
  onApprove: (id: string, name: string) => void;
  onDeny: (id: string, name: string) => void;
}

const DocumentRequestDetailsModal = ({
  isOpen,
  onClose,
  request,
  onApprove,
  onDeny
}: DocumentRequestDetailsModalProps) => {
  if (!request) return null;

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50"><AlertCircle className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatus = () => {
    if (request.paydate && request.paymenturl) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50"><CreditCard className="h-3 w-3 mr-1" />Paid</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50"><CreditCard className="h-3 w-3 mr-1" />Unpaid</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Document Request Review</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Complete details for administrative review</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Banner */}
          <div className="bg-muted/50 rounded-lg p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Request Status</h3>
                  <p className="text-sm text-muted-foreground">Current processing stage</p>
                </div>
              </div>
              {getStatusBadge(request.status)}
            </div>
            
            {/* Status Description */}
            <div className="mt-3 p-3 bg-background rounded-md border border-border">
              <p className="text-sm text-foreground">
                {(request.status.toLowerCase() === 'pending' || request.status.toLowerCase() === 'request') && (
                  <>
                    <span className="font-medium text-amber-600 dark:text-amber-400">New Request:</span> A document request has been submitted and requires your review. Please verify the requestor information, payment details, and purpose before approving or denying this request.
                  </>
                )}
                {request.status.toLowerCase() === 'processing' && (
                  <>
                    <span className="font-medium text-blue-600 dark:text-blue-400">In Processing:</span> This request has been approved and the document is currently being prepared. Ensure all required information is accurate and the document is generated according to barangay standards.
                  </>
                )}
                {(request.status.toLowerCase() === 'approved' || request.status.toLowerCase() === 'ready') && (
                  <>
                    <span className="font-medium text-green-600 dark:text-green-400">Ready for Release:</span> The document has been completed and is ready to be released to the requestor. Please notify the requestor that they can now claim their document at the barangay office with proper identification.
                  </>
                )}
                {(request.status.toLowerCase() === 'released' || request.status.toLowerCase() === 'completed') && (
                  <>
                    <span className="font-medium text-purple-600 dark:text-purple-400">Transaction Complete:</span> The document has been successfully released to the requestor. This transaction is now complete and can be archived for record-keeping purposes.
                  </>
                )}
                {request.status.toLowerCase() === 'rejected' && (
                  <>
                    <span className="font-medium text-red-600 dark:text-red-400">Request Denied:</span> This request has been rejected due to insufficient information or unmet requirements. Ensure that detailed notes have been provided to explain the reason for denial to the requestor.
                  </>
                )}
                {!['pending', 'request', 'processing', 'approved', 'ready', 'released', 'completed', 'rejected'].includes(request.status.toLowerCase()) && (
                  <>
                    <span className="font-medium">Administrative Review:</span> This request requires administrative attention. Please review the details and update the status accordingly based on the current processing stage.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Main Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Request Information
              </h3>
              
              <div className="space-y-3">
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Document Number</p>
                  </div>
                  <p className="text-lg font-mono font-semibold text-primary pl-6">{request.docnumber}</p>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Document Type</p>
                  </div>
                  <p className="font-medium text-foreground pl-6">{request.document || request.type}</p>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Request Date</p>
                  </div>
                  <p className="text-foreground pl-6">{request.timeAgo || new Date(request.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Last Updated</p>
                  </div>
                  <p className="text-foreground pl-6">{new Date(request.updated_at || request.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Requester Profile */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Requester Profile
              </h3>
              
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {request.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-foreground">{request.name}</p>
                    <p className="text-sm text-muted-foreground">Barangay Resident</p>
                  </div>
                </div>
                
                {/* Contact Information */}
                <div className="space-y-2 pt-2 border-t border-border">
                  {request.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="text-foreground">{request.email}</span>
                    </div>
                  )}
                  {request["contact#"] && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="text-foreground">{request["contact#"]}</span>
                    </div>
                  )}
                  {(!request.email && !request["contact#"]) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>Contact information not provided</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Purpose Section */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Document Purpose</h3>
            </div>
            <p className="text-blue-700 dark:text-blue-300 leading-relaxed pl-7">{request.purpose}</p>
          </div>

          {/* Payment Information */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Payment Information</h3>
                </div>
                {getPaymentStatus()}
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Amount Due</p>
                  </div>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400 pl-6">₱{request.amount || '0.00'}</p>
                </div>
                
                <div className="p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Payment Method</p>
                  </div>
                  <p className="text-foreground pl-6">{request.method || 'Not specified'}</p>
                </div>
              </div>
              
              {request.paydate && (
                <div className="p-3 border border-border rounded-lg mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Payment Date</p>
                  </div>
                  <p className="text-foreground pl-6">{new Date(request.paydate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</p>
                </div>
              )}

              {request.paymenturl && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-foreground">Payment Proof</p>
                  </div>
                  <div className="grid gap-4 pl-6">
                    {Array.isArray(request.paymenturl) ? (
                      request.paymenturl.map((url: string, index: number) => (
                        <div key={index} className="border border-border rounded-lg overflow-hidden">
                          <SmartPhotoDisplay
                            bucketName="cashg"
                            filePath={url}
                            isPublic={false}
                            className="w-full h-64"
                            alt={`Payment Screenshot ${index + 1}`}
                            fallbackContent="💳"
                            enableZoom={true}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <SmartPhotoDisplay
                          bucketName="cashg"
                          filePath={request.paymenturl}
                          isPublic={false}
                          className="w-full h-64"
                          alt="Payment Screenshot"
                          fallbackContent="💳"
                          enableZoom={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Notes */}
          {request.notes && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Additional Notes</h3>
              </div>
              <p className="text-amber-700 dark:text-amber-300 leading-relaxed pl-7">{request.notes}</p>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          {(request.status.toLowerCase() === 'pending' || request.status.toLowerCase() === 'request') && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onDeny(request.id, request.name);
                  onClose();
                }}
                className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700 hover:text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Deny Request
              </Button>
              <Button
                onClick={() => {
                  onApprove(request.id, request.name);
                  onClose();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Request
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentRequestDetailsModal;