// [review] Comment on this file in the original PR: https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b14ab6ac638a3f658496d252f6a168f7eb5820a1e5df303743d37e9e82b94c37
// [review] L2 renders the course groups only once the course list has loaded, and shows a spinner while it loads.
import { useIntl } from '@edx/frontend-platform/i18n';

import { LoadingSpinner } from '@src/generic/Loading';
import { CourseGroupList } from '../criteria-groups';
import messages from './messages';

export interface CriteriaAssociationsSectionProps {
  /** The currently selected competency's name, shown in the "Demonstrate
   * Mastery For" line.
   */
  competencyName: string;
  // [review] L2: The prop that lets the section wait for the course list. AC "Turning to another page of courses re-scopes the associations panel".
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b14ab6ac638a3f658496d252f6a168f7eb5820a1e5df303743d37e9e82b94c37R12
  /** The status of the course list below this section. The groups are scoped
   * to the listed courses, so they only render once that list has loaded.
   */
  courseListStatus: 'pending' | 'error' | 'success';
}

/** The associations section above "Courses & Content": the selected
 * competency's existing criteria groups, rendered as a tree of course-level
 * groups, bottom-tier groups, and rule boxes.
 *
 * `CourseGroupList` reads its own data and focus state from
 * `CompetencyAssociationsContext`; this component only renders the static
 * label/mastery lines, which need `competencyName` directly since the
 * context doesn't track it.
 */
const CriteriaAssociationsSection = ({ competencyName, courseListStatus }: CriteriaAssociationsSectionProps) => {
  const intl = useIntl();

  return (
    <div className="course-search-browse__associations">
      <div className="course-search-browse__associations-label">
        {intl.formatMessage(messages.associationsSectionLabel)}
      </div>
      <div className="course-search-browse__associations-mastery">
        {intl.formatMessage(messages.demonstrateMasteryForLabel, { competencyName })}
      </div>
      {/* [review] L2: A pending list shows a spinner and a failed list shows nothing, so the previous page's groups never stay on screen. AC "Turning to another page of courses re-scopes the associations panel" and AC "The course list fails to load". */}
      {/* [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b14ab6ac638a3f658496d252f6a168f7eb5820a1e5df303743d37e9e82b94c37R38 */}
      {courseListStatus === 'pending' && (
        <div className="d-flex justify-content-center py-3">
          <LoadingSpinner size="sm" />
        </div>
      )}
      {courseListStatus === 'success' && <CourseGroupList />}
    </div>
  );
};

export default CriteriaAssociationsSection;
