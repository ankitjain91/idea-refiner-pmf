-- One-time cleanup to remove all dashboard data
-- This removes any existing mock data so only real API data gets persisted going forward
DELETE FROM dashboard_data;