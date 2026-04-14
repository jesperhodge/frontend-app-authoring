import React from 'react';
import { Row } from '@tanstack/react-table';
import { useTagListContext } from '@src/taxonomy/tag-list/TagListContext';
import type { TreeRowData } from './types';
import DraftRow from './DraftRow';

interface EditRowProps {
  initialValue: string;
  indent?: number;
  row: Row<TreeRowData>;
}

const EditRow: React.FC<EditRowProps> = ({
  initialValue,
  indent = 0,
  row,
}) => {
  const {
    draftError,
    setDraftError,
    handleUpdateTag,
    setEditingRowId,
    exitDraftWithoutSave,
    updateTagMutation,
    validate,
  } = useTagListContext();

  const handleCancel = () => {
    setDraftError('');
    setEditingRowId(null);
    exitDraftWithoutSave();
  };

  return (
    <DraftRow
      draftError={draftError}
      initialValue={initialValue}
      onSave={(value) => handleUpdateTag(value, initialValue)}
      onCancel={handleCancel}
      mutationState={updateTagMutation}
      indent={indent}
      validate={validate}
      requireValueChangeToEnableSave
      row={row}
    />
  );
};

export default EditRow;
