// [review] Comment on this file in the original PR: https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-7db1ef1ee70719398a40ac88d5dd4cb0a1b0cbc3dac36a8651f103af77e41d51
// [review] L3 renders the summary line with one message per filter combination, and truncates long search terms for display only.
import type { ReactNode } from 'react';

import { useIntl } from '@edx/frontend-platform/i18n';
import moment from 'moment';

import messages from './messages';

export interface CourseListSummaryProps {
  listedCount: number;
  totalCount: number;
  search: string;
  dateRange: [Date | null, Date | null];
  /** The competency's criteria associations in the listed courses. */
  listedAssociationCount: number;
  /** All of the competency's criteria associations, in any course. */
  totalAssociationCount: number;
}

// [review] L3: Shortens only the displayed copy of the search term to 50 characters plus an ellipsis, so the course list still filters on the full term. AC "A very long search term is shown truncated in the summary".
// [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-7db1ef1ee70719398a40ac88d5dd4cb0a1b0cbc3dac36a8651f103af77e41d51R19
const MAX_SEARCH_TERM_LENGTH = 50;

const truncateSearchTerm = (search: string) => {
  const codePoints = Array.from(search);
  return codePoints.length > MAX_SEARCH_TERM_LENGTH
    ? `${codePoints.slice(0, MAX_SEARCH_TERM_LENGTH).join('')}…`
    : search;
};

const formatSummaryDate = (date: Date) => moment(date).format('MM-DD-YYYY');

const strong = (chunks: ReactNode) => <strong>{chunks}</strong>;

/** CourseListSummary
 * The summary line under the course search field: how many courses are
 * listed out of every course the user can access, which search term and
 * start-date filter narrowed the list, and how many of the competency's
 * criteria associations are in those listed courses out of all of them. Each
 * filter combination is its own message, so translators see whole sentences.
 */
const CourseListSummary = ({
  listedCount,
  totalCount,
  search,
  dateRange: [startDate, endDate],
  listedAssociationCount,
  totalAssociationCount,
}: CourseListSummaryProps) => {
  const intl = useIntl();

  // [review] L3: Picks the message for exactly the filters that are applied, so none is named when none is set. AC "The summary names whichever filters narrowed the course list".
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-7db1ef1ee70719398a40ac88d5dd4cb0a1b0cbc3dac36a8651f103af77e41d51R49
  let message = messages.coursesSummary;
  if (search && startDate && endDate) {
    message = messages.coursesSummaryWithSearchAndDateRange;
  } else if (search && startDate) {
    message = messages.coursesSummaryWithSearchAndStartDate;
  } else if (search) {
    message = messages.coursesSummaryWithSearch;
  } else if (startDate && endDate) {
    message = messages.coursesSummaryWithDateRange;
  } else if (startDate) {
    message = messages.coursesSummaryWithStartDate;
  }

  return (
    <p className="course-search-browse__summary small mt-2 mb-0">
      {intl.formatMessage(message, {
        listedCount,
        totalCount,
        searchTerm: truncateSearchTerm(search),
        startDate: startDate ? formatSummaryDate(startDate) : undefined,
        endDate: endDate ? formatSummaryDate(endDate) : undefined,
        listedAssociationCount,
        totalAssociationCount,
        strong,
      })}
    </p>
  );
};

export default CourseListSummary;
