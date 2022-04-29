-- extensions

DROP EXTENSION IF EXISTS citext CASCADE;
DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
CREATE EXTENSION IF NOT EXISTS citext with SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" with SCHEMA public;


-- public.notes definition

DROP TABLE IF EXISTS public.notes;
CREATE TABLE public.notes (
  "content" jsonb NOT NULL DEFAULT (('[ { "id": "'::text || uuid_generate_v4()) || '", "type": "paragraph", "children": [{ "text": "" }] } ]'::text)::jsonb,
  title citext NOT NULL,
  deck_id uuid NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT non_empty_title CHECK ((title <> ''::citext)),
  CONSTRAINT notes_pkey PRIMARY KEY (id),
  CONSTRAINT notes_deck_id_title_key UNIQUE (deck_id, title)
);


-- public.users definition

DROP TABLE IF EXISTS public.users;
CREATE TABLE public.users (
  id text NOT NULL,
  gun_key text NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);


-- public.decks definition

DROP TABLE IF EXISTS public.decks;
CREATE TABLE public.decks (
  user_id text NOT NULL,
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  note_tree jsonb NULL,
  deck_name text NULL,
  access_params json NULL,
  CONSTRAINT decks_pkey PRIMARY KEY (id)
);


-- public.notes foreign keys

ALTER TABLE public.notes ADD CONSTRAINT note_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id);


-- public.decks foreign keys

ALTER TABLE public.decks ADD CONSTRAINT deck_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


-- set timestamp trigger

CREATE OR REPLACE FUNCTION trigger_set_timestamp()
  RETURNS trigger 
  language plpgsql 
  security definer 
  set search_path = public
  as $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
  $$;

drop trigger if exists set_timestamp on public.notes;
create trigger set_timestamp
  before update on public.notes
  for each row execute function trigger_set_timestamp();


-- create onboarding notes trigger

CREATE OR REPLACE FUNCTION create_onboarding_notes()
  RETURNS trigger 
  language plpgsql 
  security definer 
  set search_path = public
  as $$
    declare
      getting_started_id uuid := uuid_generate_v4();
      linked_note_id uuid := uuid_generate_v4();
      stack_note_id uuid := uuid_generate_v4();
    begin
      insert into public.notes (id, deck_id, title, content)
      values
        (getting_started_id, new.id, 'Getting Started', ('[{"type":"paragraph","children":[{"text":"Here are some basics to help you get started using your DECK."}]},{"type":"heading-one","children":[{"text":"Bidirectional linking"}]},{"type":"paragraph","children":[{"text":"You can link to other notes, and each note displays the notes that link to it (its \"backlinks\"). This lets you navigate through your notes in an associative way and helps you build connections between similar ideas."}]},{"type":"paragraph","children":[{"text":"Link to another note by using the hovering menu, pressing "},{"code":true,"text":"cmd/ctrl"},{"text":" + "},{"code":true,"text":"k"},{"text":", or enclosing its title in double brackets."}]},{"type":"paragraph","children":[{"text":"Try clicking on this link: "},{"type":"note-link","noteId":"' || linked_note_id || '","children":[{"text":"Linked Note"}],"noteTitle":"Linked Note","isTextTitle":true},{"text":"!"}]},{"type":"heading-one","children":[{"text":"Formatting text"}]},{"type":"bulleted-list","children":[{"type":"list-item","children":[{"text":"Highlight text and use the hovering menu to "},{"bold":true,"text":"style"},{"text":" "},{"text":"your","italic":true},{"text":" "},{"text":"writing","underline":true}]},{"type":"list-item","children":[{"text":"Type markdown shortcuts, which get converted automatically to rich text as you type"}]},{"type":"list-item","children":[{"text":"Use keyboard shortcuts like "},{"code":true,"text":"cmd/ctrl"},{"text":" + "},{"code":true,"text":"b"},{"text":" for "},{"bold":true,"text":"bold"},{"text":", "},{"code":true,"text":"cmd/ctrl"},{"text":" + "},{"code":true,"text":"i"},{"text":" for "},{"text":"italics","italic":true},{"text":", etc."}]}]},{"type":"heading-one","children":[{"text":"Creating or finding notes"}]},{"type":"paragraph","children":[{"text":"You can create new notes or find existing notes by clicking on \"Find or create note\" in the sidebar or by pressing "},{"code":true,"text":"cmd/ctrl"},{"text":" + "},{"code":true,"text":"p"},{"text":". Just type in the title of the note you want to create or find."}]},{"type":"heading-one","children":[{"text":"Sharing DECKs"}]},{"type":"bulleted-list","children":[{"type":"list-item","children":[{"text":"You can share your DECK with a friend or a community by clicking on \"Share\" in the dropdown menu from the top of the sidebar. Among other options, you can grant access to an individual wallet, members of a certain DAO, or holders of a specific NFT."}]},{"type":"list-item","children":[{"text":"To accept an invitation to another DECK, click on \"Join\" in the dropdown menu from the top of the sidebar and enter the unique ID of the DECK you want to join."}]}]}]')::jsonb),
        (linked_note_id, new.id, 'Linked Note', ('[{"type":"paragraph","children":[{"text":"Clicking on a linked note will \""},{"type":"note-link","noteId":"' || stack_note_id || '","children":[{"text":"Page Stacking"}],"noteTitle":"Page Stacking","customText":"stack"},{"text":"\" the note to the side. This lets you easily reference multiple notes at once."}]},{"type":"paragraph","children":[{"text":"You can see what notes link to this note by looking at the \"Linked References\" below."}]}]')::jsonb),
        (stack_note_id, new.id, 'Page Stacking', ('[{"type":"paragraph","children":[{"text":"Stacking notes next to each other lets you read/edit multiple notes at once and reference them all on screen at the same time."}]},{"type":"paragraph","children":[{"text":"Try creating your own notes and linking them together!"}]}]')::jsonb);
      return new;
    end;
  $$;

drop trigger if exists on_public_deck_created on public.decks;
create trigger on_public_deck_created
  after insert on public.decks
  for each row execute function create_onboarding_notes();