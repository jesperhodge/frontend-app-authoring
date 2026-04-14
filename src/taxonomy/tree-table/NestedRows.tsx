import React from 'react';
import { useTagListContext } from '@src/taxonomy/tag-list/TagListContext';

import type {
  TreeRow,
} from './types';
import CreateRow from './CreateRow';
import EditRow from './EditRow';
import DisplayRow from './DisplayRow';
import { getTreeRowEditId } from './rowHelpers';

interface NestedRowsProps {
  /** The parent row object from TanStack React Table */
  parentRow: TreeRow;
  /** The value identifier of the parent row */
  parentRowValue: string;
  /** Array of child row objects to render */
  childRowsData?: TreeRow[];
  /** Current nesting depth level (used for indentation calculation) */
  depth?: number;
}

/**
 * NestedRows
 *
 * Recursively renders nested child rows within a tree table structure. This component handles:
 * - Display of child rows when a parent row is expanded
 * - Indentation based on nesting depth
 * - Creation of new child rows with validation
 * - Management of draft state during row creation
 * - Recursive rendering of grandchild rows and deeper levels
 *
 * The component uses the TanStack React Table library to render table cells and manages
 * the creation flow by displaying a CreateRow form when a parent is in creation mode.
 */
const NestedRows = ({
  parentRow,
  parentRowValue,
  childRowsData = [],
  depth = 1,
}: NestedRowsProps) => {
  const {
    creatingParentId,
    editingRowId,
  } = useTagListContext();

  if (!parentRow.getIsExpanded()) {
    return null;
  }
  const indent = Math.max(depth, 1);
  const isCreating = creatingParentId === parentRow.original.id;

  return (
    <>
      {isCreating && (
        <CreateRow
          parentRowValue={parentRowValue}
          indent={indent}
        />
      )}
      {childRowsData?.map(row => {
        const rowData = row.original || row;
        return (
          <React.Fragment key={String(rowData.id)}>
            {editingRowId === getTreeRowEditId(row) ? (
              <EditRow
                initialValue={String(row.original.value)}
                indent={indent}
                row={row}
              />
            ) : (
              <DisplayRow row={row} indent={indent} />
            )}
            <NestedRows
              parentRow={row}
              childRowsData={row.subRows as TreeRow[]}
              parentRowValue={String(row.original.value)}
              depth={depth + 1}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default NestedRows;
