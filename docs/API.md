# Gandalf (Epitech Moodle) - API Documentation

## Overview

Gandalf (`gandalf.epitech.eu`) is an Epitech Moodle 4.0.5 instance using the `boost_union` theme.
Authentication is via **OIDC (Office 365 SSO)**.

## Authentication

### Session-based (AJAX API)
The internal AJAX API uses:
- **Session cookie** (`MoodleSession`) - obtained after SSO login
- **Sesskey** - CSRF token available in `M.cfg.sesskey` on any authenticated page

### Token-based (Web Services API)
Endpoint: `POST /login/token.php`
- Params: `username`, `password`, `service` (e.g. `moodle_mobile_app`)
- **Note**: Since Epitech uses OIDC SSO, users don't have Moodle passwords. This endpoint is NOT usable for SSO users.

### Recommended Auth Strategy for our App
Users provide their **MoodleSession cookie** value as a token. Our app:
1. Uses this cookie to make requests to Gandalf
2. Extracts the `sesskey` from any page response (available in `M.cfg.sesskey`)
3. Uses both to call the AJAX API

---

## API Base URLs

| Type | URL | Auth |
|------|-----|------|
| AJAX (authenticated) | `POST /lib/ajax/service.php?sesskey={SESSKEY}&info={METHOD}` | Session cookie + sesskey |
| AJAX (no login) | `GET /lib/ajax/service-nologin.php?info={METHOD}&cachekey={KEY}&args={JSON}` | None (public data) |
| Grades (server-rendered) | `GET /grade/report/overview/index.php` | Session cookie |
| Course page (server-rendered) | `GET /course/view.php?id={COURSE_ID}` | Session cookie |

### AJAX Request Format
```
POST /lib/ajax/service.php?sesskey={SESSKEY}&info={METHOD_NAME}
Content-Type: application/json

[{
  "index": 0,
  "methodname": "{METHOD_NAME}",
  "args": { ... }
}]
```

### AJAX Response Format
```json
[{
  "error": false,
  "data": { ... }
}]
```
On error:
```json
[{
  "error": true,
  "exception": {
    "message": "...",
    "errorcode": "...",
    "link": "...",
    "moreinfourl": "..."
  }
}]
```

---

## Global Config (from M.cfg)

| Field | Example | Description |
|-------|---------|-------------|
| `sesskey` | `"YFL36XTeqg"` | CSRF token for AJAX calls |
| `wwwroot` | `"https://gandalf.epitech.eu"` | Base URL |
| `userid` | `1234` | Current user ID |
| `contextid` | `42808` | Current context ID |
| `theme` | `"boost_union"` | Active theme |

---

## Working Endpoints

### 1. User Profile

#### `core_user_get_users_by_field`
Get user profile information.

**Args:**
```json
{ "field": "id", "values": ["1234"] }
```
Field can be: `id`, `username`, `email`, `idnumber`

**Response (array of users):**
```json
[{
  "id": 1234,
  "username": "john.doe@epitech.eu",
  "fullname": "John Doe",
  "email": "john.doe@epitech.eu",
  "department": "AI",
  "institution": "MSC - ASI",
  "idnumber": "msc2027",
  "firstaccess": 1725875972,
  "lastaccess": 1772465294,
  "auth": "oidc",
  "suspended": false,
  "confirmed": true,
  "lang": "en",
  "theme": "",
  "mailformat": 1,
  "trackforums": 1,
  "description": "",
  "city": "Paris",
  "profileimageurlsmall": "https://secure.gravatar.com/avatar/...?s=35&d=mm",
  "profileimageurl": "https://secure.gravatar.com/avatar/...?s=100&d=mm",
  "customfields": [
    { "type": "menu", "value": "-", "name": "cursus", "shortname": "cursus" },
    { "type": "menu", "value": "-", "name": "speciality", "shortname": "speciality" }
  ],
  "preferences": [...]
}]
```

#### `core_search_get_relevant_users`
Search for users.

**Args:**
```json
{ "query": "john", "courseid": 438 }
```

**Response (array):**
```json
[{ "id": 1234, "fullname": "John Doe", "profileimageurlsmall": "..." }]
```

---

### 2. Courses

#### `core_course_get_enrolled_courses_by_timeline_classification`
Get enrolled courses filtered by status.

**Args:**
```json
{
  "classification": "all",  // "all" | "inprogress" | "past" | "future" | "favourites" | "hidden"
  "limit": 50,
  "offset": 0
}
```

