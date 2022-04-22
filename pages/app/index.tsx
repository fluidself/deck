// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { withIronSessionSsr } from 'iron-session/next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// import { useAccount } from 'wagmi';
import { toast } from 'react-toastify';
import { useViewerID, useCore, useViewerRecord } from '@self.id/framework';
import { ironOptions } from 'constants/iron-session';
import supabase from 'lib/supabase';
// import insertDeck from 'lib/api/insertDeck';
// import selectDecks from 'lib/api/selectDecks';
import { Workspace } from 'types/supabase';
import useIsMounted from 'utils/useIsMounted';
// import { useAuth } from 'utils/useAuth';
import { AccessControlCondition, AuthSig, BooleanCondition } from 'types/lit';
import type { ModelTypes, DeckItem, NoteItem } from 'types/ceramic';
import { createRequestClient } from 'utils/getRequestState';
import useCreateDeck from 'utils/useCreateDeck';
import { decryptDeck } from 'utils/encryption';
import selectWorkspaces from 'lib/api/selectWorkspaces';
import insertWorkspace from 'lib/api/insertWorkspace';
import HomeHeader from 'components/home/HomeHeader';
import RequestDeckAccess from 'components/home/RequestDeckAccess';
import ProvideDeckName from 'components/home/ProvideDeckName';
import Button from 'components/home/Button';

export default function AppHome() {
  const router = useRouter();
  // const [{ data: accountData }] = useAccount();
  // const { user, isLoaded, signOut } = useAuth();
  // const { data: decks } = useSWR(user ? 'decks' : null, () => selectDecks(user?.id), { revalidateOnFocus: false });
  const decksRecord = useViewerRecord<ModelTypes, 'decks'>('decks');
  const [requestingAccess, setRequestingAccess] = useState<boolean>(false);
  const [creatingDeck, setCreatingDeck] = useState<boolean>(false);
  const viewerID = useViewerID();
  const { tileLoader } = useCore();
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
    if (!viewerID?.id) return;

    try {
      const { success, deckId, newNoteIds } = await createDeck(deckName);
      if (!success || !deckId || !newNoteIds) {
        toast.error('There was an error creating your DECK');
        return;
      }

      const workspace = await insertWorkspace({
        name: deckName,
        master_deck: deckId,
        master_did: viewerID.id,
        decks: [deckId],
        notes: newNoteIds,
      });
      if (!workspace) {
        toast.error('There was an error creating your DECK');
        return;
      }

      toast.success(`Successfully created ${workspace.name}`);
      setCreatingDeck(false);
      router.push(`/app/${workspace.id}`);
    } catch (error) {
      console.error(error);
      toast.error('There was an error creating your DECK');
    }
  };

  const verifyAccess = async (requestedWorkspace: string) => {
    if (!requestedWorkspace || !decksRecord) return;

    // if (decks?.find(deck => deck.id === requestedDeck)) {
    //   toast.success('You own that DECK!');
    //   setRequestingAccess(false);
    //   router.push(`/app/${requestedDeck}`);
    //   return;
    // }

    const { data: workspace } = await supabase
      .from<Workspace>('workspaces')
      .select('id, name, master_deck, decks, notes, note_tree')
      .eq('id', requestedWorkspace)
      .single();
    if (!workspace) {
      toast.error('Unable to verify access.');
      return;
    }

    if (decksRecord.content?.decks) {
      for (const userDeck of decksRecord.content.decks) {
        if (workspace.decks.includes(userDeck.id.replace('ceramic://', ''))) {
          toast.success('Access to DECK is granted.');
          setRequestingAccess(false);
          router.push(`/app/${requestedWorkspace}`);
          return;
        }
      }
    }

    try {
      const deckTileDocuments = await tileLoader.loadMany(workspace?.decks);
      let notes: NoteItem[] = [];
      // TODO: or just get it from master_deck?
      // TODO: store acc on workspace after all?
      let accessControlConditions: (AccessControlCondition | BooleanCondition)[] = [];

      for (const deckTileDocument of deckTileDocuments) {
        if (deckTileDocument instanceof Error) return;
        const { notes: deckNotes, accessControlConditions: deckAcc } = await decryptDeck(deckTileDocument.content);
        notes = [...notes, ...deckNotes];
        accessControlConditions = [...deckAcc];
      }

      // TODO: this sanity check needed?
      notes = notes.filter(note => workspace.notes.includes(note.id));

      const { success, deckId } = await createDeck(workspace.name, notes, accessControlConditions);
      if (!success || !deckId) {
        toast.error('Unable to verify access.');
        return;
      }

      const { data, error } = await supabase
        .from<Workspace>('workspaces')
        .update({ decks: [...workspace.decks, deckId] })
        .eq('id', workspace.id);

      if (error) {
        toast.error('Unable to verify access.');
        return;
      }

      toast.success('Access to DECK is granted.');
      setRequestingAccess(false);
      router.push(`/app/${requestedWorkspace}`);
    } catch (error) {
      console.error(error);
      toast.error('Unable to verify access.');
    }
  };

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
                  onDeckAccessRequested={async (requestedWorkspace: string) => await verifyAccess(requestedWorkspace)}
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
    const workspaces = await selectWorkspaces(requestClient.viewerID);
    const response = await requestClient.dataStore.get('decks', requestClient.viewerID);
    const deckIds = (response?.decks ?? []).map(deck => deck.id.replace('ceramic://', ''));

    if (deckIds.length && workspaces.length) {
      const matchingWorkspace = workspaces.filter(workspace => deckIds.includes(workspace.master_deck))[0];
      return { redirect: { destination: `/app/${matchingWorkspace.id}`, permanent: false } };
    }

    // prefetch.push(requestClient.prefetch('basicProfile', requestClient.viewerID));
    prefetch.push(requestClient.prefetch('cryptoAccounts', requestClient.viewerID));
    prefetch.push(requestClient.prefetch('decks', requestClient.viewerID));
    await Promise.all([prefetch]);

    return { props: { state: requestClient.getState() } };
  }

  return { redirect: { destination: '/', permanent: false } };
}, ironOptions);
