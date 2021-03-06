import type { Dispatch, SetStateAction } from 'react';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { WalletIcon, TokenIcon, DAOIcon, POAPIcon } from '../icons';

type TypeButtonProps = {
  type: string;
  icon: JSX.Element;
  title: string;
  onClick: (type: string) => void;
};

const TypeButton = (props: TypeButtonProps) => {
  const { type, icon, title, onClick } = props;

  return (
    <button
      className="flex flex-col justify-between items-center py-2 w-[180px] h-[148px] border border-white cursor-pointer box-border text-white hover:bg-gray-900 focus:bg-gray-900"
      onClick={() => onClick(type)}
    >
      {icon}
      <div className="mb-1">{title}</div>
    </button>
  );
};

const ITEMS = [
  {
    type: 'whichWallet',
    icon: <WalletIcon />,
    title: 'Individual Wallet(s)',
  },
  {
    type: 'selectTokens',
    icon: <TokenIcon />,
    title: 'A Group of Token or NFT Owners',
  },
  {
    type: 'DAOMembers',
    icon: <DAOIcon />,
    title: 'DAO Members',
  },
  {
    type: 'choosePOAP',
    icon: <POAPIcon />,
    title: 'POAP Collectors',
  },
];

type Props = {
  setActiveStep: Dispatch<SetStateAction<string>>;
};

const AbleToAccess = (props: Props) => {
  const { setActiveStep } = props;
  const { id, deck_name, access_control_conditions } = useCurrentDeck();

  return (
    <div className="mb-4">
      <div className="text-lg">Who should be able to access this DECK?</div>
      <div className="flex space-x-4 items-center">
        <span className="text-xs inline-block mt-2 py-1 px-2.5 leading-none text-center align-baseline bg-gray-800 text-gray-300 rounded">
          {deck_name}
        </span>
        <span className="text-xs inline-block mt-2 py-1 px-2.5 leading-none text-center align-baseline bg-gray-800 text-gray-300 rounded">
          {id}
        </span>
      </div>

      <div className="grid grid-cols-[180px_180px] gap-4 justify-center mt-[28px]">
        {ITEMS.map((item, i) => (
          <TypeButton key={i} {...item} onClick={setActiveStep} />
        ))}
      </div>
      {access_control_conditions?.length > 1 && (
        <div className="w-full flex justify-center mt-8">
          <a className="text-sm hover:underline cursor-pointer" onClick={() => setActiveStep('currentAccess')}>
            See current conditions
          </a>
        </div>
      )}
    </div>
  );
};

export default AbleToAccess;
