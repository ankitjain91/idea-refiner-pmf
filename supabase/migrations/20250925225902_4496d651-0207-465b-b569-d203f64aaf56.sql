-- Update all existing users to enterprise role
UPDATE public.user_roles 
SET role = 'enterprise',
    updated_at = now()
WHERE role != 'enterprise';

-- Update all profiles to enterprise subscription
UPDATE public.profiles
SET subscription_tier = 'enterprise',
    subscription_end_date = '2099-12-31'::timestamp with time zone,
    updated_at = now();

-- Create or update analysis sessions to reflect enterprise access
UPDATE public.analysis_sessions
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{subscriptionTier}',
  '"enterprise"'
),
updated_at = now();

-- Ensure new users get enterprise by default
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'enterprise')
  ON CONFLICT (user_id) 
  DO UPDATE SET role = 'enterprise';
  
  INSERT INTO public.profiles (user_id, subscription_tier, subscription_end_date)
  VALUES (NEW.id, 'enterprise', '2099-12-31'::timestamp with time zone)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    subscription_tier = 'enterprise',
    subscription_end_date = '2099-12-31'::timestamp with time zone;
    
  RETURN NEW;
END;
$$;

-- Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();