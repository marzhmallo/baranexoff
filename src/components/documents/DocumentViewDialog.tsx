
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DocumentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
    description?: string;
    fee?: number;
    validity_days?: number;
    created_at?: string;
    updated_at?: string;
  } | null;
}

const DocumentViewDialog = ({ open, onOpenChange, template }: DocumentViewDialogProps) => {
  if (!template) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Document Template Details
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
            {template.description && (
              <p className="text-gray-600">{template.description}</p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Processing Fee</label>
                <p className="text-lg font-semibold text-gray-900">
                  {template.fee ? formatCurrency(template.fee) : 'Free'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Validity Period</label>
                <p className="text-lg font-semibold text-gray-900">
                  {template.validity_days ? `${template.validity_days} days` : 'No expiration'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {template.created_at ? formatDate(template.created_at) : 'N/A'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {template.updated_at ? formatDate(template.updated_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Template Information</h4>
            <p className="text-sm text-blue-700">
              This template defines the structure and requirements for issuing {template.name.toLowerCase()} documents. 
              When residents request this document type, administrators will use this template as a reference for 
              processing fees and validity periods.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewDialog;
