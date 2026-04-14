import React from 'react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { TagListContext } from '@src/taxonomy/tag-list/TagListContext';

import NestedRows from './NestedRows';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}}>{children}</IntlProvider>
);

const defaultContext = (overrides = {}) => ({
  isCreatingTopTag: false,
  setIsCreatingTopTag: jest.fn(),
  creatingParentId: null,
  setCreatingParentId: jest.fn(),
  editingRowId: null,
  setEditingRowId: jest.fn(),
  draftError: '',
  setDraftError: jest.fn(),
  hasOpenDraft: false,
  canAddTag: true,
  maxDepth: 3,
  createTagMutation: { isPending: false, isError: false },
  updateTagMutation: { isPending: false, isError: false },
  handleCreateTag: jest.fn(),
  handleUpdateTag: jest.fn(),
  validate: () => true,
  startDraftMode: jest.fn(),
  exitDraftWithoutSave: jest.fn(),
  ...overrides,
});

const makeCell = (id: string, content: string) => ({
  id,
  column: { columnDef: { cell: () => content } },
  getContext: () => ({}),
});

const makeRow = ({
  id,
  value,
  expanded = true,
  subRows = [],
}: {
  id: number;
  value: string;
  expanded?: boolean;
  subRows?: any[];
}) => ({
  id: String(id),
  original: { id, value },
  subRows,
  getIsExpanded: () => expanded,
  getVisibleCells: () => [makeCell(`${id}-cell`, value)],
});

describe('NestedRows', () => {
  it('renders nothing when parent row is collapsed', () => {
    const parent = makeRow({ id: 1, value: 'parent', expanded: false });
    const context = defaultContext();

    const { container } = render(
      <TagListContext.Provider value={context as any}>
        <table>
          <tbody>
            <NestedRows
              parentRow={parent as any}
              parentRowValue="parent"
            />
          </tbody>
        </table>
      </TagListContext.Provider>,
      { wrapper },
    );

    expect(container.querySelector('tr')).toBeNull();
  });

  it('resets creating parent and runs cancel callback for nested create row', () => {
    const nestedChild = makeRow({ id: 2, value: 'child', expanded: true });
    const parent = makeRow({
      id: 1,
      value: 'parent',
      expanded: true,
      subRows: [nestedChild],
    });
    const setCreatingParentId = jest.fn();
    const exitDraftWithoutSave = jest.fn();
    const context = defaultContext({ creatingParentId: 1, setCreatingParentId, exitDraftWithoutSave });

    render(
      <TagListContext.Provider value={context as any}>
        <table>
          <tbody>
            <NestedRows
              parentRow={parent as any}
              parentRowValue="parent"
              childRowsData={[nestedChild as any]}
            />
          </tbody>
        </table>
      </TagListContext.Provider>,
      { wrapper },
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(setCreatingParentId).toHaveBeenCalledWith(null);
    expect(exitDraftWithoutSave).toHaveBeenCalled();
  });

  it('renders EditRow when editingRowId matches the child row id and value', () => {
    const nestedChild = makeRow({ id: 2, value: 'child', expanded: true });
    const parent = makeRow({
      id: 1,
      value: 'parent',
      expanded: true,
      subRows: [nestedChild],
    });
    const context = defaultContext({ editingRowId: '2:child' });

    render(
      <TagListContext.Provider value={context as any}>
        <table>
          <tbody>
            <NestedRows
              parentRow={parent as any}
              parentRowValue="parent"
              childRowsData={[nestedChild as any]}
            />
          </tbody>
        </table>
      </TagListContext.Provider>,
      { wrapper },
    );

    const childInput = screen.getByDisplayValue('child');
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    expect(childInput).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
  });
});
