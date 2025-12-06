-- Fix function search_path security issue
-- Add SET search_path = public to all functions that are missing it

-- Fix notify_friend_request function
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, title, message, type, notification_type, related_user_id)
    VALUES (
      NEW.friend_id,
      'New Friend Request',
      (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' sent you a friend request',
      'info',
      'friend_request',
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix notify_card_shared function
CREATE OR REPLACE FUNCTION public.notify_card_shared()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, notification_type, related_user_id)
  VALUES (
    NEW.shared_with_user_id,
    'Card Shared',
    (SELECT full_name FROM profiles WHERE id = NEW.shared_by_user_id) || ' shared a study card with you',
    'info',
    'card_shared',
    NEW.shared_by_user_id
  );
  RETURN NEW;
END;
$function$;

-- Fix update_study_streak function
CREATE OR REPLACE FUNCTION public.update_study_streak()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_last_study_date DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Only update streak if questions were actually answered (not just viewing)
  IF NEW.questions_answered = 0 THEN
    RETURN NEW;
  END IF;

  -- Get user's last study date and current streak
  SELECT last_study_date, current_streak, longest_streak
  INTO v_last_study_date, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = NEW.user_id;

  -- If no previous study date or last study was yesterday, increment streak
  IF v_last_study_date IS NULL OR v_last_study_date = CURRENT_DATE - INTERVAL '1 day' THEN
    v_current_streak := COALESCE(v_current_streak, 0) + 1;
    IF v_current_streak > COALESCE(v_longest_streak, 0) THEN
      v_longest_streak := v_current_streak;
    END IF;
  -- If last study was today, don't change streak
  ELSIF v_last_study_date = CURRENT_DATE THEN
    -- Streak remains the same
    NULL;
  -- If gap in study, reset streak
  ELSE
    v_current_streak := 1;
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    current_streak = v_current_streak,
    longest_streak = GREATEST(longest_streak, COALESCE(v_longest_streak, 0)),
    last_study_date = CURRENT_DATE
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$function$;

-- Fix award_deck_completion_xp function
CREATE OR REPLACE FUNCTION public.award_deck_completion_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_xp_to_award INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_old_level INTEGER;
BEGIN
  -- Only award XP if this is a completed session (questions answered > 0)
  IF NEW.questions_answered = 0 OR NEW.xp_earned = 0 THEN
    RETURN NEW;
  END IF;

  -- Get current profile
  SELECT xp, level INTO v_new_xp, v_old_level
  FROM profiles
  WHERE id = NEW.user_id;

  -- Calculate new XP and level
  v_new_xp := COALESCE(v_new_xp, 0) + NEW.xp_earned;
  v_new_level := FLOOR(v_new_xp / 100) + 1;

  -- Update profile with new XP and level
  UPDATE profiles
  SET 
    xp = v_new_xp,
    level = v_new_level
  WHERE id = NEW.user_id;

  -- Log level up if it happened
  IF v_new_level > v_old_level THEN
    INSERT INTO notifications (user_id, title, message, type, notification_type)
    VALUES (
      NEW.user_id,
      'Level Up!',
      'Congratulations! You reached level ' || v_new_level || '!',
      'info',
      'achievement'
    );
  END IF;

  RETURN NEW;
END;
$function$;

