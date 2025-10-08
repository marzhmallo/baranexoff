import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UserIDsViewerProps {
  userId: string;
}

interface DocxRow {
  id: string;
  document_type: string;
  notes: string | null;
  file_path: string;
  created_at: string;
}

const UserIDsViewer: React.FC<UserIDsViewerProps> = ({ userId }) => {
  const [preview, setPreview] = React.useState<{ url: string; title: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['docx-user', userId],
    queryFn: async () => {
      if (!userId) return [] as Array<DocxRow & { url: string | null }>;
      const { data, error } = await supabase
        .from('docx')
        .select('id, document_type, notes, file_path, created_at')
        .eq('userid', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []) as DocxRow[];
      const withUrls = await Promise.all(
        rows.map(async (r) => {
          const { data: signed, error: sErr } = await supabase
            .storage
            .from('usersdis')
            .createSignedUrl(r.file_path, 60 * 60); // 1 hour expiry
          if (sErr) {
            console.error('Signed URL error:', sErr);
          }
          return {
            ...r,
            url: signed?.signedUrl ?? null,
          };
        })
      );
      return withUrls;
    },
    enabled: !!userId,
  });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-foreground border-b border-border pb-2">
        Submitted Identification Documents
      </h4>
      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading IDs…</p>
      )}
      {error && (
        <p className="text-sm text-destructive">Failed to load IDs.</p>
      )}
      {!isLoading && !error && (data?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground">No identification documents submitted.</p>
      )}
      {!isLoading && !error && (data?.length ?? 0) > 0 && (
        <ScrollArea className="max-h-80 pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data!.map((doc) => (
              <Card key={doc.id} className="overflow-hidden border border-border bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium text-foreground">
                    {doc.document_type}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <AspectRatio ratio={16 / 9}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`relative w-full h-full rounded-md overflow-hidden ${doc.url ? 'cursor-zoom-in group' : ''}`}
                      onClick={() => {
                        if (doc.url) {
                          setPreview({ url: doc.url, title: doc.document_type });
                          setIsPreviewOpen(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && doc.url) {
                          setPreview({ url: doc.url, title: doc.document_type });
                          setIsPreviewOpen(true);
                        }
                      }}
                      aria-label={`View ${doc.document_type} in full`}
                   >
                      {doc.url ? (
                        <img
                          src={doc.url}
                          alt={`User identification document - ${doc.document_type}`}
                          className="w-full h-full object-cover rounded-md"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                          No preview
                        </div>
                      )}
                    </div>
                  </AspectRatio>
                  {doc.notes && (
                    <p className="text-sm text-muted-foreground">{doc.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Uploaded {new Date(doc.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
      <Dialog open={isPreviewOpen} onOpenChange={(o) => { setIsPreviewOpen(o); if (!o) setPreview(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{preview?.title || 'Document Preview'}</DialogTitle>
          </DialogHeader>
          {preview?.url && (
            <img
              src={preview.url}
              alt={`Preview - ${preview?.title || 'Document'}`}
              className="w-full max-h-[70vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserIDsViewer;
