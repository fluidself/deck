import { useRouter } from 'next/router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { store, useStore } from 'lib/store';
import type { PickPartial } from 'types/utils';
import type { Note } from 'types/gun';
import { encrypt, decrypt } from 'utils/encryption';
import useGun from 'utils/useGun';
import useIsMounted from './useIsMounted';
// import { useGunCollectionState, useSafeReducer, collectionReducer, CollectionState, debouncedUpdates } from 'utils/gun-hooks';

export type NoteUpdate = PickPartial<Note, 'content' | 'title' | 'created_at' | 'updated_at'>;

export default function useNotes() {
  const { getGun, isReady, isAuthenticated, getUser, authenticate } = useGun();
  const [notes, setNotes] = useState<any>({});
  const [notesReady, setNotesReady] = useState<boolean>(false);
  const [updates, setUpdates] = useState<any>({});
  const router = useRouter();
  const {
    query: { deckId },
  } = router;
  const handler = useRef(null);
  const isMounted = useIsMounted();

  const userPair = useStore(state => state.userPair);
  const deckPair = useStore(state => state.deckPair);
  const upsertStoreNote = useStore(state => state.upsertNote);
  const updateStoreNote = useStore(state => state.updateNote);
  const deleteStoreNote = useStore(state => state.deleteNote);

  const processUpdates = async (updates: { [key: string]: any }) => {
    if (!updates || !isMounted()) return;
    const storeNoteIds = Object.keys(store.getState().notes);
    const storeNotes = store.getState().notes;
    const openNoteIds = store.getState().openNoteIds;

    for (const [id, note] of Object.entries(updates)) {
      if (id && note) {
        // Note is new
        if (!storeNoteIds.includes(id)) {
          // console.log(`upsert note ${id}`);
          const decryptedNote = await decrypt(note, { pair: deckPair });
          // console.log(decryptedNote);
          console.log('upsertStoreNote');
          upsertStoreNote(decryptedNote);
        } else {
          // TODO: fires very often. Can I narrow it down or improve puts?
          // Note is updated
          // Don't update the note if it is currently open
          if (storeNoteIds.includes(id) && !openNoteIds.includes(id) && storeNotes[id].updated_at !== note.updated_at) {
            // console.log(`update note ${id}`);
            const decryptedNote = await decrypt(note, { pair: deckPair });
            // console.log(decryptedNote);
            console.log('updateStoreNote', decryptedNote);
            updateStoreNote(decryptedNote);
          }
        }
      } else if (id && !note) {
        // Note is deleted
        if (storeNoteIds.includes(id)) {
          // console.log(`delete note ${id}`);
          console.log('deleteStoreNote');
          deleteStoreNote(id);
        }
      }
    }
  };

  useEffect(() => {
    const gunCb = async (note: any, id: string, message: any, event: any) => {
      if (!handler.current) {
        handler.current = event;
      }

      setUpdates((previousUpdates: any) => ({
        ...previousUpdates,
        [id]: note,
      }));
    };

    const initData = async () => {
      getGun()?.user(deckPair.pub).get('notes').map().on(gunCb, true);
    };

    if (deckPair.pub) {
      initData();
      // TODO: better way to handle this?
      setTimeout(() => setNotesReady(true), 800);
    }

    const interval = setInterval(() => {
      processUpdates(updates);
    }, 2500);

    return () => {
      if (handler.current) {
        //cleanup gun .on listener
        // @ts-ignore
        handler.current.off();
      }
      clearInterval(interval);
    };
  }, [deckPair, notesReady]);

  const upsertNote = async (noteTitle: string, noteId: string = '') => {
    if (!userPair.pub || !deckPair.pub) {
      console.log('upsertNote missing pair');
      console.log(userPair, deckPair);
      return;
    }
    return new Promise<string>(async (resolve, reject) => {
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

        await getGun().user(deckPair.pub).get('notes').get(note.id).put(encryptedNote, null, { opt: { cert } }).then();

        // Refresh the list of notes in the sidebar
        await store.getState().upsertNote({ ...note, content: JSON.parse(note.content) });

        await getGun()
          .user(deckPair.pub)
          .get('note_tree')
          .put(JSON.stringify(store.getState().noteTree), null, { opt: { cert } })
          .then();

        resolve(note.id);
      } catch (err) {
        console.log(err);
        reject(err);
      }
    });
  };

  const updateNoteTree = async () => {
    console.log('updateNoteTree');
    if (!userPair.pub || !deckPair.pub) {
      console.log('updateNoteTree missing pair');
      return;
    }
    const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

    return new Promise<void>(async (resolve, reject) => {
      getGun()
        .user(deckPair.pub)
        .get('note_tree')
        .put(JSON.stringify(store.getState().noteTree), (ack: any) => (ack.err ? reject(ack.err) : resolve()), { opt: { cert } });
    });
  };

  const updateNote = async (noteUpdate: NoteUpdate) => {
    if (!userPair.pub || !deckPair.pub) {
      console.log('updateNote missing pair');
      return;
    }
    try {
      const note: any = { ...noteUpdate };
      if (note.content) note.content = JSON.stringify(note.content);
      note.updated_at = new Date().toISOString();
      const encryptedNote = await encrypt(note, { pair: deckPair });
      const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

      return new Promise<void>(async resolve => {
        await getGun().user(deckPair.pub).get('notes').get(note.id).put(encryptedNote, null, { opt: { cert } }).then();

        // Update updated_at locally
        await store.getState().updateNote({ id: note.id, updated_at: note.updated_at });

        resolve();
      });
    } catch (error) {
      console.error(error);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!userPair.pub || !deckPair.pub) {
      console.log('deleteNote missing pair');
      return;
    }
    const cert = await getGun().user(deckPair.pub).get('certs').get(userPair.pub).then();

    return new Promise<void>(async resolve => {
      await getGun().user(deckPair.pub).get('notes').get(noteId).put(null, null, { opt: { cert } }).then();

      await getGun()
        .user(deckPair.pub)
        .get('note_tree')
        .put(JSON.stringify(store.getState().noteTree), null, { opt: { cert } })
        .then();

      // Update note titles in sidebar
      await store.getState().deleteNote(noteId);
      resolve();
    });
  };

  return {
    notes,
    notesReady,
    upsertNote,
    updateNoteTree,
    updateNote,
    deleteNote,
  };
}
