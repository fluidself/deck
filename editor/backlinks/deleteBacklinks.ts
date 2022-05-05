import { createEditor, Editor, Element, Transforms } from 'slate';
import { ElementType } from 'types/slate';
import { Note } from 'types/supabase';
import { store } from 'lib/store';
import { computeLinkedBacklinks } from './useBacklinks';

/**
 * Deletes the backlinks on each backlinked note and replaces them with the link text.
 */
const deleteBacklinks = (noteId: string) => {
  const notes = store.getState().notes;
  const backlinks = computeLinkedBacklinks(notes, noteId);
  const updateData: Pick<Note, 'id' | 'content'>[] = [];

  for (const backlink of backlinks) {
    const note = notes[backlink.id];

    if (!note) {
      continue;
    }

    const editor = createEditor();
    editor.children = note.content;

    Transforms.unwrapNodes(editor, {
      at: [],
      match: n => !Editor.isEditor(n) && Element.isElement(n) && n.type === ElementType.NoteLink && n.noteId === noteId,
    });

    updateData.push({
      id: backlink.id,
      content: editor.children,
    });
  }

  // Make sure backlinks are updated locally
  for (const newNote of updateData) {
    store.getState().updateNote(newNote);
  }

  const promisePayloads = [];
  for (const data of updateData) {
    promisePayloads.push(data);
  }

  return promisePayloads;
};

export default deleteBacklinks;