**Response:**
```json
{
  "courses": [{
    "id": 438,
    "fullname": "T-DEV-810 - Zoidberg2.0",
    "shortname": "T-DEV-810_msc2027",
    "idnumber": "",
    "summary": "<p>Help doctors detecting pneumonia.</p>",
    "summaryformat": 1,
    "startdate": 1768204800,
    "enddate": 1782682920,
    "visible": true,
    "showactivitydates": false,
    "showcompletionconditions": true,
    "pdfexportfont": "",
    "fullnamedisplay": "T-DEV-810_msc2027 T-DEV-810 - Zoidberg2.0",
    "viewurl": "https://gandalf.epitech.eu/course/view.php?id=438",
    "courseimage": "https://gandalf.epitech.eu/pluginfile.php/.../T-DEV-810.png",
    "progress": 25,
    "hasprogress": true,
    "isfavourite": false,
    "hidden": false,
    "showshortname": true,
    "coursecategory": "T8"
  }],
  "nextoffset": 50
}
```

#### `core_course_get_recent_courses`
Get recently accessed courses.

**Args:**
```json
{ "limit": 10 }
```

**Response:** Same course structure as above, with additional `timeaccess` field (unix timestamp).

#### `core_course_search_courses`
Search all available courses.

**Args:**
```json
{
  "criterianame": "search",
  "criteriavalue": "DEV",
  "page": 0,
  "perpage": 10
}
```

**Response:**
```json
{
  "total": 32,
  "courses": [{
    "id": 464,
    "fullname": "T-DEV-800 - Time Manager",
    "displayname": "T-DEV-800 - Time Manager",
    "shortname": "T-DEV-800_mscrd2027",
    "courseimage": "...",
    "categoryid": 32,
    "categoryname": "T8",
    "summary": "...",
    "contacts": [],
    "enrollmentmethods": [],
    "customfields": []
  }],
  "warnings": []
}
```

---

### 3. Course Structure & Content

#### `core_courseformat_get_state`
Get full course structure including sections and course modules.

**Args:**
```json
{ "courseid": 438 }
```

**Response (JSON string to parse):**
```json
{
  "course": {
    "id": "438",
    "numsections": 4,
    "sectionlist": ["2668", "2670", "2671", "2672"],
    "editmode": false,
    "baseurl": "https://gandalf.epitech.eu/course/view.php?id=438"
  },
  "section": [{
    "id": "2668",
    "section": 0,
    "number": 0,
    "title": "Welcome",
    "hassummary": false,
    "cmlist": ["13362", "13364"],
    "visible": true,
    "sectionurl": "https://gandalf.epitech.eu/course/section.php?id=2668"
  }],
  "cm": [{
    "id": "13390",
    "name": "Project",
    "visible": true,
    "sectionid": "2671",
    "sectionnumber": 3,
    "uservisible": true,
    "modname": "Assignment",
    "module": "assign",
    "plugin": "mod_assign",
    "url": "https://gandalf.epitech.eu/mod/assign/view.php?id=13390",
    "completionstate": 0,
    "isoverallcomplete": false
  }]
}
```

**Module types encountered:** `label` (Text and media), `forum`, `groupselect` (Team Builder), `groupmembers` (Meet your teammates — MSc 2), `folder`, `assign` (Assignment), `feedback`, `workshop`, `quiz`, `url`, `resource`

> **Filtering note:** Events with `modulename === 'feedback'` (Content feedback), `modulename === 'groupselect'` (Team Builder), and retrospectives are filtered out in GanttChart and Dashboard to avoid distorting project timelines. Team Builder events are administrative (group selection deadlines), not project deliverables, and MSc 2 courses can have 15+ of them.

#### `core_course_get_module`
Get the rendered HTML for a single course module (as it appears in the course page).

**Args:**
```json
{ "id": 13373 }
```

**Response (HTML string):**
```json
[{ "error": false, "data": "<li class=\"activity ... modtype_folder\" id=\"module-13373\" ...>...</li>" }]
```

**Notes:**
- Returns rendered HTML, not structured data
- The HTML contains the module card as shown in the course view (name, icon, completion status)
- Does **not** include folder file lists or assignment details — for those, scrape the full module page
- Useful for getting module metadata (activity name, type, completion state) without loading the full course page

#### `core_course_get_updates_since`
Check for course updates since a timestamp.

**Args:**
```json
{ "courseid": 438, "since": 1771860000 }
```

**Response:**
```json
{
  "instances": [...],
  "warnings": []
}
```

#### `core_course_get_enrolled_users_by_cmid`
Get users enrolled in a course module.

**Args:**
```json
{ "cmid": 13390 }
```

