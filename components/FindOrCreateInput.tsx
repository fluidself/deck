import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';
import { TablerIcon } from '@tabler/icons';
import { IconFilePlus, IconSearch } from '@tabler/icons';
import { toast } from 'react-toastify';
import supabase from 'lib/supabase';
import { useStore } from 'lib/store';
import type { Workspace } from 'types/supabase';
import useDeck from 'utils/useDeck';
import useNoteSearch from 'utils/useNoteSearch';
import { caseInsensitiveStringEqual } from 'utils/string';
import { useCurrentWorkspace } from 'utils/useCurrentWorkspace';
import { useCurrentDeck } from 'utils/useCurrentDeck';

enum OptionType {
  NOTE,
  NEW_NOTE,
}

type Option = {
  id: string;
  type: OptionType;
  text: string;
  icon?: TablerIcon;
};

type Props = {
  onOptionClick?: () => void;
  className?: string;
};

function FindOrCreateInput(props: Props, ref: ForwardedRef<HTMLInputElement>) {
  const { onOptionClick: onOptionClickCallback, className = '' } = props;
  const router = useRouter();
  const { workspace } = useCurrentWorkspace();
  const currentDeck = useCurrentDeck();
  const deck = useDeck(currentDeck.deck.id);

  const [inputText, setInputText] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);

  const search = useNoteSearch({ numOfResults: 10 });
  const searchResults = useMemo(() => search(inputText), [search, inputText]);

  const upsertNote = useStore(state => state.upsertNote);

  const options = useMemo(() => {
    const result: Array<Option> = [];
    // Show new note option if there isn't already a note called `inputText`
    // (We assume if there is a note, then it will be the first result)
    if (inputText && (searchResults.length <= 0 || !caseInsensitiveStringEqual(inputText, searchResults[0].item.title))) {
      result.push({
        id: 'NEW_NOTE',
        type: OptionType.NEW_NOTE,
        text: `New note: ${inputText}`,
        icon: IconFilePlus,
      });
    }
    // Show notes that match `inputText`
    result.push(
      ...searchResults.map(result => ({
        id: result.item.id,
        type: OptionType.NOTE,
        text: result.item.title,
      })),
    );
    return result;
  }, [searchResults, inputText]);

  const onOptionClick = useCallback(
    async (option: Option) => {
      if (!workspace) return;
      onOptionClickCallback?.();

      if (option.type === OptionType.NEW_NOTE) {
        try {
          if (!deck || deck.isLoading || !deck.content) return;

          const newNoteId = uuidv4();
          const newNote: any = {
            id: newNoteId,
            title: inputText,
            content: [{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] }],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const success = await deck.addNote(newNote);
          if (!success) {
            toast.error(`There was an error creating the note.`);
            return;
          }

          const { data, error } = await supabase
            .from<Workspace>('workspaces')
            .update({ notes: [...workspace.notes, newNote.id] })
            .eq('id', workspace.id)
            .single();
          if (!data || error) {
            toast.error(`There was an error creating the note.`);
            return;
          }

          upsertNote(newNote);

          router.push(`/app/${workspace.id}/note/${newNoteId}`);
        } catch (error) {
          console.error(error);
        }
      } else if (option.type === OptionType.NOTE) {
        router.push(`/app/${workspace.id}/note/${option.id}`);
      } else {
        throw new Error(`Option type ${option.type} is not supported`);
      }
    },
    [deck, workspace, router, inputText, onOptionClickCallback],
  );

  const onKeyDown = useCallback(
    event => {
      // Update the selected option based on arrow key input
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedOptionIndex(index => {
          return index <= 0 ? options.length - 1 : index - 1;
        });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedOptionIndex(index => {
          return index >= options.length - 1 ? 0 : index + 1;
        });
      }
    },
    [options.length],
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center flex-shrink-0 w-full">
        <IconSearch className="ml-4 text-gray-500" size={20} />
        <input
          ref={ref}
          type="text"
          className={`w-full py-4 px-2 text-xl border-none rounded-tl rounded-tr focus:ring-0 dark:bg-gray-800 dark:text-gray-200 ${
            options.length <= 0 ? 'rounded-bl rounded-br' : ''
          }`}
          placeholder="Find or create a note"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={onKeyDown}
          onKeyPress={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onOptionClick(options[selectedOptionIndex]);
            }
          }}
          autoFocus
        />
      </div>
      {options.length > 0 ? (
        <div className="flex-1 w-full overflow-y-auto bg-white border-t rounded-bl rounded-br dark:bg-gray-800 dark:border-gray-700">
          {options.map((option, index) => (
            <OptionItem
              key={option.id}
              option={option}
              isSelected={index === selectedOptionIndex}
              onClick={() => onOptionClick(option)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

type OptionProps = {
  option: Option;
  isSelected: boolean;
  onClick: () => void;
};

const OptionItem = (props: OptionProps) => {
  const { option, isSelected, onClick } = props;
  const isDisabled = false;

  return (
    <button
      className={`flex flex-row w-full items-center px-4 py-2 text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700 dark:active:bg-gray-600 ${
        isSelected ? 'bg-gray-100 dark:bg-gray-700' : ''
      } ${isDisabled ? 'text-gray-400 dark:text-gray-600' : ''}`}
      onClick={onClick}
    >
      {option.icon ? <option.icon size={18} className="flex-shrink-0 mr-1" /> : null}
      <span className="overflow-hidden overflow-ellipsis whitespace-nowrap">{option.text}</span>
    </button>
  );
};

export default forwardRef(FindOrCreateInput);
