// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { useMemo, useState } from 'react';
import { IconFolderPlus, IconGitPullRequest, IconPencil } from '@tabler/icons';
import { useConnection, useViewerRecord } from '@self.id/framework';
import { toast } from 'react-toastify';
import type { ModelTypes } from 'types/ceramic';
import { AuthSig } from 'types/lit';
import useHotkeys from 'utils/useHotkeys';
import useCreateDeck from 'utils/useCreateDeck';
import Button from 'components/home/Button';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { useCurrentWorkspace } from 'utils/useCurrentWorkspace';

type Props = {
  type: 'create' | 'join' | 'rename';
  closeModal: () => void;
};

export default function CreateJoinRenameDeckModal(props: Props) {
  const { type, closeModal } = props;

  const currentDeck = useCurrentDeck();
  const [connection, connect] = useConnection();
  const createDeck = useCreateDeck();
  const decksRecord = useViewerRecord<ModelTypes, 'decks'>('decks');
  const [inputText, setInputText] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);

  const hotkeys = useMemo(
    () => [
      {
        hotkey: 'esc',
        callback: () => closeModal(),
      },
    ],
    [closeModal],
  );
  useHotkeys(hotkeys);

  const createNewDeck = async () => {
    setProcessing(true);

    try {
      const redirectLocation = await createDeck(inputText);
      if (!redirectLocation) return;
      toast.success(`Successfully created ${inputText}`);
      setProcessing(false);
      closeModal();
      window.location.assign(redirectLocation);
    } catch (error) {
      console.error(error);
      toast.error('There was an error creating the DECK');
      setProcessing(false);
    }
  };

  const renameDeck = async () => {
    if (!currentDeck.deck || !decksRecord || !decksRecord.isLoadable || !inputText) return;
    setProcessing(true);

    if (connection.status !== 'connected') {
      await connect();
    }

    try {
      const decks = decksRecord.content?.decks ?? [];
      const otherDecks = decks.filter(d => d.id !== `ceramic://${currentDeck.deck.id}`);
      await decksRecord.set({ decks: [...otherDecks, { id: `ceramic://${currentDeck.deck.id}`, deck_name: inputText }] });

      toast.success(`Successfully renamed ${inputText}`);
      setProcessing(false);
      closeModal();
      window.location.assign(`${process.env.BASE_URL}/app/${currentDeck.deck.id}`);
    } catch (error) {
      console.error(error);
      toast.error('There was an error updating the DECK');
      return;
    }
  };

  // const verifyAccess = async () => {
  //   if (!inputText) return;
  //   setProcessing(true);

  //   if (decks?.find(deck => deck.id === inputText)) {
  //     toast.success('You own that DECK!');
  //     setProcessing(false);
  //     closeModal();
  //     window.location.assign(`${process.env.BASE_URL}/app/${inputText}`);
  //     return;
  //   }

  //   const { data: accessParams } = await supabase.from<Deck>('decks').select('access_params').eq('id', inputText).single();
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
  //       body: JSON.stringify({ jwt, requestedDeck: inputText }),
  //     });

  //     if (!response.ok) return;

  //     toast.success('Access to DECK is granted.');
  //     setProcessing(false);
  //     closeModal();
  //     window.location.assign(`${process.env.BASE_URL}/app/${inputText}`);
  //   } catch (e: any) {
  //     console.error(e);
  //     toast.error('Unable to verify access.');
  //   }
  // };

  const headings = { create: 'Create a new DECK', join: 'Join a DECK', rename: 'Rename this DECK' };
  const icons = {
    create: <IconFolderPlus className="ml-4 mr-1 text-gray-200" size={32} />,
    join: <IconGitPullRequest className="ml-4 mr-1 text-gray-200" size={32} />,
    rename: <IconPencil className="ml-4 mr-1 text-gray-200" size={32} />,
  };
  const placeholders = { create: 'Enter DECK name', join: 'Enter DECK ID', rename: 'Enter new DECK name' };
  // const onClickHandlers = { create: createNewDeck, join: verifyAccess, rename: renameDeck };
  const onClickHandlers = { create: createNewDeck, join: () => {}, rename: renameDeck };

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-30" onClick={closeModal} />
      <div className="flex justify-center px-6 max-h-screen-80 my-screen-10">
        <div className="flex flex-col z-30 w-full max-w-screen-sm rounded shadow-popover bg-gray-800 text-gray-200">
          <div className="flex items-center flex-shrink-0 w-full">
            {icons[type]}
            <span className="text-xl py-4 px-2 border-none rounded-tl rounded-tr focus:ring-0 bg-gray-800">{headings[type]}</span>
          </div>
          <div className="px-4 py-4 flex-1 w-full overflow-y-auto border-t rounded-bl rounded-br bg-gray-700 border-gray-700">
            <input
              type="text"
              className="w-full py-4 px-2 text-xl border-none rounded-tl rounded-tr focus:ring-0 bg-gray-800 text-gray-200"
              placeholder={placeholders[type]}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              autoFocus
              autoComplete="off"
              maxLength={type === 'create' || type === 'rename' ? 20 : 40}
            />
            <Button
              className={`my-4 ${processing ? 'bg-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-400' : ''}`}
              primary
              onClick={onClickHandlers[type]}
              disabled={processing}
              loading={processing}
            >
              {type}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