**Response:**
```json
{
  "users": [...],
  "warnings": []
}
```

---

### 4. Calendar & Events

#### `core_calendar_get_action_events_by_timesort`
Get action events (deadlines, submissions) sorted by time.

**Args:**
```json
{
  "timesortfrom": 1770000000,  // unix timestamp
  "limitnum": 20
}
```

**Response:**
```json
{
  "events": [{
    "id": 737820,
    "name": "Team Builder (Due date)",
    "description": "<div>...</div>",
    "component": "mod_groupselect",
    "modulename": "groupselect",
    "activityname": "Team Builder",
    "activitystr": "Group self-selection requires action",
    "instance": 13386,
    "eventtype": "due",
    "timestart": 1769380920,
    "timeduration": 0,
    "timesort": 1769380920,
    "overdue": true,
    "icon": {
      "key": "monologo",
      "component": "groupselect",
      "iconurl": "https://gandalf.epitech.eu/theme/image.php/..."
    },
    "course": {
      "id": 438,
      "fullname": "T-DEV-810 - Zoidberg2.0",
      "shortname": "T-DEV-810_msc2027",
      "progress": 25,
      "viewurl": "https://gandalf.epitech.eu/course/view.php?id=438",
      "courseimage": "..."
    },
    "isactionevent": true,
    "iscourseevent": false,
    "action": {
      "name": "Select group",
      "url": "https://gandalf.epitech.eu/mod/groupselect/view.php?id=13386",
      "itemcount": 1,
      "actionable": true
    },
    "purpose": "collaboration",
    "url": "https://gandalf.epitech.eu/mod/groupselect/view.php?id=13386"
  }],
  "firstid": 737820,
  "lastid": 741744
}
```

#### `core_calendar_get_action_events_by_course`
Get events for a specific course.

**Args:**
```json
{ "courseid": 438, "timesortfrom": 0, "limitnum": 20 }
```

#### `core_calendar_get_action_events_by_courses`
Get events for multiple courses at once.

**Args:**
```json
{ "courseids": [438, 435, 431], "timesortfrom": 0, "limitnum": 10 }
```

**Response:**
```json
{ "groupedbycourse": [...] }
```

#### `core_calendar_get_calendar_monthly_view`
Get the full monthly calendar view.

**Args:**
```json
{ "year": 2026, "month": 3 }
```

**Response:** Full calendar structure with weeks, daynames, navigation links.

#### `core_calendar_get_calendar_day_view`
Get calendar events for a specific day.

**Args:**
```json
{ "year": 2026, "month": 3, "day": 2 }
```

#### `core_calendar_get_calendar_upcoming_view`
Get upcoming calendar events.

**Args:** `{}`

---

### 5. Notifications

#### `message_popup_get_popup_notifications`
Get user notifications.

**Args:**
```json
{
  "useridto": 1234,
  "newestfirst": true,
  "limit": 10,
  "offset": 0
}
```

**Response:**
```json
{
  "notifications": [...],
  "unreadcount": 0
}
```

---

### 6. Achievements (Epitech Custom Plugin)

#### `local_achievement_get_achievement_results`
Get achievement/grading results for a course. This is an **Epitech custom plugin** (`local_achievement`), not standard Moodle.

**Args:**
```json
{ "course_id": 438 }
```

**Response (array of grading items, each with achievements):**
```json
[{
  "grading_id": 13390,
  "grading_name": "Project",
  "count_achievements": 27,
  "count_achievements_success": 0,
  "achievements": [{
    "achievement_name": "ntb_delivery",
    "achievement_description": "Students deliver a functional Jupyter notebook",
    "achievement_grade": 0,
    "achievement_remark": null,
    "rater_name": null
  }, {
    "achievement_name": "ntb_intro",
    "achievement_description": "Students introduce relevantly their notebook (overview, abstract, requirements, objectives, etc.)",
    "achievement_grade": 0,
    "achievement_remark": null,
    "rater_name": null
  }]
}]
```

**Fields per achievement:**
| Field | Type | Description |
|-------|------|-------------|
| `achievement_name` | string | Short identifier (e.g. `ntb_delivery`, `algo_metrics`) |
| `achievement_description` | string | Full description of the criterion |
| `achievement_grade` | number | `0` = not achieved, `1` = achieved |
| `achievement_remark` | string\|null | Rater's comment (null if not graded) |
| `rater_name` | string\|null | Name of the person who graded (null if not graded) |

