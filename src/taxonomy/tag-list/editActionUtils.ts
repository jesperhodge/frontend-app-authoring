import { useIntl } from '@edx/frontend-platform/i18n';

import globalMessages from '@src/messages';
import { TagTree } from './tagTree';
import { TAG_NAME_PATTERN } from './constants';
import messages from './messages';

type IntlShape = ReturnType<typeof useIntl>;

const getInlineValidationMessage = (value: string, intl: IntlShape): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return intl.formatMessage(messages.nameRequired);
  }

  if (!TAG_NAME_PATTERN.test(trimmed)) {
    return intl.formatMessage(messages.invalidCharacterInTagName);
  }

  return '';
};

const formatTagRequestError = (error: unknown, intl: IntlShape): string => {
  if (error && typeof error === 'object' && 'name' in error && error.name === 'AxiosError') {
    const responseData = (error as { response?: { data?: unknown } }).response?.data;
    const normalizedData = responseData && typeof responseData === 'object' ? responseData : {};
    const tagError = Object.entries(normalizedData).find(([key]) => (
      ['tag', 'value', 'updated_tag_value'].includes(key.toLowerCase())
    ));

    const errorMessages = tagError?.[1]
      ?? ((error as Error).message || intl.formatMessage(globalMessages.unknownError));
    const message = Array.isArray(errorMessages)
      ? errorMessages.join('; ')
      : String(errorMessages);

    return message.replace(/\.$/, '');
  }

  const fallback = (error as Error)?.message || intl.formatMessage(globalMessages.unknownError);
  return fallback.replace(/\.$/, '');
};

const renameTagInTree = (
  currentTagTree: TagTree | null,
  oldValue: string,
  newValue: string,
): TagTree => {
  const nextTree = currentTagTree || new TagTree([]);
  nextTree.editTagValue(oldValue, newValue);
  return nextTree;
};

const addTagToTree = (
  currentTagTree: TagTree | null,
  value: string,
  parentTagValue: string | null,
): TagTree => {
  const nextTree = currentTagTree || new TagTree([]);
  const parentTag = parentTagValue ? nextTree.getTagAsDeepCopy(parentTagValue) : null;

  nextTree.addNode({
    id: Date.now(),
    value,
    parentValue: parentTagValue,
    depth: parentTag ? parentTag.depth + 1 : 0,
    childCount: 0,
    subTagsUrl: null,
    externalId: '',
  }, parentTagValue);

  return nextTree;
};

export {
  getInlineValidationMessage,
  formatTagRequestError,
  renameTagInTree,
  addTagToTree,
};
