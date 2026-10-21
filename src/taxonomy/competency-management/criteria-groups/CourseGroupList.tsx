// [review] Comment on this file in the original PR: https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-af8feab05becc3de740862a09b54b503b774cae23b893dbf36a8c508620a3b60
// [review] L2 treats a groups query that is disabled until course keys are reported as still loading. L4 also waits for course access to resolve before an empty list reads as no associations.
import { useEffect, useRef } from 'react';
import { useIntl } from '@edx/frontend-platform/i18n';

import AlertMessage from '@src/generic/alert-message';
import { LoadingSpinner } from '@src/generic/Loading';
import { useCompetencyAssociations } from '../CompetencyAssociationsContext';
import courseSearchMessages from '../course-search/messages';
import CourseGroupSection from './CourseGroupSection';
import messages from './messages';
// @ts-ignore
import './criteria-groups.scss';

// [review] L2 rewrites this docblock for scoped data. Forward references: its sentence about `isCourseAccessResolved` describes the L4 change in this file, and its mention of the summary line refers to L3.
/** The top-of-panel associations tree for the currently selected
 * competency: loading, failed, empty, or the list of accessible course-level
 * groups. Reads everything from `CompetencyAssociationsContext`.
 *
 * "Loading" covers both the groups query and the default-rule-profile query,
 * since `effectiveRuleOf` needs the profile to resolve an unoverridden
 * criterion. Whether the list is empty is decided on `accessibleCourseGroups`
 * (already filtered), never the raw payload's own counts, so a course the
 * author can't see never shows a group. It waits for `isCourseAccessResolved`,
 * since that filter is incomplete until then.
 *
 * The fetch is scoped to the listed courses, so the empty state only means
 * none are in the listed courses; the course list's summary line carries the
 * listed and total association counts.
 */
const CourseGroupList = () => {
  const intl = useIntl();
  const {
    groupsQuery,
    profileQuery,
    index,
    accessibleCourseGroups,
    keyboardFocusRequest,
    consumeKeyboardFocusRequest,
  } = useCompetencyAssociations();
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const takesKeyboardFocus = keyboardFocusRequest?.kind === 'empty';

  // The empty state mounts in the same render that last emptied the list, so
  // the ref is normally set by the time this runs.
  useEffect(() => {
    if (takesKeyboardFocus && emptyStateRef.current) {
      emptyStateRef.current.focus({ preventScroll: true });
      consumeKeyboardFocusRequest();
    }
  }, [takesKeyboardFocus, accessibleCourseGroups.length, consumeKeyboardFocusRequest]);

  // [review] L2: Uses `isPending`, which also covers a query that is disabled until keys are reported, so the list shows a spinner rather than the empty state. AC "The panel does not look empty while it re-scopes".
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-af8feab05becc3de740862a09b54b503b774cae23b893dbf36a8c508620a3b60R52
  if (groupsQuery.isPending || profileQuery.isPending) {
    return (
      <div className="d-flex justify-content-center py-3">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (groupsQuery.isError || profileQuery.isError || !index || !profileQuery.data) {
    return (
      <AlertMessage
        variant="danger"
        description={intl.formatMessage(messages.courseGroupListErrorMessage)}
      />
    );
  }

  // [review] Note: AC "Associations exist, but none in the courses currently listed" asks for a second message naming the out-of-view count. This branch renders the single existing message for every count combination.
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-af8feab05becc3de740862a09b54b503b774cae23b893dbf36a8c508620a3b60
  if (accessibleCourseGroups.length === 0) {
    return (
      <div ref={emptyStateRef} tabIndex={-1} className="course-search-browse__associations-empty-state">
        <p>{intl.formatMessage(courseSearchMessages.noAssociationsMessage)}</p>
        <p>{intl.formatMessage(courseSearchMessages.noAssociationsPromptMessage)}</p>
      </div>
    );
  }

  return (
    <div className="course-group-list">
      {accessibleCourseGroups.map((courseGroup) => (
        <CourseGroupSection
          key={courseGroup.id}
          courseGroup={courseGroup}
        />
      ))}
    </div>
  );
};

export default CourseGroupList;