**Notes:**
- `grading_id` corresponds to a course module ID (`cmid`) — typically an `assign` module
- `count_achievements` = total criteria, `count_achievements_success` = how many passed
- This is the data source for the "Course achievements" dashboard on course pages

---

### 7. Activity Completion

#### `core_completion_update_activity_completion_status_manually`
Toggle manual completion status of a course module activity.

**Args:**
```json
{ "cmid": "13399", "completed": true }
```

**Response:**
```json
{ "status": true, "warnings": [] }
```

**Notes:**
- `cmid` is the course module ID (string)
- `completed`: `true` to mark as done, `false` to undo
- Only works for activities with **manual completion** enabled (e.g. folder view, label/text areas)
- Activities with automatic completion (e.g. "receive a grade") cannot be toggled manually

---

### 8. Participants (Dynamic Table)

#### `core_table_get_dynamic_table_content`
Get participants list for a course as a dynamic HTML table. Used on the Participants tab.

**Args:**
```json
{
  "component": "core_user",
  "handler": "participants",
  "uniqueid": "user-index-participants-438",
  "sortdata": [{ "sortby": "lastname", "sortorder": 4 }],
  "jointype": 2,
  "filters": {
    "courseid": { "name": "courseid", "jointype": 1, "values": [438] },
    "groups": { "name": "groups", "jointype": 1, "values": [96291, 96254], "filteroptions": [] }
  },
  "firstinitial": "",
  "lastinitial": "",
  "pagenumber": "1",
  "pagesize": "20",
  "hiddencolumns": [],
  "resetpreferences": false
}
```

**Response:**
```json
{
  "html": "<div class=\"table-dynamic ...\" data-table-total-rows=\"23\">...</div>",
  "warnings": []
}
```

**Notes:**
- Returns **rendered HTML**, not structured JSON — must be parsed/scraped
- `sortorder`: `3` = ascending, `4` = descending
- `jointype`: `1` = ANY, `2` = ALL (for filter matching)
- `filters.groups.values` are group IDs (e.g. `96291` = `all_RENNES`, `96254` = `REN_3`)
- The HTML contains participant data: name, role (`student`/`pedago`), groups, last access
- `uniqueid` format: `user-index-participants-{COURSE_ID}`
- Supports pagination via `pagenumber` and `pagesize`
- Supports alphabetical filtering via `firstinitial` / `lastinitial`

---

### 9. Grades (Server-Rendered Only)

The grade API endpoints (`gradereport_user_get_grade_items`, `gradereport_overview_get_course_grades`) are **disabled** via AJAX.

Grades must be scraped from:
- **Overview**: `GET /grade/report/overview/index.php` - Shows all courses with grades
- **Per-course**: `GET /course/user.php?mode=grade&id={COURSE_ID}&user={USER_ID}`

---

## Disabled/Unavailable Endpoints

| Endpoint | Reason |
|----------|--------|
| `core_enrol_get_users_courses` | servicenotavailable |
| `core_enrol_get_enrolled_users` | servicenotavailable |
| `core_completion_get_activities_completion_status` | servicenotavailable |
| `core_course_get_contents` | servicenotavailable |
| `core_badges_get_user_badges` | servicenotavailable |
| `core_message_get_conversations` | Messaging disabled |
| `core_message_get_unread_conversations_count` | Messaging disabled |
| `gradereport_user_get_grade_items` | servicenotavailable |
| `gradereport_user_get_grades_table` | servicenotavailable |
| `gradereport_overview_get_course_grades` | servicenotavailable |
| `core_block_get_dashboard_blocks` | servicenotavailable |
| `core_webservice_get_site_info` | servicenotavailable |
| `core_course_get_categories` | servicenotavailable |
| `core_files_get_files` | servicenotavailable |
| `core_group_get_course_user_groups` | servicenotavailable |
| `core_group_get_course_groups` | nopermissions (requires "Manage groups") |
| `mod_assign_get_assignments` | servicenotavailable |
| `mod_folder_get_folders_by_courses` | servicenotavailable |
| `mod_forum_get_forums_by_courses` | servicenotavailable |
| `local_report_*` | Not a web service (HTML plugin only) |

---

## Site Navigation Structure

| Menu Item | URL / Description |
|-----------|-------------------|
| Dashboard | `/my/` |
| My Profile | `/user/profile.php?id={USER_ID}` |
| Panoramix | External link (separate Epitech app) |
| JARVISS | Course category |
| MSc 2027 | Course category (cohort) |
| Grades | `/grade/report/overview/index.php` |
| Calendar | `/calendar/view.php` |
| Security Keys | `/user/managetoken.php` |

### MSc 2027 Navigation Hierarchy

