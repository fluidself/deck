// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import classNames from 'classnames';
import colors from 'tailwindcss/colors';
import { useAccount } from 'wagmi';
import { useStore, store, NoteTreeItem, getNoteTreeItem, Notes, SidebarTab } from 'lib/store';
import { ProvideCurrentDeck } from 'utils/useCurrentDeck';
import useHotkeys from 'utils/useHotkeys';
import { useAuth } from 'utils/useAuth';
import useGun from 'utils/useGun';
import useNotes from 'utils/useNotes';
import useIsMounted from 'utils/useIsMounted';
import { isMobile } from 'utils/device';
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
  const { user, isLoaded, signOut } = useAuth();
  const [{ data: accountData }] = useAccount();
  const { isReady, getUser, getGun } = useGun();
  const { upsertNote: upsertDbNote, notesReady, getNotes } = useNotes();
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const deckPair = useStore(state => state.deckPair);
  const isMounted = useIsMounted();

  useEffect(() => {
    const onDisconnect = () => signOut();
    accountData?.connector?.on('disconnect', onDisconnect);

    return () => {
      accountData?.connector?.off('disconnect', onDisconnect);
    };
  }, [accountData?.connector, signOut]);

  useEffect(() => {
    if (!isPageLoaded && isLoaded && user) {
      // Use user's specific store and rehydrate data
      useStore.persist.setOptions({
        name: `deck-storage-${user.id}`,
      });
      useStore.persist.rehydrate();
    }
  }, [isPageLoaded, isLoaded, user]);

  const setNoteTree = useStore(state => state.setNoteTree);
  // const setDeckId = useStore(state => state.setDeckId);

  const initLit = async () => {
    const client = new LitJsSdk.LitNodeClient({ alertWhenUnauthorized: false, debug: false });
    await client.connect();
    window.litNodeClient = client;
  };

  // TODO: always runs twice on first load. figure out why
  const initData = useCallback(async () => {
    if (!window.litNodeClient && isMounted()) {
      await initLit();
    }

    if (!deckId || typeof deckId !== 'string') {
      return;
    }
    // setDeckId(deckId);

    const notes = Object.values(store.getState().notes);
    console.log('initData', notes);

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

    // Handle note tree
    const storedNoteTree = await getGun().user(deckPair.pub).get('note_tree').then();
    const notesAsObj = store.getState().notes;

    if (storedNoteTree && typeof storedNoteTree !== 'undefined') {
      console.log(storedNoteTree);
      const noteTree: NoteTreeItem[] = [...JSON.parse(storedNoteTree)];
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
  }, [deckId, router, setNoteTree]);

  useEffect(() => {
    if (isLoaded && !user) {
      // Redirect to root page if there is no user logged in
      router.replace('/');
    } else if (!isPageLoaded && isLoaded && user && notesReady) {
      // Initialize data if there is a user and the data has not been initialized yet
      initData();
    }
  }, [router, user, isLoaded, isPageLoaded, notesReady, initData]);

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

  // TODO: figure out a less hacky way to transmit this update?
  // editor/plugins/withAutoMarkdown/handleInlineShortcuts.ts
  useEffect(() => {
    const interval = setInterval(() => {
      if (localStorage.getItem('deck-note-upsert-id')) {
        const upsertId = localStorage.getItem('deck-note-upsert-id');
        const upsertTitle = localStorage.getItem('deck-note-upsert-title');
        if (!upsertId || !upsertTitle) return;
        localStorage.removeItem('deck-note-upsert-id');
        localStorage.removeItem('deck-note-upsert-title');
        upsertDbNote(upsertTitle, upsertId);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

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

  const appContainerClassName = classNames('h-screen font-display', { dark: darkMode }, className);

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

const removeNonexistentNotes = (tree: NoteTreeItem[], notes: Notes) => {
  for (let i = 0; i < tree.length; i++) {
    const item = tree[i];
    if (!notes[item.id]) {
      tree.splice(i, 1);
    } else if (item.children.length > 0) {
      removeNonexistentNotes(item.children, notes);
    }
  }
};
