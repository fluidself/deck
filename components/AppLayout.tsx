// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import classNames from 'classnames';
import colors from 'tailwindcss/colors';
import { useViewerID } from '@self.id/framework';
// import { useAccount } from 'wagmi';
import { useStore, store, NoteTreeItem, getNoteTreeItem, Notes, SidebarTab } from 'lib/store';
// import supabase from 'lib/supabase';
// import { Note, Deck } from 'types/supabase';
import type { Deck, ModelTypes, NoteItem } from 'types/ceramic';
import { ProvideCurrentDeck } from 'utils/useCurrentDeck';
import { useDeck } from 'utils/ceramic-hooks';
import useHotkeys from 'utils/useHotkeys';
// import { useAuth } from 'utils/useAuth';
import { isMobile } from 'utils/device';
import useIsMounted from 'utils/useIsMounted';
import { decodeFromB64, decryptWithLit } from 'utils/encryption';
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
  const {
    query: { deckId },
  } = router;
  const viewerID = useViewerID();
  const deck = useDeck(deckId as string);
  const isMounted = useIsMounted();

  const [isPageLoaded, setIsPageLoaded] = useState(false);

  useEffect(() => {
    const initLit = async () => {
      const client = new LitJsSdk.LitNodeClient({ alertWhenUnauthorized: false, debug: false });
      await client.connect();
      window.litNodeClient = client;
    };

    if (!window.litNodeClient && isMounted()) {
      initLit();
    }
  }, [isMounted]);

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
  const setDeckId = useStore(state => state.setDeckId);

  const initData = useCallback(async () => {
    if (!deckId || typeof deckId !== 'string' || !deck.content) {
      return;
    }

    setDeckId(deckId);

    const { encryptedZip, symmetricKey, accessControlConditions } = deck.content;
    const { success, decodedZip, decodedSymmetricKey } = await decodeFromB64(encryptedZip, symmetricKey);
    if (!success || !decodedZip || !decodedSymmetricKey) return;

    const decryptedString = await decryptWithLit(decodedZip, decodedSymmetricKey, accessControlConditions);
    const { notes, note_tree }: { notes: NoteItem[]; note_tree: NoteTreeItem[] | null } = JSON.parse(decryptedString);
    // console.log(notes);

    // const notes: NoteItem[] = deck.content?.notes ?? [];

    // Redirect to most recent note or first note in database
    if (router.pathname.match(/^\/app\/[^/]+$/i)) {
      const openNoteIds = store.getState().openNoteIds;
      if (openNoteIds.length > 0 && notes && notes.findIndex(note => note.id === openNoteIds[0]) > -1) {
        router.replace(`/app/${deckId}/note/${openNoteIds[0]}`);
        return;
      } else if (notes && notes.length > 0) {
        router.replace(`/app/${deckId}/note/${notes[0].id}`);
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
    if (note_tree) {
      const noteTree: NoteTreeItem[] = [...note_tree];
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
  }, [deckId, deck, router, setNotes, setNoteTree, setDeckId]);

  useEffect(() => {
    // TODO: finetune?
    // console.log('AppLayout useEffect', isPageLoaded, connection, deck, decksRecord, decksRecordPublic, decks);
    if (!viewerID?.id) {
      // Redirect to root page if there is no user logged in
      router.replace('/');
    } else if (!isPageLoaded && !deck.isLoading) {
      // Initialize data if there is a user and the data has not been initialized yet
      initData();
    }
  }, [router, viewerID, deck.isLoading, deck.content, isPageLoaded, initData]);

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
        callback: () => router.push(`/app/${deckId}/graph`),
      },
      {
        hotkey: 'mod+\\',
        callback: () => setIsSidebarOpen(isOpen => !isOpen),
      },
    ],
    [setIsFindOrCreateModalOpen, setSidebarTab, setIsSidebarOpen, router, deckId],
  );
  useHotkeys(hotkeys);

  const appContainerClassName = classNames('h-screen font-display text-base', { dark: darkMode }, className);

  if (!isPageLoaded) {
    return <PageLoading />;
  }

  if (!deckId || typeof deckId !== 'string') {
    return <PageLoading />;
  }

  return (
    <>
      <Head>
        <meta name="theme-color" content={darkMode ? colors.neutral[900] : colors.white} />
      </Head>
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
