-- Fix the conflicting RLS policies for profiles table
DROP POLICY IF EXISTS "Prevent profile enumeration" ON public.profiles;

-- Ensure proper policies exist
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile only" ON public.profiles;

-- Create the correct policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);