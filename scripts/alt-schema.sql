-- extensions

DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" with SCHEMA public;


-- public.workspaces definition

DROP TABLE IF EXISTS public.workspaces;
CREATE TABLE public.workspaces (
  "name" text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  master_deck text NOT NULL,
  master_did text NOT NULL,
  decks jsonb NOT NULL,
  notes jsonb NOT NULL, -- would this break if all notes are deleted?
  note_tree jsonb NULL,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);


-- TODO: bring back a notes table?
-- would allow me to subscribe to changes and update more fluently
-- .from<Note>(`notes:workspace_id=eq.${workspaceId}`)

-- alternatively: have an updated_at on workspace?


-- public.notes definition

DROP TABLE IF EXISTS public.notes;
CREATE TABLE public.notes (
  workspace_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_workspace_id_key UNIQUE (workspace_id)
);


-- public.notes foreign keys

ALTER TABLE public.notes ADD CONSTRAINT note_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);