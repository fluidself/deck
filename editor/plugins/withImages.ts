import { Editor, Path } from 'slate';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-toastify';
import { insertImage } from 'editor/formatting';
import { isUrl } from 'utils/url';
import imageExtensions from 'utils/image-extensions';
import supabase from 'lib/supabase';
import { store } from 'lib/store';

const withImages = (editor: Editor) => {
  const { insertData } = editor;

  editor.insertData = data => {
    const text = data.getData('text/plain');
    const { files } = data;

    // TODO: there is a bug on iOS Safari where the files array is empty
    // See https://github.com/ianstormtaylor/slate/issues/4491
    if (files && files.length > 0) {
      for (const file of files) {
        const [mime] = file.type.split('/');
        if (mime === 'image') {
          uploadAndInsertImage(editor, file);
        } else {
          toast.error('Only images can be uploaded.');
        }
      }
    } else if (isImageUrl(text)) {
      insertImage(editor, text);
    } else {
      insertData(data);
    }
  };

  return editor;
};

const isImageUrl = (url: string) => {
  if (!url || !isUrl(url)) {
    return false;
  }
  const ext = new URL(url).pathname.split('.').pop();
  if (ext) {
    return imageExtensions.includes(ext);
  }
  return false;
};

export const uploadAndInsertImage = async (editor: Editor, file: File, path?: Path) => {
  const userId = store.getState().userId;

  if (!userId) {
    return;
  }

  const uploadingToast = toast.info('Uploading image, please wait...', {
    autoClose: false,
    closeButton: false,
    draggable: false,
  });
  const key = `${userId}/${uuidv4()}.png`;
  const { error: uploadError } = await supabase.storage.from('user-assets').upload(key, file, { upsert: false });

  if (uploadError) {
    toast.dismiss(uploadingToast);
    toast.error(uploadError);
    return;
  }

  const expiresIn = 60 * 60 * 24 * 365 * 100; // 100 year expiry
  const { signedURL, error: signedUrlError } = await supabase.storage.from('user-assets').createSignedUrl(key, expiresIn);

  toast.dismiss(uploadingToast);
  if (signedURL) {
    insertImage(editor, signedURL, path);
  } else if (signedUrlError) {
    toast.error(signedUrlError);
  } else {
    toast.error('There was a problem uploading your image. Please try again later.');
  }
};

export default withImages;