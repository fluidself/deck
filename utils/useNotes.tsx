import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { ISEAPair } from 'gun/types/sea';
import { store, useStore } from 'lib/store';
import type { PickPartial } from 'types/utils';
import type { Note } from 'types/gun';
import { encrypt, decrypt } from 'utils/encryption';
import useGun from 'utils/useGun';

export type NoteUpdate = PickPartial<Note, 'content' | 'title' | 'created_at' | 'updated_at'>;

export default function useNotes() {
  const { getGun, isReady, getUser, authenticate, reauthenticateDeck, isAuthenticated } = useGun();
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
      // await checkReauthenticate();
      // console.log(deckPair);
      if (!deckPair.pub) {
        console.log(deckPair.pub);
        return;
      }

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
              if (!storeNotes.includes(id)) {
                console.log(`upsert note ${id}: ${note}`);
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

    initData();
    // TODO: better way to handle this?
    setTimeout(() => setNotesReady(true), 800);

    return () => {
      getGun()?.user(deckPair.pub).get('notes').off();
    };
  }, [deckPair]);

  const checkReauthenticate = async () => {
    if (!deckId || typeof deckId !== 'string') return;
    const gunUser = getUser()?.is;
    const deckPair: ISEAPair = store.getState().deckPair;
    // TODO: keeps resetting to app user. in useDeck?
    if (
      !gunUser ||
      typeof gunUser === 'undefined' ||
      gunUser.pub === JSON.parse(process.env.NEXT_PUBLIC_APP_ACCESS_KEY_PAIR!).pub
    ) {
      if (deckPair.pub !== '') {
        await authenticate(deckPair);
        return;
      } else {
        try {
          await reauthenticateDeck(deckId);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const getNotes = async () => {
    // await checkReauthenticate();

    const notes: any = {};
    console.log(typeof userPair);
    console.log(typeof deckPair);
    return new Promise<any>(resolve => {
      getGun()
        ?.user(deckPair.pub)
        .get('notes')
        .map()
        .once(async (note: any, id: string) => {
          if (!userPair) return;
          if (id && note) {
            const decryptedNote = await decrypt(note, { pair: deckPair });
            notes[decryptedNote.id] = decryptedNote;
          }
        });

      resolve(notes);
    });
  };

  // const upsertNote = useCallback(
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

        await getGun()
          .user(deckPair.pub)
          .get('notes')
          .get(note.id)
          .put(
            encryptedNote,
            (ack: any) => {
              console.log(ack);
            },
            { opt: { cert } },
          )
          .then();

        // Refresh the list of notes in the sidebar
        store.getState().upsertNote({ ...note, content: JSON.parse(note.content) });

        await getGun()
          .user(deckPair.pub)
          .get('note_tree')
          .get(note.id)
          .put(JSON.stringify(store.getState().noteTree), { opt: { cert } })
          .then();

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
        getGun().user(deckPair.pub).get('notes').get(note.id).put(encryptedNote, { opt: { cert } });
        // Update updated_at locally
        store.getState().updateNote({ id: note.id, updated_at: note.updated_at });

        resolve();
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNote = async (noteId: string) => {
    // await checkReauthenticate();

    // Update note titles in sidebar
    store.getState().deleteNote(noteId);

    const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();
    return new Promise<void>(resolve => {
      getGun().user(deckPair.pub).get('notes').get(noteId).put(null);

      getGun().user(deckPair.pub).get('note_tree').put(JSON.stringify(store.getState().noteTree), { opt: { cert } }).then();

      resolve();
    });
  };

  return {
    notesReady,
    getNotes,
    upsertNote,
    updateNote,
    deleteNote,
  };
}
