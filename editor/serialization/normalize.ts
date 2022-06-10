import { MdastNode } from './types';

/**
 * This plugin normalizes the MdastNode format to conform to app's slate schema.
 */
export default function normalize(node: MdastNode): MdastNode {
  return normalizeTables(normalizeDetailsDisclosure(normalizeImages(normalizeCheckListItems(normalizeLists(node)))));
}

/**
 * This function:
 * 1. Lifts nested lists up one level
 * 2. Strips out paragraphs from list items, lifting the list item children up one level
 */
const normalizeLists = (node: MdastNode): MdastNode => {
  if (!node.children) {
    return node;
  }

  if (node.type !== 'list') {
    return { ...node, children: node.children.map(normalizeLists) };
  }

  const newChildren = [];

  // Iterate through the children (list items) of the list
  for (const child of node.children) {
    const normalizedChild = normalizeLists(child); // Normalize child

    if (!normalizedChild.children) {
      // No children, just push in normally
      newChildren.push(normalizedChild);
      continue;
    }

    // Iterate through the children of the list item
    if (normalizedChild.type === 'listItem') {
      const nestedLists = [];
      const newNestedChildren = [];
      for (const nestedChild of normalizedChild.children) {
        if (!nestedChild.children) {
          // No children, just push in normally
          newNestedChildren.push(nestedChild);
          continue;
        }

        if (nestedChild.type === 'list') {
          // If the list item child is a list, add it to nestedLists
          nestedLists.push(nestedChild);
        } else if (nestedChild.type === 'paragraph' || nestedChild.type === 'heading') {
          // If the list item child is a paragraph or heading, remove the wrapper
          newNestedChildren.push(...(nestedChild.children ?? []));
        } else {
          // If the list item child is anything else (e.g. list item), add it normally
          newNestedChildren.push(nestedChild);
        }
      }

      // Add in the normalized list item with its normalized children, as well as the nested lists
      newChildren.push({ ...normalizedChild, children: newNestedChildren });
      newChildren.push(...nestedLists);
    } else {
      // Push in normally if it is not a list item
      newChildren.push(normalizedChild);
    }
  }

  return { ...node, children: newChildren };
};

const isCheckListItem = (node: MdastNode): boolean => {
  return typeof node.checked === 'boolean';
};

/**
 * This function pulls checklist items out of lists (splitting the list)
 */
const normalizeCheckListItems = (node: MdastNode): MdastNode => {
  if (!node.children) {
    return node;
  }

  const newChildren = [];
  for (const child of node.children) {
    const normalizedChild = normalizeCheckListItems(child);

    if (!normalizedChild.children) {
      // No children, just push in normally
      newChildren.push(normalizedChild);
      continue;
    }

    if (normalizedChild.type === 'list') {
      const blocks: MdastNode[] = [];

      for (const listChild of normalizedChild.children) {
        if (isCheckListItem(listChild)) {
          // Checklist items should be pulled out
          blocks.push(listChild);
        } else {
          // Add a new block if it doesn't exist yet
          if (blocks.length <= 0 || isCheckListItem(blocks[blocks.length - 1])) {
            blocks.push({ type: normalizedChild.type, children: [] });
          }
          // Push in listChild at the same level
          blocks[blocks.length - 1].children?.push(listChild);
        }
      }

      newChildren.push(...blocks);
    } else {
      newChildren.push(normalizedChild);
    }
  }

  return { ...node, children: newChildren };
};

/**
 * This function splits images into their own block if necessary (splitting the parent node)
 */
const normalizeImages = (node: MdastNode): MdastNode => {
  if (!node.children) {
    return node;
  }

  const newChildren = [];

  for (const child of node.children) {
    const normalizedChild = normalizeImages(child); // Normalize child

    if (!normalizedChild.children) {
      // No children, just push in normally
      newChildren.push(normalizedChild);
      continue;
    }

    // Pull the image out into its own block if it's not the child of a list
    if (normalizedChild.type !== 'list' && normalizedChild.children.some(nestedChild => nestedChild.type === 'image')) {
      const blocks: MdastNode[] = [];

      // Split children into separate blocks
      for (const nestedChild of normalizedChild.children) {
        if (nestedChild.type === 'image') {
          blocks.push(nestedChild);
        }
        // Nested child is a text node
        else {
          // Add a new block if it doesn't exist yet
          if (blocks.length <= 0 || blocks[blocks.length - 1].type === 'image') {
            blocks.push({ type: normalizedChild.type, children: [] });
          }
          blocks[blocks.length - 1].children?.push(nestedChild);
        }
      }

      newChildren.push(...blocks);
    } else {
      newChildren.push(normalizedChild);
    }
  }

  return { ...node, children: newChildren };
};

/**
 * This function converts <details><summary> content into custom DetailsDisclosureElement
 */
const normalizeDetailsDisclosure = (node: MdastNode): MdastNode => {
  if (!node.children) {
    return node;
  }

  const newChildren = [];
  let detailsDisclosureNode: MdastNode = { type: 'detailsDisclosure', detailsSummaryText: '', children: [] };
  let partsCounter = 0;

  for (const child of node.children) {
    if (child.type === 'html' && child.value?.startsWith('<details><summary>')) {
      partsCounter++;
      // @ts-ignore
      detailsDisclosureNode.detailsSummaryText = child.value?.match('<summary>(.*)</summary>')[1];
      detailsDisclosureNode.position = child.position;
    } else if (partsCounter === 1) {
      partsCounter++;
      detailsDisclosureNode.children = child.children;
    } else if (partsCounter === 2) {
      newChildren.push(detailsDisclosureNode);
      partsCounter = 0;
      detailsDisclosureNode = { type: 'detailsDisclosure', detailsSummaryText: '', children: [] };
    } else {
      newChildren.push(child);
    }
  }

  return { ...node, children: newChildren };
};

/**
 * This function converts table content into custom table elements
 */
const normalizeTables = (node: MdastNode): MdastNode => {
  if (!node.children) {
    return node;
  }

  const newChildren = [];
  let tableNode: MdastNode = { type: 'table', tableRows: [] };

  for (const child of node.children) {
    if (child.type === 'html' && child.value?.startsWith('<table>')) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(child.value, 'text/html');
      const rows = doc.getElementsByTagName('tr');
      const tableRows = [];

      for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].cells;
        const rowCells = [];
        for (let j = 0; j < cells.length; j++) {
          const cellContent = cells[j].innerHTML;
          rowCells.push(cellContent);
        }
        tableRows.push(rowCells);
      }

      tableNode.tableRows = [...tableRows];
      tableNode.position = child.position;
      newChildren.push(tableNode);
      tableNode = { type: 'table', tableRows: [] };
    } else {
      newChildren.push(child);
    }
  }

  return { ...node, children: newChildren };
};
