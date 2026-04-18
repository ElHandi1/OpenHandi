-- supabase/migrations/00_init.sql

-- Enable the pgcrypto extension for gen_random_uuid() if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: messages
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Table: cron_tasks
CREATE TABLE public.cron_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    schedule text NOT NULL,
    enabled boolean DEFAULT true,
    last_run timestamptz,
    next_run timestamptz,
    last_status text CHECK (last_status IN ('success', 'error', 'running', 'pending')),
    payload jsonb
);

-- Table: cron_logs
CREATE TABLE public.cron_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid REFERENCES public.cron_tasks(id) ON DELETE CASCADE,
    executed_at timestamptz DEFAULT now(),
    status text CHECK (status IN ('success', 'error')),
    output text,
    error text
);

-- Table: config
CREATE TABLE public.config (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Disable Row Level Security (RLS) on all tables for initial personal use simplicity,
-- or enable them and allow full access (which is functionally equivalent but sets up the RLS boundary).
-- According to request: "frontend uses the anon key with RLS policies disabled for simplicity".

ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.config DISABLE ROW LEVEL SECURITY;

-- If you ever enable RLS, the following permissive policies would serve as a baseline:
-- CREATE POLICY "Allow all operations for anon" ON public.messages FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations for anon" ON public.cron_tasks FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations for anon" ON public.cron_logs FOR ALL TO anon USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations for anon" ON public.config FOR ALL TO anon USING (true) WITH CHECK (true);
