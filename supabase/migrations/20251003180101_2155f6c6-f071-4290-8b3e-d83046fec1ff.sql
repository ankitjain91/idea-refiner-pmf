-- Create AI credits tracking table
CREATE TABLE IF NOT EXISTS public.ai_credits_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_used integer NOT NULL DEFAULT 0,
  operation_type text NOT NULL, -- 'chat', 'analysis', 'batch', 'competition', etc.
  session_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  billing_period_start timestamp with time zone NOT NULL,
  billing_period_end timestamp with time zone NOT NULL
);

-- Create exports tracking table
CREATE TABLE IF NOT EXISTS public.exports_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type text NOT NULL, -- 'pdf', 'csv', 'json'
  idea_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  billing_period_start timestamp with time zone NOT NULL,
  billing_period_end timestamp with time zone NOT NULL
);

-- Create usage limits tracking table (for current billing period)
CREATE TABLE IF NOT EXISTS public.usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  ideas_used integer NOT NULL DEFAULT 0,
  ai_credits_used integer NOT NULL DEFAULT 0,
  exports_used integer NOT NULL DEFAULT 0,
  seats_used integer NOT NULL DEFAULT 1,
  projects_used integer NOT NULL DEFAULT 0,
  billing_period_start timestamp with time zone NOT NULL,
  billing_period_end timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_credits_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exports_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_credits_usage
CREATE POLICY "Users can view their own AI credits usage"
  ON public.ai_credits_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage AI credits usage"
  ON public.ai_credits_usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for exports_usage
CREATE POLICY "Users can view their own exports"
  ON public.exports_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export records"
  ON public.exports_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for usage_limits
CREATE POLICY "Users can view their own usage limits"
  ON public.usage_limits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage limits"
  ON public.usage_limits
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to get current billing period
CREATE OR REPLACE FUNCTION public.get_current_billing_period()
RETURNS TABLE (
  period_start timestamp with time zone,
  period_end timestamp with time zone
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month_start timestamp with time zone;
  next_month_start timestamp with time zone;
BEGIN
  current_month_start := date_trunc('month', now());
  next_month_start := current_month_start + interval '1 month';
  
  RETURN QUERY SELECT current_month_start, next_month_start;
END;
$$;

-- Function to initialize or reset usage limits for a user
CREATE OR REPLACE FUNCTION public.initialize_usage_limits(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start timestamp with time zone;
  period_end timestamp with time zone;
BEGIN
  SELECT * INTO period_start, period_end FROM public.get_current_billing_period();
  
  INSERT INTO public.usage_limits (
    user_id,
    ideas_used,
    ai_credits_used,
    exports_used,
    seats_used,
    projects_used,
    billing_period_start,
    billing_period_end
  )
  VALUES (
    _user_id,
    0,
    0,
    0,
    1,
    0,
    period_start,
    period_end
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    ideas_used = CASE 
      WHEN usage_limits.billing_period_end < now() THEN 0
      ELSE usage_limits.ideas_used
    END,
    ai_credits_used = CASE 
      WHEN usage_limits.billing_period_end < now() THEN 0
      ELSE usage_limits.ai_credits_used
    END,
    exports_used = CASE 
      WHEN usage_limits.billing_period_end < now() THEN 0
      ELSE usage_limits.exports_used
    END,
    billing_period_start = CASE 
      WHEN usage_limits.billing_period_end < now() THEN period_start
      ELSE usage_limits.billing_period_start
    END,
    billing_period_end = CASE 
      WHEN usage_limits.billing_period_end < now() THEN period_end
      ELSE usage_limits.billing_period_end
    END,
    updated_at = now();
END;
$$;

-- Function to increment usage counters
CREATE OR REPLACE FUNCTION public.increment_usage(
  _user_id uuid,
  _type text,
  _amount integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize if needed
  PERFORM public.initialize_usage_limits(_user_id);
  
  -- Update the appropriate counter
  IF _type = 'ideas' THEN
    UPDATE public.usage_limits
    SET ideas_used = ideas_used + _amount, updated_at = now()
    WHERE user_id = _user_id;
  ELSIF _type = 'ai_credits' THEN
    UPDATE public.usage_limits
    SET ai_credits_used = ai_credits_used + _amount, updated_at = now()
    WHERE user_id = _user_id;
  ELSIF _type = 'exports' THEN
    UPDATE public.usage_limits
    SET exports_used = exports_used + _amount, updated_at = now()
    WHERE user_id = _user_id;
  ELSIF _type = 'projects' THEN
    UPDATE public.usage_limits
    SET projects_used = projects_used + _amount, updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Trigger to initialize usage limits on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_usage_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.initialize_usage_limits(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_usage_limits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_usage_limits();