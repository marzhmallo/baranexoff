-- Fix notify_forum_reply function to reference threads table instead of forum_posts
CREATE OR REPLACE FUNCTION public.notify_forum_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_thread_author UUID;
  v_thread_title TEXT;
BEGIN
  -- Get thread author and title from threads table
  SELECT created_by, title INTO v_thread_author, v_thread_title
  FROM threads WHERE id = NEW.thread_id;
  
  -- Don't notify if replying to own thread
  IF v_thread_author != NEW.created_by THEN
    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      read
    ) VALUES (
      v_thread_author,
      NEW.thread_id,
      'forum_reply',
      'New reply to your thread: ' || v_thread_title,
      'forum',
      'normal',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$function$;