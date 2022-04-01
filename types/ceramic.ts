import type { ModelTypeAliases } from '@glazed/types';
import type { BasicProfile } from '@datamodels/identity-profile-basic';

export type EditionState =
  | { status: 'pending' }
  | { status: 'loading' }
  | { status: 'failed'; error?: unknown }
  | { status: 'done'; notePage: string };

export type NoteForm = {
  content: string;
  title: string;
};

export type Note = {
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type NoteItem = {
  id: string;
  title: string;
};

export type Notes = {
  notes: Array<NoteItem>;
};

export type ModelTypes = ModelTypeAliases<
  {
    BasicProfile: BasicProfile;
    Note: Note;
    Notes: Notes;
  },
  {
    basicProfile: 'BasicProfile';
    notes: 'Notes';
  },
  { placeholderNote: 'Note' }
>;
