import { useCallback } from 'react';
import { Descendant, Element } from 'slate';
import { toast } from 'react-toastify';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import wikiLinkPlugin from 'remark-wiki-link';
import { v4 as uuidv4 } from 'uuid';
import { store } from 'lib/store';
import { NoteUpsert } from 'lib/api/upsertNote';
import supabase from 'lib/supabase';
import { getDefaultEditorValue } from 'editor/constants';
import remarkToSlate from 'editor/serialization/remarkToSlate';
import { caseInsensitiveStringEqual } from 'utils/string';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import { ElementType, NoteLink } from 'types/slate';
import { Note } from 'types/supabase';

export default function useImport() {
  const currentDeck = useCurrentDeck();

  const onImport = useCallback(() => {
    if (!currentDeck) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.text, .txt, .md, .mkdn, .mdwn, .mdown, .markdown';
    input.multiple = true;

    input.onchange = async e => {
      if (!e.target) {
        return;
      }

      const inputElement = e.target as HTMLInputElement;

      if (!inputElement.files) {
        return;
      }

      const importingToast = toast.info('Importing notes, please wait...', {
        autoClose: false,
        closeButton: false,
        draggable: false,
      });

      // Add a new note for each imported note
      const upsertData: NoteUpsert[] = [];
      const noteLinkUpsertData: NoteUpsert[] = [];
      const noteTitleToIdCache: Record<string, string | undefined> = {};
      for (const file of inputElement.files) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        if (!fileName) {
          continue;
        }
        const fileContent = await file.text();

        const { result } = unified()
          .use(remarkParse)
          .use(remarkGfm)
          .use(wikiLinkPlugin, { aliasDivider: '|' })
          .use(remarkToSlate)
          .processSync(fileContent);

        const { content: slateContent, upsertData: newUpsertData } = fixNoteLinks(
          result as Descendant[],
          noteTitleToIdCache,
          currentDeck.deck.id,
        );

        noteLinkUpsertData.push(...newUpsertData);
        upsertData.push({
          deck_id: currentDeck.deck.id,
          title: fileName,
          content: slateContent.length > 0 ? slateContent : getDefaultEditorValue(),
        });
      }

      // Create new notes that are linked to
      const { data: newLinkedNotes } = await supabase
        .from<Note>('notes')
        .upsert(noteLinkUpsertData, { onConflict: 'deck_id, title' });

      // Create new notes from files
      const { data: newNotes } = await supabase.from<Note>('notes').upsert(upsertData, { onConflict: 'deck_id, title' });

      // Show a toast with the number of successfully imported notes
      toast.dismiss(importingToast);
      const numOfSuccessfulImports = [...(newLinkedNotes ?? []), ...(newNotes ?? [])]?.filter(note => !!note).length ?? 0;
      if (numOfSuccessfulImports > 1) {
        toast.success(`${numOfSuccessfulImports} notes were successfully imported.`);
      } else if (numOfSuccessfulImports === 1) {
        toast.success(`${numOfSuccessfulImports} note was successfully imported.`);
      } else {
        toast.error('No notes were imported.');
      }
    };

    input.click();
  }, [currentDeck]);

  return onImport;
}

/**
 * Fixes note links by adding the proper note id to the link.
 * The note id comes from an existing note, or a new note is created.
 */
const fixNoteLinks = (
  content: Descendant[],
  noteTitleToIdCache: Record<string, string | undefined> = {},
  deckId: string,
): { content: Descendant[]; upsertData: NoteUpsert[] } => {
  const upsertData: NoteUpsert[] = [];

  // Update note link elements with noteId
  const notesArr = Object.values(store.getState().notes);
  const newContent = content.map(node => setNoteLinkIds(node, notesArr, noteTitleToIdCache, upsertData, deckId));

  return { content: newContent, upsertData };
};

const getNoteId = (
  node: NoteLink,
  notes: Note[],
  noteTitleToIdCache: Record<string, string | undefined>,
  upsertData: NoteUpsert[],
  deckId: string,
): string => {
  const noteTitle = node.noteTitle;
  let noteId;

  const existingNoteId =
    noteTitleToIdCache[noteTitle.toLowerCase()] ?? notes.find(note => caseInsensitiveStringEqual(note.title, noteTitle))?.id;

  if (existingNoteId) {
    noteId = existingNoteId;
  } else {
    noteId = uuidv4(); // Create new note id
    if (deckId) {
      upsertData.push({ id: noteId, deck_id: deckId, title: noteTitle });
    }
  }
  noteTitleToIdCache[noteTitle.toLowerCase()] = noteId; // Add to cache
  return noteId;
};

const setNoteLinkIds = (
  node: Descendant,
  notes: Note[],
  noteTitleToIdCache: Record<string, string | undefined>,
  upsertData: NoteUpsert[],
  deckId: string,
): Descendant => {
  if (Element.isElement(node)) {
    return {
      ...node,
      ...(node.type === ElementType.NoteLink ? { noteId: getNoteId(node, notes, noteTitleToIdCache, upsertData, deckId) } : {}),
      children: node.children.map(child => setNoteLinkIds(child, notes, noteTitleToIdCache, upsertData, deckId)),
    };
  } else {
    return node;
  }
};
