-- Function to notify residents about new disaster zones
CREATE OR REPLACE FUNCTION public.notify_disaster_zone_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  risk_priority text;
  zone_message text;
BEGIN
  -- Set priority based on risk level
  risk_priority := CASE NEW.risk_level
    WHEN 'high' THEN 'urgent'
    WHEN 'medium' THEN 'high'
    ELSE 'normal'
  END;

  -- Create descriptive message
  zone_message := 'New ' || NEW.risk_level || ' risk ' || NEW.zone_type || ' zone identified: ' || NEW.zone_name;
  IF NEW.notes IS NOT NULL THEN
    zone_message := zone_message || ' - ' || LEFT(NEW.notes, 100) || CASE WHEN LENGTH(NEW.notes) > 100 THEN '...' ELSE '' END;
  END IF;

  -- Insert notifications for all approved residents in the barangay (excluding creator)
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
    'disaster_zone_alert',
    zone_message,
    'emergency',
    risk_priority,
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved'
  AND p.id != NEW.created_by;  -- Exclude the creator
  
  RETURN NEW;
END;
$function$;

-- Function to notify residents about new evacuation centers
CREATE OR REPLACE FUNCTION public.notify_evacuation_center_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  center_message text;
BEGIN
  -- Create descriptive message with capacity info
  center_message := 'New evacuation center available: ' || NEW.name || ' (Capacity: ' || NEW.capacity || ' people)';
  IF NEW.address IS NOT NULL THEN
    center_message := center_message || ' at ' || NEW.address;
  END IF;
  IF NEW.facilities IS NOT NULL AND array_length(NEW.facilities, 1) > 0 THEN
    center_message := center_message || ' - Facilities: ' || array_to_string(NEW.facilities, ', ');
  END IF;

  -- Insert notifications for all approved residents in the barangay (excluding creator)
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
    'evacuation_center_alert',
    center_message,
    'emergency',
    'high',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved';  -- No creator exclusion since evacuation centers don't have created_by field
  
  RETURN NEW;
END;
$function$;

-- Function to notify residents about new evacuation routes
CREATE OR REPLACE FUNCTION public.notify_evacuation_route_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  route_message text;
  start_desc text;
  end_desc text;
BEGIN
  -- Extract start and end descriptions from JSON
  start_desc := COALESCE(NEW.start_point->>'description', 'Starting point');
  end_desc := COALESCE(NEW.end_point->>'description', 'Safe destination');

  -- Create descriptive message with route info
  route_message := 'New evacuation route: ' || NEW.route_name || ' from ' || start_desc || ' to ' || end_desc;
  
  IF NEW.distance_km IS NOT NULL THEN
    route_message := route_message || ' (' || NEW.distance_km || ' km';
    IF NEW.estimated_time_minutes IS NOT NULL THEN
      route_message := route_message || ', ~' || NEW.estimated_time_minutes || ' minutes)';
    ELSE
      route_message := route_message || ')';
    END IF;
  END IF;

  -- Insert notifications for all approved residents in the barangay (excluding creator)
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
    'evacuation_route_alert',
    route_message,
    'emergency',
    'high',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved'
  AND p.id != NEW.created_by;  -- Exclude the creator
  
  RETURN NEW;
END;
$function$;

-- Create triggers for disaster zones
CREATE TRIGGER notify_disaster_zone_insert
    AFTER INSERT ON public.disaster_zones
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_disaster_zone_alert();

-- Create triggers for evacuation centers  
CREATE TRIGGER notify_evacuation_center_insert
    AFTER INSERT ON public.evacuation_centers
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_evacuation_center_alert();

-- Create triggers for evacuation routes
CREATE TRIGGER notify_evacuation_route_insert
    AFTER INSERT ON public.evacuation_routes
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_evacuation_route_alert();