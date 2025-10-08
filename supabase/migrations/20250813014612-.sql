-- Create payme table to manage per-barangay payment providers
CREATE TABLE IF NOT EXISTS public.payme (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brgyid uuid NOT NULL,
  gname text NOT NULL,
  url text,
  enabled boolean NOT NULL DEFAULT true,
  credz jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payme_unique_provider UNIQUE (brgyid, gname)
);

-- Enable RLS
ALTER TABLE public.payme ENABLE ROW LEVEL SECURITY;

-- SELECT policy: authenticated users can view providers in their barangay
DROP POLICY IF EXISTS "Payme: Authenticated users can view own brgy" ON public.payme;
CREATE POLICY "Payme: Authenticated users can view own brgy" 
ON public.payme
FOR SELECT
USING (
  brgyid = (
    SELECT p.brgyid FROM public.profiles p WHERE p.id = auth.uid()
  )
);

-- INSERT policy: admins/staff can insert for their barangay
DROP POLICY IF EXISTS "Payme: Admin/Staff insert in their brgy" ON public.payme;
CREATE POLICY "Payme: Admin/Staff insert in their brgy"
ON public.payme
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','staff') AND p.brgyid = payme.brgyid
  )
);

-- UPDATE policy: admins/staff can update in their barangay
DROP POLICY IF EXISTS "Payme: Admin/Staff update in their brgy" ON public.payme;
CREATE POLICY "Payme: Admin/Staff update in their brgy"
ON public.payme
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','staff') AND p.brgyid = payme.brgyid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','staff') AND p.brgyid = payme.brgyid
  )
);

-- DELETE policy: admins/staff can delete in their barangay
DROP POLICY IF EXISTS "Payme: Admin/Staff delete in their brgy" ON public.payme;
CREATE POLICY "Payme: Admin/Staff delete in their brgy"
ON public.payme
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('admin','staff') AND p.brgyid = payme.brgyid
  )
);

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_payme_updated_at ON public.payme;
CREATE TRIGGER update_payme_updated_at
BEFORE UPDATE ON public.payme
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();