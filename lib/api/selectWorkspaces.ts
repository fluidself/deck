import supabase from 'lib/supabase';
import type { Workspace } from 'types/supabase';

export default async function selectWorkspaces(did: string) {
  const { data, error } = await supabase.from<Workspace>('workspaces').select('id, master_deck').eq('master_did', did);

  if (error) throw error.message;

  return data;
}
