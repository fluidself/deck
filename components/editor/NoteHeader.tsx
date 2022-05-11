import { useCallback, useRef, useState, useEffect } from 'react';
import { Menu } from '@headlessui/react';
import Select from 'react-select';
import {
  IconDots,
  IconDownload,
  IconUpload,
  IconCloudDownload,
  IconX,
  IconTrash,
  IconCornerDownRight,
  IconSend,
} from '@tabler/icons';
import { usePopper } from 'react-popper';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useRouter } from 'next/router';
import Portal from 'components/Portal';
import { useCurrentNote } from 'utils/useCurrentNote';
import { store, useStore } from 'lib/store';
import serialize from 'editor/serialization/serialize';
import { Deck, Note } from 'types/gun';
import useImport from 'utils/useImport';
import { queryParamToArray } from 'utils/url';
import { addEllipsis } from 'utils/string';
import { useAuth } from 'utils/useAuth';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import Tooltip from 'components/Tooltip';
import OpenSidebarButton from 'components/sidebar/OpenSidebarButton';
import { DropdownItem } from 'components/Dropdown';
import useDeleteNote from 'utils/useDeleteNote';
import useDeck from 'utils/useDeck';
import { decryptWithLit } from 'utils/encryption';
import NoteMetadata from 'components/NoteMetadata';
import MoveToModal from 'components/MoveToModal';
import MintNFTModal from 'components/MintNFTModal';
import Identicon from 'components/home/Identicon';
import { NoteHeaderDivider } from './NoteHeaderDivider';
// import { NFTIcon } from './NFTIcon';

