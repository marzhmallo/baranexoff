-- Fix notification functions to exclude creator and align with actual schema

CREATE OR REPLACE FUNCTION notify_residents_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notifications for all residents in the barangay (excluding creator)
  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'announcement',
    'New Announcement: ' || NEW.title || ' - ' || LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
    'announcement',
    'normal',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved'
  AND p.id != NEW.created_by;  -- Exclude the creator
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_residents_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert notifications for all residents in the barangay (excluding creator)
  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'event',
    'Upcoming Event: ' || NEW.title || ' on ' || TO_CHAR(NEW.start_time, 'MM/DD/YYYY') || CASE WHEN NEW.location IS NOT NULL THEN ' at ' || NEW.location ELSE '' END,
    'event',
    'high',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved'
  AND p.id != NEW.created_by;  -- Exclude the creator
  
  RETURN NEW;
END;
$$;