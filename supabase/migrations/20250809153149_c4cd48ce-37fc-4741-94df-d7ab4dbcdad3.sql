-- Enable RLS on docx and replace incorrect policies
ALTER TABLE public.docx ENABLE ROW LEVEL SECURITY;

-- Drop existing incorrect policies if present
DROP POLICY IF EXISTS "Admins can manage documents in their barangay." ON public.docx;
DROP POLICY IF EXISTS "Users can manage their own documents." ON public.docx;

-- Allow admins and staff to fully manage resident IDs (docx) within their barangay
CREATE POLICY "Admin/staff manage resident IDs in brgy"
ON public.docx
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = docx.resid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = docx.resid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
);

-- Storage policies for resident ID images under residentphotos/dis/{residentId}/...
-- Grant admin/staff READ access within their barangay
CREATE POLICY "Admin/staff read resident IDs in brgy"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'residentphotos'
  AND (storage.foldername(name))[1] = 'dis'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = ((storage.foldername(name))[2])::uuid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
);

-- Grant admin/staff UPLOAD (INSERT) access within their barangay
CREATE POLICY "Admin/staff upload resident IDs in brgy"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'residentphotos'
  AND (storage.foldername(name))[1] = 'dis'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = ((storage.foldername(name))[2])::uuid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
);

-- Grant admin/staff UPDATE (rename/overwrite metadata) access
CREATE POLICY "Admin/staff update resident IDs in brgy"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'residentphotos'
  AND (storage.foldername(name))[1] = 'dis'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = ((storage.foldername(name))[2])::uuid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
)
WITH CHECK (
  bucket_id = 'residentphotos'
  AND (storage.foldername(name))[1] = 'dis'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = ((storage.foldername(name))[2])::uuid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
);

-- Grant admin/staff DELETE access within their barangay
CREATE POLICY "Admin/staff delete resident IDs in brgy"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'residentphotos'
  AND (storage.foldername(name))[1] = 'dis'
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.residents r ON r.id = ((storage.foldername(name))[2])::uuid
    WHERE p.id = auth.uid()
      AND p.role IN ('admin','staff')
      AND p.brgyid = r.brgyid
  )
);