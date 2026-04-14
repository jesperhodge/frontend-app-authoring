import React, { createContext, useContext } from 'react';

import type { RowId, CreateRowMutationState } from '@src/taxonomy/tree-table/types';

interface TagListContextValue {
  isCreatingTopTag: boolean;
  setIsCreatingTopTag: React.Dispatch<React.SetStateAction<boolean>>;
  creatingParentId: RowId | null;
  setCreatingParentId: React.Dispatch<React.SetStateAction<RowId | null>>;
  editingRowId: RowId | null;
  setEditingRowId: React.Dispatch<React.SetStateAction<RowId | null>>;
  draftError: string;
  setDraftError: React.Dispatch<React.SetStateAction<string>>;
  hasOpenDraft: boolean;
  canAddTag: boolean;
  maxDepth: number;
  createTagMutation: CreateRowMutationState;
  updateTagMutation: CreateRowMutationState;
  handleCreateTag: (value: string, parentTagValue?: string) => Promise<void>;
  handleUpdateTag: (value: string, originalValue: string) => Promise<void>;
  validate: (value: string, mode?: 'soft' | 'hard') => boolean;
  startDraftMode: () => void;
  exitDraftWithoutSave: () => void;
}

const TagListContext = createContext<TagListContextValue | null>(null);

const useTagListContext = (): TagListContextValue => {
  const context = useContext(TagListContext);
  if (!context) {
    throw new Error('useTagListContext must be used within TagListContext.Provider');
  }
  return context;
};

export type { TagListContextValue };
export { TagListContext, useTagListContext };