export default function NoteHeader() {
  const currentNote = useCurrentNote();
  const onImport = useImport();
  const { user } = useAuth();
  const { deck } = useCurrentDeck();
  const { decks } = useDeck();
  const [deckOptions, setDeckOptions] = useState<any>(null);
  const [selectedDeck, setSelectedDeck] = useState<any>(null);
  const router = useRouter();
  const {
    query: { deckId, stack: stackQuery },
  } = router;

  useEffect(() => {
    if (Object.keys(decks).length > 0) {
      const decksToOptions = Object.values(decks)?.map(deck => ({
        label: `${deck.name} (${deck.id})`,
        id: deck.id,
        value: deck.id,
      }));
      setDeckOptions(decksToOptions);
      setSelectedDeck(decksToOptions?.find(deckOption => deckOption.id === deck?.id));
    }
  }, [Object.keys(decks).length, deck?.id]);

  const isSidebarButtonVisible = useStore(state => !state.isSidebarOpen && state.openNoteIds?.[0] === currentNote.id);
  const isCloseButtonVisible = useStore(state => state.openNoteIds.length > 1);
  const note = useStore(state => state.notes[currentNote.id]);

  const onClosePane = useCallback(() => {
    const currentNoteIndex = store.getState().openNoteIds.findIndex(openNoteId => openNoteId === currentNote.id);
    const stackedNoteIds = queryParamToArray(stackQuery);

    if (currentNoteIndex < 0) {
      return;
    }

    if (currentNoteIndex === 0) {
      // Changes current note to first note in stack
      router.push(
        {
          pathname: router.pathname,
          query: { deckId, id: stackedNoteIds[0], stack: stackedNoteIds.slice(1) },
        },
        undefined,
        { shallow: true },
      );
    } else {
      // Remove from stacked notes and shallowly route
      stackedNoteIds.splice(
        currentNoteIndex - 1, // Stacked notes don't include the main note
        1,
      );
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, stack: stackedNoteIds },
        },
        undefined,
        { shallow: true },
      );
    }
  }, [currentNote.id, stackQuery, router, deckId]);

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);
  const { styles, attributes } = usePopper(menuButtonRef.current, popperElement, { placement: 'bottom-start' });

  const onExportClick = useCallback(async () => {
    saveAs(getNoteAsBlob(note), `${note.title}.md`);
  }, [note]);

  const onExportAllClick = useCallback(async () => {
    const zip = new JSZip();

    const notes = Object.values(store.getState().notes);
    for (const note of notes) {
      zip.file(`${note.title}.md`, getNoteAsBlob(note));
    }

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, 'notes-export.zip');
  }, []);

  const onDeleteClick = useDeleteNote(currentNote.id);

  const [isMoveToModalOpen, setIsMoveToModalOpen] = useState(false);
  const onMoveToClick = useCallback(() => setIsMoveToModalOpen(true), []);

  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const onMintClick = useCallback(() => setIsMintModalOpen(true), []);

  const buttonClassName = 'rounded hover:bg-gray-300 active:bg-gray-400 dark:hover:bg-gray-700 dark:active:bg-gray-600';
  const iconClassName = 'text-gray-600 dark:text-gray-300';

  return (
    <div className="flex items-center justify-between w-full px-4 py-1 text-right">
      <div>{isSidebarButtonVisible ? <OpenSidebarButton /> : null}</div>
      <div>
        {isCloseButtonVisible ? (
          <Tooltip content="Close pane">
            <button className={buttonClassName} onClick={onClosePane} title="Close pane">
              <span className="flex items-center justify-center w-8 h-8">
                <IconX className={iconClassName} />
              </span>
            </button>
          </Tooltip>
        ) : null}
        <div className="inline-flex justify-center">
          {!isCloseButtonVisible && user && (
            <div className="flex items-center">
              <div className="mr-3">
                <Select
                  className="react-select-container-header"
                  classNamePrefix="react-select-header"
                  options={deckOptions}
                  value={selectedDeck}
                  onChange={async value => {
                    setSelectedDeck(value);

                    const deck: Deck = Object.values(decks).find(deck => deck.id === value.id)!;
                    const { encryptedString, encryptedSymmetricKey, accessControlConditions } = deck;
                    const decryptedDeckKeypair = await decryptWithLit(
                      encryptedString,
                      encryptedSymmetricKey,
                      accessControlConditions,
                    );

                    const response = await fetch('/api/deck', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ deckId: deck.id, pair: JSON.parse(decryptedDeckKeypair) }),
                    });
                    if (!response.ok) return;

                    window.location.assign(`${process.env.BASE_URL}/app/${deck.id}`);
                  }}
                />
              </div>
              <NoteHeaderDivider />
              <div className="px-2 pt-1 pb-1 text-sm text-gray-600 overflow-ellipsis dark:text-gray-400">
                {user ? addEllipsis(user?.id) : ''}
              </div>
              <Identicon diameter={16} className="w-5 h-5 mr-2" />
              <NoteHeaderDivider />
            </div>
          )}
          <Menu>
            {({ open }) => (
              <>
                <Menu.Button ref={menuButtonRef} className={buttonClassName} title="Options (export, import, etc.)">
                  <Tooltip content="Options (export, import, etc.)">
                    <span className="flex items-center justify-center w-8 h-8">
                      <IconDots className={iconClassName} />
                    </span>
                  </Tooltip>
                </Menu.Button>
                {open && (
                  <Portal>
                    <Menu.Items
                      ref={setPopperElement}
                      className="z-10 w-56 overflow-hidden bg-white rounded shadow-popover dark:bg-gray-800 focus:outline-none"
                      static
                      style={styles.popper}
                      {...attributes.popper}
                    >
                      <DropdownItem onClick={onMintClick}>
                        {/* <NFTIcon className="w-5 h-5 mr-1" />
                        <span>Mint as NFT</span> */}
                        <IconSend size={18} className="mr-1" />
                        <span>Publish</span>
                      </DropdownItem>
                      <DropdownItem onClick={onImport}>
                        <IconDownload size={18} className="mr-1" />
                        <span>Import</span>
                      </DropdownItem>
                      <DropdownItem onClick={onExportClick}>
                        <IconUpload size={18} className="mr-1" />
                        <span>Export</span>
                      </DropdownItem>
                      <DropdownItem onClick={onExportAllClick}>
                        <IconCloudDownload size={18} className="mr-1" />
                        <span>Export All</span>
                      </DropdownItem>
                      <DropdownItem onClick={onDeleteClick} className="border-t dark:border-gray-700">
                        <IconTrash size={18} className="mr-1" />
                        <span>Delete</span>
                      </DropdownItem>
                      <DropdownItem onClick={onMoveToClick}>
                        <IconCornerDownRight size={18} className="mr-1" />
                        <span>Move to</span>
                      </DropdownItem>
                      <NoteMetadata note={note} />
                    </Menu.Items>
                  </Portal>
                )}
              </>
            )}
          </Menu>
        </div>
      </div>
      {isMoveToModalOpen ? (
        <Portal>
          <MoveToModal noteId={currentNote.id} setIsOpen={setIsMoveToModalOpen} />
        </Portal>
      ) : null}
      {isMintModalOpen ? (
        <Portal>
          <MintNFTModal note={note} userId={user?.id} setIsOpen={setIsMintModalOpen} />
        </Portal>
      ) : null}
    </div>
  );
}

export const getSerializedNote = (note: Note) => note.content.map(n => serialize(n)).join('');

const getNoteAsBlob = (note: Note) => {
  const serializedContent = getSerializedNote(note);
  const blob = new Blob([serializedContent], {
    type: 'text/markdown;charset=utf-8',
  });
  return blob;
};
