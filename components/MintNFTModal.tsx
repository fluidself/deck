import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { IconSend } from '@tabler/icons';
import fleekStorage from '@fleekhq/fleek-storage-js';
// import { useSigner, useContract } from 'wagmi';
// import { Contract } from 'ethers';
import { toast } from 'react-toastify';
import { Note } from 'types/gun';
import useHotkeys from 'utils/useHotkeys';
import { getSerializedNote } from 'components/editor/NoteHeader';
import Button from 'components/home/Button';
// import DECKNFT from 'artifacts/contracts/DECKNFT.sol/DECKNFT.json';
// import { CONTRACT_ADDRESS } from 'constants/nft-contract';

type Props = {
  note: Note;
  userId: string | undefined;
  setIsOpen: (isOpen: boolean) => void;
};

export default function MintNFTModal(props: Props) {
  const { note, userId, setIsOpen } = props;

  const router = useRouter();
  // const [{ data: signer }] = useSigner();
  // const contract: Contract = useContract({
  //   addressOrName: CONTRACT_ADDRESS,
  //   contractInterface: DECKNFT.abi,
  //   signerOrProvider: signer,
  // });
  const [processing, setProcessing] = useState<boolean>(false);

  const hotkeys = useMemo(
    () => [
      {
        hotkey: 'esc',
        callback: () => setIsOpen(false),
      },
    ],
    [setIsOpen],
  );
  useHotkeys(hotkeys);

  const onConfirm = async () => {
    // if (!userId || !signer) return;
    if (!userId) return;
    setProcessing(true);

    const serializedBody = getSerializedNote(note);
    const data = JSON.stringify({ address: userId, timestamp: Date.now(), title: note.title, body: serializedBody });

    try {
      const uploadedFile = await fleekStorage.upload({
        apiKey: process.env.NEXT_PUBLIC_FLEEK_API_KEY ?? '',
        apiSecret: process.env.NEXT_PUBLIC_FLEEK_API_SECRET ?? '',
        key: `${userId}/${note.title}`,
        data,
      });
      console.log(uploadedFile.hash);

      // const tokenURI = `https://ipfs.infura.io/ipfs/${uploadedFile.hash}`;
      // const tx = await contract.createToken(tokenURI);
      // await tx.wait();
      // toast.success('Your NFT was minted! Hang tight while we redirect you.');

      toast.success('Published! Hang tight while we redirect you.');
      setProcessing(false);
      setIsOpen(false);
      router.push(`/publications/${uploadedFile.hash}`);
    } catch (e: any) {
      // toast.error('Failed to mint the NFT.');
      toast.error('Failed to publish.');
      console.error(e);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto">
      <div className="fixed inset-0 bg-black opacity-30" onClick={() => setIsOpen(false)} />
      <div className="flex justify-center px-6 max-h-screen-80 my-screen-10">
        <div className="flex flex-col z-30 w-full max-w-screen-sm rounded shadow-popover bg-gray-800 text-gray-200">
          <div className="flex items-center flex-shrink-0 w-full">
            {/* <IconAlertTriangle className="ml-4 mr-1 text-gray-200" size={32} /> */}
            <IconSend className="ml-4 mr-1 text-gray-200" size={32} />
            <span className="text-xl py-4 px-2 border-none rounded-tl rounded-tr focus:ring-0 bg-gray-800">
              {/* Confirm NFT minting */}
              Confirm publishing
            </span>
          </div>
          <div className="px-4 py-2 flex-1 w-full overflow-y-auto border-t rounded-bl rounded-br bg-gray-700 border-gray-700">
            <div className="flex mb-2 m-[-4px] flex-wrap">
              <span className="text-xs m-1 inline-block py-1 px-2.5 leading-none text-center align-baseline bg-gray-800 text-gray-300 rounded">
                {note.title}
              </span>
              <span className="text-xs m-1 inline-block py-1 px-2.5 leading-none text-center align-baseline bg-gray-800 text-gray-300 rounded">
                {note.id}
              </span>
            </div>
            You are about to publish this note to the public. Please double check that you are only including what you intended.
            <Button
              className={`my-4 ${processing ? 'bg-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-400' : ''}`}
              primary
              onClick={onConfirm}
              disabled={processing}
              loading={processing}
            >
              {/* Mint my NFT */}
              Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
