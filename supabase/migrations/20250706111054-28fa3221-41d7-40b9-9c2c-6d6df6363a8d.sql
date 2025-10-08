CREATE OR REPLACE FUNCTION public.get_document_stats()
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    stats json;
    user_brgyid uuid;
BEGIN
    -- Get the current user's brgyid
    SELECT brgyid INTO user_brgyid 
    FROM public.profiles 
    WHERE id = auth.uid();
    
    -- If no brgyid found, return empty stats
    IF user_brgyid IS NULL THEN
        RETURN json_build_object(
            'status_counts', '[]'::json,
            'avg_processing_time_interval', null
        );
    END IF;

    SELECT json_build_object(
        'status_counts', (
            SELECT json_agg(t) FROM (
                SELECT status, COUNT(*) AS count
                FROM public.docrequests
                WHERE created_at >= date_trunc('week', now())
                  AND brgyid = user_brgyid
                GROUP BY status
            ) t
        ),
        'avg_processing_time_interval', (
            SELECT AVG(updated_at - created_at)
            FROM public.docrequests
            WHERE status IN ('approved', 'rejected') 
              AND updated_at >= date_trunc('week', now())
              AND brgyid = user_brgyid
        )
    ) INTO stats;
    RETURN stats;
END;
$function$