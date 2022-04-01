import { withIronSessionSsr } from 'iron-session/next';
import type { RequestState } from '@self.id/framework';
import { ironOptions } from 'constants/iron-session';
import OpenSidebarButton from 'components/sidebar/OpenSidebarButton';
// import checkProtectedPageAuth from 'utils/checkProtectedPageAuth';
import getRequestState from 'utils/getRequestState';
import { useStore } from 'lib/store';

type Props = {
  did: string;
  state: RequestState;
};

export default function DeckHome(props: Props) {
  const isSidebarOpen = useStore(state => state.isSidebarOpen);

  return (
    <div className="flex items-center justify-center flex-1 w-full p-12">
      {!isSidebarOpen ? <OpenSidebarButton className="absolute top-0 left-0 z-10 mx-4 my-1" /> : null}
      <p className="text-center text-gray-500">Get started by clicking &ldquo;Find or Create Note&rdquo; in the sidebar</p>
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(async function ({ params, req }) {
  // const { user, allowedDeck } = req.session;
  // const did = params?.did;
  const did = params?.deckId;

  // TODO: clean up when using did
  if (did == null || typeof did !== 'string') {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }

  // const getRequestState = await import('utils/getRequestState');
  const cookie = req.headers.cookie;
  return {
    props: { did, state: await getRequestState(cookie, did) },
  };

  // const authorized = await checkProtectedPageAuth(deckId, user, allowedDeck);

  // return authorized ? { props: {} } : { redirect: { destination: '/', permanent: false } };
}, ironOptions);
