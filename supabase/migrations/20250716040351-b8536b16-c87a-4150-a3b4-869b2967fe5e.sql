CREATE OR REPLACE FUNCTION public.accept_data_transfer(transferid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    transfer_record public.dnexus;
    v_adminbrgyid uuid;
    v_adminid uuid;
BEGIN
    -- Get the ID and brgy_id of the currently logged-in admin
    v_adminid := auth.uid();
    SELECT brgyid INTO v_adminbrgyid FROM public.profiles WHERE id = v_adminid;

    -- Find the transfer request
    SELECT * INTO transfer_record FROM public.dnexus WHERE id = transferid;

    -- Security Check: Ensure the request exists and the user is the authorized destination admin
    IF transfer_record IS NULL THEN
        RAISE EXCEPTION 'Transfer request not found.';
    END IF;

    IF transfer_record.destination IS DISTINCT FROM v_adminbrgyid THEN
        RAISE EXCEPTION 'You are not authorized to accept this transfer.';
    END IF;

    IF transfer_record.status != 'pending' THEN
        RAISE EXCEPTION 'This transfer has already been processed.';
    END IF;

    -- Step 1: Update the brgy_id for all records in the transfer
    -- Handle both singular and plural data types for backward compatibility
    IF transfer_record.datatype IN ('resident', 'residents') THEN
        UPDATE public.residents
        SET brgyid = transfer_record.destination
        WHERE id = ANY(transfer_record.dataid);
    ELSIF transfer_record.datatype = 'households' THEN
        UPDATE public.households
        SET brgyid = transfer_record.destination
        WHERE id = ANY(transfer_record.dataid);
    ELSIF transfer_record.datatype = 'officials' THEN
        UPDATE public.officials
        SET brgyid = transfer_record.destination
        WHERE id = ANY(transfer_record.dataid);
    ELSIF transfer_record.datatype = 'announcements' THEN
        UPDATE public.announcements
        SET brgyid = transfer_record.destination
        WHERE id = ANY(transfer_record.dataid);
    ELSIF transfer_record.datatype = 'events' THEN
        UPDATE public.events
        SET brgyid = transfer_record.destination
        WHERE id = ANY(transfer_record.dataid);
    ELSIF transfer_record.datatype = 'documents' THEN
        UPDATE public.document_types
        SET brgyid = transfer_record.destination
        WHERE id = ANY(transfer_record.dataid);
    ELSE
        RAISE EXCEPTION 'Unknown data type for transfer: %', transfer_record.datatype;
    END IF;

    -- Step 2: Update the transfer request status to 'accepted'
    UPDATE public.dnexus
    SET
        status = 'accepted',
        reviewer = v_adminid
    WHERE id = transferid;

    RETURN 'Transfer completed successfully.';
END;
$function$