import React, {
  useState,
  useMemo,
  useEffect,
} from 'react';
import type { PaginationState } from '@tanstack/react-table';
import { TableView } from '@src/taxonomy/tree-table';
import { useTagListData, useCreateTag, useUpdateTag } from '@src/taxonomy/data/apiHooks';
import { TagTree } from './tagTree';
import type {
  RowId,
  TreeRowData,
  ToastState,
} from '../tree-table/types';
import {
  TABLE_MODES,
} from './constants';
import { useTagColumns } from './tagColumns';
import { TagListContext } from './TagListContext';
import { useTableModes, useEditActions } from './hooks';

interface TagListTableProps {
  taxonomyId: number;
  maxDepth: number;
}

// TODO: Fix and enable pagination on backend and frontend.For now, disable pagination by showing all tags on one page.
const DISABLE_PAGINATION = true;

interface TagListTableContentProps {
  treeData: TreeRowData[];
  pageCount: number;
  pagination: PaginationState;
  handlePaginationChange: React.Dispatch<React.SetStateAction<PaginationState>>;
  isLoading: boolean;
  toast: ToastState;
  setToast: React.Dispatch<React.SetStateAction<ToastState>>;
}

const TagListTableContent = ({
  treeData,
  pageCount,
  pagination,
  handlePaginationChange,
  isLoading,
  toast,
  setToast,
}: TagListTableContentProps) => {
  const columns = useTagColumns();

  return (
    <TableView
      treeData={treeData}
      columns={columns}
      pageCount={pageCount}
      pagination={pagination}
      handlePaginationChange={handlePaginationChange}
      isLoading={isLoading}
      toast={toast}
      setToast={setToast}
    />
  );
};

const TagListTable = ({ taxonomyId, maxDepth }: TagListTableProps) => {
  // The table has a VIEW, DRAFT, and a PREVIEW mode. It starts in VIEW mode.
  // It switches to DRAFT mode when a user edits or creates a tag.
  // It switches to PREVIEW mode after saving changes, and only switches to VIEW when
  // the user refreshes the page, orders a column, or navigates to a different page.
  // During DRAFT and PREVIEW mode the table makes POST requests and receives
  // success or failure responses.
  // However, the table does not refresh to show the updated data from the backend.
  // This allows us to show the newly created or updated tag in the same place without reordering.
  //
  // TODO: Simpler approaches have been suggested. Two options are to just use simple React state:
  // `isCurrentlyEditingTag` and `lastCreatedTag`, or to use optimistic updates.
  // For reference, see https://github.com/openedx/frontend-app-authoring/pull/2872#discussion_r2880965005.

  const [creatingParentId, setCreatingParentId] = useState<RowId | null>(null);
  const [editingRowId, setEditingRowId] = useState<RowId | null>(null);

  // TODO: change to use the global ToastContext (waiting for UX refinement on that).
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [tagTree, setTagTree] = useState<TagTree | null>(null);
  const [isCreatingTopTag, setIsCreatingTopTag] = useState(false);
  const [draftError, setDraftError] = useState('');
  const treeData = (tagTree?.getAllAsDeepCopy() || []) as unknown as TreeRowData[];
  const hasOpenDraft = isCreatingTopTag || creatingParentId !== null || editingRowId !== null;

  // TABLE MODES
  const {
    tableMode, enterDraftMode, exitDraftWithoutSave, enterPreviewMode, enterViewMode,
  } = useTableModes();

  // PAGINATION
  // TODO: Fix and enable pagination. For now, disable pagination.
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  const handlePaginationChange = (updater: React.SetStateAction<PaginationState>) => {
    if (tableMode === TABLE_MODES.PREVIEW) {
      enterViewMode();
    }
    setPagination(updater);
  };

  // API HOOKS
  const { isLoading, data: tagList } = useTagListData(taxonomyId, {
    ...pagination,
    disablePagination: DISABLE_PAGINATION,
    enabled: tableMode === TABLE_MODES.VIEW,
  });
  const createTagMutation = useCreateTag(taxonomyId);
  const updateTagMutation = useUpdateTag(taxonomyId);
  const pageCount = tagList?.numPages ?? -1;

  // Custom Edit Actions Hook - handles table mode transitions, API calls,
  // and updating the table without a full data reload when creating or editing tags.
  const { handleCreateTag, handleUpdateTag, validate } = useEditActions({
    setTagTree,
    setDraftError,
    createTagMutation,
    updateTagMutation,
    enterPreviewMode,
    setToast,
    setIsCreatingTopTag,
    setCreatingParentId,
    exitDraftWithoutSave,
    setEditingRowId,
  });

  const contextValue = useMemo(
    () => ({
      isCreatingTopTag,
      setIsCreatingTopTag,
      creatingParentId,
      setCreatingParentId,
      editingRowId,
      setEditingRowId,
      draftError,
      setDraftError,
      hasOpenDraft,
      canAddTag: tagList?.canAddTag !== false,
      maxDepth,
      createTagMutation,
      updateTagMutation,
      handleCreateTag,
      handleUpdateTag,
      validate,
      startDraftMode: enterDraftMode,
      exitDraftWithoutSave,
    }),
    [
      isCreatingTopTag,
      setIsCreatingTopTag,
      creatingParentId,
      setCreatingParentId,
      editingRowId,
      setEditingRowId,
      draftError,
      setDraftError,
      hasOpenDraft,
      tagList?.canAddTag,
      maxDepth,
      createTagMutation,
      updateTagMutation,
      handleCreateTag,
      handleUpdateTag,
      validate,
      enterDraftMode,
      exitDraftWithoutSave,
    ],
  );

  // RELOAD DATA IN VIEW MODE
  useEffect(() => {
    // Get row data in VIEW mode. Otherwise keep current data to avoid disrupting
    // users while they edit or create a tag.
    if (tableMode === TABLE_MODES.VIEW && tagList?.results) {
      const tree = new TagTree(tagList?.results);
      if (tree) {
        setTagTree(tree);
      }
    }
  }, [tagList?.results, tableMode]);

  return (
    <TagListContext.Provider value={contextValue}>
      <TagListTableContent
        treeData={treeData}
        pageCount={pageCount}
        pagination={pagination}
        handlePaginationChange={handlePaginationChange}
        isLoading={isLoading}
        toast={toast}
        setToast={setToast}
      />
    </TagListContext.Provider>
  );
};

export default TagListTable;
