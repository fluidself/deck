// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import { IconInfoCircle } from '@tabler/icons';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ironOptions } from 'constants/iron-session';
import selectDecks from 'lib/api/selectDecks';
import { useAuth } from 'utils/useAuth';
import useIsMounted from 'utils/useIsMounted';
import { EthereumIcon } from 'components/home/EthereumIcon';
import Button from 'components/home/Button';

export default function Home() {
  const [{ data: accountData }] = useAccount();
  const { signIn, signOut } = useAuth();
  const isMounted = useIsMounted();

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

  useEffect(() => {
    const onDisconnect = () => signOut();
    accountData?.connector?.on('disconnect', onDisconnect);

    return () => {
      accountData?.connector?.off('disconnect', onDisconnect);
    };
  }, [accountData?.connector, signOut]);

  return (
    <div className="mt-2">
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

        <Button className="py-4 w-80 mx-auto" onClick={signIn} primary>
          <EthereumIcon />
          Sign-in with Ethereum
        </Button>
      </main>
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(async function ({ req }) {
  const { user } = req.session;
  const decks = await selectDecks(user?.id);

  if (decks.length) {
    return { redirect: { destination: `/app/${decks[decks.length - 1].id}`, permanent: false } };
  } else {
    return user ? { redirect: { destination: '/app', permanent: false } } : { props: {} };
  }
}, ironOptions);
