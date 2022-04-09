import type { ModelTypeAliases } from '@glazed/types';
import type { BasicProfile } from '@datamodels/identity-profile-basic';

// export type EditionState =
//   | { status: 'pending' }
//   | { status: 'loading' }
//   | { status: 'failed'; error?: unknown }
//   | { status: 'done'; notePage: string };

export type NoteItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Deck = {
  notes: Array<NoteItem>;
  note_tree: string;
  access_params: string;
};

export type DeckItem = {
  id: string;
  deck_name: string;
};

export type Decks = {
  decks: Array<DeckItem>;
};

export type ModelTypes = ModelTypeAliases<
  {
    BasicProfile: BasicProfile;
    Deck: Deck;
    Decks: Decks;
  },
  {
    basicProfile: 'BasicProfile';
    decks: 'Decks';
  }
>;
