import type { Descendant } from 'slate';
import type { ISEAPair } from 'gun/types/sea';

export type User = {
  id: string;
  pair: ISEAPair;
};

export type Deck = {
  id: string;
  name: string;
  user: User['id'];
  encryptedString: string;
  encryptedSymmetricKey: string;
  accessControlConditions: any[];
};

export type Note = {
  id: string;
  content: Descendant[];
  title: string;
  created_at: string;
  updated_at: string;
};
