import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { store, useStore } from 'lib/store';
import type { PickPartial } from 'types/utils';
import type { Note } from 'types/gun';
import { encrypt, decrypt } from 'utils/encryption';
import useGun from 'utils/useGun';

export type NoteUpdate = PickPartial<Note, 'content' | 'title' | 'created_at' | 'updated_at'>;

export default function useNotes() {
  const { getGun, isReady, isAuthenticated, getUser, authenticate } = useGun();
  const [notesReady, setNotesReady] = useState<boolean>(false);
  const router = useRouter();
  const {
    query: { deckId },
  } = router;

  const userPair = useStore(state => state.userPair);
  const deckPair = useStore(state => state.deckPair);
  const upsertStoreNote = useStore(state => state.upsertNote);
  const updateStoreNote = useStore(state => state.updateNote);
  const deleteStoreNote = useStore(state => state.deleteNote);

  useEffect(() => {
    const initData = async () => {
      getGun()
        ?.user(deckPair.pub)
        .get('notes')
        .map()
        .on(
          async (note: any, id: string) => {
            const storeNotes = Object.keys(store.getState().notes);
            const openNoteIds = store.getState().openNoteIds;
            if (id && note) {
              // Note is new
              setNotesReady(true);
              if (!storeNotes.includes(id)) {
                // console.log(`upsert note ${id}`);
                const decryptedNote = await decrypt(note, { pair: deckPair });
                upsertStoreNote(decryptedNote);
              } else {
                // TODO: fires very often. Can I narrow it down or improve puts?
                // Note is updated
                // Don't update the note if it is currently open
                if (storeNotes.includes(id) && !openNoteIds.includes(id)) {
                  // console.log(`update note ${id}`);
                  const decryptedNote = await decrypt(note, { pair: deckPair });
                  updateStoreNote(decryptedNote);
                }
              }
            } else if (id && !note) {
              // Note is deleted
              if (storeNotes.includes(id)) {
                // console.log(`delete note ${id}`);
                deleteStoreNote(id);
              }
            }
          },
          { change: true },
        );
    };

    if (deckPair.pub) {
      initData();
      // TODO: better way to handle this?
      setTimeout(() => setNotesReady(true), 800);
    }

    return () => {
      getGun()?.user(deckPair.pub).get('notes').off();
    };
  }, [deckPair, notesReady]);

  const upsertNote = async (noteTitle: string, noteId: string = '') =>
    new Promise<string>(async (resolve, reject) => {
      try {
        const note = {
          id: noteId || uuidv4(),
          title: noteTitle,
          content: JSON.stringify([{ id: uuidv4(), type: 'paragraph', children: [{ text: '' }] }]),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const encryptedNote = await encrypt(note, { pair: deckPair });
        const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

        getGun().user(deckPair.pub).get('notes').get(note.id).put(encryptedNote, null, { opt: { cert } });

        // Refresh the list of notes in the sidebar
        store.getState().upsertNote({ ...note, content: JSON.parse(note.content) });

        getGun().user(deckPair.pub).get('note_tree').put(JSON.stringify(store.getState().noteTree), null, { opt: { cert } });

        resolve(note.id);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });

  const updateNote = async (noteUpdate: NoteUpdate) => {
    try {
      const note: any = { ...noteUpdate };
      if (note.content) note.content = JSON.stringify(note.content);
      note.updated_at = new Date().toISOString();
      const encryptedNote = await encrypt(note, { pair: deckPair });
      const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

      return new Promise<void>(resolve => {
        getGun().user(deckPair.pub).get('notes').get(note.id).put(encryptedNote, null, { opt: { cert } });

        // Update updated_at locally
        store.getState().updateNote({ id: note.id, updated_at: note.updated_at });

        resolve();
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNote = async (noteId: string) => {
    const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

    return new Promise<void>(resolve => {
      getGun().user(deckPair.pub).get('notes').get(noteId).put(null, null, { opt: { cert } });

      getGun().user(deckPair.pub).get('note_tree').put(JSON.stringify(store.getState().noteTree), null, { opt: { cert } });

      // Update note titles in sidebar
      store.getState().deleteNote(noteId);
      resolve();
    });
  };

  return {
    notesReady,
    upsertNote,
    updateNote,
    deleteNote,
  };
}
