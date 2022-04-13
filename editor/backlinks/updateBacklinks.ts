import { Element } from 'slate';
import produce from 'immer';
import { ElementType } from 'types/slate';
import { Note } from 'types/supabase';
import { store } from 'lib/store';
import { computeLinkedBacklinks } from './useBacklinks';

/**
 * Updates the link properties of the backlinks on each backlinked note when the
 * current note title has changed.
 */
const updateBacklinks = async (newTitle: string, noteId: string) => {
  const notes = store.getState().notes;
  const backlinks = computeLinkedBacklinks(notes, noteId);
  const updateData: Pick<Note, 'id' | 'content'>[] = [];

  for (const backlink of backlinks) {
    const note = notes[backlink.id];

    if (!note) {
      continue;
    }

    let newBacklinkContent = note.content;
    for (const match of backlink.matches) {
      newBacklinkContent = produce(newBacklinkContent, draftState => {
        // Path should not be empty
        const path = match.path;
        if (path.length <= 0) {
          return;
        }

        // Get the node from the path
        let linkNode = draftState[path[0]];
        for (const pathNumber of path.slice(1)) {
          linkNode = (linkNode as Element).children[pathNumber];
        }

        // Assert that linkNode is a note link
        if (!Element.isElement(linkNode) || linkNode.type !== ElementType.NoteLink) {
          return;
        }

        // Update noteTitle property on the node
        linkNode.noteTitle = newTitle;

        // If there is no custom text, then the link text should be the same as the note title
        if (!linkNode.customText) {
          linkNode.children = [{ text: newTitle }];
        }
      });
    }
    updateData.push({
      id: backlink.id,
      content: newBacklinkContent,
    });
  }

  // Make sure backlinks are updated locally
  for (const newNote of updateData) {
    store.getState().updateNote(newNote);
  }

  const updatePayloads = [];
  for (const data of updateData) {
    const note = notes[data.id];

    updatePayloads.push({
      ...data,
      title: note.title,
      content: data.content,
      created_at: note.created_at,
      updated_at: new Date().toISOString(),
    });
  }

  return updatePayloads;
};

export default updateBacklinks;
