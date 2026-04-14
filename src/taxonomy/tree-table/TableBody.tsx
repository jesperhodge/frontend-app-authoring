import React from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';
import { useTagListContext } from '@src/taxonomy/tag-list/TagListContext';

import { LoadingSpinner } from '@src/generic/Loading';
import NestedRows from './NestedRows';

import messages from './messages';

import CreateRow from './CreateRow';
import EditRow from './EditRow';
import DisplayRow from './DisplayRow';
import { getTreeRowEditId } from './rowHelpers';

const TableBody = () => {
  const intl = useIntl();
  const {
    isCreatingTopTag,
    editingRowId,
    columns,
    table,
    isLoading,
  } = useTagListContext();

  if (!table || isLoading) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length} className="text-center">
            <LoadingSpinner />
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {table.getRowModel().rows.length === 0 && (
        <tr>
          <td colSpan={columns.length} className="text-center">
            {intl.formatMessage(messages.noResultsFoundMessage)}
          </td>
        </tr>
      )}

      {isCreatingTopTag && (
        <CreateRow />
      )}

      {table.getRowModel().rows.filter(row => row.depth === 0).map(row => (
        <React.Fragment key={row.id}>
          {editingRowId === getTreeRowEditId(row) ? (
            <EditRow
              initialValue={String(row.original.value)}
              row={row}
            />
          ) : (
            <DisplayRow row={row} />
          )}
          <NestedRows
            parentRow={row}
            childRowsData={row.subRows}
            parentRowValue={String(row.original.value)}
            depth={1}
          />
        </React.Fragment>
      ))}
    </tbody>
  );
};

export default TableBody;
