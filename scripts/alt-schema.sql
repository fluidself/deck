-- extensions

DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" with SCHEMA public;


-- public.workspaces definition

DROP TABLE IF EXISTS public.workspaces;
CREATE TABLE public.workspaces (
  "name" text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  master_deck text NOT NULL,
  -- access_control_conditions jsonb NOT NULL,
  decks jsonb NOT NULL,
  note_tree jsonb NULL,
  CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);
