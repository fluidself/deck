import { useState, useEffect } from 'react';
import { Menu } from '@headlessui/react';
import {
  IconLogout,
  IconSelector,
  IconChevronsLeft,
  IconCode,
  IconShare,
  IconGitPullRequest,
  IconFolderPlus,
  IconPencil,
} from '@tabler/icons';
import { useAuth } from 'utils/useAuth';
import useDeck from 'utils/useDeck';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { useStore } from 'lib/store';
import Tooltip from 'components/Tooltip';
import { DropdownItem } from 'components/Dropdown';

type Props = {
  setIsShareModalOpen: (arg0: boolean) => void;
  setCreateJoinRenameModal: (arg0: { open: boolean; type: string }) => void;
};

export default function Header(props: Props) {
  const { setIsShareModalOpen, setCreateJoinRenameModal } = props;
  const { signOut } = useAuth();
  const { decks } = useDeck();
  const { deck } = useCurrentDeck();
  const setIsSidebarOpen = useStore(state => state.setIsSidebarOpen);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  useEffect(() => {
    if (Object.keys(decks).length) {
      if (Object.values(decks).findIndex(d => d.id === deck.id) > -1) {
        setIsOwner(true);
      }
    }
  }, [Object.keys(decks).length, deck]);

  return (
    <>
      <div className="relative">
        <Menu>
          <Menu.Button className="flex items-center justify-between w-full py-2 pl-6 overflow-x-hidden text-left text-gray-800 hover:bg-gray-200 active:bg-gray-300 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 overflow-ellipsis whitespace-nowrap focus:outline-none border-b border-gray-700">
            <div className="flex items-center flex-1">
              <span className="mr-1 font-semibold select-none">DECK</span>
              <IconSelector size={18} className="text-gray-500 dark:text-gray-400" />
            </div>
            <Tooltip content="Collapse sidebar (Ctrl+\)" placement="right">
              <span
                className="p-1 mr-2 rounded hover:bg-gray-300 active:bg-gray-400 dark:hover:bg-gray-600 dark:active:bg-gray-500"
                onClick={e => {
                  e.stopPropagation();
                  setIsSidebarOpen(false);
                }}
              >
                <IconChevronsLeft className="text-gray-500 dark:text-gray-400" />
              </span>
            </Tooltip>
          </Menu.Button>
          <Menu.Items className="absolute z-20 w-56 overflow-hidden bg-white rounded left-6 top-full shadow-popover dark:bg-gray-800 focus:outline-none border border-gray-500">
            {isOwner && (
              <>
                <DropdownItem className="" onClick={() => setIsShareModalOpen(true)}>
                  <IconShare size={18} className="mr-1" />
                  <span>Share</span>
                </DropdownItem>
                <DropdownItem className="" onClick={() => setCreateJoinRenameModal({ open: true, type: 'rename' })}>
                  <IconPencil size={18} className="mr-1" />
                  <span>Rename</span>
                </DropdownItem>
              </>
            )}
            <DropdownItem className="" onClick={() => setCreateJoinRenameModal({ open: true, type: 'join' })}>
              <IconGitPullRequest size={18} className="mr-1" />
              <span>Join</span>
            </DropdownItem>
            <DropdownItem className="" onClick={() => setCreateJoinRenameModal({ open: true, type: 'create' })}>
              <IconFolderPlus size={18} className="mr-1" />
              <span>Create</span>
            </DropdownItem>
            <DropdownItem
              as="a"
              className="border-t dark:border-gray-700"
              href="https://github.com/fluidself/deck"
              rel="noopener noreferrer"
              target="_blank"
            >
              <IconCode size={18} className="mr-1" />
              <span>Code</span>
            </DropdownItem>
            <DropdownItem className="" onClick={signOut}>
              <IconLogout size={18} className="mr-1" />
              <span>Sign Out</span>
            </DropdownItem>
          </Menu.Items>
        </Menu>
      </div>
    </>
  );
}
