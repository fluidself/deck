import { Transforms, NodeEntry, Editor } from 'slate';
import { ElementType, TableCell } from 'types/slate';
import { splitTable, Col } from '../selection';

export function removeRow(table: NodeEntry, editor: Editor) {
  const { selection } = editor;
  if (!selection || !table) return;

  const { getCol } = splitTable(editor, table);

  const yIndex = table[1].length;

  const [start, end] = Editor.edges(editor, selection);
  const [startNode] = Editor.nodes<TableCell>(editor, {
    match: n => n.type === ElementType.TableCell,
    at: start,
  });
  const [endNode] = Editor.nodes<TableCell>(editor, {
    match: n => n.type === ElementType.TableCell,
    at: end,
  });
  if (!startNode || !endNode) return;

  const [startCol] = getCol((col: Col) => col.cell.id === startNode[0].id);
  const [endCol] = getCol((col: Col) => col.cell.id === endNode[0].id);

  const yTop = startCol.path[yIndex];
  const yBottom = endCol.path[yIndex];

  const { gridTable } = splitTable(editor, table);

  const removeCols = gridTable.slice(yTop, yBottom + 1).reduce((p: Col[], c: Col[]) => [...p, ...c], []) as Col[];

  removeCols.forEach((col: Col) => {
    Transforms.removeNodes(editor, {
      at: table[1],
      match: n => n.id === col.cell.id,
    });
  });

  Transforms.removeNodes(editor, {
    at: table[1],
    match: n => {
      if (n.type !== ElementType.TableRow) {
        return false;
      }

      if (!n.children || n.children.findIndex((cell: TableCell) => cell.type === ElementType.TableCell) < 0) {
        return true;
      }

      return false;
    },
  });

  if (!Editor.string(editor, table[1])) {
    Transforms.removeNodes(editor, {
      at: table[1],
    });
  }
}
