import {
  Icon,
  IconButton,
  IconButtonWithTooltip,
  Dropdown,
} from '@openedx/paragon';
import { useMemo } from 'react';
import {
  AddCircle,
  MoreVert,
} from '@openedx/paragon/icons';
import { FormattedMessage, useIntl } from '@edx/frontend-platform/i18n';
import type { Row } from '@tanstack/react-table';

import type {
  TreeColumnDef,
  TreeRowData,
} from '@src/taxonomy/tree-table/types';
import { useTagListContext } from './TagListContext';
import { TagListRowData } from './types';
import messages from './messages';
import OptionalExpandLink from './OptionalExpandLink';
import UsageCountDisplay from './UsageCountDisplay';

const EDITABLE_COLUMNS = ['value'];

const asTagListRowData = (row: Row<TreeRowData>): TagListRowData => (
  row.original as unknown as TagListRowData
);

interface ActionsHeaderProps {
  startDraftMode: () => void;
  setDraftError: (error: string) => void;
  setIsCreatingTopTag: (isCreating: boolean) => void;
  setEditingRowId: (id: string | number | null) => void;
  hasOpenDraft: boolean;
  draftInProgressHintId: string;
  canAddTag: boolean;
}

const ActionsHeader = ({
  startDraftMode,
  setDraftError,
  setIsCreatingTopTag,
  setEditingRowId,
  hasOpenDraft,
  canAddTag,
  draftInProgressHintId,
}: ActionsHeaderProps) => {
  const intl = useIntl();
  return (
    <div className="d-flex justify-content-end">
      <IconButtonWithTooltip
        tooltipPlacement="top"
        tooltipContent={<div>{intl.formatMessage(messages.createNewTagTooltip)}</div>}
        src={AddCircle}
        alt={intl.formatMessage(messages.createTagButtonLabel)}
        size="inline"
        onClick={() => {
          startDraftMode();
          setDraftError('');
          setIsCreatingTopTag(true);
          setEditingRowId(null);
        }}
        disabled={hasOpenDraft || !canAddTag}
        aria-describedby={hasOpenDraft ? draftInProgressHintId : undefined}
      />
    </div>
  );
};

interface ActionsMenuProps {
  rowData: TagListRowData;
  startSubtagDraft: () => void;
  disableAddSubtag: boolean;
  editTag: () => void;
  disableEditTag: boolean;
  reachedMaxDepth: (row: Row<TreeRowData>) => boolean;
  row: Row<TreeRowData>;
}

const ActionsMenu = ({
  rowData,
  row,
  startSubtagDraft,
  disableAddSubtag,
  editTag,
  disableEditTag,
  reachedMaxDepth,
}: ActionsMenuProps) => {
  const intl = useIntl();

  return (
    <Dropdown>
      <Dropdown.Toggle
        id={`dropdown-toggle-for-tag-${rowData.id}`}
        as={IconButton}
        src={MoreVert}
        iconAs={Icon}
        variant="primary"
        aria-label={intl.formatMessage(messages.moreActionsForTag, { tagName: rowData.value })}
        size="sm"
      />
      <Dropdown.Menu>
        <Dropdown.Item
          onClick={startSubtagDraft}
          disabled={reachedMaxDepth(row) || disableAddSubtag}
        >
          {intl.formatMessage(messages.addSubtag)}
        </Dropdown.Item>
        <Dropdown.Item
          onClick={editTag}
          disabled={disableEditTag}
        >
          {intl.formatMessage(messages.renameTag)}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

const useTagColumns = (): TreeColumnDef[] => {
  const {
    setIsCreatingTopTag,
    setCreatingParentId,
    setEditingRowId,
    startDraftMode,
    hasOpenDraft,
    canAddTag,
    setDraftError,
    maxDepth,
  } = useTagListContext();

  return useMemo(() => {
    const reachedMaxDepth = (row: Row<TreeRowData>) => row.depth >= maxDepth;
    const draftInProgressHintId = 'tag-list-draft-in-progress-hint';

    return [
      {
        id: 'valueColumn',
        header: () => <FormattedMessage {...messages.tagListColumnValueHeader} />,
        cell: ({ row }) => {
          const {
            value,
          } = asTagListRowData(row);

          return (
            <span className="d-flex align-items-center gap-2">
              <OptionalExpandLink row={row} />
              <span>{value}</span>
            </span>
          );
        },
      },
      {
        id: 'count',
        header: () => <FormattedMessage {...messages.tagListColumnCountHeader} />,
        cell: UsageCountDisplay,
      },
      {
        id: 'actions',
        header: () => (
          <ActionsHeader
            startDraftMode={startDraftMode}
            setDraftError={setDraftError}
            setIsCreatingTopTag={setIsCreatingTopTag}
            setEditingRowId={setEditingRowId}
            hasOpenDraft={hasOpenDraft}
            draftInProgressHintId={draftInProgressHintId}
            canAddTag={canAddTag}
          />
        ),
        cell: ({ row }) => {
          const rowData = asTagListRowData(row);

          if (rowData.isNew || rowData.isEditing) {
            return <div className="d-flex gap-2" />;
          }

          const disableAddSubtag = hasOpenDraft || !canAddTag;
          const disableEditTag = hasOpenDraft || row.original.canChangeTag === false;

          const startSubtagDraft = () => {
            startDraftMode();
            setDraftError('');
            setCreatingParentId(rowData.id);
            setEditingRowId(null);
            setIsCreatingTopTag(false);
            row.toggleExpanded(true);
          };

          const editTag = () => {
            startDraftMode();
            setDraftError('');
            setEditingRowId(`${rowData.id}:${rowData.value}`);
            setCreatingParentId(null);
            setIsCreatingTopTag(false);
          };

          return (
            <div className="d-flex align-items-center justify-content-end gap-2">
              <ActionsMenu
                rowData={rowData}
                row={row}
                startSubtagDraft={startSubtagDraft}
                disableAddSubtag={disableAddSubtag}
                editTag={editTag}
                disableEditTag={disableEditTag}
                reachedMaxDepth={reachedMaxDepth}
              />
            </div>
          );
        },
      },
    ];
  }, [
    maxDepth,
    startDraftMode,
    setDraftError,
    setCreatingParentId,
    setEditingRowId,
    setIsCreatingTopTag,
    hasOpenDraft,
    canAddTag,
  ]);
};

export { useTagColumns, EDITABLE_COLUMNS };
