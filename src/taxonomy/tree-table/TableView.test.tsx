import React from 'react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { TagListContext } from '@src/taxonomy/tag-list/TagListContext';

import { TableView } from './TableView';

jest.mock('./TableBody', () => {
  const MockTableBody = () => (
    <tbody>
      <tr>
        <td>mock body</td>
      </tr>
    </tbody>
  );
  return MockTableBody;
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}}>{children}</IntlProvider>
);

const baseContext = () => ({
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
  validate: jest.fn(() => true),
  startDraftMode: jest.fn(),
  exitDraftWithoutSave: jest.fn(),
});

const baseProps = () => ({
  treeData: [{ id: 1, value: 'root' }],
  columns: [{ accessorKey: 'value', header: 'Tag name', cell: (info: any) => info.getValue() }],
  pageCount: 3,
  pagination: { pageIndex: 0, pageSize: 10 },
  handlePaginationChange: jest.fn(),
  isLoading: false,
  toast: { show: false, message: '', variant: 'success' },
  setToast: jest.fn(),
});

const renderTableView = (props: any, contextOverrides: Record<string, unknown> = {}) => {
  const context = { ...baseContext(), ...contextOverrides };
  return render(
    <TagListContext.Provider value={context as any}>
      <TableView {...props} />
    </TagListContext.Provider>,
    { wrapper },
  );
};

describe('TableView', () => {
  it('shows and dismisses save error banner', () => {
    const props = baseProps();
    const context = {
      createTagMutation: { isPending: false, isError: true },
      draftError: 'Request failed with status code 500',
    };

    renderTableView(props, context);

    expect(screen.getByText('Error saving changes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Error saving changes')).not.toBeInTheDocument();
  });

  it('keeps pagination hidden by default even when multiple pages are reported', () => {
    const props = baseProps();
    renderTableView(props);

    expect(screen.queryByRole('navigation', { name: /table pagination/i })).not.toBeInTheDocument();
  });

  it('renders pagination and updates page selection when explicitly enabled', () => {
    const props = baseProps();
    renderTableView({ ...props, enablePagination: true });

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^page 2$/i }));
    expect(props.handlePaginationChange).toHaveBeenCalled();
  });

  it('hides pagination when there is only one page', () => {
    const props = baseProps();
    props.pageCount = 1;
    renderTableView(props);

    expect(screen.queryByRole('navigation', { name: /table pagination/i })).not.toBeInTheDocument();
  });

  it('closes toast by setting show to false', () => {
    const props = baseProps();
    props.toast = { show: true, message: 'created', variant: 'success' };

    renderTableView(props);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(props.setToast).toHaveBeenCalled();
    const updater = props.setToast.mock.calls[0][0];
    expect(updater({ show: true, message: 'created', variant: 'success' })).toEqual({
      show: false,
      message: 'created',
      variant: 'success',
    });
  });
});
