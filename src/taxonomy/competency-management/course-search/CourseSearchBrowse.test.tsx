// [review] Comment on this file in the original PR: https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-4f34a6535c56201720da8c31df2b225a543e6ca075ccf1ef1d99f4067f26f5c4
// [review] L2 tests the panel scoping to the listed courses. L3 tests the summary line. L4 tests that the panel never reads as empty while course access resolves and that selection waits for the data.
import {
  act,
  fireEvent,
  initializeMocks,
  render,
  screen,
  waitFor,
  within,
} from '@src/testUtils';
import { isEqual, uniqBy } from 'lodash';
import { getApiBaseUrl, type Course } from '@src/studio-home/data/api';
import { getCourseOutlineIndexApiUrl } from '@src/course-outline/data';
import { buildOutlineIndex } from '@src/course-outline/__mocks__';
import { CompetencyAssociationsProvider } from '../CompetencyAssociationsContext';
import { apiUrls as competencyManagementApiUrls } from '../data/api';
import type { CompetencyTreeNode } from '../CompetencyTree';
import CourseRow from './CourseRow';
import CourseSearchBrowse from './CourseSearchBrowse';

let axiosMock;

const coursesApiUrl = `${getApiBaseUrl()}/api/contentstore/v2/home/courses`;

const activeCompetency: CompetencyTreeNode = { id: 1, value: 'Test Competency' };

const buildCourse = (overrides: Partial<Course> = {}): Course => ({
  courseKey: 'course-v1:OrgX+CS101+2024',
  displayName: 'Intro to Testing',
  lmsLink: null,
  number: 'CS101',
  org: 'OrgX',
  rerunLink: null,
  run: '2024',
  url: '/course/course-v1:OrgX+CS101+2024',
  ...overrides,
});

const buildResponse = (courses: Course[], numPages: number = 1) => ({
  results: { courses },
  numPages,
  count: courses.length,
});

// [review] L2: `isCourseListRequest` and its params constant are needed by the scoping cases below. Forward reference: the accessible-count request they exclude, and its handler, are added in L3.
// [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-4f34a6535c56201720da8c31df2b225a543e6ca075ccf1ef1d99f4067f26f5c4R45
/** The params of the summary line's unfiltered accessible-course-count request, which hits the same endpoint. */
const accessibleCoursesCountParams = { page_size: 1 };

/** A request for a page of the course list itself, not the accessible-course-count one. */
const isCourseListRequest = (req: { url?: string; params?: unknown; }) => (
  req.url === coursesApiUrl && !isEqual(req.params, accessibleCoursesCountParams)
);

// Scoped to the course list's own requests: `axiosMock.history.get` also holds
// `CompetencyAssociationsProvider`'s requests and the accessible-course-count one.
const lastRequestParams = () => {
  const courseRequests = axiosMock.history.get.filter((req) => req.url === coursesApiUrl);
  return courseRequests[courseRequests.length - 1].params;
};

/** A promise-backed reply the test settles itself, to hold a request in flight. */
const deferredReply = () => {
  let settle: (reply: [number, unknown]) => void = () => {};
  const promise = new Promise<[number, unknown]>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
};

const courseSearchBrowseTree = (competency: CompetencyTreeNode = activeCompetency) => (
  <CompetencyAssociationsProvider
    tagId={Number(competency.id)}
    competencyName={competency.value}
    competencyExternalId={null}
  >
    <CourseSearchBrowse activeCompetency={competency} />
  </CompetencyAssociationsProvider>
);

const renderCourseSearchBrowse = () => render(courseSearchBrowseTree());

const renderCourseRow = (course: Course) =>
  render(
    <CompetencyAssociationsProvider
      tagId={Number(activeCompetency.id)}
      competencyName={activeCompetency.value}
      competencyExternalId={null}
    >
      <CourseRow course={course} />
    </CompetencyAssociationsProvider>,
  );

