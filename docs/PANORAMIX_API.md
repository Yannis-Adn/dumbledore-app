# Panoramix (Epitech Calendar) — API Documentation

> **Source:** Endpoints extracted from the Panoramix frontend bundle (`index-BXW7KTto.js`) + live network capture. Last updated: 2026-03-03.

## Overview

Panoramix (`panoramix.epitest.eu`) is Epitech's calendar and scheduling platform. It provides event scheduling, room assignments, module references, cohort management, project groups, and follow-up tracking. Panoramix is linked to Gandalf via shared `tpIds` (third-party IDs) that map modules and activities between the two systems.

### Frontend Routes (for reference)

| Route | Description |
|-------|-------------|
| `/login` | Login page (Microsoft SSO) |
| `/calendar` | Calendar view (default, redirected from `/`) |
| `/calendar/events/:eventId/details` | Event detail modal (over calendar) |
| `/rooms/timeline` | Room timeline view |
| `/rooms/status` | Room availability status |
| `/modules` | Module listing/management |

---

## Authentication

### Double Token Architecture

Panoramix uses a two-layer authentication system:

1. **Microsoft Azure AD (MSAL)** — Identity layer
   - Users authenticate via Microsoft SSO (Office 365)
   - MSAL tokens are stored in the browser's `localStorage`
   - Client ID: `6a3d1838-8c2a-4b92-8d21-77897cf1ab12`
   - Tenant ID: `901cb4ca-b862-4029-9306-e5cd0f6d9f86`
   - Scopes: `openid profile User.Read email`

2. **Panoramix JWT** — API layer
   - Algorithm: `HS256`
   - Stored as an **httpOnly, secure, SameSite=Lax** cookie on `panoramix.epitest.eu`
   - Expiry: ~7 days
   - Payload contains: `_id` (Panoramix user ID), `login` (email), `iat`, `exp`

### Auth Flow

```
User → Microsoft SSO (MSAL) → Azure AD tokens
     → POST /api/users/login { accessToken, login }
     → Panoramix sets JWT as httpOnly cookie
     → All /api/* requests are authenticated via this cookie
```

### Auth in Dumbledore

Since the JWT is an httpOnly cookie, the browser sends it automatically for same-origin requests. For our Vite proxy setup:

- User provides the JWT value (extracted from DevTools > Cookies > `refresh_token`)
- Proxy at `/panoramix-api` forwards it as `Cookie: refresh_token=<value>` to `panoramix.epitest.eu`
- The cookie name is **`refresh_token`** — this is critical for the proxy to work
- See `vite.config.ts` for proxy configuration

### JWT Payload Example

```json
{
  "_id": "aabbccdd11223344eeff5566",
  "login": "john.doe@epitech.eu",
  "iat": 1772440713,
  "exp": 1773045513
}
```

---

## API Base URL

| Environment | URL |
|-------------|-----|
| Production  | `https://panoramix.epitest.eu/api` |
| Dev proxy   | `/panoramix-api` (Vite rewrites to `/api` on target) |

All endpoints return JSON. Arrays are returned directly (not wrapped in an object).

---

## Endpoints — Authentication & Users

### POST /api/users/login

Exchange an MSAL access token for a Panoramix session (JWT cookie).

**Body:**

```json
{
  "accessToken": "<MSAL access token>",
  "login": "john.doe@epitech.eu"
}
```

**Response:** `PanoramixUser` — the authenticated user object (see Type Definitions).

**Side effect:** Sets an httpOnly JWT cookie for subsequent requests.

---

### POST /api/users/logout

Logout and clear the session cookie.

**Body:** None

**Response:** `200 OK`

---

### GET /api/users/token

Get/refresh the current authentication token.

**Response:** Token data (used internally for token refresh flow).

---

### GET /api/users/token/:userId

Get a "logas" (impersonation) token for a specific user. Used by staff to view the platform as another user.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `userId` | string | Panoramix user `_id` to impersonate |

---

### GET /api/users

