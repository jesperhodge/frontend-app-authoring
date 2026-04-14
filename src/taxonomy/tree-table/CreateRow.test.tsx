import React from 'react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { TagListContext } from '@src/taxonomy/tag-list/TagListContext';

import CreateRow from './CreateRow';

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
  validate: jest.fn((value: string) => value.trim().length > 0),
  startDraftMode: jest.fn(),
  exitDraftWithoutSave: jest.fn(),
});

describe('CreateRow', () => {
  it('saves on Enter when value is valid', () => {
    const context = baseContext();
    render(
      <TagListContext.Provider value={context as any}>
        <table>
          <tbody>
            <CreateRow />
          </tbody>
        </table>
      </TagListContext.Provider>,
      { wrapper },
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  new tag  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(context.handleCreateTag).toHaveBeenCalledWith('new tag', undefined);
  });

  it('does not save on Enter when mutation is pending', () => {
    const context = baseContext();
    context.createTagMutation = { isPending: true, isError: false };

    render(
      <TagListContext.Provider value={context as any}>
        <table>
          <tbody>
            <CreateRow />
          </tbody>
        </table>
      </TagListContext.Provider>,
      { wrapper },
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'pending tag' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(context.handleCreateTag).not.toHaveBeenCalled();
  });

  it('cancels on Escape and resets draft state', () => {
    const context = baseContext();

    render(
      <TagListContext.Provider value={context as any}>
        <table>
          <tbody>
            <CreateRow />
          </tbody>
        </table>
      </TagListContext.Provider>,
      { wrapper },
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'will cancel' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(context.setDraftError).toHaveBeenCalledWith('');
    expect(context.setIsCreatingTopTag).toHaveBeenCalledWith(false);
    expect(context.exitDraftWithoutSave).toHaveBeenCalled();
  });
});
