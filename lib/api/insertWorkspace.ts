import supabase from 'lib/supabase';
import type { Workspace } from 'types/supabase';

type WorkspaceInsert = {
  name: string;
  master_deck: string;
  master_did: string;
  decks: string[];
  notes: string[];
};

export default async function insertWorkspace(workspace: WorkspaceInsert) {
  const { data, error } = await supabase.from<Workspace>('workspaces').insert(workspace).single();

  if (data) {
    return data;
  } else if (error) {
    console.error(error);
  }
}