describe('<CourseSearchBrowse /> and <CourseRow />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    ({ axiosMock } = initializeMocks());
    // The associations section mounts alongside the course list and fires
    // its own requests; mocked here to the empty-associations shape so
    // tests that don't care about it aren't left in a loading state.
    axiosMock.onGet(competencyManagementApiUrls.competencyCriteriaGroups(Number(activeCompetency.id)))
      .reply(200, { groups: [], criteria: [] });
    axiosMock.onGet(competencyManagementApiUrls.defaultCompetencyRuleProfile())
      .reply(200, {
        count: 1,
        next: null,
        previous: null,
        results: [{
          id: 1,
          scope_type: 'system_default',
          rule_type: 'grade',
          rule_payload: { op: 'gte', value: 0.7, scale: 'percent' },
          archived: false,
        }],
      });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('<CourseSearchBrowse />', () => {
    it(
      'renders the active competency\'s name in the "Demonstrate Mastery For" line, and the '
        + 'empty-associations state once the associations queries resolve',
      async () => {
        axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()]));
        renderCourseSearchBrowse();

        expect(await screen.findByText('Demonstrate Mastery For Test Competency')).toBeInTheDocument();
        expect(await screen.findByText('No content associated.')).toBeInTheDocument();
        expect(
          screen.getByText('Make content selections to associate this competency with course content.'),
        ).toBeInTheDocument();
      },
    );

    it('renders course rows once the request resolves, and paginates on page-button click', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()], 2));
      renderCourseSearchBrowse();

      // Scoped to the "Courses & Content" list itself: the associations
      // section above it (mocked in `beforeEach`) briefly shows its own
      // loading spinner too, so an unscoped `getByRole('status')` would see
      // two.
      const coursesContainer = screen.getByText('Courses & Content').closest(
        '.course-search-browse__container',
      ) as HTMLElement;
      expect(within(coursesContainer).getByRole('status')).toBeInTheDocument();
      expect(await screen.findByText('Intro to Testing')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

      await waitFor(() => {
        expect(lastRequestParams()).toMatchObject({ page: 2 });
      });
    });

    it('renders an inline error, not the empty state, when the request fails', async () => {
      axiosMock.onGet(coursesApiUrl).reply(500);
      renderCourseSearchBrowse();

      expect(await screen.findByText('There was a problem loading courses. Please try again.'))
        .toBeInTheDocument();
      expect(screen.queryByText('You do not have access to any courses.')).not.toBeInTheDocument();
      expect(screen.queryByText('No courses match your search.')).not.toBeInTheDocument();
    });

    it('shows distinct empty-result messages for no search vs. a search value, and clears the search on demand', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([]));
      renderCourseSearchBrowse();

      expect(await screen.findByText('You do not have access to any courses.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

      const searchBox = screen.getByRole('searchbox');
      fireEvent.change(searchBox, { target: { value: 'nonexistent' } });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      expect(await screen.findByText('No courses match your search.')).toBeInTheDocument();
      expect(screen.queryByText('You do not have access to any courses.')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

      await waitFor(() => expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe(''));
      await waitFor(() => {
        expect(lastRequestParams()).toMatchObject({ search: '' });
      });
    });

    it('shows the "no matching courses" message, not "no accessible courses", when only a date filter (no search text) narrows the results to zero', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()]));
      renderCourseSearchBrowse();
      await screen.findByText('Intro to Testing');

      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([]));
      fireEvent.click(screen.getByLabelText('Start Date'));
      const startDay = screen.getByText('10').closest('.react-datepicker__day') as HTMLElement;
      fireEvent.click(startDay);

      // No search text is active here - only the date filter - so the
      // narrowed-by-a-filter wording is the correct one, not the
      // no-filters-at-all "no accessible courses" wording.
      expect(await screen.findByText('No courses match your search.')).toBeInTheDocument();
      expect(screen.queryByText('You do not have access to any courses.')).not.toBeInTheDocument();
    });

    it('debounces the search field by 400ms and resets the page back to 1', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()], 3));
      renderCourseSearchBrowse();
      await screen.findByText('Intro to Testing');

      // Move off page 1 first, so the reset back to page 1 below is observable.
      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
      await waitFor(() => {
        expect(lastRequestParams()).toMatchObject({ page: 2 });
      });

      const requestCountBeforeTyping = axiosMock.history.get.length;
      const searchBox = screen.getByRole('searchbox');
      fireEvent.change(searchBox, { target: { value: 'physics' } });

      act(() => {
        jest.advanceTimersByTime(399);
      });
      expect(axiosMock.history.get).toHaveLength(requestCountBeforeTyping);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      await waitFor(() => {
        expect(axiosMock.history.get.length).toBeGreaterThan(requestCountBeforeTyping);
      });

      // Exactly one request: an intermediate one pairing the new search
      // with the old page would mean the two were reset in separate renders.
      const requestsSinceTyping = axiosMock.history.get.slice(requestCountBeforeTyping);
      expect(requestsSinceTyping).toHaveLength(1);
      expect(requestsSinceTyping[0].params).toMatchObject({ search: 'physics', page: 1 });
    });

    it('keeps an active search filter in the request when only the page changes', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()], 3));
      renderCourseSearchBrowse();
      await screen.findByText('Intro to Testing');

      const searchBox = screen.getByRole('searchbox');
      fireEvent.change(searchBox, { target: { value: 'physics' } });
      act(() => {
        jest.advanceTimersByTime(400);
      });
      await waitFor(() => {
        expect(lastRequestParams()).toMatchObject({ search: 'physics', page: 1 });
      });
      // The request firing (checked above) doesn't mean the response has
      // been processed and re-rendered yet - wait for the page controls
      // themselves, so the click below lands once they're actually there.
      const pageTwoButton = await screen.findByRole('button', { name: 'Page 2' });

      // Changing the page alone must not drop the still-active search filter.
      fireEvent.click(pageTwoButton);
      await waitFor(() => {
        expect(lastRequestParams()).toMatchObject({ search: 'physics', page: 2 });
      });
    });

    it('sends start_date_on_or_after when a start date is picked in the range calendar, and resets the page back to 1', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()], 3));
      renderCourseSearchBrowse();
      await screen.findByText('Intro to Testing');

      // Move off page 1 first, so the reset back to page 1 below is observable.
      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
      await waitFor(() => {
        expect(lastRequestParams()).toMatchObject({ page: 2 });
      });

      const requestCountBeforeChange = axiosMock.history.get.length;
      // Open the range calendar and pick a single day - react-datepicker's
      // `selectsRange` fires `onChange` as `[start, null]` immediately after
      // this first click, before any second (end) day is ever picked.
      fireEvent.click(screen.getByLabelText('Start Date'));
      const startDay = screen.getByText('10').closest('.react-datepicker__day') as HTMLElement;
      fireEvent.click(startDay);

      await waitFor(() => {
        expect(axiosMock.history.get.length).toBeGreaterThan(requestCountBeforeChange);
      });

      // Exactly one request: an intermediate one pairing the new date with
      // the old page would mean the two were reset in separate renders.
      const requestsSinceChange = axiosMock.history.get.slice(requestCountBeforeChange);
      expect(requestsSinceChange).toHaveLength(1);
      // Plain `YYYY-MM-DD`: the backend's `get_date_param` 400s on anything else.
      expect(requestsSinceChange[0].params.start_date_on_or_after).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(requestsSinceChange[0].params.start_date_on_or_before).toBeUndefined();
      expect(requestsSinceChange[0].params).toMatchObject({ page: 1 });
    });

    it('sends both start_date_on_or_after and start_date_on_or_before once an end date is also picked', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()], 3));
      renderCourseSearchBrowse();
      await screen.findByText('Intro to Testing');

      fireEvent.click(screen.getByLabelText('Start Date'));
      const startDay = screen.getByText('10').closest('.react-datepicker__day') as HTMLElement;
      fireEvent.click(startDay);
      await waitFor(() => {
        expect(lastRequestParams().start_date_on_or_before).toBeUndefined();
      });

      const requestCountBeforeChange = axiosMock.history.get.length;
      const endDay = screen.getByText('20').closest('.react-datepicker__day') as HTMLElement;
      fireEvent.click(endDay);

      await waitFor(() => {
        expect(axiosMock.history.get.length).toBeGreaterThan(requestCountBeforeChange);
      });

      const requestsSinceChange = axiosMock.history.get.slice(requestCountBeforeChange);
      expect(requestsSinceChange).toHaveLength(1);
      expect(requestsSinceChange[0].params.start_date_on_or_after).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(requestsSinceChange[0].params.start_date_on_or_before).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('omits start_date_on_or_after and start_date_on_or_before from the request when neither date is set', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([buildCourse()]));
      renderCourseSearchBrowse();
      await screen.findByText('Intro to Testing');

      // The mock adapter records params before axios serializes them, so an
      // `undefined` value (the key axios's serializer drops) is still
      // distinguishable here from `''` (sent as an empty query param).
      expect(lastRequestParams().start_date_on_or_after).toBeUndefined();
      expect(lastRequestParams().start_date_on_or_before).toBeUndefined();
    });
  });

  // [review] L2: Pins the panel scoping: the groups request carries the listed keys in list order, also as an empty value, a page, search or date change starts a new request and drops the old groups, returning to a page restores its group, and a loading or failed course list or groups request never reads as empty. ACs "The associations panel opens scoped to the courses first listed", "Turning to another page of courses re-scopes the associations panel", "Searching or changing the date filter re-scopes the associations panel", "An association outside the listed courses comes back when its course is listed again", "The associations fail to load for the courses now listed" and "The course list fails to load".
  // [review] https://github.com/AShatsila/frontend-app-authoring/pull/6/files#diff-4f34a6535c56201720da8c31df2b225a543e6ca075ccf1ef1d99f4067f26f5c4R686
  describe('scoping the associations to the listed courses', () => {
    const tagId = Number(activeCompetency.id);
    const groupsUrl = competencyManagementApiUrls.competencyCriteriaGroups(tagId);
    const courseA = buildCourse({ courseKey: 'course-v1:OrgX+CSA+2024', displayName: 'Course A' });
    const courseB = buildCourse({ courseKey: 'course-v1:OrgX+CSB+2024', displayName: 'Course B' });
    const courseC = buildCourse({ courseKey: 'course-v1:OrgX+CSC+2024', displayName: 'Course C' });
    const emptyMessage = 'No content associated.';

    const groupsRequests = () => axiosMock.history.get.filter((req) => req.url === groupsUrl);

    /** Course A's and B's criteria together: the total a response scoped to either course alone still reports. */
    const criteriaAcrossBothCourses = 2;

    /** One course-level group for `course`, holding one leaf group with one criterion, in wire (snake_case) form. */
    const buildGroupsResponse = (course: Course, courseGroupId: number, totalCriteriaCount = 1) => ({
      groups: [
        {
          id: 500,
          parent_id: null,
          tag_id: tagId,
          course_key: null,
          name: 'root',
          ordering: 0,
          logic_operator: 'AND',
          archived: false,
        },
        {
          id: courseGroupId,
          parent_id: 500,
          tag_id: tagId,
          course_key: course.courseKey,
          name: 'course',
          ordering: 0,
          logic_operator: 'AND',
          archived: false,
        },
        {
          id: courseGroupId * 10,
          parent_id: courseGroupId,
          tag_id: tagId,
          course_key: null,
          name: 'leaf',
          ordering: 0,
          logic_operator: 'AND',
          archived: false,
        },
      ],
      criteria: [{
        id: courseGroupId * 100,
        object_id: `sub-${courseGroupId}`,
        group_id: courseGroupId * 10,
        rule_profile_id: 1,
        rule_type_override: null,
        rule_payload_override: null,
      }],
      criteria_count: 1,
      total_criteria_count: totalCriteriaCount,
    });

    /** Several `buildGroupsResponse` payloads as one response, listing their shared root group once. */
    const combineGroupsResponses = (...responses: ReturnType<typeof buildGroupsResponse>[]) => {
      const criteria = responses.flatMap((response) => response.criteria);
      return {
        groups: uniqBy(responses.flatMap((response) => response.groups), 'id'),
        criteria,
        criteria_count: criteria.length,
        total_criteria_count: criteria.length,
      };
    };

    /** No groups or criteria in the listed courses, while the competency has `totalCriteriaCount` across the instance. */
    const buildEmptyGroupsResponse = (totalCriteriaCount: number) => ({
      groups: [],
      criteria: [],
      criteria_count: 0,
      total_criteria_count: totalCriteriaCount,
    });

    /** The outline names the course differently from its course-list row, so a course group's header is findable apart from that row. */
    const outlineNameOf = (course: Course) => `${course.displayName} outline`;
    const buildOutline = (course: Course) =>
      buildOutlineIndex({
        overrides: { courseStructure: { displayName: outlineNameOf(course) } },
      });

    /** Records whether `text` is ever added to the page, so a message that flashes between assertions is still caught. */
    const watchForText = (text: string) => {
      let seen = false;
      const check = (records: MutationRecord[]) => {
        seen = seen || records.some((record) => (
          Array.from(record.addedNodes).some((node) => node.textContent?.includes(text))
        ));
      };
      const observer = new MutationObserver(check);
      observer.observe(document.body, { childList: true, subtree: true });
      return {
        wasSeen: () => {
          check(observer.takeRecords());
          return seen;
        },
        stop: () => observer.disconnect(),
      };
    };

    beforeEach(() => {
      // jsdom has no layout; a sole group gets auto-focused, and its rule box scrolls itself into view.
      Element.prototype.scrollIntoView = jest.fn();
    });

    const associationsSection = () =>
      screen.getByText('Competency Criteria Associations').closest(
        '.course-search-browse__associations',
      ) as HTMLElement;

    it('sends no groups request until the course list loads, then one carrying its keys in list order', async () => {
      // Deliberately out of alphabetical order, so any sort on the way out would show.
      const listedCourses = [courseC, courseA, courseB];
      const coursesReply = deferredReply();
      axiosMock.onGet(coursesApiUrl).reply(() => coursesReply.promise);
      renderCourseSearchBrowse();

      await waitFor(() => {
        expect(axiosMock.history.get.some(isCourseListRequest)).toBe(true);
      });
      expect(groupsRequests()).toHaveLength(0);

      await act(async () => {
        coursesReply.settle([200, buildResponse(listedCourses)]);
      });
      expect(await screen.findByText('Course C')).toBeInTheDocument();

      await waitFor(() => expect(groupsRequests()).toHaveLength(1));
      expect(groupsRequests()[0].params).toEqual({
        course_keys: listedCourses.map((course) => course.courseKey).join(','),
      });
    });

    it('still sends course_keys, as an empty value, for an empty page', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([]));
      axiosMock.onGet(groupsUrl).reply(200, buildEmptyGroupsResponse(0));
      renderCourseSearchBrowse();

      expect(await screen.findByText('You do not have access to any courses.')).toBeInTheDocument();
      await waitFor(() => expect(groupsRequests()).toHaveLength(1));
      expect(groupsRequests()[0].params).toEqual({ course_keys: '' });
      expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
    });

    it('shows the empty state for an empty page, even when the competency has associations elsewhere', async () => {
      axiosMock.onGet(coursesApiUrl).reply(200, buildResponse([]));
      axiosMock.onGet(groupsUrl).reply(200, buildEmptyGroupsResponse(criteriaAcrossBothCourses));
      renderCourseSearchBrowse();

      expect(await screen.findByText('You do not have access to any courses.')).toBeInTheDocument();
      expect(await within(associationsSection()).findByText(emptyMessage)).toBeInTheDocument();
    });

    it('keeps nothing from the previous page once a page change has loaded', async () => {
      axiosMock.onGet(coursesApiUrl).reply((
        config,
      ) => [200, buildResponse(config.params.page === 2 ? [courseB] : [courseA], 2)]);
      axiosMock.onGet(groupsUrl).reply((config) => [
        200,
        config.params.course_keys === courseB.courseKey
          ? buildGroupsResponse(courseB, 2, criteriaAcrossBothCourses)
          : buildGroupsResponse(courseA, 1, criteriaAcrossBothCourses),
      ]);
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseB.courseKey)).reply(200, buildOutline(courseB));
      renderCourseSearchBrowse();
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

      expect(await screen.findByText(outlineNameOf(courseB))).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseA))).not.toBeInTheDocument();
      expect(screen.queryByText('Course A')).not.toBeInTheDocument();
      expect(groupsRequests()[groupsRequests().length - 1].params).toEqual({ course_keys: courseB.courseKey });
    });

    it('re-scopes the groups request to the narrowed list once a search has debounced', async () => {
      axiosMock.onGet(coursesApiUrl).reply((config) => [
        200,
        buildResponse(config.params.search === 'Course A' ? [courseA] : [courseA, courseB]),
      ]);
      axiosMock.onGet(groupsUrl).reply((config) => [
        200,
        config.params.course_keys === courseA.courseKey
          ? buildGroupsResponse(courseA, 1, criteriaAcrossBothCourses)
          : combineGroupsResponses(buildGroupsResponse(courseA, 1), buildGroupsResponse(courseB, 2)),
      ]);
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseB.courseKey)).reply(200, buildOutline(courseB));
      renderCourseSearchBrowse();
      expect(await screen.findByText(outlineNameOf(courseB))).toBeInTheDocument();
      expect(screen.getByText(outlineNameOf(courseA))).toBeInTheDocument();

      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Course A' } });
      act(() => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => expect(groupsRequests()).toHaveLength(2));
      expect(groupsRequests()[1].params).toEqual({ course_keys: courseA.courseKey });
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseB))).not.toBeInTheDocument();
    });

    it('re-scopes the groups request to the narrowed list once a start date is picked', async () => {
      axiosMock.onGet(coursesApiUrl).reply((config) => [
        200,
        buildResponse(config.params.start_date_on_or_after ? [courseA] : [courseA, courseB]),
      ]);
      axiosMock.onGet(groupsUrl).reply((config) => [
        200,
        config.params.course_keys === courseA.courseKey
          ? buildGroupsResponse(courseA, 1, criteriaAcrossBothCourses)
          : combineGroupsResponses(buildGroupsResponse(courseA, 1), buildGroupsResponse(courseB, 2)),
      ]);
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseB.courseKey)).reply(200, buildOutline(courseB));
      renderCourseSearchBrowse();
      expect(await screen.findByText(outlineNameOf(courseB))).toBeInTheDocument();
      expect(screen.getByText(outlineNameOf(courseA))).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Start Date'));
      const startDay = screen.getByText('10').closest('.react-datepicker__day') as HTMLElement;
      fireEvent.click(startDay);

      await waitFor(() => expect(groupsRequests()).toHaveLength(2));
      expect(groupsRequests()[1].params).toEqual({ course_keys: courseA.courseKey });
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseB))).not.toBeInTheDocument();
    });

    it('shows a page\'s Course Group again, unchanged, on returning to that page', async () => {
      axiosMock.onGet(coursesApiUrl).reply((
        config,
      ) => [200, buildResponse(config.params.page === 2 ? [courseB] : [courseA], 2)]);
      axiosMock.onGet(groupsUrl).reply((config) => [
        200,
        config.params.course_keys === courseB.courseKey
          ? buildGroupsResponse(courseB, 2, criteriaAcrossBothCourses)
          : buildGroupsResponse(courseA, 1, criteriaAcrossBothCourses),
      ]);
      // Names the subsection behind Course A's one criterion (`sub-1`), so its chip is identifiable.
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(
        200,
        buildOutlineIndex({
          sections: [{ id: 'section-a', displayName: 'Section A', children: [{ id: 'sub-1', displayName: 'Quiz A' }] }],
          overrides: { courseStructure: { displayName: outlineNameOf(courseA) } },
        }),
      );
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseB.courseKey)).reply(200, buildOutline(courseB));
      renderCourseSearchBrowse();

      /** Course A's Course Group holds exactly one leaf group, holding one rule box with the "Quiz A" chip. */
      const expectCourseAGroup = () => {
        const courseGroup = screen.getByText(outlineNameOf(courseA)).closest('.course-group-section') as HTMLElement;
        const leafGroup = within(courseGroup).getByRole('group', { name: 'Rule group' });
        const ruleBox = within(leafGroup).getByRole('group', { name: 'Rule: 70% or higher' });
        expect(within(ruleBox).getByText('Quiz A')).toBeInTheDocument();
      };

      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();
      expectCourseAGroup();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
      expect(await screen.findByText(outlineNameOf(courseB))).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseA))).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 1' }));
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseB))).not.toBeInTheDocument();
      expectCourseAGroup();
    });

    it('drops the previous page\'s Course Groups once the next page\'s courses fail to load', async () => {
      axiosMock.onGet(coursesApiUrl).reply((config) => (
        config.params.page === 2 ? [500] : [200, buildResponse([courseA], 2)]
      ));
      axiosMock.onGet(groupsUrl).reply(200, buildGroupsResponse(courseA, 1));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      renderCourseSearchBrowse();
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

      expect(await screen.findByText('There was a problem loading courses. Please try again.')).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseA))).not.toBeInTheDocument();
    });

    it('shows the associations error, and no empty-associations message, when the next page\'s groups fail to load', async () => {
      axiosMock.onGet(coursesApiUrl).reply((
        config,
      ) => [200, buildResponse(config.params.page === 2 ? [courseB] : [courseA], 2)]);
      axiosMock.onGet(groupsUrl).reply((config) => (
        config.params.course_keys === courseB.courseKey
          ? [500]
          : [200, buildGroupsResponse(courseA, 1, criteriaAcrossBothCourses)]
      ));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      renderCourseSearchBrowse();
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();

      const emptyMessageWatch = watchForText(emptyMessage);
      try {
        fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

        expect(
          await within(associationsSection()).findByText(
            'There was a problem loading this competency\'s associations. Please try again.',
          ),
        ).toBeInTheDocument();
        expect(groupsRequests()[groupsRequests().length - 1].params).toEqual({ course_keys: courseB.courseKey });
        expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
        expect(screen.queryByText(outlineNameOf(courseA))).not.toBeInTheDocument();
        expect(emptyMessageWatch.wasSeen()).toBe(false);
      } finally {
        emptyMessageWatch.stop();
      }
    });

    it('sends no groups request, and shows only the header lines, when the first courses request fails', async () => {
      axiosMock.onGet(coursesApiUrl).reply(500);
      // Would show a Course Group if the section ever asked for one.
      axiosMock.onGet(groupsUrl).reply(200, buildGroupsResponse(courseA, 1));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      renderCourseSearchBrowse();

      expect(await screen.findByText('There was a problem loading courses. Please try again.')).toBeInTheDocument();
      expect(groupsRequests()).toHaveLength(0);
      const section = associationsSection();
      expect(within(section).getByText('Demonstrate Mastery For Test Competency')).toBeInTheDocument();
      expect(within(section).queryByRole('status')).not.toBeInTheDocument();
      expect(within(section).queryByText(outlineNameOf(courseA))).not.toBeInTheDocument();
      expect(within(section).queryByText(emptyMessage)).not.toBeInTheDocument();
    });

    it('shows a spinner, not the previous page\'s Course Groups, while the next page\'s courses load', async () => {
      const page2CoursesReply = deferredReply();
      axiosMock.onGet(coursesApiUrl).reply((config) => (
        config.params.page === 2 ? page2CoursesReply.promise : [200, buildResponse([courseA], 2)]
      ));
      axiosMock.onGet(groupsUrl).reply(200, buildGroupsResponse(courseA, 1));
      axiosMock.onGet(getCourseOutlineIndexApiUrl(courseA.courseKey)).reply(200, buildOutline(courseA));
      renderCourseSearchBrowse();
      expect(await screen.findByText(outlineNameOf(courseA))).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

      await waitFor(() => {
        expect(axiosMock.history.get.some((req) => req.url === coursesApiUrl && req.params.page === 2)).toBe(true);
      });
      expect(within(associationsSection()).getByRole('status')).toBeInTheDocument();
      expect(screen.queryByText(outlineNameOf(courseA))).not.toBeInTheDocument();
    });
  });

  describe('<CourseRow />', () => {
    it('toggles expansion only via its disclosure control, and title clicks do nothing', async () => {
      const course = buildCourse();
      const outlineSectionHeading = 'Section 1';
      axiosMock.onGet(getCourseOutlineIndexApiUrl(course.courseKey)).reply(
        200,
        buildOutlineIndex({
          sections: [
            {
              id: 'section-1',
              displayName: outlineSectionHeading,
              children: [
                { id: 'sub-1a', displayName: 'Subsection 1A', overrides: { graded: true } },
              ],
            },
          ],
        }),
      );
      renderCourseRow(course);

      expect(screen.queryByText(outlineSectionHeading)).not.toBeInTheDocument();

      const expandButton = screen.getByRole('button', { name: 'Expand' });
      expect(expandButton).toHaveAttribute('aria-expanded', 'false');

      // Clicking the row's own title text does nothing - only the disclosure
      // control (asserted below) toggles anything.
      fireEvent.click(screen.getByText(course.displayName));
      expect(screen.queryByText(outlineSectionHeading)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(expandButton);
      const collapseButton = screen.getByRole('button', { name: 'Collapse' });
      expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
      // Expanding now mounts the real CourseOutlineSubtree, which fires a real
      // outline request - wait for it to resolve and render.
      expect(await screen.findByText(outlineSectionHeading)).toBeInTheDocument();

      fireEvent.click(collapseButton);
      expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText(outlineSectionHeading)).not.toBeInTheDocument();
    });
  });
});
