import type { StreamMetadata } from '@ceramicnetwork/common';
import type { TileDocument } from '@ceramicnetwork/stream-tile';
import { PublicID, useConnection, useCore, usePublicRecord, useViewerID, useViewerRecord } from '@self.id/framework';
import type { PublicRecord } from '@self.id/framework';
import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { NoteTreeItem, store, useStore } from 'lib/store';
import type { ModelTypes, Deck, Decks, NoteItem } from 'types/ceramic';
import { decodeFromB64, encryptWithLit, decryptWithLit } from 'utils/encryption';

export type TileDoc<ContentType> = {
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

export function useTileDoc<ContentType>(id: string): TileDoc<ContentType> {
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

export function useDecksRecord(did: string): PublicRecord<Decks | null> {
  // return usePublicRecord<ModelTypes, 'decks'>('decks', did);
  return useViewerRecord<ModelTypes, 'decks'>('decks');
}

export function useDeck(id: string) {
  const [connection, connect] = useConnection<ModelTypes>();
  const deckDoc = useTileDoc<Deck>(id);

  const upsertNoteStore = useStore(state => state.upsertNote);
  const updateNoteStore = useStore(state => state.updateNote);
  const deleteNoteStore = useStore(state => state.deleteNote);

  const content = deckDoc.content;
  const isEditable = deckDoc.isController;

  // TODO: handle errors / loading state?

  // const addNote = useCallback(
  //   async newNote => {
  //     if (connection.status !== 'connected') await connect();
  //     if (!deckDoc.content?.notes?.length || !newNote) return false;

  //     try {
  //       await deckDoc.update({ ...deckDoc.content, notes: [...deckDoc.content.notes, newNote] });

  //       upsertNoteStore({ ...newNote, content: JSON.parse(newNote.content) });
  //       return true;
  //     } catch (error) {
  //       console.error(error);
  //       return false;
  //     }
  //   },
  //   [deckDoc, connection, connect],
  // );

  const updateNote = useCallback(
    async noteUpdate => {
      if (connection.status !== 'connected') await connect();
      if (!deckDoc.content || !noteUpdate) return { success: false };

      try {
        const { encryptedZip, symmetricKey, accessControlConditions } = deckDoc.content;
        console.log(accessControlConditions);
        const { success, decodedZip, decodedSymmetricKey } = await decodeFromB64(encryptedZip, symmetricKey);
        console.log(success, decodedZip, decodedSymmetricKey);
        if (!success || !decodedZip || !decodedSymmetricKey) return { success: false };

        const decryptedString = await decryptWithLit(decodedZip, decodedSymmetricKey, accessControlConditions);
        console.log(decryptedString);
        const { notes, note_tree }: { notes: NoteItem[]; note_tree: NoteTreeItem[] | null } = JSON.parse(decryptedString);
        const otherNotes = notes.filter(note => note.id !== noteUpdate.id);
        const duplicateTitle = otherNotes.findIndex(note => note.title === noteUpdate.title) >= 0;

        if (duplicateTitle) {
          return { success: false, error: `There's already a note called ${noteUpdate.title}. Please use a different title.` };
        }

        const toEncrypt = JSON.stringify({
          notes,
          note_tree,
        });
        const [encryptedZipBase64, encryptedSymmetricKeyBase64] = await encryptWithLit(toEncrypt, accessControlConditions);

        await deckDoc.update({
          encryptedZip: encryptedZipBase64,
          symmetricKey: encryptedSymmetricKeyBase64,
          accessControlConditions,
        });

        // Don't update the note if it is currently open
        const openNoteIds = store.getState().openNoteIds;
        if (!openNoteIds.includes(noteUpdate.id)) {
          updateNoteStore({ ...noteUpdate, content: JSON.parse(noteUpdate.content) });
        }

        return { success: true };
      } catch (error) {
        console.error(error);
        return { success: false };
      }
    },
    [deckDoc, connection, connect],
  );

  // const deleteNote = useCallback(
  //   async noteId => {
  //     if (connection.status !== 'connected') await connect();
  //     if (!deckDoc.content?.notes?.length || !noteId) return false;

  //     try {
  //       const remainingNotes = deckDoc.content.notes.filter(note => note.id !== noteId);

  //       await deckDoc.update({ ...deckDoc.content, notes: remainingNotes, note_tree: JSON.stringify(store.getState().noteTree) });

  //       deleteNoteStore(noteId);

  //       return true;
  //     } catch (error) {
  //       console.error(error);
  //       return false;
  //     }
  //   },
  //   [deckDoc, connection, connect],
  // );

  // const updateNoteTree = useCallback(async () => {
  //   if (connection.status !== 'connected') await connect();
  //   if (!deckDoc.content?.notes?.length) return false;

  //   try {
  //     await deckDoc.update({ ...deckDoc.content, note_tree: JSON.stringify(store.getState().noteTree) });

  //     return true;
  //   } catch (error) {
  //     console.error(error);
  //     return false;
  //   }
  // }, [deckDoc, connection, connect]);

  return {
    isEditable,
    isError: deckDoc.isError,
    isLoading: deckDoc.isLoading,
    isMutable: deckDoc.isMutable,
    isMutating: deckDoc.isMutating,
    content,
    error: deckDoc.error,
    // addNote,
    updateNote,
    // deleteNote,
    // updateNoteTree,
  };
}