Search for users. Returns user references.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name/email |
| `refOnly` | boolean | No | Return minimal fields (default `true`) |
| `logas` | boolean | No | Filter for logas-eligible users |
| `moduleId` | string | No | Filter by enrolled module `_id` |
| `cohortGroupIds[]` | string[] | No | Filter by cohort group hashes |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixUserRef[]`

---

### GET /api/authorizationGroups/users

Search for staff/pedagogue users (authorized users). Similar to `/api/users` but scoped to staff roles.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search filter |
| `moduleId` | string | No | Filter by module `_id` |
| `moduleSources[]` | string[] | No | Filter by module tpId sources |
| `cohortGroupIds[]` | string[] | No | Filter by cohort group hashes |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixUserRef[]`

---

### GET /api/users/settings

Get the current user's settings (language, display preferences).

**Response:** `PanoramixUserSettings`

---

### PUT /api/users/settings

Update the current user's settings.

**Body:** `PanoramixUserSettings`

```json
{
  "language": "fr"
}
```

**Response:** Updated `PanoramixUserSettings`

---

### GET /api/users/cohortGroups

Get the current authenticated user's cohort groups (city, curriculum, promotion).

**Response:** `PanoramixCohortGroup[]`

---

## Endpoints — Events

### GET /api/events

Fetch calendar events. Supports three usage modes depending on query parameters.

#### Mode 1: Calendar View (date range)

Returns events within a time window, enriched with full module, room, and registration data.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | ISO 8601 string | Yes | Range start (e.g. `2026-03-01T23:00:00.000Z`) |
| `end` | ISO 8601 string | Yes | Range end (e.g. `2026-03-09T22:59:59.999Z`) |
| `search` | string | No | Search filter |
| `limit` | number | No | Max results |
| `offset` | number | No | Pagination offset |

**Example:**

```
GET /api/events?start=2026-03-01T23:00:00.000Z&end=2026-03-09T22:59:59.999Z
```

**Response:** `PanoramixEvent[]`

#### Mode 2: Calendar View with Registration Status

Same as above, but includes the user's registration status for each event.

**Additional Param:**

| Param | Type | Description |
|-------|------|-------------|
| `registrationStatus` | `true` | Include `isRegistered` field in response |

**Example:**

```
GET /api/events?start=2026-03-01T23:00:00.000Z&end=2026-03-09T22:59:59.999Z&registrationStatus=true
```

**Response:** `PanoramixEvent[]` (with `isRegistered` populated)

```json
[
  {
    "_id": "695e5014bcb361f7f179eefc",
    "title": "FU1",
    "start": "2026-03-04T08:30:00.000Z",
    "end": "2026-03-04T10:55:00.000Z",
    "type": "appointment",
    "registrationType": "group",
    "roomsRef": [
      {
        "name": "Salle 223",
        "seats": 40,
        "city": "Rennes",
        "tpIds": [{ "id": "2290", "source": "intra" }],
        "disabled": false,
        "_id": "6853c38e9194d134c1545803"
      }
    ],
    "seats": null,
    "moduleRef": {
      "name": "T-DEV-810_msc2027 T-DEV-810 - Zoidberg2.0",
      "code": "T-DEV-810_msc2027",
      "tpIds": [{ "id": "438", "source": "gandalf" }],
      "activityRef": {
        "name": "Follow-up 1",
        "tpIds": [
          { "id": "13392", "source": "gandalf", "sourceType": "followup", "_id": "69402dd6718dcc45dbbfa044" }
        ],
        "_id": "69402dd6718dcc45dbbfa043"
      },
      "groupingsRef": [],
      "_id": "69402dd1718dcc45dbbf41a6"
    },
    "cohortGroups": [
      {
        "city": { "name": "Rennes", "type": "city", "_id": "666c13f4b4493d928ab6d789" },
        "curriculum": { "name": "MSc Pro 1", "type": "curriculum", "_id": "666c13f7b4493d928ab6dac2" },
        "promotion": { "name": "2027", "type": "promotion", "_id": "666c13f3b4493d928ab6d729" }
      }
    ],
    "visible": true,
    "isRegistered": {
      "start": "2026-03-04T10:10:00.000Z",
      "end": "2026-03-04T10:55:00.000Z"
    }
  }
]
```

