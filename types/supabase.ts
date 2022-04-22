import type { Descendant } from 'slate';
import { NoteTreeItem } from 'lib/store';
import { AccessControlCondition, ResourceId } from './lit';

export type User = {
  id: string;
};

export type Deck = {
  id: string;
  user_id: User['id'];
  note_tree: NoteTreeItem[];
  deck_name?: string;
  access_params: AccessParams;
};

export type Note = {
  id: string;
  deck_id: Deck['id'];
  content: Descendant[];
  title: string;
  created_at: string;
  updated_at: string;
};

export type AccessParams = {
  resource_id: ResourceId;
  access_control_conditions: AccessControlCondition[];
};

export type Workspace = {
  id: string;
  name: string;
  master_deck: string;
  master_did: string;
  decks: string[];
  notes: string[];
  note_tree: NoteTreeItem[];
};
