import { withIronSessionSsr } from 'iron-session/next';
import { ironOptions } from 'constants/iron-session';
import type { ISEAPair } from 'gun/types/sea';
import OpenSidebarButton from 'components/sidebar/OpenSidebarButton';
import checkProtectedPageAuth from 'utils/checkProtectedPageAuth';
import { useStore } from 'lib/store';
import { useEffect } from 'react';

export default function DeckHome({ gun }: { gun: ISEAPair }) {
  const isSidebarOpen = useStore(state => state.isSidebarOpen);
  const setDeckPair = useStore(state => state.setDeckPair);

  useEffect(() => {
    setDeckPair(gun);
  }, []);

  return (
    <div className="flex items-center justify-center flex-1 w-full p-12">
      {!isSidebarOpen ? <OpenSidebarButton className="absolute top-0 left-0 z-10 mx-4 my-1" /> : null}
      <p className="text-center text-gray-500">Get started by clicking &ldquo;Find or Create Note&rdquo; in the sidebar</p>
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(async function ({ params, req }) {
  // TODO: cover all edge cases
  const { user, gun, deck } = req.session;
  // const deckId = params?.deckId;
  // const authorized = await checkProtectedPageAuth(deckId, user, allowedDeck);
  const authorized = user && gun ? true : false;

  return authorized ? { props: { gun } } : { redirect: { destination: '/', permanent: false } };
}, ironOptions);
