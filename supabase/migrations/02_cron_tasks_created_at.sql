-- supabase/migrations/02_cron_tasks_created_at.sql

-- Add missing created_at column to cron_tasks
ALTER TABLE public.cron_tasks
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
