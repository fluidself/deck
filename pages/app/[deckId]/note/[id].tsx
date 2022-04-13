// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import type { RequestState } from '@self.id/framework';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Path } from 'slate';
import { ironOptions } from 'constants/iron-session';
import Note from 'components/Note';
import { useStore } from 'lib/store';
import usePrevious from 'utils/usePrevious';
import { queryParamToArray } from 'utils/url';
import useIsMounted from 'utils/useIsMounted';
import useBlockBacklinks from 'editor/backlinks/useBlockBacklinks';
// import checkProtectedPageAuth from 'utils/checkProtectedPageAuth';
import getRequestState from 'utils/getRequestState';

type Props = {
  deckId: string;
  id: string;
  state: RequestState;
};

export default function NotePage(props: Props) {
  const router = useRouter();
  const {
    query: { id: noteId, stack: stackQuery },
  } = router;
  const isMounted = useIsMounted();
  const openNoteIds = useStore(state => state.openNoteIds);
  const setOpenNoteIds = useStore(state => state.setOpenNoteIds);
  const prevOpenNoteIds = usePrevious(openNoteIds);

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

  const pageTitle = useStore(state => {
    if (!noteId || typeof noteId !== 'string' || !state.notes[noteId]?.title) {
      return 'DECK';
    }
    return state.notes[noteId].title;
  });

  useBlockBacklinks();

  const [highlightedPath, setHighlightedPath] = useState<{
    index: number;
    path: Path;
  } | null>(null);

  // Initialize open notes and highlighted path
  useEffect(() => {
    if (!noteId || typeof noteId !== 'string') {
      return;
    }

    const newOpenNoteIds = [noteId, ...queryParamToArray(stackQuery)];
    setOpenNoteIds(newOpenNoteIds);

    // We use router.asPath specifically so we handle any route change (even if asPath is the same)
    const newHighlightedPath = getHighlightedPath(router.asPath);
    setHighlightedPath(newHighlightedPath);
  }, [setOpenNoteIds, router, noteId, stackQuery]);

  useEffect(() => {
    // Scroll the last open note into view if:
    // 1. The last open note id has changed
    // 2. prevOpenNoteIds has length > 0 (ensures that this is not the first render)
    // 3. highlightedPath is not set (if it is, scrolling will be handled by the editor component)
    if (
      openNoteIds.length > 0 &&
      prevOpenNoteIds &&
      prevOpenNoteIds.length > 0 &&
      openNoteIds[openNoteIds.length - 1] !== prevOpenNoteIds[prevOpenNoteIds.length - 1] &&
      !highlightedPath
    ) {
      document.getElementById(openNoteIds[openNoteIds.length - 1])?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
      });
    }
  }, [openNoteIds, prevOpenNoteIds, highlightedPath]);

  if (!noteId || typeof noteId !== 'string') {
    return (
      <>
        <Head>
          <title>Not Found | DECK</title>
        </Head>
        <div className="flex flex-col items-center justify-center flex-1 h-screen p-4">
          <p className="text-2xl text-center">Whoops&mdash;it doesn&apos;t look like this note exists!</p>
          <Link href="/app">
            <a className="mt-6 btn">Go back to my notes</a>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
      </Head>
      <div className="flex flex-1 overflow-x-auto divide-x divide-gray-200 dark:divide-gray-700">
        {openNoteIds.length > 0
          ? openNoteIds.map((noteId, index) => (
              <Note
                key={noteId}
                noteId={noteId}
                className="sticky left-0"
                highlightedPath={highlightedPath?.index === index ? highlightedPath.path : undefined}
              />
            ))
          : null}
      </div>
    </>
  );
}

/**
 * Takes in a url with a hash parameter formatted like #1-2,3 (where 1 signifies the open note index,
 * and 2,3 signifies the path to be highlighted). Parses the url and
 * returns the open note index and the path to be highlighted as an object.
 */
const getHighlightedPath = (url: string): { index: number; path: Path } | null => {
  const urlArr = url.split('#');
  if (urlArr.length <= 1) {
    return null;
  }

  const hash = urlArr[urlArr.length - 1];
  const [strIndex, ...strPath] = hash.split(/[-,]+/);

  const index = Number.parseInt(strIndex);
  const path = strPath.map(pathSegment => Number.parseInt(pathSegment));
  if (Number.isNaN(index) || path.length <= 0 || path.some(segment => Number.isNaN(segment))) {
    return null;
  }

  return { index, path };
};

export const getServerSideProps = withIronSessionSsr(async function ({ params, req }) {
  const cookie = req.headers.cookie;
  const deckId = params?.deckId;
  const id = params?.id;

  if (deckId == null || typeof deckId !== 'string') {
    return {
      redirect: { destination: '/', permanent: false },
    };
  } else if (id == null) {
    return {
      redirect: { destination: `/${deckId}`, permanent: false },
    };
  }

  return {
    props: { deckId, id, state: await getRequestState(cookie) },
  };
}, ironOptions);
