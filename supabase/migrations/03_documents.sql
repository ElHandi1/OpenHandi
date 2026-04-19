-- supabase/migrations/03_documents.sql

CREATE TABLE public.workspace_docs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content_markdown text DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enhance cron tasks to support Society orchestration
ALTER TABLE public.cron_tasks ADD COLUMN task_type text DEFAULT 'simple';
ALTER TABLE public.cron_tasks ADD COLUMN doc_id uuid REFERENCES public.workspace_docs(id) ON DELETE SET NULL;

-- Disable RLS for parity
ALTER TABLE public.workspace_docs DISABLE ROW LEVEL SECURITY;
