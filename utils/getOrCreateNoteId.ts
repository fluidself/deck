import { v4 as uuidv4 } from 'uuid';
import { caseInsensitiveStringEqual } from 'utils/string';
import useNotes from 'utils/useNotes';
import { store } from 'lib/store';

// If the normalized note title exists, then returns the existing note id.
// Otherwise, creates a new note id.
export default function getOrCreateNoteId(noteTitle: string): string | null {
  const { upsertNote } = useNotes();

  let noteId;

  const notes = store.getState().notes;
  const notesArr = Object.values(notes);
  const matchingNote = notesArr.find(note => caseInsensitiveStringEqual(note.title, noteTitle));

  if (matchingNote) {
    noteId = matchingNote.id;
  } else {
    const deckId = store.getState().deckId;
    noteId = uuidv4();
    if (deckId) {
      upsertNote(noteTitle, noteId);
    }
  }

  return noteId;
}