#### Mode 3: Reference/Search (paginated, minimal)

Returns a flat list of events with minimal fields. Used for dropdowns, search, and admin views.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `refOnly` | `true` | Yes | Return minimal fields only |
| `search` | string | No | Search filter on event title |
| `start` | ISO 8601 string | No | Optional date range filter |
| `end` | ISO 8601 string | No | Optional date range filter |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Example:**

```
GET /api/events?limit=10&offset=0&refOnly=true&search=FU1
```

**Response:** `PanoramixEventRef[]`

```json
[
  {
    "_id": "66dad4ff130524dc2c4e7ff5",
    "title": "Day01",
    "start": "2024-09-09T09:00:00.000Z",
    "end": "2024-09-09T16:00:00.000Z"
  }
]
```

---

### GET /api/events/:eventId

Get a single event with full details (slots, registrations, rooms, module info).

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Example:**

```
GET /api/events/695e5014bcb361f7f179eefc
```

**Response:** `PanoramixEventDetail` — enriched `PanoramixEvent` with full slot/registration data.

For `type: "course"`, the response includes `registeredStudents`/`registeredStaff` arrays. For `type: "appointment"`, it includes slot-level registration details with groups sorted by `login`.

---

### GET /api/events/:eventId/history

Get the modification history of an event (who created, registered, unregistered, etc.).

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Response:** `PanoramixEventHistoryEntry[]`

History actions: `"create"`, `"createMass"`, `"update"`, `"add_room"`, `"remove_room"`, `"register_student"`, `"force_register_student"`, `"register_staff"`, `"force_register_staff"`, `"unregister_student"`, `"force_unregister_student"`, `"unregister_staff"`, `"force_unregister_staff"`

---

### GET /api/events/module/:moduleId

Get events filtered by module. Used to see all events for a specific course/project.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `moduleId` | string | Module `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | ISO 8601 string | No | Date range start |
| `end` | ISO 8601 string | No | Date range end |
| `search` | string | No | Search filter |
| `limit` | number | No | Max results |
| `offset` | number | No | Pagination offset |

**Example:**

```
GET /api/events/module/69402dd1718dcc45dbbf41a6?start=2026-03-01T00:00:00.000Z&end=2026-04-01T00:00:00.000Z
```

**Response:** `PanoramixEvent[]`

---

### GET /api/events/rooms/:cityId

Get events filtered by rooms in a specific city. Used for the room timeline and status views.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cityId` | string | City cohort `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | ISO 8601 string | No | Date range start |
| `end` | ISO 8601 string | No | Date range end |
| `search` | string | No | Search filter |
| `rooms` | string | No | Room filter |
| `disabled` | boolean | No | Include disabled rooms (default `false`) |
| `isTime` | boolean | No | Time-based view (default `true`) |
| `limit` | number | No | Max results |
| `offset` | number | No | Pagination offset |

**Response:** `{ data: PanoramixEvent[] }` (wrapped in data envelope)

---

### POST /api/events

Create a new event.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `ignoreWarnings` | boolean | No | Skip validation warnings (default `false`) |

**Body:** `PanoramixEventInput`

```json
{
  "title": "FU1",
  "type": "appointment",
  "registrationType": "group",
  "moduleRef": "<moduleId>",
  "activityRef": "<activityId>",
  "cohortGroups": [{ "city": "<id>", "curriculum": "<id>", "promotion": "<id>" }],
  "roomsRef": ["<roomId>"],
  "slots": [
    {
      "start": "2026-03-10T09:00:00.000Z",
      "end": "2026-03-10T09:45:00.000Z",
      "type": "slot",
      "occurence": 1,
      "breakDuration": 0,
      "slotNumber": 1
    }
  ],
  "visible": true
}
```

**Response:** Created `PanoramixEvent`

---

### PUT /api/events/:eventId

Update an existing event.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `ignoreWarnings` | boolean | No | Skip validation warnings (default `false`) |

**Body:** Full `PanoramixEvent` object (including `_id`).

**Response:** Updated `PanoramixEvent`

---

### DELETE /api/events/:eventId

Delete an event.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `ignoreWarnings` | boolean | No | Skip validation warnings (default `false`) |

**Response:** `200 OK`

---

## Endpoints — Event Registration

### POST /api/events/:eventId/:type/:registerId

Register a student/staff/group to a specific event slot.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |
| `type` | string | Registration type identifier (e.g. registration group type) |
| `registerId` | string | The `_id` of the entity to register (user or group) |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slotIdx` | number | No | Slot index to register for |

