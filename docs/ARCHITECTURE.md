# Architecture

## System Overview

```
┌──────────────────────────────────────────────┐
│                  nginx :80                   │
│  ┌────────────┐  ┌─────────────────────────┐ │
│  │ SPA static │  │ reverse proxy           │ │
│  │ app/dist   │  │ /api/* → backend        │ │
│  │            │  │ /panoramix-api/* → back. │ │
│  └────────────┘  └──────────┬──────────────┘ │
└─────────────────────────────┼────────────────┘
                              │
┌─────────────────────────────▼────────────────┐
│              backend :3000                   │
│  Express (proxy Gandalf + Panoramix + API)   │
│  + cron jobs (check-deadlines)               │
│  + Redis (token storage for notifications)   │
└──────────────────────────────────────────────┘
```

In **development**, Vite replaces nginx and proxies API requests directly. In **production**, Docker Compose orchestrates nginx + backend + redis.

## Authentication

### Gandalf (Moodle)

```
User pastes MoodleSession cookie
        │
        ▼
AuthProvider.login(token)
        │
        ▼
GandalfAPI.init()
  ├── GET /api/my/ (with X-Moodle-Session header)
  ├── Proxy rewrites to https://gandalf.epitech.eu/my/
  │   and sets Cookie: MoodleSession={token}
  ├── Parse HTML response for:
  │   - sesskey (regex: /"sesskey":"([^"]+)"/)
  │   - userid  (regex: /data-userid="(\d+)"/)
  └── Return { sesskey, userid }
        │
        ▼
AuthProvider stores { token, api, user, userid } in React state
localStorage persists the token across reloads
```

MoodleSession cookies expire after ~2h of inactivity.

### Panoramix (Calendar)

Two-step JWT auth:

1. User provides `refresh_token` (httpOnly cookie from `panoramix.epitest.eu`)
2. `PanoramixAPI.init()` exchanges it for a short-lived access JWT via `GET /users/token`
3. All API calls use `Authorization: Bearer <accessJWT>`
4. On 401, `fetchWithRetry()` auto-refreshes the token and retries

See `docs/PANORAMIX_API.md` for full API reference.

## Proxy Mechanism

### Development (Vite)

```
Browser:  POST /api/lib/ajax/service.php?sesskey=ABC&info=core_course_get_recent_courses
          Headers: { X-Moodle-Session: "token" }

Vite:     POST https://gandalf.epitech.eu/lib/ajax/service.php?sesskey=ABC&...
          Headers: { Cookie: "MoodleSession=token" }
```

Vite's `configure` callback converts the `X-Moodle-Session` header to a `Cookie` header. A custom middleware also handles `pluginfile.php` downloads (S3 redirects cause CORS issues, so the middleware follows redirects server-side).

Panoramix proxy works similarly: `/panoramix-api/*` → `panoramix.epitest.eu/api/*` with `Cookie: refresh_token=<value>`.

### Production (Express)

The Express server (`server/src/proxy.ts`) does the same proxying with `http-proxy-middleware`:
- `/api/*` → `gandalf.epitech.eu/*`
- `/panoramix-api/*` → `panoramix.epitest.eu/api/*`
- Download proxy with redirect allowlist (`gandalf.epitech.eu`, `*.amazonaws.com`)

Security features: rate limiting, CORS, security headers, Redis key sanitization.

## API Clients

### GandalfAPI (`lib/gandalf-api.ts`)

Stateful class — holds `sessionToken` and `sesskey`.

```
GandalfAPI
├── init()                        # Fetch /my/, extract sesskey + userid
├── call<T>(method, args)         # Authenticated AJAX call
├── getUserProfile(userid)        # core_user_get_users_by_field
├── getCourses(classification)    # core_course_get_enrolled_courses_by_timeline_classification
├── getRecentCourses(limit)       # core_course_get_recent_courses
├── getCourseState(courseid)      # core_courseformat_get_state (returns JSON string!)
├── getActionEvents(from, limit)  # core_calendar_get_action_events_by_timesort
├── getEventsByCourse(courseid)   # core_calendar_get_action_events_by_course
├── getMonthlyCalendar(y, m)      # core_calendar_get_calendar_monthly_view
└── getNotifications(userid)      # message_popup_get_popup_notifications
```

All Moodle AJAX calls follow the same pattern:
```
POST /lib/ajax/service.php?sesskey={SESSKEY}&info={METHOD_NAME}
Body: [{ "index": 0, "methodname": "{METHOD_NAME}", "args": { ... } }]
Response: [{ "error": false, "data": { ... } }]
```

See `docs/API.md` for the full Moodle API reference.

### PanoramixAPI (`lib/panoramix-api.ts`)

See `docs/PANORAMIX_API.md` for endpoints and types.

## State Management

- **React Context** (`AuthProvider`) — auth state (tokens, API instances, user profile)
- **Local `useState`** — page-specific data, fetched in `useEffect`
- **`localStorage`** — session persistence only (tokens)

```tsx
function MyPage() {
  const { api, userid } = useAuth();
  const [data, setData] = useState<MyType[]>([]);

  useEffect(() => {
    if (!api) return;
    api.getSomething().then(setData);
  }, [api]);

  return <>{/* render data */}</>;
}
```

## Push Notifications

See `docs/PUSH_NOTIFICATIONS.md`. Uses ntfy.sh with a cron job that checks Panoramix events and sends reminders.

## Component Architecture

```
App
├── BrowserRouter
│   └── AuthProvider
│       └── ThemeProvider
│           └── ToastProvider
│               └── Routes
│                   ├── /login → PublicRoute → Login
│                   ├── /demo → PublicRoute → DemoLogin
│                   └── /* → ProtectedRoute → Layout
│                       ├── /            → Dashboard
│                       ├── /courses     → Courses
│                       ├── /calendar    → Calendar
│                       ├── /manage      → ManageTokens
│                       └── /push-notifications → PushNotifications
```

Key component directories:
- `components/calendar/` — Calendar views (day, week, month) + event detail modal
- `components/gantt/` — Gantt chart (header, rows, constants)
- `components/Layout.tsx` — Sidebar nav + header + dropdown menu

### Conventions

- One component per file, `export default`
- Path alias: `@/` → `app/src/`
- Icons from `lucide-react` only
- Every element needs light + dark mode classes (see `docs/STYLE_GUIDE.md`)
- Types imported from `@/lib/gandalf-api` and `@/lib/panoramix-api`

## Deployment

See `docs/DEPLOYMENT.md` for Docker Compose setup and deployment commands.
