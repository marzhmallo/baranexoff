-- Notifications for dnexus events: create triggers to insert rows into public.notification
-- 1) Function and trigger for INSERT on dnexus (notify destination admins)
CREATE OR REPLACE FUNCTION public.notify_dnexus_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_name text;
  v_dest_name text;
  v_count integer;
BEGIN
  SELECT barangayname INTO v_source_name FROM public.barangays WHERE id = NEW.source;
  SELECT barangayname INTO v_dest_name FROM public.barangays WHERE id = NEW.destination;
  v_count := COALESCE(array_length(NEW.dataid, 1), 0);

  -- Notify all admins of the destination barangay
  INSERT INTO public.notification (userid, type, message, linkurl, read)
  SELECT p.id,
         'dnexus'::text,
         format('New transfer request: %s → %s • %s • %s item(s)',
                COALESCE(v_source_name, 'Unknown'),
                COALESCE(v_dest_name, 'Unknown'),
                COALESCE(NEW.datatype, 'data'),
                v_count),
         NEW.id,
         false
  FROM public.profiles p
  WHERE p.role = 'admin' AND p.brgyid = NEW.destination;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dnexus_notify_insert ON public.dnexus;
CREATE TRIGGER trg_dnexus_notify_insert
AFTER INSERT ON public.dnexus
FOR EACH ROW
EXECUTE FUNCTION public.notify_dnexus_insert();

-- 2) Function and trigger for UPDATE of status on dnexus (notify initiator on Accepted/Rejected)
CREATE OR REPLACE FUNCTION public.notify_dnexus_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dest_name text;
  v_count integer;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) AND NEW.status IN ('Accepted', 'Rejected') THEN
    SELECT barangayname INTO v_dest_name FROM public.barangays WHERE id = NEW.destination;
    v_count := COALESCE(array_length(NEW.dataid, 1), 0);

    -- Notify the request initiator
    INSERT INTO public.notification (userid, type, message, linkurl, read)
    VALUES (
      NEW.initiator,
      'dnexus_status',
      format('Your transfer to %s was %s • %s • %s item(s)',
             COALESCE(v_dest_name, 'destination'),
             NEW.status,
             COALESCE(NEW.datatype, 'data'),
             v_count),
      NEW.id,
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dnexus_notify_status_update ON public.dnexus;
CREATE TRIGGER trg_dnexus_notify_status_update
AFTER UPDATE OF status ON public.dnexus
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_dnexus_status_update();