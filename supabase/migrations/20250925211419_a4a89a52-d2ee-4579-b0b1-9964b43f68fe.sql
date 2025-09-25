-- Function to clear all data for a specific user by email
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user ID from auth.users by email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = 'er.ankitjain91@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Delete from all user-related tables
    DELETE FROM public.analysis_sessions WHERE user_id = target_user_id;
    DELETE FROM public.collaborations WHERE requester_id = target_user_id OR recipient_id = target_user_id;
    DELETE FROM public.ideas WHERE user_id = target_user_id;
    DELETE FROM public.refinements WHERE user_id = target_user_id;
    DELETE FROM public.subscriptions WHERE user_id = target_user_id;
    DELETE FROM public.user_features WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE user_id = target_user_id;
    
    RAISE NOTICE 'Successfully deleted all data for user: er.ankitjain91@gmail.com';
  ELSE
    RAISE NOTICE 'User not found: er.ankitjain91@gmail.com';
  END IF;
END $$;