-- Remove email from profiles table (to prevent harvesting)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update RLS policies for profiles table to prevent enumeration
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create more restrictive policies
CREATE POLICY "Users can view their own profile only" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile only" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile only" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add a policy to prevent listing all profiles
CREATE POLICY "Prevent profile enumeration" 
ON public.profiles 
FOR SELECT 
USING (false);