```
MSc 2027 (menu)
├── T8 (category)
│   ├── T-DEV-810 - Zoidberg2.0    (course id=438)
│   ├── T-DEV-811 - Smart Trash Cans (course id=440)
│   ├── T-ENG-800 - English          (course id=409)
│   ├── T-ESP-800 - End of Study Project (course id=437)
│   ├── T-NSA-810 - CIA              (course id=439)
│   └── T-PRO-800 - Part-time job    (course id=463)
├── T7 (category)
│   └── ...
├── T6 (category)
├── T5 (category)
├── All Extra Curricular Engagement
└── All T-CAA-000 - Coaching and administrative activities
```

**Category hierarchy:** `MSC PRO` (id=2) → `MSC2027` (id=59) → `T8` (id=63), `T7`, `T6`, `T5`

Category listing page: `GET /course/index.php?categoryid={CATEGORY_ID}`

---

## Project/Course Page Structure

When navigating to a course (`/course/view.php?id={COURSE_ID}`), the page contains:

### Horizontal Navbar (tabs)
| Tab | URL | Data Source |
|-----|-----|-------------|
| Course | `/course/view.php?id={ID}` | `core_courseformat_get_state` (AJAX) + `local_achievement_get_achievement_results` (AJAX) |
| Participants | `/user/index.php?id={ID}` | `core_table_get_dynamic_table_content` (AJAX, returns HTML) |
| Grades | `/grade/report/user/index.php?id={ID}` | Server-rendered HTML (no AJAX data endpoint) |

### Left Sidebar (Course Index)
A tree navigation showing all sections and their course modules (activities). Built from `core_courseformat_get_state` data.

### Course Sections Structure (typical project)
```
Welcome (section 0)
├── Deadlines (label — text/HTML with deadline dates)
└── Sharing & Brainstorming Forum (forum)

Starters (section 2)
├── Team Builder (groupselect — team formation)
├── Kick-off appointment (label — Panoramix booking link)
├── Kick-off (folder — downloadable files, e.g. kickoff.pptx)
└── Bootstrap (folder — downloadable files)

Project (section 3)
├── Project (assign — main deliverable with rubric)
├── Follow-up 1 (label — Panoramix booking link)
├── Follow-up 2 (label — Panoramix booking link)
├── Follow-up 3 (label — Panoramix booking link)
└── Keynote appointment (label — Panoramix booking link)

Feedbacks (section 4)
├── Retrospective (label — Panoramix booking link)
├── Content feedback (feedback — anonymous survey)
└── Achievements dashboard (label — renders achievement widget)
```

### Module Pages (Server-Rendered)

All module detail pages are server-rendered HTML. No AJAX data endpoints.

#### Assignment (`/mod/assign/view.php?id={CMID}`)
Shows:
- **Submission status**: group name, submission status, grading status, time remaining, last modified
- **Attached files**: e.g. `project.pdf` at `/pluginfile.php/{contextid}/mod_assign/introattachment/0/{filename}?forcedownload=1`
- **Grading criteria (Rubric)**: list of criterion names with levels (KO=0 points, description=1 point)
- **Completion requirements**: "View" (done) + "Receive a grade" (to do)

#### Team Builder / Group Self-Selection (`/mod/groupselect/view.php?id={CMID}`)
Shows:
- Group list as a table: group name, description, count (e.g. `5/5`), member list with avatars
- Each member links to `/user/view.php?id={USER_ID}&course={COURSE_ID}`
- Groups with fewer members than required show a warning icon
- After deadline: "Group selection is not available anymore" alert

#### Feedback (`/mod/feedback/view.php?id={CMID}`)
Shows:
- Description (anonymous survey info)
- Open/close dates
- Completion requirement: "Submit feedback"
- Status: "The feedback is not open" if before open date

#### Folder (`/mod/folder/view.php?id={CMID}`)
Shows:
- List of downloadable files (e.g. `kickoff.pptx`)
- File URLs: `/pluginfile.php/{contextid}/mod_folder/content/0/{filename}?forcedownload=1`
- "Download folder" button
- Manual completion toggle

#### Forum (`/mod/forum/view.php?id={CMID}`)
Shows:
- Forum description and rules
- Discussion topics list (or "no discussion topics yet")
- "Add discussion topic" button
- Group filtering (e.g. "Separate groups: all_RENNES")
- Search forums input

