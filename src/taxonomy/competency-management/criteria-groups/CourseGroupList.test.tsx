// [review] Comment on this file in the original PR: https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b9cf945ca73eaecee43265981f30964997f44469d0f4191776a0d1a5860b7846
// [review] L2 tests the loading and empty states under scoping. L4 tests the wait for course access. L5 adds the two count fields to the fixtures.
import type { UseQueryResult } from '@tanstack/react-query';
import { initializeMocks, render, screen } from '@src/testUtils';
import { buildMockCompetencyAssociationsContextValue, MockCompetencyAssociationsProvider } from '../testHelpers';
import type { CompetencyCriteriaGroupsResponse, CompetencyRuleProfile } from '../data/types';
import { buildCompetencyCriteriaGroupsIndex } from '../utils';
import CourseGroupList from './CourseGroupList';

const systemDefaultProfile: CompetencyRuleProfile = {
  id: 1,
  scopeType: 'system_default',
  ruleType: 'grade',
  rulePayload: { op: 'gte', value: 0.7, scale: 'percent' },
  archived: false,
};

const emptyGroupsResponse: CompetencyCriteriaGroupsResponse = { groups: [], criteria: [] };

const populatedGroupsResponse: CompetencyCriteriaGroupsResponse = {
  groups: [
    {
      id: 100,
      parentId: null,
      tagId: 42,
      courseKey: null,
      name: 'root',
      ordering: 0,
      logicOperator: 'AND',
      archived: false,
    },
    {
      id: 1,
      parentId: 100,
      tagId: 42,
      courseKey: 'course-v1:OrgX+CS101+2024',
      name: 'course',
      ordering: 0,
      logicOperator: 'AND',
      archived: false,
    },
  ],
  criteria: [],
};

const buildQueryResult = <T,>(overrides: Partial<UseQueryResult<T>>): UseQueryResult<T> => ({
  isPending: false,
  isLoading: false,
  isError: false,
  data: undefined,
  ...overrides,
} as UseQueryResult<T>);

const loadingGroupsQuery = buildQueryResult<CompetencyCriteriaGroupsResponse>({ isPending: true, isLoading: true });
/** Disabled until the course list reports its keys: pending, but not loading, since nothing is fetching. */
const awaitingCourseKeysGroupsQuery = buildQueryResult<CompetencyCriteriaGroupsResponse>({
  isPending: true,
  isLoading: false,
  fetchStatus: 'idle',
});
const loadedEmptyGroupsQuery = buildQueryResult<CompetencyCriteriaGroupsResponse>({ data: emptyGroupsResponse });
const loadedPopulatedGroupsQuery = buildQueryResult<CompetencyCriteriaGroupsResponse>({
  data: populatedGroupsResponse,
});
const erroredGroupsQuery = buildQueryResult<CompetencyCriteriaGroupsResponse>({ isError: true });

const loadingProfileQuery = buildQueryResult<CompetencyRuleProfile>({ isPending: true, isLoading: true });
const loadedProfileQuery = buildQueryResult<CompetencyRuleProfile>({ data: systemDefaultProfile });
const erroredProfileQuery = buildQueryResult<CompetencyRuleProfile>({ isError: true });

const renderList = (contextOverrides: Parameters<typeof buildMockCompetencyAssociationsContextValue>[0] = {}) => (
  render(
    <MockCompetencyAssociationsProvider value={contextOverrides}>
      <CourseGroupList />
    </MockCompetencyAssociationsProvider>,
  )
);

