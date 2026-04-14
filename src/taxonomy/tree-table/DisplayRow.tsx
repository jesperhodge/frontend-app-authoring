import React from 'react';
import { flexRender } from '@tanstack/react-table';

import type { TreeRow } from './types';

interface DisplayRowProps {
  row: TreeRow;
  indent?: number;
}

const DisplayRow = ({ row, indent = 0 }: DisplayRowProps) => (
  <tr>
    {row.getVisibleCells().map((cell, index) => {
      const content = flexRender(cell.column.columnDef.cell, cell.getContext());
      const isFirstColumn = index === 0;
      const shouldIndent = isFirstColumn && indent > 0;

      return (
        <td
          key={cell.id}
          className="p-1 tree-table-overflow-anywhere"
        >
          {shouldIndent ? (
            <div className={`tree-table-indent tree-table-indent-${indent}`}>{content}</div>
          ) : (
            content
          )}
        </td>
      );
    })}
  </tr>
);

export default DisplayRow;