### Grades Page (`/grade/report/user/index.php?id={COURSE_ID}`)
Shows:
- Table with columns: Grade item, Calculated weight, Grade, Range, Percentage, Feedback, Contribution to course total
- Grade items correspond to assignment modules (e.g. "Project" → `assign` module)
- Course total row with aggregation (Natural/weighted)
- Range: typically `0–100`
- Gradebook navigation dropdown for switching between report types

### Participants Page (`/user/index.php?id={COURSE_ID}`)
Shows:
- Filter controls: Match (None/Any/All), Filter type (Keyword/Roles/Groups/Inactive), with autocomplete
- Participant table: Full name, Roles (`student`/`pedago`), Groups (e.g. `all_RENNES, REN_8`), Last access to course
- Alphabetical filtering by first/last name initial
- Pagination (20 per page default)
- Export options: CSV, XLSX, HTML, JSON, ODS, PDF

### REST API (UI Preferences)

#### `POST /r.php/api/rest/v2/user/current/preferences/{KEY}`
Save user UI preferences (e.g. drawer open/close state).

Observed keys:
- `drawer-open-index` — Course index drawer visibility

---

## 10. Document Downloads (Folder & Assignment Files)

Project pages contain downloadable documents (Kick-off slides, Bootstrap PDF, Project PDF) accessible via `pluginfile.php`. Since `mod_folder_get_folders_by_courses`, `mod_assign_get_assignments`, and `core_files_get_files` are all **disabled**, file URLs must be extracted by scraping module pages.

### File URL Pattern

| Module type | URL pattern | Example |
|-------------|-------------|---------|
| Folder (`mod_folder`) | `/pluginfile.php/{contextid}/mod_folder/content/0/{filename}?forcedownload=1` | `/pluginfile.php/55746/mod_folder/content/0/kickoff.pptx?forcedownload=1` |
| Assignment intro (`mod_assign`) | `/pluginfile.php/{contextid}/mod_assign/introattachment/0/{filename}?forcedownload=1` | `/pluginfile.php/55763/mod_assign/introattachment/0/project.pdf?forcedownload=1` |

### Typical Project Documents

A typical project course (e.g. T-DEV-810 Zoidberg2.0) has 3 downloadable documents in 2 sections:

| Document | Section | Module type | Module page URL |
|----------|---------|-------------|-----------------|
| **Kick-off** (`.pptx`) | Starters | `folder` | `/mod/folder/view.php?id={cmid}` |
| **Bootstrap** (`.pdf`) | Starters | `folder` | `/mod/folder/view.php?id={cmid}` |
| **Project** (`.pdf`) | Project | `assign` | `/mod/assign/view.php?id={cmid}` |

### How to Get File URLs Programmatically

1. Use `core_courseformat_get_state` to get the course structure with all module `cmid`s and their `modname` (e.g. `folder`, `assign`).
2. For each relevant module, scrape the module page HTML:
   - **Folder**: `GET /mod/folder/view.php?id={cmid}` — extract `pluginfile.php` URLs matching `mod_folder/content`
   - **Assignment**: `GET /mod/assign/view.php?id={cmid}` — extract `pluginfile.php` URLs matching `mod_assign/introattachment`
3. The `contextid` in the URL is **not available from any API** — it's embedded in the `pluginfile.php` URLs in the page HTML.

**Scraping regex:**
```
Folder files:    /pluginfile\.php\/(\d+)\/mod_folder\/content\/0\/([^?"]+)/
Assign files:    /pluginfile\.php\/(\d+)\/mod_assign\/introattachment\/0\/([^?"]+)/
```

**Download**: Authenticated `GET` request to the full `pluginfile.php` URL with the `MoodleSession` cookie.

---

## 11. Profile Page — `local_report` / `local_graph` Plugin (Server-Rendered)

**URL (MSc 1 / msc2027):** `GET /local/report/view.php`
**URL (MSc 2 / msc2026):** `GET /local/graph/view.php`

> **Note:** The profile page URL differs between MSc years. Our code tries `/local/report/view.php` first, then falls back to `/local/graph/view.php`.

This is a **custom Epitech plugin** (`local_report` or `local_graph`). It has **no web service endpoints** — all data is server-rendered HTML that must be scraped. The page contains user info and 4 tabs.

### User Info Header

Rendered at the top of the page, contains:

| Field | CSS selector hint | Example |
|-------|-------------------|---------|
| Full name | `.userInfoName` / first child | `John Doe` |
| Email | — | `john.doe@epitech.eu` |
| Cursus | — | `MSC - ASI` |
| Specialty | — | `AI` |
| School year | — | `2027` |
| Director of studies | — | `Jane SMITH` |
| Campus | — | `Paris` |

### Tab 1: Achievements