describe('<CourseGroupList />', () => {
  beforeEach(() => {
    initializeMocks();
  });

  it('renders a loading state while the groups query is still loading', () => {
    renderList({ groupsQuery: loadingGroupsQuery, profileQuery: loadedProfileQuery });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // [review] L2: Pins that a groups query waiting for course keys shows a spinner, not the empty state. AC "The panel does not look empty while it re-scopes".
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b9cf945ca73eaecee43265981f30964997f44469d0f4191776a0d1a5860b7846R94
  it('renders a loading state, not the empty state, while the groups query waits for course keys', () => {
    renderList({ groupsQuery: awaitingCourseKeysGroupsQuery, profileQuery: loadedProfileQuery });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('No content associated.')).not.toBeInTheDocument();
  });

  it('renders a loading state while the default-rule-profile query is still loading, even if groups already loaded', () => {
    renderList({ groupsQuery: loadedEmptyGroupsQuery, profileQuery: loadingProfileQuery });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders a failed state when the groups query errors', () => {
    renderList({ groupsQuery: erroredGroupsQuery, profileQuery: loadedProfileQuery });
    expect(screen.getByText('There was a problem loading this competency\'s associations. Please try again.'))
      .toBeInTheDocument();
  });

  it('renders no "+ Rule"/"+ Rule Group" add control on a failed load', () => {
    renderList({ groupsQuery: erroredGroupsQuery, profileQuery: loadedProfileQuery });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a failed state when the default-rule-profile query errors, even if groups already loaded', () => {
    renderList({
      groupsQuery: loadedEmptyGroupsQuery,
      profileQuery: erroredProfileQuery,
      index: buildCompetencyCriteriaGroupsIndex(emptyGroupsResponse),
    });
    expect(screen.getByText('There was a problem loading this competency\'s associations. Please try again.'))
      .toBeInTheDocument();
  });

  it('renders the empty state when accessibleCourseGroups is empty, not throwing', () => {
    renderList({
      groupsQuery: loadedEmptyGroupsQuery,
      profileQuery: loadedProfileQuery,
      index: buildCompetencyCriteriaGroupsIndex(emptyGroupsResponse),
      systemDefaultProfile,
      accessibleCourseGroups: [],
    });
    expect(screen.getByText('No content associated.')).toBeInTheDocument();
    expect(screen.getByText('Make content selections to associate this competency with course content.'))
      .toBeInTheDocument();
  });

  it(
    'renders the empty state when every course-level group is inaccessible, even though the raw '
      + 'groups response has one - accessibleCourseGroups decides this, not the raw response\'s own count',
    () => {
      renderList({
        groupsQuery: loadedPopulatedGroupsQuery,
        profileQuery: loadedProfileQuery,
        index: buildCompetencyCriteriaGroupsIndex(populatedGroupsResponse),
        systemDefaultProfile,
        // The one course-level group didn't pass the outline-accessibility
        // check, so it must render identically to no associations at all.
        accessibleCourseGroups: [],
      });
      expect(screen.getByText('No content associated.')).toBeInTheDocument();
    },
  );

  // [review] L4: Pins the access wait: a spinner while the outlines that decide access are loading, focus on the empty state once access resolves, and accessible groups that render without waiting for other courses. AC "The panel does not look empty while it re-scopes".
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b9cf945ca73eaecee43265981f30964997f44469d0f4191776a0d1a5860b7846R156
  it('renders a loading state, not the empty state, while course outlines that decide access are still loading', () => {
    renderList({
      groupsQuery: loadedPopulatedGroupsQuery,
      profileQuery: loadedProfileQuery,
      index: buildCompetencyCriteriaGroupsIndex(populatedGroupsResponse),
      systemDefaultProfile,
      accessibleCourseGroups: [],
      isCourseAccessResolved: false,
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('No content associated.')).not.toBeInTheDocument();
  });

  it('takes keyboard focus on the empty state once course access resolves, when a request was waiting', () => {
    const consumeKeyboardFocusRequest = jest.fn();
    const value = {
      groupsQuery: loadedEmptyGroupsQuery,
      profileQuery: loadedProfileQuery,
      index: buildCompetencyCriteriaGroupsIndex(emptyGroupsResponse),
      systemDefaultProfile,
      accessibleCourseGroups: [],
      keyboardFocusRequest: { kind: 'empty' } as const,
      consumeKeyboardFocusRequest,
    };
    const { rerender } = render(
      <MockCompetencyAssociationsProvider value={{ ...value, isCourseAccessResolved: false }}>
        <CourseGroupList />
      </MockCompetencyAssociationsProvider>,
    );
    expect(consumeKeyboardFocusRequest).not.toHaveBeenCalled();

    rerender(
      <MockCompetencyAssociationsProvider value={{ ...value, isCourseAccessResolved: true }}>
        <CourseGroupList />
      </MockCompetencyAssociationsProvider>,
    );

    expect(screen.getByText('No content associated.').parentElement).toHaveFocus();
    expect(consumeKeyboardFocusRequest).toHaveBeenCalledTimes(1);
  });

  it('renders the accessible course group sections without waiting on other courses\' outlines', async () => {
    const index = buildCompetencyCriteriaGroupsIndex(populatedGroupsResponse);
    renderList({
      groupsQuery: loadedPopulatedGroupsQuery,
      profileQuery: loadedProfileQuery,
      index,
      systemDefaultProfile,
      accessibleCourseGroups: index.courseGroups,
      isCourseAccessResolved: false,
    });
    expect(await screen.findByText('course-v1:OrgX+CS101+2024')).toBeInTheDocument();
  });

  it('renders course group sections for every accessible course-level group', async () => {
    const index = buildCompetencyCriteriaGroupsIndex(populatedGroupsResponse);
    renderList({
      groupsQuery: loadedPopulatedGroupsQuery,
      profileQuery: loadedProfileQuery,
      index,
      systemDefaultProfile,
      accessibleCourseGroups: index.courseGroups,
    });
    expect(screen.queryByText('No content associated.')).not.toBeInTheDocument();
    // The outline isn't mocked here, so it degrades to the raw course id via
    // its defensive fallback - enough to prove a real `CourseGroupSection`
    // was mounted.
    expect(await screen.findByText('course-v1:OrgX+CS101+2024')).toBeInTheDocument();
  });

  it('takes keyboard focus on the empty state when a request asks for it, then consumes the request', () => {
    const consumeKeyboardFocusRequest = jest.fn();
    renderList({
      groupsQuery: loadedEmptyGroupsQuery,
      profileQuery: loadedProfileQuery,
      index: buildCompetencyCriteriaGroupsIndex(emptyGroupsResponse),
      systemDefaultProfile,
      accessibleCourseGroups: [],
      keyboardFocusRequest: { kind: 'empty' },
      consumeKeyboardFocusRequest,
    });

    expect(screen.getByText('No content associated.').parentElement).toHaveFocus();
    expect(consumeKeyboardFocusRequest).toHaveBeenCalledTimes(1);
  });

  it('leaves the empty state unfocused without a request', () => {
    renderList({
      groupsQuery: loadedEmptyGroupsQuery,
      profileQuery: loadedProfileQuery,
      index: buildCompetencyCriteriaGroupsIndex(emptyGroupsResponse),
      systemDefaultProfile,
      accessibleCourseGroups: [],
    });

    expect(screen.getByText('No content associated.').parentElement).not.toHaveFocus();
  });

  // [review] L2: Pins the empty state under scoping: it shows for every count combination, and it does not show while a query is pending or failed. AC "A competency with no associations anywhere" and AC "The associations fail to load for the courses now listed".
  // [review] Note: AC "Associations exist, but none in the courses currently listed" asks for a second message naming the out-of-view count. The first set of cases below asserts the single existing message for 0 of 1 and 1 of 3.
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-b9cf945ca73eaecee43265981f30964997f44469d0f4191776a0d1a5860b7846R254
  describe('the empty state when no associations are in the listed courses', () => {
    const noAssociationsMessage = 'No content associated.';
    const noAssociationsPromptMessage = 'Make content selections to associate this competency with course content.';

    /** The component ignores the counts, so the empty arrays here needn't agree with them. */
    const buildCountsResponse = (criteriaCount: number, totalCriteriaCount: number) => ({
      ...emptyGroupsResponse,
      criteriaCount,
      totalCriteriaCount,
    });

    const renderEmptyList = (
      data: CompetencyCriteriaGroupsResponse,
      overrides: Parameters<typeof buildMockCompetencyAssociationsContextValue>[0] = {},
    ) =>
      renderList({
        groupsQuery: buildQueryResult<CompetencyCriteriaGroupsResponse>({ data }),
        profileQuery: loadedProfileQuery,
        index: buildCompetencyCriteriaGroupsIndex(data),
        systemDefaultProfile,
        accessibleCourseGroups: [],
        ...overrides,
      });

    it.each([
      { criteriaCount: 0, totalCriteriaCount: 0 },
      // Some of the competency's criteria are in courses not listed.
      { criteriaCount: 0, totalCriteriaCount: 1 },
      { criteriaCount: 1, totalCriteriaCount: 3 },
      // The listed courses hold every criterion, but none of those courses is accessible.
      { criteriaCount: 2, totalCriteriaCount: 2 },
    ])(
      'shows the no-associations messages when criteriaCount is $criteriaCount of totalCriteriaCount '
        + '$totalCriteriaCount',
      ({ criteriaCount, totalCriteriaCount }) => {
        renderEmptyList(buildCountsResponse(criteriaCount, totalCriteriaCount));
        expect(screen.getByText(noAssociationsMessage)).toBeInTheDocument();
        expect(screen.getByText(noAssociationsPromptMessage)).toBeInTheDocument();
      },
    );

    it.each([
      { state: 'the groups query is pending', overrides: { groupsQuery: loadingGroupsQuery } },
      { state: 'the groups query waits for course keys', overrides: { groupsQuery: awaitingCourseKeysGroupsQuery } },
      { state: 'the default-rule-profile query is pending', overrides: { profileQuery: loadingProfileQuery } },
      { state: 'course access is resolving', overrides: { isCourseAccessResolved: false } },
      { state: 'the groups query errored', overrides: { groupsQuery: erroredGroupsQuery } },
      { state: 'the default-rule-profile query errored', overrides: { profileQuery: erroredProfileQuery } },
    ])('shows no empty state while $state', ({ overrides }) => {
      renderEmptyList(buildCountsResponse(1, 3), overrides);
      expect(screen.queryByText(noAssociationsMessage)).not.toBeInTheDocument();
      expect(screen.queryByText(noAssociationsPromptMessage)).not.toBeInTheDocument();
    });
  });
});
