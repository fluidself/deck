import { withIronSessionSsr } from 'iron-session/next';
import type { RequestState } from '@self.id/framework';
import { ironOptions } from 'constants/iron-session';
import OpenSidebarButton from 'components/sidebar/OpenSidebarButton';
// import checkProtectedPageAuth from 'utils/checkProtectedPageAuth';
import getRequestState from 'utils/getRequestState';
import { useStore } from 'lib/store';

type Props = {
  deckId: string;
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
  const cookie = req.headers.cookie;
  const deckId = params?.deckId;

  if (deckId == null || typeof deckId !== 'string') {
    return {
      redirect: { destination: '/', permanent: false },
    };
  }

  return {
    props: { deckId, state: await getRequestState(cookie) },
  };
}, ironOptions);
