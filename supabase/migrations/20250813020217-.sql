-- Fix payme schema to match app expectations
-- 1) Ensure updated_at exists and has default; ensure created_at has default
ALTER TABLE public.payme
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.payme
  ALTER COLUMN created_at SET DEFAULT now();

-- 2) Add unique composite index for upserts on (brgyid, gname)
CREATE UNIQUE INDEX IF NOT EXISTS payme_brgyid_gname_key ON public.payme (brgyid, gname);

-- 3) Drop incorrect/overly restrictive unique index on JSONB credz
DROP INDEX IF EXISTS payme_credz_key;

-- 4) Add trigger to auto-update updated_at on updates
DROP TRIGGER IF EXISTS update_payme_updated_at ON public.payme;
CREATE TRIGGER update_payme_updated_at
BEFORE UPDATE ON public.payme
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();