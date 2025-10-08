-- Add category column to forums table
ALTER TABLE forums ADD COLUMN category TEXT NOT NULL DEFAULT 'General Questions';