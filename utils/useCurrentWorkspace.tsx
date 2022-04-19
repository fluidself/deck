import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';
import supabase from 'lib/supabase';
import { Workspace } from 'types/supabase';

type CurrentWorkspace = {
  workspace: Workspace | null;
};

const WorkspaceContext = createContext<CurrentWorkspace | undefined>(undefined);

function useProvideWorkspace(workspaceId: string): CurrentWorkspace {
  // const [deck, setDeck] = useState<Workspace>({ id: workspaceId, name: '' });
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const initWorkspace = async (workspaceId: string) => {
    // const res = await fetch('/api/deck', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({ deckId }),
    // });
    // const { deck } = await res.json();

    const { data: workspace, error } = await supabase
      .from<Workspace>('workspaces')
      .select('*')
      .match({ id: workspaceId })
      .single();

    if (workspace && !error) {
      setWorkspace(workspace);
    }
  };

  useEffect(() => {
    initWorkspace(workspaceId);
  }, []);

  return {
    workspace,
  };
}

export function ProvideCurrentWorkspace({ children, workspaceId }: { children: ReactNode; workspaceId: string }) {
  const workspace = useProvideWorkspace(workspaceId);
  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>;
}

export const useCurrentWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useCurrentWorkspace must be used within a provider');
  }
  return context;
};