**Body:** The registration object (`toRegister`).

**Response:** Updated `PanoramixEvent`

---

### DELETE /api/events/:eventId/:type/:registerId

Unregister a student/staff/group from a specific event slot.

**Path Parameters:** Same as POST above.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slotIdx` | number | No | Slot index to unregister from |

**Response:** Updated `PanoramixEvent`

---

### POST /api/events/:eventId/force_register/:type

Force-register one or more entities (students/staff) to an event slot. Admin/staff action.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |
| `type` | string | Registration type identifier |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slotIdx` | number | No | Target slot index |

**Body:** `toRegisters[]` — array of entities to register.

**Response:** Updated `PanoramixEvent`

---

### DELETE /api/events/:eventId/force_register/:type

Force-unregister one or more entities from an event slot. Admin/staff action.

**Path/Query Parameters:** Same as POST above.

**Body:** `toRegisters[]` — array of entities to unregister.

**Response:** Updated `PanoramixEvent`

---

### POST /api/events/:eventId/force_register/users

Force-register users with metadata to an event. Admin action with additional user metadata.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Body:** Registration data with user metadata.

**Response:** Updated `PanoramixEvent`

---

### DELETE /api/events/:eventId/force_register/users

Force-unregister users with metadata from an event.

**Path Parameters:** Same as POST above.

**Body:** Unregistration data.

**Response:** Updated `PanoramixEvent`

---

## Endpoints — Event Room Registration

### POST /api/events/:eventId/register/room

Register a room to a specific event slot.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slotIdx` | number | Yes | Target slot index |

**Body:** `roomsToRegister` — room registration data.

**Response:** Updated `PanoramixEvent`

---

### DELETE /api/events/:eventId/register/room

Unregister a room from a specific event slot.

**Path/Query Parameters:** Same as POST above (slotIdx is optional).

**Response:** Updated `PanoramixEvent`

---

### POST /api/events/:eventId/register/mass/room

Mass-register rooms to multiple event slots at once.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `eventId` | string | Event `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `slotIdx[]` | number[] | Yes | Array of slot indices |

**Body:** `roomsToRegister` — room registration data.

**Response:** Updated `PanoramixEvent`

---

### DELETE /api/events/:eventId/register/mass/room

Mass-unregister rooms from multiple event slots.

**Path/Query Parameters:** Same as POST above.

**Response:** Updated `PanoramixEvent`

---

## Endpoints — Rooms

### GET /api/rooms (refOnly=true)

Search rooms. Returns minimal room references for dropdowns/filters.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by room name |
| `city` | string | No | Filter by city name |
| `disabled` | boolean | No | Include disabled rooms (default `false`) |
| `refOnly` | `true` | Yes | Return minimal fields |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Example:**

```
GET /api/rooms?search=Salle&city=Rennes&disabled=false&refOnly=true&limit=10&offset=0
```

**Response:** `PanoramixRoomRef[]`

---

### GET /api/rooms (refOnly=false)