**Tab panel ID:** contains `tabAchievement`

Shows ECTS/achievement progress grouped by semester, with collapsible categories.

**Structure:**
```html
<details open>
  <summary class="semesterDetails">Semester 7</summary>
  <!-- One card per achievement category -->
  <div class="card-header" role="button" data-toggle="collapse">
    <span class="progressTitle">Dev web</span>
    <span class="progressBarContainer" title="82%">
      <span title="Required progress (D grade): 50%"></span>
      <span title="C grade progress: 70%"></span>
      <span title="Success progress (B grade): 90%"></span>
      <span title="A grade progress: 97%"></span>
    </span>
  </div>
  <!-- When expanded: shows linked courses -->
  <a href="/course/view.php?id=413">T-DEV-700_msc2027</a>
</details>
```

**Parseable data per category:**
| Field | Source | Example |
|-------|--------|---------|
| Semester | `<summary>` text | `Semester 7` |
| Category name | `.progressTitle` | `Dev web` |
| Progress % | `.progressBarContainer[title]` | `82%` |
| D grade threshold | threshold `[title]` | `50%` |
| C grade threshold | threshold `[title]` | `70%` |
| B grade threshold | threshold `[title]` | `90%` |
| A grade threshold | threshold `[title]` | `97%` |
| Linked courses | expanded `<a>` links | `T-DEV-700_msc2027` → `/course/view.php?id=413` |

### Tab 2: My Projects

**Tab panel ID:** `tabProject` (MSc 1) or `projectsTab` (MSc 2)

Lists all projects the user is enrolled in, grouped by semester (e.g. `MSC2027 - T8`, `MSC2026 - T10`...). Each project is a collapsible `<details>` element.

**Structure:**
```html
<div id="tabProject"> <!-- or id="projectsTab" for MSc 2 -->
  <h3>MSC2027 - T8</h3>
  <details class="projects-details">
    <summary class="projects-summary">T-DEV-810_msc2027 - T-DEV-810 - Zoidberg2.0</summary>
    <div class="row">
      <div class="col-md-10">
        <!-- Grades section (only if graded) -->
        <div class="courseGrades">
          <span class="infoTitle">Grades</span>
          <table>
            <thead><tr><th>Name</th><th>Grade</th><th>Grade Max</th><th>Feedback</th></tr></thead>
            <tbody>
              <tr><td>Project</td><td>75.76</td><td>100</td><td>...feedback text...</td></tr>
              <tr><td>Sharing &amp; Brainstorming Forum rating</td><td></td><td>1</td><td></td></tr>
            </tbody>
          </table>
        </div>
        <!-- Info section -->
        <div class="courseInfo">
          <span class="infoTitle">Information</span>
          <ul>
            <li>Link to the project <a href="/course/view.php?id=413">T-DEV-700_msc2027</a>.</li>
            <li><a href="/user/index.php?id=413">Member</a> of the project group:
              <details>
                <summary>REN_3
                  <a href="https://teams.microsoft.com/l/chat/0/0?users=email1,email2,..." class="teams-btn">
                    <img src="/local/graph/images/teams.svg" alt="Open in Teams">
                  </a>
                </summary>
                <ul>
                  <li>alice.smith@epitech.eu</li>
                  <li>bob.jones@epitech.eu</li>
                  <li>carol.martin@epitech.eu</li>
                  <li>john.doe@epitech.eu</li>
                  <li>dave.wilson@epitech.eu</li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </details>
</div>
```

**Parseable data per project:**
| Field | Source | Example |
|-------|--------|---------|
| Semester group | `<h3>` headings | `MSC2027 - T8` |
| Course shortname + name | `<summary>` text | `T-DEV-810_msc2027 - T-DEV-810 - Zoidberg2.0` |
| Course ID | `<a href="/course/view.php?id={ID}">` | `438` |
| Grade items | `<table> tbody tr` cells | Name, Grade, Grade Max, Feedback |
| Group name | nested `<details><summary>` text | `REN_3` |
| Member emails | `<ul><li>` inside group details | `alice.smith@epitech.eu`, ... |
| Member emails (alt) | Teams link `?users=` param | comma-separated emails |

**MSc 2 grade differences:**
- Some MSc 2 projects use `Grade Max = 2` (ECTS-style) instead of `100`
- Grade name `"Course ECTS"` appears alongside `"Project"` — our `getMainGrade()` handles this via fallback to first graded entry
- Semester format: `MSC2026 - T10` (vs `MSC2027 - T8` for MSc 1) — display code uses `/^MSC\d+\s*-\s*/` regex to strip prefix

