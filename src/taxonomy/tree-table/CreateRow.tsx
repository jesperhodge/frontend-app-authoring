import React from 'react';
import { useTagListContext } from '@src/taxonomy/tag-list/TagListContext';
import DraftRow from './DraftRow';

interface CreateRowProps {
  parentRowValue?: string;
  indent?: number;
}

const CreateRow: React.FC<CreateRowProps> = ({
  parentRowValue,
  indent = 0,
}) => {
  const {
    draftError,
    setDraftError,
    handleCreateTag,
    setIsCreatingTopTag,
    setCreatingParentId,
    exitDraftWithoutSave,
    createTagMutation,
    validate,
  } = useTagListContext();

  const handleCancel = () => {
    setDraftError('');
    setIsCreatingTopTag(false);
    if (parentRowValue) {
      setCreatingParentId(null);
    }
    exitDraftWithoutSave();
  };

  return (
    <DraftRow
      draftError={draftError}
      onSave={(value) => handleCreateTag(value, parentRowValue)}
      onCancel={handleCancel}
      mutationState={createTagMutation}
      indent={indent}
      validate={validate}
      rowId="creating-top-row"
      rowTestId="creating-top-row"
    />
  );
};

export default CreateRow;
