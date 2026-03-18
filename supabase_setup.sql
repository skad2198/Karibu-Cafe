-- Run this script in your Supabase SQL Editor to create the tables

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable real-time for the orders table
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Important for prototype: disable Row Level Security to allow anonymous read/write
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
