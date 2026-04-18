-- supabase/migrations/01_sessions.sql

-- Create the sessions table
CREATE TABLE public.sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Alter messages table to link to sessions
ALTER TABLE public.messages ADD COLUMN session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Disable RLS on the new table to maintain architecture parity
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
