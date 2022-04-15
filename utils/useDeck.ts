import type { StreamMetadata } from '@ceramicnetwork/common';
import type { TileDocument } from '@ceramicnetwork/stream-tile';
import { PublicID, useConnection, useCore, usePublicRecord, useViewerID, useViewerRecord } from '@self.id/framework';
// import type { PublicRecord } from '@self.id/framework';
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { NoteTreeItem, store, useStore } from 'lib/store';
import type { ModelTypes, Deck, Decks, NoteItem } from 'types/ceramic';
import { decodeFromB64, encryptWithLit, decryptWithLit } from 'utils/encryption';

type TileDoc<ContentType> = {
  isLoading: boolean;
  content?: ContentType;
  metadata?: StreamMetadata;
  isError: boolean;
  error?: unknown;
  isController: boolean;
  isMutable: boolean;
  isMutating: boolean;
  update(content: ContentType): Promise<void>;
};

function useTileDoc<ContentType>(id: string): TileDoc<ContentType> {
  const queryClient = useQueryClient();
  const core = useCore();
  const viewerID = useViewerID();

  const {
    data: doc,
    isLoading,
    isError,
    error,
  } = useQuery<TileDocument<ContentType>>(id, async () => await core.tileLoader.load<ContentType>(id));

  const isController = viewerID != null && doc?.metadata.controllers[0] === viewerID.id;

  const updateMutation = useMutation(
    async (content: ContentType) => {
      if (viewerID == null || viewerID instanceof PublicID || doc == null) {
        throw new Error('Cannot mutate record');
      }
      await doc.update(content);
      return doc;
    },
    {
      onSuccess: (doc: TileDocument<ContentType>) => {
        queryClient.setQueryData(id, doc);
      },
    },
  );

  return {
    content: doc?.content,
    metadata: doc?.metadata,
    error,
    isLoading,
    isError,
    isController,
    isMutable: isController && !(viewerID instanceof PublicID),
    isMutating: updateMutation.isLoading,
    update: async (content: ContentType) => {
      await updateMutation.mutateAsync(content);
    },
  };
}

// export function useDecksRecord(did: string): PublicRecord<Decks | null> {
//   // return usePublicRecord<ModelTypes, 'decks'>('decks', did);
//   return useViewerRecord<ModelTypes, 'decks'>('decks');
// }

export default function useDeck(id: string) {
  const [connection, connect] = useConnection<ModelTypes>();
  const deckDoc = useTileDoc<Deck>(id);

  const upsertNoteStore = useStore(state => state.upsertNote);
  const updateNoteStore = useStore(state => state.updateNote);
  const deleteNoteStore = useStore(state => state.deleteNote);

  const content = deckDoc.content;
  const isEditable = deckDoc.isController;

  // TODO: DRY up
  // TODO: handle errors / loading state?

  const addNote = useCallback(
    async newNote => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content || !newNote) return false;

      try {
        const { notes, note_tree, accessControlConditions } = await decryptDeck(deckDoc.content);
        if (!notes || !accessControlConditions) {
          return false;
        }

        const toEncrypt = JSON.stringify({
          notes: [...notes, newNote],
          note_tree,
        });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

        await deckDoc.update({
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        upsertNoteStore({ ...newNote, content: newNote.content });
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  const updateNotes = useCallback(
    async (noteUpdates, noteToDelete = null) => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content) return false;

      try {
        const { notes, note_tree, accessControlConditions } = await decryptDeck(deckDoc.content);
        if (!notes || !accessControlConditions) {
          return false;
        }

        const noteUpdateIds = noteUpdates.map((note: NoteItem) => note.id);
        let otherNotes = noteToDelete ? notes.filter(note => note.id !== noteToDelete) : notes;
        otherNotes = otherNotes.filter(note => !noteUpdateIds.includes(note.id));

        const toEncrypt = JSON.stringify({
          notes: [...otherNotes, ...noteUpdates],
          note_tree: noteToDelete ? store.getState().noteTree : note_tree,
        });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

        await deckDoc.update({
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        // Don't update the note if it is currently open
        const openNoteIds = store.getState().openNoteIds;
        noteUpdates.forEach((noteUpdate: NoteItem) => {
          if (!openNoteIds.includes(noteUpdate.id)) {
            updateNoteStore({ ...noteUpdate, content: noteUpdate.content });
          }
        });

        if (noteToDelete) {
          deleteNoteStore(noteToDelete);
        }

        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [deckDoc, connection, connect],
  );

  const updateNoteTree = useCallback(async () => {
    if (connection.status !== 'connected') await connect();
    if (!deckDoc.content) return false;

    try {
      const { notes, accessControlConditions } = await decryptDeck(deckDoc.content);
      if (!notes || !accessControlConditions) {
        return false;
      }

      const toEncrypt = JSON.stringify({
        notes,
        note_tree: store.getState().noteTree,
      });
      const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

      await deckDoc.update({
        encryptedZip: encryptedZipBase64,
        symmetricKey: encryptedSymmetricKeyBase64,
        accessControlConditions,
      });

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }, [deckDoc, connection, connect]);

  return {
    isEditable,
    isError: deckDoc.isError,
    isLoading: deckDoc.isLoading,
    isMutable: deckDoc.isMutable,
    isMutating: deckDoc.isMutating,
    content,
    error: deckDoc.error,
    addNote,
    updateNotes,
    updateNoteTree,
  };
}

const decryptDeck = async (deck: Deck) => {
  const { encryptedZip, symmetricKey, accessControlConditions } = deck;
  const { success, decodedZip, decodedSymmetricKey } = await decodeFromB64(encryptedZip, symmetricKey);
  // TODO: fix
  if (!success || !decodedZip || !decodedSymmetricKey) {
    return { notes: [], note_tree: null, accessControlConditions: null };
  }

  const decryptedString = await decryptWithLit(decodedZip, decodedSymmetricKey, accessControlConditions);
  const { notes, note_tree }: { notes: NoteItem[]; note_tree: NoteTreeItem[] | null } = JSON.parse(decryptedString);

  return { notes, note_tree, accessControlConditions };
};
