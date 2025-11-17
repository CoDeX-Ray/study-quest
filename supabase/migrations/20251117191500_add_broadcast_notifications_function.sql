-- Optimize announcement notifications by moving fan-out to the database
CREATE OR REPLACE FUNCTION public.broadcast_announcement_notifications(
  p_post_id UUID,
  p_title TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_post_id)
  SELECT
    profiles.id,
    'New Announcement: ' || coalesce(p_title, ''),
    CASE
      WHEN length(coalesce(p_message, '')) > 140
        THEN left(coalesce(p_message, ''), 140) || '...'
      ELSE coalesce(p_message, '')
    END,
    'announcement',
    p_post_id
  FROM public.profiles
  WHERE profiles.role IN ('student', 'professional');
END;
$$;

GRANT EXECUTE ON FUNCTION public.broadcast_announcement_notifications(UUID, TEXT, TEXT) TO authenticated;

