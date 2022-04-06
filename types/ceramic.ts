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
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Deck = {
  deck_name: string;
  notes?: Array<NoteItem>;
  note_tree?: string;
  // access_params: string;
};

export type ModelTypes = ModelTypeAliases<
  {
    BasicProfile: BasicProfile;
    Note: Note;
    // Notes: Notes;
    Deck: Deck;
  },
  {
    basicProfile: 'BasicProfile';
    // notes: 'Notes';
    deck: 'Deck';
  }
  // { placeholderNote: 'Note' }
>;
