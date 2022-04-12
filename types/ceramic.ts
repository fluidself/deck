import type { ModelTypeAliases } from '@glazed/types';
import type { BasicProfile } from '@datamodels/identity-profile-basic';
import type { CryptoAccountLinks as CryptoAccounts } from '@datamodels/identity-accounts-crypto';
import type { Descendant } from 'slate';
import type { AccessControlCondition, BooleanCondition } from './lit';
import { NoteTreeItem } from 'lib/store';

export type NoteItem = {
  id: string;
  title: string;
  content: Descendant[];
  created_at: string;
  updated_at: string;
};

export type DecryptedDeck = {
  notes: Array<NoteItem>;
  note_tree: Array<NoteTreeItem> | null;
};

export type Deck = {
  encryptedZip: string;
  symmetricKey: string;
  accessControlConditions: Array<AccessControlCondition | BooleanCondition>;
  // chain: string;
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
    CryptoAccounts: CryptoAccounts;
    Deck: Deck;
    Decks: Decks;
  },
  {
    basicProfile: 'BasicProfile';
    cryptoAccounts: 'CryptoAccounts';
    // deck: 'Deck';
    decks: 'Decks';
  }
>;
