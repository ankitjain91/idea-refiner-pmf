-- Create Stripe subscription for er.ankitjain91@gmail.com (Enterprise Plan)
-- Update profile with Stripe customer ID and create subscription record

UPDATE public.profiles
SET 
  stripe_customer_id = 'cus_TAayM9Zn3DLqq6',
  updated_at = now()
WHERE user_id = 'a1ddf844-a92e-4078-8ce1-fcfac87e9764';

-- Insert subscription record (no ON CONFLICT since there's no unique constraint on user_id)
INSERT INTO public.subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  price_id,
  product_id,
  status,
  current_period_start,
  current_period_end
)
VALUES (
  'a1ddf844-a92e-4078-8ce1-fcfac87e9764',
  'cus_TAayM9Zn3DLqq6',
  'sub_test_enterprise_manual',
  'price_1SAySoJtb0GRtBUm7TgSNxQt',
  'prod_T7CsCuGP8R6RrO',
  'active',
  now(),
  now() + interval '1 month'
);