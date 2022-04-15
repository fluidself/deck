// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { ironOptions } from 'constants/iron-session';
// import supabase from 'lib/supabase';
// import insertDeck from 'lib/api/insertDeck';
// import selectDecks from 'lib/api/selectDecks';
// import { Deck } from 'types/supabase';
import useIsMounted from 'utils/useIsMounted';
// import { useAuth } from 'utils/useAuth';
import { AuthSig } from 'types/lit';
import type { ModelTypes, DeckItem } from 'types/ceramic';
import { createRequestClient } from 'utils/getRequestState';
import useCreateDeck from 'utils/useCreateDeck';
import HomeHeader from 'components/home/HomeHeader';
import RequestDeckAccess from 'components/home/RequestDeckAccess';
import ProvideDeckName from 'components/home/ProvideDeckName';
import Button from 'components/home/Button';

export default function AppHome() {
  const router = useRouter();
  // const [{ data: accountData }] = useAccount();
  // const { user, isLoaded, signOut } = useAuth();
  // const { data: decks } = useSWR(user ? 'decks' : null, () => selectDecks(user?.id), { revalidateOnFocus: false });
  const [requestingAccess, setRequestingAccess] = useState<boolean>(false);
  const [creatingDeck, setCreatingDeck] = useState<boolean>(false);
  const isMounted = useIsMounted();
  const createDeck = useCreateDeck();

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

  const createNewDeck = async (deckName: string) => {
    try {
      const redirectLocation = await createDeck(deckName);
      if (!redirectLocation) return;
      toast.success(`Successfully created ${deckName}`);
      router.push(redirectLocation);
    } catch (error) {
      console.error(error);
      toast.error('There was an error creating the DECK');
    }
  };

  // const verifyAccess = async (requestedDeck: string) => {
  //   if (!requestedDeck) return;

  //   if (decks?.find(deck => deck.id === requestedDeck)) {
  //     toast.success('You own that DECK!');
  //     setRequestingAccess(false);
  //     router.push(`/app/${requestedDeck}`);
  //     return;
  //   }

  //   const { data: accessParams } = await supabase.from<Deck>('decks').select('access_params').eq('id', requestedDeck).single();
  //   if (!accessParams?.access_params) {
  //     toast.error('Unable to verify access.');
  //     return;
  //   }

  //   const { resource_id: resourceId, access_control_conditions: accessControlConditions } = accessParams?.access_params || {};
  //   if (!resourceId || !accessControlConditions || !accessControlConditions[0].chain) {
  //     toast.error('Unable to verify access.');
  //     return;
  //   }

  //   try {
  //     const chain = accessControlConditions[0].chain;
  //     const authSig: AuthSig = await LitJsSdk.checkAndSignAuthMessage({ chain });
  //     const jwt = await window.litNodeClient.getSignedToken({
  //       accessControlConditions,
  //       chain,
  //       authSig,
  //       resourceId,
  //     });

  //     const response = await fetch('/api/verify-jwt', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ jwt, requestedDeck }),
  //     });

  //     if (!response.ok) return;

  //     toast.success('Access to DECK is granted.');
  //     setRequestingAccess(false);
  //     router.push(`/app/${requestedDeck}`);
  //   } catch (e: any) {
  //     console.error(e);
  //     toast.error('Unable to verify access.');
  //   }
  // };

  return (
    <div id="app-container" className="h-screen font-display text-base">
      <div className="flex flex-col w-full h-full bg-gray-900 text-gray-100">
        <div className="flex flex-col items-end text-white min-h-[27px] pr-8 mt-2">{<HomeHeader />}</div>
        <div className="flex flex-col flex-1 overflow-y-hidden container">
          <div className="flex flex-col items-center flex-1 w-full p-12">
            <h1 className="mb-12 text-xl text-center mt-24 lg:mt-48">Welcome to DECK</h1>
            <p className="text-center">
              You are one step closer to compiling your new favorite knowledge base. Work by yourself or join forces with your
              community. Get started by creating a new DECK or joining one if you have received an invitation.
            </p>

            <div className="flex flex-col w-1/2 mx-auto mt-12 space-y-5">
              {creatingDeck ? (
                <ProvideDeckName
                  onCancel={() => setCreatingDeck(false)}
                  onDeckNameProvided={async (deckName: string) => await createNewDeck(deckName)}
                />
              ) : (
                <Button onClick={() => setCreatingDeck(true)}>Create a new DECK</Button>
              )}

              {requestingAccess ? (
                <RequestDeckAccess
                  onCancel={() => setRequestingAccess(false)}
                  onDeckAccessRequested={() => {}}
                  // onDeckAccessRequested={async (requestedDeck: string) => await verifyAccess(requestedDeck)}
                />
              ) : (
                <Button onClick={() => setRequestingAccess(true)}>Join a DECK</Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps = withIronSessionSsr(async function ({ req }) {
  const cookie = req.headers.cookie;
  const requestClient = createRequestClient(cookie);
  const prefetch = [];

  if (requestClient.viewerID != null) {
    const response = await requestClient.dataStore.get('decks', requestClient.viewerID);
    const decks = response?.decks ?? [];

    if (decks.length) {
      const newestDeck = decks[decks.length - 1];
      return { redirect: { destination: `/app/${newestDeck.id.replace('ceramic://', '')}`, permanent: false } };
    }

    // prefetch.push(requestClient.prefetch('basicProfile', requestClient.viewerID));
    prefetch.push(requestClient.prefetch('cryptoAccounts', requestClient.viewerID));
    prefetch.push(requestClient.prefetch('decks', requestClient.viewerID));
    await Promise.all([prefetch]);

    return { props: { state: requestClient.getState() } };
  }

  return { redirect: { destination: '/', permanent: false } };
}, ironOptions);
