import { useCallback } from 'react';
import { useRouter } from 'next/router';
import deleteBacklinks from 'editor/backlinks/deleteBacklinks';
import { store, useStore } from 'lib/store';
import { useCurrentDeck } from 'utils/useCurrentDeck';
import useNotes from './useNotes';

export default function useDeleteNote(noteId: string) {
  const router = useRouter();
  const { deck } = useCurrentDeck();
  const { deleteNote, updateNote } = useNotes();

  const openNoteIds = useStore(state => state.openNoteIds);

  const onDeleteClick = useCallback(async () => {
    if (!deck) return;
    const deletedNoteIndex = openNoteIds.findIndex(openNoteId => openNoteId === noteId);

    if (deletedNoteIndex !== -1) {
      // Redirect if one of the notes that was deleted was open
      const noteIds = Object.keys(store.getState().notes);
      // If there are other notes to redirect to, redirect to the first one
      if (noteIds.length > 1) {
        for (const id of noteIds) {
          // We haven't deleted the note yet, so we need to check the id
          if (noteId !== id) {
            router.push(`/app/${deck.id}/note/${id}`, undefined, { shallow: true });
            break;
          }
        }
      } else {
        // No note ids to redirect to, redirect to app
        router.push(`/app/${deck.id}`);
      }
    }

    await deleteNote(noteId);

    const deleteBacklinkPayloads = deleteBacklinks(noteId);
    const promises = [];
    for (const data of deleteBacklinkPayloads) {
      promises.push(updateNote(data));
    }
    await Promise.all(promises);
  }, [router, noteId, openNoteIds]);

  return onDeleteClick;
}
