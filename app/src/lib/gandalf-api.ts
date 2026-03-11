import { TokenExpiredError, NetworkError, ApiError } from './errors';

const GANDALF_BASE = '/api';

interface AjaxRequest {
  index: number;
  methodname: string;
  args: Record<string, unknown>;
}

interface AjaxResponseSuccess<T> {
  error: false;
  data: T;
}

interface AjaxResponseError {
  error: true;
  exception: {
    message: string;
    errorcode: string;
  };
}

type AjaxResponse<T> = AjaxResponseSuccess<T> | AjaxResponseError;

export class GandalfAPI {
  private sessionToken: string;
  private sesskey: string | null = null;

  constructor(sessionToken: string) {
    this.sessionToken = sessionToken;
  }

  async init(): Promise<{ userid: number; sesskey: string }> {
    let res: Response;
    try {
      res = await fetch(`${GANDALF_BASE}/my/`, {
        headers: { 'X-Moodle-Session': this.sessionToken },
      });
    } catch {
      throw new NetworkError('Impossible de contacter Gandalf. Vérifiez votre connexion.');
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new TokenExpiredError('gandalf');
      }
      throw new ApiError(res.status, `Gandalf error: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();

    const sesskeyMatch = html.match(/"sesskey":"([^"]+)"/);
    const useridMatch = html.match(/data-userid="(\d+)"/) || html.match(/"userid":(\d+)/);

    if (!sesskeyMatch || !useridMatch) {
      throw new TokenExpiredError('gandalf');
    }

    this.sesskey = sesskeyMatch[1];
    return {
      userid: parseInt(useridMatch[1]),
      sesskey: this.sesskey,
    };
  }

  private async call<T>(methodname: string, args: Record<string, unknown> = {}): Promise<T> {
    if (!this.sesskey) {
      throw new Error('API not initialized. Call init() first.');
    }

    const body: AjaxRequest[] = [{ index: 0, methodname, args }];

    let res: Response;
    try {
      res = await fetch(
        `${GANDALF_BASE}/lib/ajax/service.php?sesskey=${this.sesskey}&info=${methodname}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Moodle-Session': this.sessionToken,
          },
          body: JSON.stringify(body),
        }
      );
    } catch {
      throw new NetworkError('Impossible de contacter Gandalf. Vérifiez votre connexion.');
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new TokenExpiredError('gandalf');
      }
      throw new ApiError(res.status, `Gandalf API error: ${res.status} ${res.statusText}`);
    }

    // Moodle may return HTML login page instead of JSON when session expires
    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new TokenExpiredError('gandalf');
    }

    const json: AjaxResponse<T>[] = await res.json();
    const result = json[0];

    if (result.error) {
      const code = result.exception.errorcode;
      if (code === 'invalidtoken' || code === 'servicerequireslogin' || code === 'requireloginerror') {
        throw new TokenExpiredError('gandalf');
      }
      throw new ApiError(0, `Moodle: ${result.exception.message} (${code})`);
    }

    return result.data;
  }

  // ---- User ----

  async getUserProfile(userid: number) {
    const users = await this.call<UserProfile[]>('core_user_get_users_by_field', {
      field: 'id',
      values: [String(userid)],
    });
    return users[0];
  }

  // ---- Courses ----

  async getCourses(classification: CourseClassification = 'all', limit = 50, offset = 0) {
    return this.call<CoursesResponse>('core_course_get_enrolled_courses_by_timeline_classification', {
      classification,
      limit,
      offset,
    });
  }

  async getRecentCourses(limit = 10) {
    return this.call<Course[]>('core_course_get_recent_courses', { limit });
  }

  async getCourseState(courseid: number) {
    const raw = await this.call<string>('core_courseformat_get_state', { courseid });
    return JSON.parse(raw) as CourseState;
  }

  async searchCourses(query: string, page = 0, perpage = 20) {
    return this.call<CourseSearchResponse>('core_course_search_courses', {
      criterianame: 'search',
      criteriavalue: query,
      page,
      perpage,
    });
  }

  // ---- Achievements (Epitech custom plugin) ----

  async getAchievements(courseid: number) {
    return this.call<GradingResult[]>('local_achievement_get_achievement_results', {
      course_id: courseid,
    });
  }

  // ---- Activity Completion ----

  async updateActivityCompletion(cmid: string, completed: boolean) {
    return this.call<{ status: boolean; warnings: unknown[] }>(
      'core_completion_update_activity_completion_status_manually',
      { cmid, completed },
    );
  }

  // ---- Calendar ----

  async getActionEvents(timesortfrom?: number, limitnum = 20) {
    return this.call<EventsResponse>('core_calendar_get_action_events_by_timesort', {
      timesortfrom: timesortfrom ?? Math.floor(Date.now() / 1000) - 86400 * 30,
      limitnum,
    });
  }

  async getEventsByCourse(courseid: number, limitnum = 20) {
    return this.call<EventsResponse>('core_calendar_get_action_events_by_course', {
      courseid,
      timesortfrom: 0,
      limitnum,
    });
  }

  async getEventsByCourses(courseids: number[], timesortfrom = 0, limitnum = 10) {
    return this.call<{ groupedbycourse: EventsResponse[] }>('core_calendar_get_action_events_by_courses', {
      courseids,
      timesortfrom,
      limitnum,
    });
  }

  async getMonthlyCalendar(year: number, month: number) {
    return this.call<MonthlyCalendarResponse>('core_calendar_get_calendar_monthly_view', {
      year,
      month,
    });
  }

  async getDayView(year: number, month: number, day: number) {
    return this.call<CalendarDayResponse>('core_calendar_get_calendar_day_view', {
      year,
      month,
      day,
    });
  }

  async getUpcomingEvents() {
    return this.call<CalendarUpcomingResponse>('core_calendar_get_calendar_upcoming_view', {});
  }

  // ---- Notifications ----

  async getNotifications(userid: number, limit = 20, offset = 0) {
    return this.call<NotificationsResponse>('message_popup_get_popup_notifications', {
      useridto: userid,
      newestfirst: true,
      limit,
      offset,
    });
  }

  // ---- HTML Scraping ----

  async fetchPage(path: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${GANDALF_BASE}${path}`, {
        headers: { 'X-Moodle-Session': this.sessionToken },
      });
    } catch {
      throw new NetworkError('Impossible de contacter Gandalf. Vérifiez votre connexion.');
    }
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new TokenExpiredError('gandalf');
      }
      throw new ApiError(res.status, `Gandalf error: ${res.status} ${res.statusText}`);
    }
    return res.text();
  }

  async getAssignmentDetails(cmid: number): Promise<AssignmentDetails> {
    const html = await this.fetchPage(`/mod/assign/view.php?id=${cmid}`);
    return parseAssignmentPage(html);
  }

  async getModuleFiles(modulePath: string): Promise<ModuleFile[]> {
    const html = await this.fetchPage(modulePath);
    return extractFilesFromHtml(html);
  }

  async downloadFile(path: string): Promise<{ blob: Blob; filename: string }> {
    const res = await fetch(`${GANDALF_BASE}${path}`, {
      headers: { 'X-Moodle-Session': this.sessionToken },
    });
    const blob = await res.blob();
    const nameMatch = path.match(/\/([^/?]+)\?/);
    const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : 'download';
    return { blob, filename };
  }

  // ---- Profile Page Scraping (local_report plugin) ----

  async getProfileProjects(mscYear: 1 | 2 = 1): Promise<ProfileProject[]> {
    // MSc 1 uses /local/report/view.php, MSc 2 uses /local/graph/view.php
    const path = mscYear === 2 ? '/local/graph/view.php' : '/local/report/view.php';
    const html = await this.fetchPage(path);
    return parseProfileProjects(html);
  }
}

// ---- Types ----

export type CourseClassification = 'all' | 'inprogress' | 'past' | 'future' | 'favourites' | 'hidden';

export interface UserProfile {
  id: number;
  username: string;
  fullname: string;
  email: string;
  department: string;
  institution: string;
  idnumber: string;
  firstaccess: number;
  lastaccess: number;
  city: string;
  profileimageurlsmall: string;
  profileimageurl: string;
  customfields: { type: string; value: string; name: string; shortname: string }[];
}

export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  idnumber: string;
  summary: string;
  startdate: number;
  enddate: number;
  visible: boolean;
  fullnamedisplay: string;
  viewurl: string;
  courseimage: string;
  progress: number;
  hasprogress: boolean;
  isfavourite: boolean;
  hidden: boolean;
  showshortname: boolean;
  coursecategory: string;
  timeaccess?: number;
}

export interface CoursesResponse {
  courses: Course[];
  nextoffset: number;
}

export interface CourseSearchResponse {
  total: number;
  courses: Course[];
  warnings: unknown[];
}

export interface CourseState {
  course: {
    id: string;
    numsections: number;
    sectionlist: string[];
    baseurl: string;
  };
  section: {
    id: string;
    section: number;
    number: number;
    title: string;
    hassummary: boolean;
    cmlist: string[];
    visible: boolean;
    sectionurl: string;
  }[];
  cm: CourseModule[];
}

export interface CourseModule {
  id: string;
  name: string;
  visible: boolean;
  sectionid: string;
  sectionnumber: number;
  uservisible: boolean;
  modname: string;
  module: string;
  plugin: string;
  url?: string;
  completionstate?: number;
  isoverallcomplete?: boolean;
}

export interface CalendarEvent {
  id: number;
  name: string;
  description: string;
  component: string;
  modulename: string;
  activityname: string;
  activitystr: string;
  instance: number;
  eventtype: string;
  timestart: number;
  timeduration: number;
  timesort: number;
  overdue: boolean;
  icon: { key: string; component: string; iconurl: string };
  course: Course;
  isactionevent: boolean;
  iscourseevent: boolean;
  action?: { name: string; url: string; itemcount: number; actionable: boolean };
  purpose: string;
  url: string;
}

export interface EventsResponse {
  events: CalendarEvent[];
  firstid: number;
  lastid: number;
}

export interface Achievement {
  achievement_name: string;
  achievement_description: string;
  achievement_grade: number;
  achievement_remark: string | null;
  grade_date: string | null;
  rater_name: string | null;
}

export interface GradingResult {
  grading_id: number;
  grading_name: string;
  count_achievements: number;
  count_achievements_success: number;
  achievements: Achievement[];
}

export interface Notification {
  id: number;
  useridfrom: number;
  useridto: number;
  subject: string;
  shortenedsubject: string;
  text: string;
  fullmessage: string;
  fullmessagehtml: string;
  smallmessage: string;
  contexturl: string;
  contexturlname: string;
  timecreated: number;
  timeread: number | null;
  read: boolean;
  iconurl: string;
  component: string;
  eventtype: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadcount: number;
}

export interface CalendarDay {
  mday: number;
  istoday: boolean;
  isweekend: boolean;
  timestamp: number;
  events: CalendarDayEvent[];
  hasevents: boolean;
  popovertitle?: string;
}

export interface CalendarDayEvent {
  id: number;
  name: string;
  timestart: number;
  timeduration: number;
  formattedtime: string;
  course?: { id: number; fullname: string };
  url: string;
  eventtype: string;
  modulename?: string;
  popupname?: string;
}

export interface CalendarWeek {
  days: CalendarDay[];
}

export interface MonthlyCalendarResponse {
  url: string;
  weeks: CalendarWeek[];
  daynames: { dayno: number; shortname: string; fullname: string }[];
  periodname: string;
  date: { year: number; mon: number; mday: number };
  previousperiod: { year: number; mon: number; mday: number };
  nextperiod: { year: number; mon: number; mday: number };
}

export interface CalendarDayResponse {
  events: CalendarDayEvent[];
  date: { year: number; mon: number; mday: number };
  periodname: string;
  previousperiod: { year: number; mon: number; mday: number };
  nextperiod: { year: number; mon: number; mday: number };
}

export interface CalendarUpcomingResponse {
  events: CalendarDayEvent[];
  isloggedin: boolean;
}

export interface ModuleFile {
  name: string;
  url: string; // Relative path (e.g. /pluginfile.php/...)
}

export interface AssignmentDetails {
  submissionStatus: string | null;
  gradingStatus: string | null;
  group: string | null;
  grade: { score: number; max: number } | null;
  gradedOn: string | null;
  gradedBy: string | null;
  feedbackComments: string | null;
}

function extractTableValue(html: string, label: string): string | null {
  // Moodle renders key-value rows as <td>Label</td><td>Value</td>
  const re = new RegExp(
    label + '[^<]*<\\/t[dh]>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>',
    'i',
  );
  const m = html.match(re);
  if (!m) return null;
  // Strip HTML tags and trim
  return m[1].replace(/<[^>]+>/g, '').trim() || null;
}

function parseAssignmentPage(html: string): AssignmentDetails {
  const submissionStatus = extractTableValue(html, 'Submission status');
  const gradingStatus = extractTableValue(html, 'Grading status');
  const group = extractTableValue(html, 'Group');
  const gradedOn = extractTableValue(html, 'Graded on');
  const gradedBy = extractTableValue(html, 'Graded by');

  // Grade: "75.76 / 100.00"
  let grade: AssignmentDetails['grade'] = null;
  const gradeRaw = extractTableValue(html, 'Grade');
  if (gradeRaw) {
    const gm = gradeRaw.match(/([\d.]+)\s*\/\s*([\d.]+)/);
    if (gm) grade = { score: parseFloat(gm[1]), max: parseFloat(gm[2]) };
  }

  // Feedback comments — can contain rich HTML, keep as-is
  let feedbackComments: string | null = null;
  const fbRe = /Feedback comments<\/t[dh]>\s*<td[^>]*>([\s\S]*?)<\/td>/i;
  const fbMatch = html.match(fbRe);
  if (fbMatch) {
    feedbackComments = fbMatch[1].replace(/<[^>]+>/g, '').trim() || null;
  }

  return { submissionStatus, gradingStatus, group, grade, gradedOn, gradedBy, feedbackComments };
}

function extractFilesFromHtml(html: string): ModuleFile[] {
  const files: ModuleFile[] = [];
  const seen = new Set<string>();
  // Only match actual document URLs (folder content + assign intro attachments)
  const patterns = [
    /href="([^"]*pluginfile\.php\/\d+\/mod_folder\/content\/[^"]+)"/g,
    /href="([^"]*pluginfile\.php\/\d+\/mod_assign\/introattachment\/[^"]+)"/g,
  ];
  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      let url = match[1];
      url = url.replace(/&amp;/g, '&');
      url = url.replace(/https?:\/\/gandalf\.epitech\.eu/, '');
      const nameMatch = url.match(/\/([^/?]+?)(?:\?|$)/);
      if (!nameMatch) continue;
      const filename = decodeURIComponent(nameMatch[1]);
      if (seen.has(filename)) continue;
      seen.add(filename);
      if (!url.includes('forcedownload=')) {
        url += (url.includes('?') ? '&' : '?') + 'forcedownload=1';
      }
      files.push({ name: filename, url });
    }
  }
  return files;
}

// ---- Profile page parser (local_report) ----

export interface ProfileGrade {
  name: string;
  grade: number | null;
  gradeMax: number | null;
  feedback: string | null;
}

export interface ProfileProject {
  courseShortname: string;
  courseName: string;
  courseId: number | null;
  semester: string;
  grades: ProfileGrade[];
  group: { name: string; members: string[] } | null;
}

function parseProfileProjects(html: string): ProfileProject[] {
  // Extract the "My Projects" tab panel
  // MSc 1: id="tabProject", MSc 2: id="projectsTab"
  const tabMatch = html.match(/id="(?:tabProject|projectsTab)"[^>]*>([\s\S]*?)(?=<div[^>]*(?:role="tabpanel"|id="(?:followup|myReports|followUp)")|<\/body>)/);
  if (!tabMatch) return [];
  const tabHtml = tabMatch[1];

  const projects: ProfileProject[] = [];

  // Find all project summary positions to split into blocks
  const summaryRegex = /<summary class="projects-summary">\s*([\s\S]*?)\s*<\/summary>/g;
  const positions: { index: number; text: string }[] = [];
  let sm;
  while ((sm = summaryRegex.exec(tabHtml)) !== null) {
    positions.push({ index: sm.index, text: sm[1].replace(/<[^>]+>/g, '').trim() });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = i + 1 < positions.length ? positions[i + 1].index : tabHtml.length;
    const block = tabHtml.substring(start, end);
    const summaryText = positions[i].text;

    // Parse "T-DEV-810_msc2027 - T-DEV-810 - Zoidberg2.0"
    const dashSplit = summaryText.split(' - ');
    const courseShortname = (dashSplit[0] || '').trim();
    const courseName = dashSplit.slice(1).join(' - ').trim();

    // Course ID from link
    const cidMatch = block.match(/\/course\/view\.php\?id=(\d+)/);
    const courseId = cidMatch ? parseInt(cidMatch[1]) : null;

    // Semester: nearest <h3> before this block
    const before = tabHtml.substring(0, start);
    const semMatches = [...before.matchAll(/<h3>([^<]+)<\/h3>/g)];
    const semester = semMatches.length > 0 ? semMatches[semMatches.length - 1][1].trim() : '';

    // Grades table
    const grades: ProfileGrade[] = [];
    const tbodyMatch = block.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (tbodyMatch) {
      const rowRegex = /<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g;
      let rm;
      while ((rm = rowRegex.exec(tbodyMatch[1])) !== null) {
        const name = rm[1].replace(/<[^>]+>/g, '').trim();
        const g = rm[2].replace(/<[^>]+>/g, '').trim();
        const gMax = rm[3].replace(/<[^>]+>/g, '').trim();
        const fb = rm[4]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
          .replace(/<(?:li)>/gi, '  \u2022 ')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        grades.push({
          name,
          grade: g ? parseFloat(g) : null,
          gradeMax: gMax ? parseFloat(gMax) : null,
          feedback: fb || null,
        });
      }
    }

    // Group name + members
    let group: ProfileProject['group'] = null;
    const groupMatch = block.match(/Member[\s\S]*?of the project group:\s*<details[^>]*>\s*<summary>\s*([^<\n]+)/);
    if (groupMatch) {
      const groupName = groupMatch[1].trim();
      const groupBlock = block.substring(block.indexOf(groupMatch[0]));
      const members: string[] = [];
      const memberRegex = /<li>\s*([^\s<]+@[^\s<]+)\s*<\/li>/g;
      let mm;
      while ((mm = memberRegex.exec(groupBlock)) !== null) {
        members.push(mm[1].trim());
      }
      group = { name: groupName, members };
    }

    projects.push({ courseShortname, courseName, courseId, semester, grades, group });
  }

  return projects;
}