Get rooms with full data (seats, tpIds, disabled status).

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by room name |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixRoom[]`

---

### GET /api/rooms/events

Search for room-related events. Used in the rooms timeline/status views.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start` | ISO 8601 string | No | Date range start |
| `end` | ISO 8601 string | No | Date range end |
| `search` | string | No | Search filter |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixEvent[]`

---

## Endpoints — Modules

### GET /api/modules/:moduleId

Get a single module with full details.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `moduleId` | string | Module `_id` |

**Response:** `PanoramixModuleFull`

---

### GET /api/modules (search)

Search modules. Returns minimal references.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name/code |
| `refOnly` | boolean | No | Return minimal fields (default `true`) |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Example:**

```
GET /api/modules?search=DEV-810&refOnly=true&limit=10&offset=0
```

**Response:** `PanoramixModuleRef[]`

```json
[
  {
    "_id": "66d85dce4202adbb2230a242",
    "name": "T-WEB-500_msc2027 T-WEB-500 - Seminar Web Dev",
    "code": "T-WEB-500_msc2027",
    "tpIds": [{ "id": "353", "source": "gandalf" }]
  }
]
```

---

### GET /api/modules/:moduleId/groupings

Search for groupings within a module. Groupings are organizational units for project teams.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `moduleId` | string | Module `_id` |

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search filter |
| `refOnly` | boolean | No | Return minimal fields |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixGroupingRef[]`

---

### GET /api/modules/:moduleId/projectGroups

Search or get project groups for a module.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `moduleId` | string | Module `_id` |

#### Search Mode

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search filter |
| `groupingIds[]` | string[] | No | Filter by grouping IDs |
| `refOnly` | `true` | Yes | Return minimal fields |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixProjectGroupRef[]`

#### User's Group Mode

Get the project group that a specific user belongs to.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `groupingIds[]` | string[] | No | Filter by grouping IDs |
| `userIds[]` | string[] | Yes | User `_id`(s) to look up |

**Example:**

```
GET /api/modules/69402dd1718dcc45dbbf41a6/projectGroups?userIds[0]=aabbccdd11223344eeff5566
```

**Response:** `PanoramixProjectGroup[]` (frontend uses `transformResponse: e => e[0]` to get the first match)

---

### GET /api/modules/:moduleId/activities/:activityId/followUps/:projectGroupId

Get follow-up data for a specific project group within a module activity.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `moduleId` | string | Module `_id` |
| `activityId` | string | Activity `_id` |
| `projectGroupId` | string | Project group `_id` |

**Response:** `PanoramixFollowUp`

---

### POST /api/modules/:moduleId/activities/:activityId/followUps/:projectGroupId

Save/update follow-up data for a project group.

**Path Parameters:** Same as GET above.

**Body:** `PanoramixFollowUp` — follow-up data to save.

**Response:** Updated `PanoramixFollowUp`

---

## Endpoints — Cohorts

### GET /api/cohorts (full)

Get all cohorts with full data.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Response:** `PanoramixCohort[]`

---

### GET /api/cohorts (search)

Search cohorts by type. Returns minimal references for dropdowns/filters.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"city"` \| `"curriculum"` \| `"promotion"` | Yes | Cohort type to fetch |
| `search` | string | No | Search filter |
| `refOnly` | `true` | Yes | Return minimal fields |
| `limit` | number | No | Max results (default 10) |
| `offset` | number | No | Pagination offset (default 0) |

**Examples:**

```
GET /api/cohorts?type=city&refOnly=true&limit=10&offset=0&search=
GET /api/cohorts?type=curriculum&refOnly=true&limit=10&offset=0&search=
GET /api/cohorts?type=promotion&refOnly=true&limit=10&offset=0&search=
```

**Response:** `PanoramixCohort[]`

```json
// type=city
[{ "_id": "666c13f4b4493d928ab6d789", "name": "Rennes", "type": "city" }]

// type=curriculum
[
  { "_id": "666c13f7b4493d928ab6dac2", "name": "MSc Pro 1", "type": "curriculum" },
  { "_id": "666c13f7b4493d928ab6dabc", "name": "Pré-MSc Pro", "type": "curriculum" }
]

// type=promotion
[{ "_id": "666c13f3b4493d928ab6d729", "name": "2027", "type": "promotion" }]
```

---

### GET /api/cohorts/:cohortId

Get a single cohort with full details.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cohortId` | string | Cohort `_id` |

**Response:** `PanoramixCohort`

---

### DELETE /api/cohorts/:cohortId

Delete a cohort. Admin action.

**Response:** `200 OK`

---

### POST /api/cohorts/:cohortId/users

Add a user to a cohort.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cohortId` | string | Cohort `_id` |

