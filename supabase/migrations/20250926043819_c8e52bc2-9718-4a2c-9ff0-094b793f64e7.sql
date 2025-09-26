-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS public.check_email_exists(text);

CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = email_to_check
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$;