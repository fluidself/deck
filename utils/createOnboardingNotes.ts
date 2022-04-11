import { v4 as uuidv4 } from 'uuid';

export default function createOnboardingNotes() {
  const gettingStartedId = uuidv4();
  const linkedNoteId = uuidv4();
  const stackedNotedId = uuidv4();

  return [
    {
      id: gettingStartedId,
      title: 'Getting Started',
      content: JSON.stringify([
        {
          type: 'paragraph',
          children: [{ text: 'Here are some basics to help you get started using your DECK.' }],
        },
        { type: 'heading-one', children: [{ text: 'Bidirectional linking' }] },
        {
          type: 'paragraph',
          children: [
            {
              text: 'You can link to other notes, and each note displays the notes that link to it (its "backlinks"). This lets you navigate through your notes in an associative way and helps you build connections between similar ideas.',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { text: 'Link to another note by using the hovering menu, pressing ' },
            { code: true, text: 'cmd/ctrl' },
            { text: ' + ' },
            { code: true, text: 'k' },
            { text: ', or enclosing its title in double brackets.' },
          ],
        },
        {
          type: 'paragraph',
          children: [
            { text: 'Try clicking on this link: ' },
            {
              type: 'note-link',
              noteId: `${linkedNoteId}`,
              children: [{ text: 'Linked Note' }],
              noteTitle: 'Linked Note',
              isTextTitle: true,
            },
            { text: '!' },
          ],
        },
        { type: 'heading-one', children: [{ text: 'Formatting text' }] },
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [
                { text: 'Highlight text and use the hovering menu to ' },
                { bold: true, text: 'style' },
                { text: ' ' },
                { text: 'your', italic: true },
                { text: ' ' },
                { text: 'writing', underline: true },
              ],
            },
            {
              type: 'list-item',
              children: [
                {
                  text: 'Type markdown shortcuts, which get converted automatically to rich text as you type',
                },
              ],
            },
            {
              type: 'list-item',
              children: [
                { text: 'Use keyboard shortcuts like ' },
                { code: true, text: 'cmd/ctrl' },
                { text: ' + ' },
                { code: true, text: 'b' },
                { text: ' for ' },
                { bold: true, text: 'bold' },
                { text: ', ' },
                { code: true, text: 'cmd/ctrl' },
                { text: ' + ' },
                { code: true, text: 'i' },
                { text: ' for ' },
                { text: 'italics', italic: true },
                { text: ', etc.' },
              ],
            },
          ],
        },
        { type: 'heading-one', children: [{ text: 'Creating or finding notes' }] },
        {
          type: 'paragraph',
          children: [
            {
              text: 'You can create new notes or find existing notes by clicking on "Find or create note" in the sidebar or by pressing ',
            },
            { code: true, text: 'cmd/ctrl' },
            { text: ' + ' },
            { code: true, text: 'p' },
            {
              text: '. Just type in the title of the note you want to create or find.',
            },
          ],
        },
        { type: 'heading-one', children: [{ text: 'Sharing DECKs' }] },
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [
                {
                  text: 'You can share your DECK with a friend or a community by clicking on "Share" in the dropdown menu from the top of the sidebar. Among other options, you can grant access to an individual wallet, members of a certain DAO, or holders of a specific NFT.',
                },
              ],
            },
            {
              type: 'list-item',
              children: [
                {
                  text: 'To accept an invitation to another DECK, click on "Join" in the dropdown menu from the top of the sidebar and enter the unique ID of the DECK you want to join.',
                },
              ],
            },
          ],
        },
      ]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: linkedNoteId,
      title: 'Linked Note',
      content: JSON.stringify([
        {
          type: 'paragraph',
          children: [
            { text: 'Clicking on a linked note will "' },
            {
              type: 'note-link',
              noteId: `${stackedNotedId}`,
              children: [{ text: 'Page Stacking' }],
              noteTitle: 'Page Stacking',
              customText: 'stack',
            },
            {
              text: '" the note to the side. This lets you easily reference multiple notes at once.',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [
            {
              text: 'You can see what notes link to this note by looking at the "Linked References" below.',
            },
          ],
        },
      ]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: stackedNotedId,
      title: 'Page Stacking',
      content: JSON.stringify([
        {
          type: 'paragraph',
          children: [
            {
              text: 'Stacking notes next to each other lets you read/edit multiple notes at once and reference them all on screen at the same time.',
            },
          ],
        },
        { type: 'paragraph', children: [{ text: 'Try creating your own notes and linking them together!' }] },
      ]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
}
