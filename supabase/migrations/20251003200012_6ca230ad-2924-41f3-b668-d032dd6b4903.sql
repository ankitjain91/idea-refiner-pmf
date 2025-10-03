-- Upgrade er.ankitjain91@gmail.com to Enterprise plan
-- User ID: a1ddf844-a92e-4078-8ce1-fcfac87e9764

-- Update via the sync function to ensure all related tables are updated
SELECT public.sync_user_subscription(
  'a1ddf844-a92e-4078-8ce1-fcfac87e9764'::uuid,
  'enterprise'::app_role,
  NULL, -- stripe_customer_id (can be set later when they actually purchase)
  '2099-12-31'::timestamp with time zone -- subscription end date (far future for testing)
);