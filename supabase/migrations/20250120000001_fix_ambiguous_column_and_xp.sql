-- Fix ambiguous column error in update_study_streak function
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

  -- Get user's last study date and current streak (qualify with table name)
  SELECT p.last_study_date, p.current_streak, p.longest_streak
  INTO v_last_study_date, v_current_streak, v_longest_streak
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

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

  -- Update profile (qualify column names)
  UPDATE public.profiles
  SET 
    current_streak = v_current_streak,
    longest_streak = GREATEST(profiles.longest_streak, COALESCE(v_longest_streak, 0)),
    last_study_date = CURRENT_DATE
  WHERE profiles.id = NEW.user_id;

  RETURN NEW;
END;
$function$;

-- Fix award_deck_completion_xp to properly calculate levels
CREATE OR REPLACE FUNCTION public.award_deck_completion_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_old_level INTEGER;
  v_old_xp INTEGER;
BEGIN
  -- Only award XP if this is a completed session (questions answered > 0)
  IF NEW.questions_answered = 0 OR NEW.xp_earned = 0 THEN
    RETURN NEW;
  END IF;

  -- Get current profile (qualify with table name)
  SELECT p.xp, p.level INTO v_old_xp, v_old_level
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  -- Calculate new XP and level
  v_new_xp := COALESCE(v_old_xp, 0) + NEW.xp_earned;
  -- Level calculation: every 100 XP = 1 level (starting from level 1)
  v_new_level := FLOOR(v_new_xp / 100) + 1;

  -- Update profile with new XP and level (qualify column names)
  UPDATE public.profiles
  SET 
    xp = v_new_xp,
    level = v_new_level,
    updated_at = NOW()
  WHERE profiles.id = NEW.user_id;

  -- Log level up if it happened
  IF v_new_level > COALESCE(v_old_level, 1) THEN
    INSERT INTO public.notifications (user_id, title, message, type, notification_type)
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

-- Ensure triggers exist
DROP TRIGGER IF EXISTS update_study_streak_trigger ON public.study_sessions;
CREATE TRIGGER update_study_streak_trigger
  AFTER INSERT ON public.study_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_study_streak();

-- The award_deck_completion_xp trigger should already exist, but ensure it's correct
-- (It's created in a previous migration as on_deck_completion_xp)

