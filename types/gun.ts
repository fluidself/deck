import type { Descendant } from 'slate';

export type User = {
  id: string;
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
