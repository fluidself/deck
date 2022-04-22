// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import classNames from 'classnames';
import colors from 'tailwindcss/colors';
import { useViewerID, useCore, useViewerRecord } from '@self.id/framework';
// import { useAccount } from 'wagmi';
import { useStore, store, NoteTreeItem, getNoteTreeItem, Notes, SidebarTab } from 'lib/store';
import supabase from 'lib/supabase';
// import { Note, Deck } from 'types/supabase';
import type { Deck, ModelTypes, NoteItem } from 'types/ceramic';
import type { Workspace } from 'types/supabase';
import { ProvideCurrentDeck } from 'utils/useCurrentDeck';
import { ProvideCurrentWorkspace } from 'utils/useCurrentWorkspace';
import useHotkeys from 'utils/useHotkeys';
// import { useAuth } from 'utils/useAuth';
import { isMobile } from 'utils/device';
import useIsMounted from 'utils/useIsMounted';
import { decryptDeck } from 'utils/encryption';
import Sidebar from './sidebar/Sidebar';
import FindOrCreateModal from './FindOrCreateModal';
import PageLoading from './PageLoading';
import OfflineBanner from './OfflineBanner';

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AppLayout(props: Props) {
  const { children, className = '' } = props;
  const router = useRouter();
  // TODO: [deckId] => [workspaceId]
  const {
    query: { deckId: workspaceId },
  } = router;
  const viewerID = useViewerID();
  const decksRecord = useViewerRecord<ModelTypes, 'decks'>('decks');
  const isMounted = useIsMounted();
  const { tileLoader } = useCore();

  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [deckId, setDeckId] = useState<string | null>(null);

  // useEffect(() => {
  //   const onDisconnect = () => signOut();
  //   accountData?.connector?.on('disconnect', onDisconnect);

  //   return () => {
  //     accountData?.connector?.off('disconnect', onDisconnect);
  //   };
  // }, [accountData?.connector, signOut]);

  useEffect(() => {
    if (!isPageLoaded && viewerID?.id) {
      // Use user's specific store and rehydrate data
      useStore.persist.setOptions({
        name: `deck-storage-${viewerID?.id.slice(6)}`,
      });
      useStore.persist.rehydrate();
    }
  }, [isPageLoaded, viewerID]);

  const setNotes = useStore(state => state.setNotes);
  const setNoteTree = useStore(state => state.setNoteTree);
  const setDeckIdStore = useStore(state => state.setDeckId);

  const initLit = async () => {
    const client = new LitJsSdk.LitNodeClient({ alertWhenUnauthorized: false, debug: false });
    await client.connect();
    window.litNodeClient = client;
  };

  const initData = useCallback(async () => {
    if (!window.litNodeClient && isMounted()) {
      await initLit();
    }

    if (!workspaceId || typeof workspaceId !== 'string') {
      return;
    }

    const { data: workspace } = await supabase
      .from<Workspace>('workspaces')
      .select('master_deck, decks, note_tree')
      .eq('id', workspaceId)
      .single();
    if (!workspace) return;

    const currentUserDeck = decksRecord.content?.decks.find(deck => workspace.decks.includes(deck.id.replace('ceramic://', '')));
    if (currentUserDeck) {
      // const deckIdNormalized = currentUserDeck.id.replace('ceramic://', '')
      // setDeckId(deckIdNormalized);
      // setDeckIdStore(deckIdNormalized);
      setDeckId(currentUserDeck.id.replace('ceramic://', ''));
    }

    const deckTileDocuments = await tileLoader.loadMany(workspace.decks);
    let notes: NoteItem[] = [];

    // TODO: DRY up and reuse in verifyAccess?
    for (const deckTileDocument of deckTileDocuments) {
      if (deckTileDocument instanceof Error) return;
      const { notes: deckNotes } = await decryptDeck(deckTileDocument.content);
      notes = [...notes, ...deckNotes];
    }

    notes = notes
      .sort((a, b) => (a.updated_at < b.updated_at ? -1 : a.updated_at > b.updated_at ? 1 : 0))
      .filter((value, index, self) => index === self.findIndex(t => t.id === value.id));
    // TODO: make sure this filter does what I want
    // TODO: experiment with each user having same note. latest updated_at should be shown

    // Redirect to most recent note or first note in database
    if (router.pathname.match(/^\/app\/[^/]+$/i)) {
      const openNoteIds = store.getState().openNoteIds;
      if (openNoteIds.length > 0 && notes && notes.findIndex(note => note.id === openNoteIds[0]) > -1) {
        router.replace(`/app/${workspaceId}/note/${openNoteIds[0]}`);
        return;
      } else if (notes && notes.length > 0) {
        router.replace(`/app/${workspaceId}/note/${notes[0].id}`);
        return;
      }
    }

    if (!notes.length) {
      setIsPageLoaded(true);
      return;
    }

    // Set notes
    const notesAsObj = notes.reduce<Record<NoteItem['id'], NoteItem>>((acc, note) => {
      acc[note.id] = note;
      return acc;
    }, {});
    setNotes(notesAsObj);

    // Set note tree
    if (workspace.note_tree) {
      const noteTree: NoteTreeItem[] = [...workspace.note_tree];
      // This is a sanity check for removing notes in the noteTree that do not exist
      removeNonexistentNotes(noteTree, notesAsObj);
      // If there are notes that are not in the note tree, add them
      // This is a sanity check to make sure there are no orphaned notes
      for (const note of notes) {
        if (getNoteTreeItem(noteTree, note.id) === null) {
          noteTree.push({ id: note.id, children: [], collapsed: true });
        }
      }
      // Use the note tree saved in the database
      setNoteTree(noteTree);
    } else {
      // No note tree in database, just use notes
      setNoteTree(notes.map(note => ({ id: note.id, children: [], collapsed: true })));
    }

    setIsPageLoaded(true);
  }, [isMounted, workspaceId, decksRecord.isLoading, router, setNotes, setNoteTree, setDeckId]);

  useEffect(() => {
    if (!viewerID?.id) {
      // Redirect to root page if there is no user logged in
      router.replace('/');
    } else if (!isPageLoaded && decksRecord && !decksRecord.isLoading) {
      initData();
    }
  }, [router, viewerID?.id, isPageLoaded, decksRecord.isLoading, initData]);

  const [isFindOrCreateModalOpen, setIsFindOrCreateModalOpen] = useState(false);
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // const darkMode = useStore(state => state.darkMode);
  const darkMode = true;
  const setIsSidebarOpen = useStore(state => state.setIsSidebarOpen);
  const setIsPageStackingOn = useStore(state => state.setIsPageStackingOn);
  const setSidebarTab = useStore(state => state.setSidebarTab);

  const hasHydrated = useStore(state => state._hasHydrated);
  useEffect(() => {
    // If the user is mobile, the persisted data has been hydrated, and there are no open note ids (a proxy for the first load),
    // change the initial values of isSidebarOpen and isPageStackingOn to better suit mobile devices
    // We need to wait until after hydration because otherwise the persisted state gets overridden and thrown away
    // After https://github.com/pmndrs/zustand/issues/562 is fixed, we can change this
    if (isMobile() && hasHydrated && store.getState().openNoteIds.length === 0) {
      setIsSidebarOpen(false);
      setIsPageStackingOn(false);
    }
  }, [setIsSidebarOpen, setIsPageStackingOn, hasHydrated]);

  const hotkeys = useMemo(
    () => [
      {
        hotkey: 'mod+p',
        callback: () => setIsFindOrCreateModalOpen(isOpen => !isOpen),
      },
      {
        hotkey: 'mod+s',
        callback: () => {
          /* todo: placeholder for saving */
        },
      },
      {
        hotkey: 'mod+shift+e',
        callback: () => setSidebarTab(SidebarTab.Notes),
      },
      {
        hotkey: 'mod+shift+f',
        callback: () => setSidebarTab(SidebarTab.Search),
      },
      {
        hotkey: 'mod+shift+g',
        callback: () => router.push(`/app/${workspaceId}/graph`),
      },
      {
        hotkey: 'mod+\\',
        callback: () => setIsSidebarOpen(isOpen => !isOpen),
      },
    ],
    [setIsFindOrCreateModalOpen, setSidebarTab, setIsSidebarOpen, router, workspaceId],
  );
  useHotkeys(hotkeys);

  const appContainerClassName = classNames('h-screen font-display text-base', { dark: darkMode }, className);

  if (!isPageLoaded || !workspaceId || typeof workspaceId !== 'string' || !deckId) {
    return <PageLoading />;
  }

  return (
    <>
      <Head>
        <meta name="theme-color" content={darkMode ? colors.neutral[900] : colors.white} />
      </Head>
      <ProvideCurrentWorkspace workspaceId={workspaceId}>
        <ProvideCurrentDeck deckId={deckId}>
          <div id="app-container" className={appContainerClassName}>
            <div className="flex w-full h-full dark:bg-gray-900">
              <Sidebar setIsFindOrCreateModalOpen={setIsFindOrCreateModalOpen} />
              <div className="relative flex flex-col flex-1 overflow-y-hidden">
                <OfflineBanner />
                {children}
              </div>
              {isFindOrCreateModalOpen ? <FindOrCreateModal setIsOpen={setIsFindOrCreateModalOpen} /> : null}
            </div>
          </div>
        </ProvideCurrentDeck>
      </ProvideCurrentWorkspace>
    </>
  );
}

// const removeNonexistentNotes = (tree: NoteTreeItem[], notes: Notes) => {
const removeNonexistentNotes = (tree: NoteTreeItem[], notes: any) => {
  for (let i = 0; i < tree.length; i++) {
    const item = tree[i];
    if (!notes[item.id]) {
      tree.splice(i, 1);
    } else if (item.children.length > 0) {
      removeNonexistentNotes(item.children, notes);
    }
  }
};
