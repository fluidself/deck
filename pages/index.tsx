import { useConnection } from '@self.id/framework';
import { withIronSessionSsr } from 'iron-session/next';
import { IconInfoCircle } from '@tabler/icons';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
// import { useAccount } from 'wagmi';
import { ironOptions } from 'constants/iron-session';
import { createRequestClient } from 'utils/getRequestState';
import selectWorkspaces from 'lib/api/selectWorkspaces';
// import { useAuth } from 'utils/useAuth';
import { EthereumIcon } from 'components/home/EthereumIcon';
import Button from 'components/home/Button';
import PageLoading from 'components/PageLoading';

export default function Home() {
  // const [{ data: accountData }] = useAccount();
  // const { signIn, signOut } = useAuth();
  const [connection, connect] = useConnection();
  const router = useRouter();

  useEffect(() => {
    if (connection.status === 'connected') {
      router.push('/app');
    }
  }, [connection, router]);

  // useEffect(() => {
  //   const onDisconnect = () => signOut();
  //   accountData?.connector?.on('disconnect', onDisconnect);

  //   return () => {
  //     accountData?.connector?.off('disconnect', onDisconnect);
  //   };
  // }, [accountData?.connector, signOut]);

  if (connection.status !== 'disconnected') {
    return <PageLoading />;
  }

  return (
    <div className="mt-2 font-display text-base">
      <a
        href="https://github.com/fluidself/deck#deck"
        rel="noopener noreferrer"
        target="_blank"
        className="focus:outline-none absolute top-3 right-6"
      >
        <IconInfoCircle size={20} className="hover:text-gray-500" />
      </a>
      <main className="container mt-28 lg:mt-48 flex flex-col">
        <div className="mx-auto pl-2 mb-16">
          <h1 className="text-5xl space-y-4 tracking-wider">
            <span className="block">
              <span className="hero-decoration">D</span>
              ecentralized
            </span>
            <span className="block">
              <span className="hero-decoration">E</span>ncrypted
            </span>
            <span className="block">
              <span className="hero-decoration">C</span>
              ollaborative
            </span>
            <span className="block">
              <span className="hero-decoration">K</span>nowledge
            </span>
          </h1>
        </div>
        <Button className="py-4 w-80 mx-auto" primary onClick={connect}>
          <EthereumIcon />
          Sign-in with Ethereum
        </Button>
      </main>
    </div>
  );
}

// TODO: not working as intended when switching between MetaMask accounts in one browser
export const getServerSideProps = withIronSessionSsr(async function ({ req }) {
  const cookie = req.headers.cookie;
  const requestClient = createRequestClient(cookie);

  if (requestClient.viewerID != null) {
    const workspaces = await selectWorkspaces(requestClient.viewerID);
    const response = await requestClient.dataStore.get('decks', requestClient.viewerID);
    const deckIds = (response?.decks ?? []).map(deck => deck.id.replace('ceramic://', ''));

    if (deckIds.length && workspaces.length) {
      const matchingWorkspace = workspaces.filter(workspace => deckIds.includes(workspace.master_deck))[0];
      return { redirect: { destination: `/app/${matchingWorkspace.id}`, permanent: false } };
    }

    return { redirect: { destination: '/app', permanent: false } };
  }

  return { props: {} };
}, ironOptions);
