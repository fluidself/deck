import type { BaseEditor, Descendant, Node } from 'slate';
import type { ReactEditor } from 'slate-react';
import type { HistoryEditor } from 'slate-history';
import { YjsEditor } from 'slate-yjs';

export type DeckEditor = BaseEditor & ReactEditor & HistoryEditor & YjsEditor;

export enum ElementType {
  Paragraph = 'paragraph',
  HeadingOne = 'heading-one',
  HeadingTwo = 'heading-two',
  HeadingThree = 'heading-three',
  ListItem = 'list-item',
  BulletedList = 'bulleted-list',
  NumberedList = 'numbered-list',
  CheckListItem = 'check-list-item',
  Blockquote = 'block-quote',
  ExternalLink = 'link',
  NoteLink = 'note-link',
  Tag = 'tag',
  CodeBlock = 'code-block',
  ThematicBreak = 'thematic-break',
  Image = 'image',
  BlockReference = 'block-reference',
  DetailsDisclosure = 'details-disclosure',
  Table = 'table',
  TableRow = 'table-row',
  TableCell = 'table-cell',
  TableContent = 'table-content',
}

export enum Mark {
  Bold = 'bold',
  Italic = 'italic',
  Code = 'code',
  Underline = 'underline',
  Strikethrough = 'strikethrough',
  Highlight = 'highlight',
}

export type ParagraphElement = {
  id: string;
  type: ElementType.Paragraph;
  children: Descendant[];
};

export type HeadingOneElement = {
  id: string;
  type: ElementType.HeadingOne;
  children: Descendant[];
};

export type HeadingTwoElement = {
  id: string;
  type: ElementType.HeadingTwo;
  children: Descendant[];
};

export type HeadingThreeElement = {
  id: string;
  type: ElementType.HeadingThree;
  children: Descendant[];
};

export type ListItem = {
  id: string;
  type: ElementType.ListItem;
  children: Descendant[];
};

export type BulletedList = {
  id: string;
  type: ElementType.BulletedList;
  children: Descendant[];
};

export type NumberedList = {
  id: string;
  type: ElementType.NumberedList;
  children: Descendant[];
};

export type CheckListItem = {
  id: string;
  type: ElementType.CheckListItem;
  checked: boolean;
  children: Descendant[];
};

export type Blockquote = {
  id: string;
  type: ElementType.Blockquote;
  children: Descendant[];
};

export type ExternalLink = {
  id: string;
  type: ElementType.ExternalLink;
  url: string;
  children: Descendant[];
};

export type NoteLink = {
  id: string;
  type: ElementType.NoteLink;
  noteId: string;
  noteTitle: string;
  customText?: string;
  children: Descendant[];
};

export type Tag = {
  id: string;
  type: ElementType.Tag;
  name: string; // Name does not have #
  children: Descendant[]; // Children has the #
};

export type CodeBlock = {
  id: string;
  type: ElementType.CodeBlock;
  children: Descendant[];
};

export type ThematicBreak = {
  id: string;
  type: ElementType.ThematicBreak;
  children: Descendant[];
};

export type Image = {
  id: string;
  type: ElementType.Image;
  url: string;
  caption?: string;
  children: Descendant[];
};

export type BlockReference = {
  id: string;
  type: ElementType.BlockReference;
  blockId: string;
  children: Descendant[];
};

export type DetailsDisclosure = {
  id: string;
  type: ElementType.DetailsDisclosure;
  summaryText: string;
  children: Descendant[];
};

export type Table = {
  id: string;
  type: ElementType.Table;
  children: TableRow[];
};

export type TableRow = {
  id: string;
  type: ElementType.TableRow;
  children: TableCell[];
};

export type TableCell = {
  id: string;
  type: ElementType.TableCell;
  children: Node[];
};

export type TableContent = {
  id: string;
  type: ElementType.TableContent;
  children: Descendant[];
};

export type ReferenceableBlockElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | HeadingThreeElement
  | ListItem
  | CheckListItem
  | Blockquote
  | CodeBlock
  | ThematicBreak
  | Image
  | BlockReference
  | DetailsDisclosure
  | Table;

export type InlineElement = ExternalLink | NoteLink | Tag | TableRow | TableCell | TableContent;

export type ListElement = BulletedList | NumberedList;

export type DeckElement = ReferenceableBlockElement | ListElement | InlineElement;

export type FormattedText = { text: string } & Partial<Record<Mark, boolean>>;

export type DeckText = FormattedText;

declare module 'slate' {
  interface CustomTypes {
    Editor: DeckEditor;
    Element: DeckElement;
    Text: DeckText;
  }
}
