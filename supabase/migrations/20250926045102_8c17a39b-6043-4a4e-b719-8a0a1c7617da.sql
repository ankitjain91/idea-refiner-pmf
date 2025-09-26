-- Enable real-time updates for brainstorming_sessions table
ALTER TABLE brainstorming_sessions REPLICA IDENTITY FULL;

-- Ensure the table is in the real-time publication
ALTER PUBLICATION supabase_realtime ADD TABLE brainstorming_sessions;