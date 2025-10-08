-- Make resid optional and enforce at least one of resid/userid is present
DO $$
BEGIN
  -- Drop NOT NULL on resid if it exists
  BEGIN
    ALTER TABLE public.docx ALTER COLUMN resid DROP NOT NULL;
  EXCEPTION WHEN others THEN
    -- ignore if already nullable or column missing
    NULL;
  END;

  -- Add CHECK constraint to ensure at least one identifier is present
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'docx_resid_or_userid_present'
  ) THEN
    ALTER TABLE public.docx
    ADD CONSTRAINT docx_resid_or_userid_present
    CHECK ((resid IS NOT NULL) OR (userid IS NOT NULL));
  END IF;
END $$;