**Body:** `userRef` — user reference object.

**Response:** `200 OK`

---

### DELETE /api/cohorts/:cohortId/users/:userId

Remove a user from a cohort.

**Path Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `cohortId` | string | Cohort `_id` |
| `userId` | string | User `_id` to remove |

**Response:** `200 OK`

---

## Type Definitions

### PanoramixEvent (full, from calendar view)

```typescript
interface PanoramixEvent {
  _id: string;
  title: string;
  start: string;                    // ISO 8601
  end: string;                      // ISO 8601
  type: EventType;
  registrationType: EventRegistrationType;
  roomsRef: PanoramixRoom[];
  seats: number | null;
  moduleRef: PanoramixModuleEnriched;
  cohortGroups: PanoramixCohortGroup[];
  visible: boolean;
  isRegistered: {                   // only if registrationStatus=true
    start: string;                  // user's registered slot start
    end: string;                    // user's registered slot end
  } | false | null;
}
```

### PanoramixEventRef (minimal)

```typescript
interface PanoramixEventRef {
  _id: string;
  title: string;
  start: string;  // ISO 8601
  end: string;    // ISO 8601
}
```

### PanoramixEventHistoryEntry

```typescript
interface PanoramixEventHistoryEntry {
  _id: string;
  action: EventHistoryAction;
  logasUserRef?: PanoramixUserRef;  // who performed the action (if logas)
  log?: Record<string, unknown>;    // action-specific details
}
```

### PanoramixRoom

```typescript
interface PanoramixRoom {
  _id: string;
  name: string;          // e.g. "Salle 223"
  seats: number;
  city: string;          // e.g. "Rennes"
  disabled: boolean;
  tpIds: TpId[];
}
```

### PanoramixModuleEnriched (from event)

```typescript
interface PanoramixModuleEnriched {
  _id: string;
  name: string;          // e.g. "T-DEV-810_msc2027 T-DEV-810 - Zoidberg2.0"
  code: string;          // e.g. "T-DEV-810_msc2027"
  tpIds: TpId[];         // links to Gandalf course IDs
  activityRef?: {
    _id: string;
    name: string;        // e.g. "Follow-up 1"
    tpIds: TpId[];       // links to Gandalf activity IDs
  };
  groupingsRef: unknown[];
}
```

### PanoramixModuleRef (minimal)

```typescript
interface PanoramixModuleRef {
  _id: string;
  name: string;
  code: string;
  tpIds: TpId[];
}
```

### PanoramixCohortGroup

```typescript
interface PanoramixCohortGroup {
  city: PanoramixCohort;
  curriculum: PanoramixCohort;
  promotion: PanoramixCohort;
}
```

### PanoramixCohort

```typescript
interface PanoramixCohort {
  _id: string;
  name: string;
  type: "city" | "curriculum" | "promotion";
}
```

### PanoramixUser (full, from login/localStorage)

```typescript
interface PanoramixUser {
  _id: string;                          // "aabbccdd11223344eeff5566"
  ionisId: string;                      // "ABCDE12345678901"
  login: string;                        // "john.doe@epitech.eu"
  firstName: string;
  lastName: string;
  disabled: boolean;
  tpIds: TpId[];                        // links to Gandalf user IDs
  cohortGroups: PanoramixCohortGroup[];  // user's city/curriculum/promotion
  modulesRef: PanoramixModuleRef[];      // user's enrolled modules
}
```

### PanoramixUserRef (minimal)

```typescript
interface PanoramixUserRef {
  _id: string;
  login: string;
  firstName: string;
  lastName: string;
}
```

### TpId (shared reference)

```typescript
interface TpId {
  id: string;
  source: "gandalf" | "intra" | "oai";
  sourceType?: string;  // e.g. "followup"
  _id?: string;
}
```

---

## Enums & Constants

### Event Types

```typescript
type EventType = "course" | "appointment" | "appointment_multiple";
```

