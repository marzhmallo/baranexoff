
-- Add rank fields to the officials table
ALTER TABLE public.officials 
ADD COLUMN rank_number INTEGER,
ADD COLUMN rank_label TEXT;

-- Create an index for better performance when querying by rank
CREATE INDEX idx_officials_rank ON public.officials(rank_number);