**Stats use-case data extraction:**
To build teammate analytics (best/worst grades together, most frequent partners), parse all projects and cross-reference:
- `members[]` → who you worked with on each project
- `grades[].grade` / `grades[].gradeMax` → project score
- `summary` → project identifier to match across semesters

### Tab 3: Comments (Follow-up Notes)

**Tab panel ID:** `tabComments`

Paginated list of pedagogy follow-up notes from project reviews. Contains filters and pagination.

**Structure per comment:**
```html
<div class="commentCard">
  <h3>Pedago</h3>
  <h4>5/01/2026 - 11:03</h4>
  <div class="commentDetails">
    <span>Completion: 80%</span>
    <span>Evaluator: eva.teacher@epitech.eu</span>
    <a href="/course/view.php?id=413">T-DEV-700_msc2027</a>
    <a href="/mod/followup/view.php?id=13185">Follow-up 2</a>
    <a href="/group/group.php?id=81485">REN_3</a>
    <!-- Member list with presence/absence status -->
    <a href="/local/graph/view.php?userid=1235">
      <span class="present"></span> alice.smith@epitech.eu
    </a>
    <a href="/local/graph/view.php?userid=1234">
      <span class="absent"></span> john.doe@epitech.eu
    </a>
  </div>
  <div class="commentNotes">...detailed follow-up notes...</div>
</div>
```

**Parseable data per comment:**
| Field | Source | Example |
|-------|--------|---------|
| Author type | `<h3>` | `Pedago` |
| Date | `<h4>` | `5/01/2026 - 11:03` |
| Completion % | span text matching `Completion: (\d+)%` | `80%` |
| Evaluator | span text matching `Evaluator: (.+)` | `eva.teacher@epitech.eu` |
| Course shortname | `<a href="/course/view.php?id={ID}">` text | `T-DEV-700_msc2027` |
| Follow-up activity | `<a href="/mod/followup/view.php?id={ID}">` text | `Follow-up 2` |
| Group name | `<a href="/group/group.php?id={ID}">` text | `REN_3` |
| Members + attendance | `<a href="/local/graph/view.php?userid={ID}">` with `present`/`absent` class | email + status |
| Notes | comment text div | free-text follow-up notes |

### Tab 4: README

Static informational content about the MSc program (format, duration, FAQ). Not useful for data extraction.

---

## Summary of Available Data for Frontend

| Feature | API Endpoint | Status |
|---------|-------------|--------|
| User profile & avatar | `core_user_get_users_by_field` | OK |
| All enrolled courses | `core_course_get_enrolled_courses_by_timeline_classification` | OK |
| Recent courses | `core_course_get_recent_courses` | OK |
| Course progress (%) | Included in course data | OK |
| Course structure | `core_courseformat_get_state` | OK |
| Course module HTML | `core_course_get_module` | OK (returns HTML) |
| Course achievements | `local_achievement_get_achievement_results` | OK |
| Activity completion toggle | `core_completion_update_activity_completion_status_manually` | OK |
| Course participants | `core_table_get_dynamic_table_content` (HTML) | OK (parse needed) |
| Calendar events | `core_calendar_get_action_events_by_timesort` | OK |
| Monthly calendar | `core_calendar_get_calendar_monthly_view` | OK |
| Notifications | `message_popup_get_popup_notifications` | OK |
| Search courses | `core_course_search_courses` | OK |
| Search users | `core_search_get_relevant_users` | OK |
| **Document downloads** | Scrape `/mod/folder/view.php` + `/mod/assign/view.php` | Scrape (§10) |
| **Profile — projects & grades** | Scrape `/local/report/view.php` or `/local/graph/view.php` tab "My projects" | Scrape (§11) |
| **Profile — achievements** | Scrape `/local/report/view.php` or `/local/graph/view.php` tab "Achievements" | Scrape (§11) |
| **Profile — follow-up comments** | Scrape `/local/report/view.php` or `/local/graph/view.php` tab "Comments" | Scrape (§11) |
| Grades | Server-rendered scraping needed | Partial |
| Assignment detail (rubric) | Server-rendered `/mod/assign/view.php` | Scrape |
| Team Builder (groups) | Server-rendered `/mod/groupselect/view.php` | Scrape |
| Feedback surveys | Server-rendered `/mod/feedback/view.php` | Scrape |
| Folder (files) | Server-rendered `/mod/folder/view.php` | Scrape |
| Forum posts | Disabled | No |
| Assignments API | Disabled (`mod_assign_get_assignments`) | No |
