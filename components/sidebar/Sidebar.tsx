// @ts-ignore
import LitJsSdk from 'lit-js-sdk';
import { memo, useCallback, useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { IconAffiliate, IconSearch } from '@tabler/icons';
import { useTransition, animated } from '@react-spring/web';
import { toast } from 'react-toastify';
import Tooltip from 'components/Tooltip';
import { isMobile } from 'utils/device';
import useIsMounted from 'utils/useIsMounted';
import { useAuth } from 'utils/useAuth';
import useDeck from 'utils/useDeck';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { useStore } from 'lib/store';
import { SPRING_CONFIG } from 'constants/spring';
import { AccessControlCondition, BooleanCondition } from 'types/lit';
import { ShareModal } from 'components/ShareModal';
import CreateJoinRenameDeckModal from 'components/CreateJoinRenameDeckModal';
import SidebarItem from './SidebarItem';
import SidebarContent from './SidebarContent';
import SidebarHeader from './SidebarHeader';

type Props = {
  setIsFindOrCreateModalOpen: Dispatch<SetStateAction<boolean>>;
  className?: string;
};

function Sidebar(props: Props) {
  const { setIsFindOrCreateModalOpen, className } = props;

  const { user } = useAuth();
  const { deck } = useCurrentDeck();
  const { decks, provisionAccess } = useDeck();
  const isSidebarOpen = useStore(state => state.isSidebarOpen);
  const setIsSidebarOpen = useStore(state => state.setIsSidebarOpen);
  const hideSidebarOnMobile = useCallback(() => {
    if (isMobile()) {
      setIsSidebarOpen(false);
    }
  }, [setIsSidebarOpen]);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [processingAccess, setProcessingAccess] = useState<boolean>(false);
  const [createJoinRenameModal, setCreateJoinRenameModal] = useState<any>({ open: false, type: '' });
  const [deckName, setDeckName] = useState<string>('');
  const isMounted = useIsMounted();

  useEffect(() => {
    const matchingDeck = Object.values(decks).find(deckOption => deckOption.id === deck?.id);
    if (matchingDeck) {
      setDeckName(matchingDeck.name);
    }
  }, [decks]);

  useEffect(() => {
    const initLit = async () => {
      const client = new LitJsSdk.LitNodeClient({ alertWhenUnauthorized: false, debug: false });
      await client.connect();
      window.litNodeClient = client;
    };

    if (!window.litNodeClient && isMounted() && user) {
      initLit();
    }
  }, [isMounted, user]);

  const provisionDeckAccess = async (acc: AccessControlCondition[]) => {
    try {
      await provisionAccess(acc);
      toast.success('Access to your DECK was configured');
      return true;
    } catch (e: any) {
      console.error(e);
      toast.error('Provisioning access failed.');
      return false;
    }
  };

  const transition = useTransition<
    boolean,
    {
      transform: string;
      dspl: number;
      backgroundOpacity: number;
      backgroundColor: string;
    }
  >(isSidebarOpen, {
    initial: {
      transform: 'translateX(0%)',
      dspl: 1,
      backgroundOpacity: 0.3,
      backgroundColor: 'black',
    },
    from: {
      transform: 'translateX(-100%)',
      dspl: 0,
      backgroundOpacity: 0,
      backgroundColor: 'transparent',
    },
    enter: {
      transform: 'translateX(0%)',
      dspl: 1,
      backgroundOpacity: 0.3,
      backgroundColor: 'black',
    },
    leave: {
      transform: 'translateX(-100%)',
      dspl: 0,
      backgroundOpacity: 0,
      backgroundColor: 'transparent',
    },
    config: SPRING_CONFIG,
    expires: item => !item,
  });

  return transition(
    (styles, item) =>
      item && (
        <>
          {isMobile() ? (
            <animated.div
              className="fixed inset-0 z-10"
              style={{
                backgroundColor: styles.backgroundColor,
                opacity: styles.backgroundOpacity,
                display: styles.dspl.to(displ => (displ === 0 ? 'none' : 'initial')),
              }}
              onClick={() => setIsSidebarOpen(false)}
            />
          ) : null}
          <animated.div
            className="fixed top-0 bottom-0 left-0 z-20 w-64 shadow-popover md:shadow-none md:static md:z-0"
            style={{
              transform: styles.transform,
              display: styles.dspl.to(displ => (displ === 0 ? 'none' : 'initial')),
            }}
          >
            <div
              className={`flex flex-col flex-none h-full border-r bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 ${className}`}
            >
              <SidebarHeader setIsShareModalOpen={setIsShareModalOpen} setCreateJoinRenameModal={setCreateJoinRenameModal} />
              <FindOrCreateModalButton
                onClick={() => {
                  hideSidebarOnMobile();
                  setIsFindOrCreateModalOpen(isOpen => !isOpen);
                }}
              />
              {deck && <GraphButton onClick={hideSidebarOnMobile} deckId={deck?.id} />}
              <SidebarContent
                className="flex-1 mt-3 overflow-x-hidden overflow-y-auto"
                setIsFindOrCreateModalOpen={setIsFindOrCreateModalOpen}
              />
            </div>
          </animated.div>
          {isShareModalOpen && (
            <ShareModal
              onClose={() => setIsShareModalOpen(false)}
              deckToShare={deck?.id}
              deckName={deckName}
              processingAccess={processingAccess}
              onAccessControlConditionsSelected={async (acc: AccessControlCondition[]) => {
                setProcessingAccess(false);
                const success = await provisionDeckAccess(acc);
                if (success) return true;
                setProcessingAccess(false);
              }}
              showStep={'ableToAccess'}
            />
          )}
          {createJoinRenameModal.open && (
            <CreateJoinRenameDeckModal
              type={createJoinRenameModal.type}
              closeModal={() => setCreateJoinRenameModal({ open: false, type: '' })}
            />
          )}
        </>
      ),
  );
}

type FindOrCreateModalButtonProps = {
  onClick: () => void;
};

const FindOrCreateModalButton = (props: FindOrCreateModalButtonProps) => {
  const { onClick } = props;
  return (
    <SidebarItem>
      <Tooltip content="Quickly jump to a note, or create a new note (Ctrl+P)" placement="right" touch={false}>
        <button className="flex items-center w-full px-6 py-1 text-left" onClick={onClick}>
          <IconSearch className="flex-shrink-0 mr-1 text-gray-800 dark:text-gray-300" size={20} />
          <span className="overflow-x-hidden select-none overflow-ellipsis whitespace-nowrap">Find or Create Note</span>
        </button>
      </Tooltip>
    </SidebarItem>
  );
};

type GraphButtonProps = {
  onClick: () => void;
  deckId: string;
};

const GraphButton = (props: GraphButtonProps) => {
  const { onClick, deckId } = props;
  const router = useRouter();

  return (
    <SidebarItem isHighlighted={router.pathname.includes(`/app/${deckId}/graph`)} onClick={onClick}>
      <Tooltip content="Visualization of all of your notes as a network (Ctrl+Shift+G)" placement="right" touch={false}>
        <span>
          <Link href={`/app/${deckId}/graph`}>
            <a className="flex items-center px-6 py-1">
              <IconAffiliate className="flex-shrink-0 mr-1 text-gray-800 dark:text-gray-300" size={20} />
              <span className="overflow-x-hidden select-none overflow-ellipsis whitespace-nowrap">Graph View</span>
            </a>
          </Link>
        </span>
      </Tooltip>
    </SidebarItem>
  );
};

export default memo(Sidebar);
