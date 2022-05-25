import { NoteTreeItem } from 'lib/store';
import { AccessControlCondition, BooleanCondition, ResourceId } from './lit';

export type User = {
  id: string;
};

export type Deck = {
  id: string;
  user_id: User['id'];
  note_tree: NoteTreeItem[];
  deck_name: string;
  encrypted_string: string;
  encrypted_symmetric_key: string;
  access_control_conditions: (AccessControlCondition | BooleanCondition)[];
};

export type Note = {
  id: string;
  deck_id: Deck['id'];
  content: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type AccessParams = {
  resource_id: ResourceId;
  access_control_conditions: AccessControlCondition[];
};