| Value | Description |
|-------|-------------|
| `course` | Full-day course session (all students attend) |
| `appointment` | Appointment with single time slots (e.g. follow-ups, oral exams) |
| `appointment_multiple` | Appointment with multiple slot types |

### Event Registration Types

```typescript
type EventRegistrationType = "individual" | "group";
```

| Value | Description |
|-------|-------------|
| `individual` | Students register individually |
| `group` | Project groups register as a unit |

### Slot Types

```typescript
type SlotType = "break" | "slot" | "slot_multiple";
type SlotTypeSingle = "break" | "slot";
type SlotTypeMultiple = "break" | "slot_multiple";
```

### Event History Actions

```typescript
type EventHistoryAction =
  | "create"
  | "createMass"
  | "update"
  | "add_room"
  | "remove_room"
  | "register_student"
  | "force_register_student"
  | "register_staff"
  | "force_register_staff"
  | "unregister_student"
  | "force_unregister_student"
  | "unregister_staff"
  | "force_unregister_staff";
```

### Permission Actions (Cohort Groups)

```typescript
type CohortGroupAction = "create" | "read" | "update" | "delete" | "force_register_user" | "manage";
```

---

## Data Relationships

### Panoramix ↔ Gandalf Mapping

Panoramix and Gandalf entities are linked via `tpIds`:

| Panoramix Entity | Field | Gandalf Equivalent |
|------------------|-------|--------------------|
| Module | `moduleRef.tpIds[source="gandalf"].id` | Gandalf course ID |
| Activity | `activityRef.tpIds[source="gandalf"].id` | Gandalf activity/cm ID |
| Room | `roomsRef[].tpIds[source="intra"].id` | Intranet room ID |

**Example:** A Panoramix event for "Zoidberg2.0" has `moduleRef.tpIds = [{ id: "438", source: "gandalf" }]`, which maps to Gandalf course ID `438`.

### Gandalf Links in Event Detail

The event detail dialog provides direct links to Gandalf:
- **Module link:** `https://gandalf.epitech.eu/course/view.php?id={gandalfCourseId}`
- **Activity link:** `https://gandalf.epitech.eu/mod/followup/view.php?id={gandalfActivityId}`

---

## Pagination Pattern

All listing endpoints support:
- `limit` — number of results per page (default: 10)
- `offset` — skip N results

**Note:** There is no `total` count returned. To detect end of list, check if the returned array has fewer items than the `limit`.

---

## Important Notes

- **All timestamps are ISO 8601 strings** (not Unix seconds like Gandalf). No conversion with `fromUnixTime()` needed — use `new Date()` or `parseISO()` from date-fns directly.
- **304 Not Modified** — Panoramix supports ETags. Responses may return 304 with the browser serving from cache.
- **`access-control-allow-origin: *`** — The API allows CORS from any origin, but auth relies on a same-origin httpOnly cookie, so CORS requests without the cookie will be unauthenticated.
- **`refOnly=true`** — Many endpoints support this flag to return minimal fields. Useful for populating dropdowns and search results without heavy payloads.
- **Array query params** use the format `param[0]=value0&param[1]=value1` (bracket notation).
- **Module name format** follows the same pattern as Gandalf: `T-DEV-810_msc2027 T-DEV-810 - Zoidberg2.0`. Use the same display name stripping logic: `name.replace(/^T-\w+-\d+_\w+\s+T-\w+-\d+\s*-\s*/, '')`.
- **Token refresh** — The frontend uses a mutex-based token refresh flow. If a request returns an auth error, it acquires a lock, calls `GET /api/users/token`, and retries the original request.

---

## Endpoint Summary Table

| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| **Auth** | | | |
| POST | `/api/users/login` | Login (MSAL → JWT) | Public |
| POST | `/api/users/logout` | Logout | Authenticated |
| GET | `/api/users/token` | Refresh token | Authenticated |
| GET | `/api/users/token/:userId` | Logas token | Staff |
| **Users** | | | |
| GET | `/api/users` | Search users | Authenticated |
| GET | `/api/authorizationGroups/users` | Search staff | Authenticated |
| GET | `/api/users/settings` | Get user settings | Authenticated |
| PUT | `/api/users/settings` | Update settings | Authenticated |
| GET | `/api/users/cohortGroups` | Get user cohort groups | Authenticated |
| **Events** | | | |
| GET | `/api/events` | List/search events | Authenticated |
| GET | `/api/events/:id` | Get event detail | Authenticated |
| GET | `/api/events/:id/history` | Get event history | Authenticated |
| GET | `/api/events/module/:moduleId` | Events by module | Authenticated |
| GET | `/api/events/rooms/:cityId` | Events by city rooms | Authenticated |
| POST | `/api/events` | Create event | Staff |
| PUT | `/api/events/:id` | Update event | Staff |
| DELETE | `/api/events/:id` | Delete event | Staff |
| **Event Registration** | | | |
| POST | `/api/events/:id/:type/:registerId` | Register to slot | Authenticated |
| DELETE | `/api/events/:id/:type/:registerId` | Unregister from slot | Authenticated |
| POST | `/api/events/:id/force_register/:type` | Force register | Staff |
| DELETE | `/api/events/:id/force_register/:type` | Force unregister | Staff |
| POST | `/api/events/:id/force_register/users` | Force register (metadata) | Staff |
| DELETE | `/api/events/:id/force_register/users` | Force unregister (metadata) | Staff |
| **Room Registration** | | | |
| POST | `/api/events/:id/register/room` | Register room to slot | Staff |
| DELETE | `/api/events/:id/register/room` | Unregister room | Staff |
| POST | `/api/events/:id/register/mass/room` | Mass register rooms | Staff |
| DELETE | `/api/events/:id/register/mass/room` | Mass unregister rooms | Staff |
| **Rooms** | | | |
| GET | `/api/rooms` | Search/list rooms | Authenticated |
| GET | `/api/rooms/events` | Room events | Authenticated |
| **Modules** | | | |
| GET | `/api/modules/:id` | Get module | Authenticated |
| GET | `/api/modules` | Search modules | Authenticated |
| GET | `/api/modules/:id/groupings` | Module groupings | Authenticated |
| GET | `/api/modules/:id/projectGroups` | Project groups | Authenticated |
| GET | `/api/modules/:id/activities/:actId/followUps/:pgId` | Get follow-up | Authenticated |
| POST | `/api/modules/:id/activities/:actId/followUps/:pgId` | Save follow-up | Staff |
| **Cohorts** | | | |
| GET | `/api/cohorts` | List/search cohorts | Authenticated |
| GET | `/api/cohorts/:id` | Get cohort | Authenticated |
| DELETE | `/api/cohorts/:id` | Delete cohort | Admin |
| POST | `/api/cohorts/:id/users` | Add user to cohort | Admin |
| DELETE | `/api/cohorts/:id/users/:userId` | Remove user from cohort | Admin |

---

## Useful Frontend Patterns (for Dumbledore)

### Most Relevant Endpoints for Student-Facing Features

| Feature | Endpoint(s) |
|---------|-------------|
| Calendar view | `GET /api/events?start=...&end=...&registrationStatus=true` |
| Event detail | `GET /api/events/:eventId` |
| User's registered slots | `isRegistered` field from events with `registrationStatus=true` |
| Register for a slot | `POST /api/events/:eventId/:type/:registerId?slotIdx=N` |
| Unregister from a slot | `DELETE /api/events/:eventId/:type/:registerId?slotIdx=N` |
| Events by module | `GET /api/events/module/:moduleId` |
| Event history | `GET /api/events/:eventId/history` |
| User's project group | `GET /api/modules/:moduleId/projectGroups?userIds[0]=...` |
| Follow-up data | `GET /api/modules/:moduleId/activities/:actId/followUps/:pgId` |
| User settings | `GET /api/users/settings` / `PUT /api/users/settings` |
| Search rooms | `GET /api/rooms?search=...&city=...&refOnly=true` |
| User cohort groups | `GET /api/users/cohortGroups` |
