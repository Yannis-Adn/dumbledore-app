import { GandalfAPI } from './gandalf-api';
import type {
  UserProfile, Course, CalendarEvent, CoursesResponse,
  EventsResponse, GradingResult, ProfileProject,
  CourseClassification, CourseState,
} from './gandalf-api';
import { PanoramixAPI } from './panoramix-api';
import type { PanoramixEvent, PanoramixEventDetail, PanoramixCohortGroup } from './panoramix-api';
import { getPlanningDay } from './planning';

// ─── Relative date helpers (computed once at module load) ─────────────────────
// Use midnight UTC as base so wk()+iso() never overflow to the next calendar day
const _today = new Date(); _today.setUTCHours(0, 0, 0, 0);
const NOW_S = Math.floor(_today.getTime() / 1000);
const DAY = 86400;

/** Unix timestamp N days from now (negative = past) */
const d = (days: number) => NOW_S + days * DAY;

/** ISO 8601 string N days + hours + minutes from now */
const iso = (days: number, hours = 0, minutes = 0) =>
  new Date((NOW_S + days * DAY + hours * 3600 + minutes * 60) * 1000).toISOString();

/** Date string YYYY-MM-DD N days from now */
const dateStr = (days: number) =>
  new Date((NOW_S + days * DAY) * 1000).toISOString().split('T')[0];

/** Shift offset to nearest weekday (Mon-Fri) */
const wk = (days: number): number => {
  const dow = new Date((NOW_S + days * DAY) * 1000).getUTCDay();
  if (dow === 0) return days + 1; // Sun → Mon
  if (dow === 6) return days + 2; // Sat → Mon
  return days;
};

/** Shift offset to nearest school day (of=true in planning data).
 *  Falls back to wk() if no planning data covers the date range. */
const school = (days: number): number => {
  for (let i = 0; i < 14; i++) {
    const candidate = days + i;
    const date = dateStr(candidate);
    const planning = getPlanningDay(date);
    if (planning?.of) return candidate;
    // If no planning data, fallback to weekday
    if (!planning && i === 0) return wk(days);
  }
  return wk(days); // fallback
};

/** Shift offset to nearest Saturday (for weekend hackathons) */
const we = (days: number): number => {
  const dow = new Date((NOW_S + days * DAY) * 1000).getUTCDay();
  if (dow === 6 || dow === 0) return days; // already weekend
  return days + (6 - dow); // jump to Saturday
};

// ─── User ─────────────────────────────────────────────────────────────────────
export const DEMO_USER: UserProfile = {
  id: 42,
  username: 'alex.martin',
  fullname: 'Alex Martin',
  email: 'alex.martin@epitech.eu',
  department: 'MSc 1',
  institution: 'Epitech',
  idnumber: 'msc2027',
  firstaccess: d(-365),
  lastaccess: d(0),
  city: 'Rennes',
  profileimageurlsmall: '',
  profileimageurl: '',
  customfields: [],
};

// ─── Course images ────────────────────────────────────────────────────────────
const IMG_GREEN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23B5C9A8'/%3E%3Cstop offset='1' stop-color='%238AAF78'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E";
const IMG_PURPLE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23C4B5D8'/%3E%3Cstop offset='1' stop-color='%23A68EC4'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E";
const IMG_TEAL =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23A8CCC8'/%3E%3Cstop offset='1' stop-color='%237BB5AF'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E";
const IMG_ORANGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23E8C9A0'/%3E%3Cstop offset='1' stop-color='%23D4A96E'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E";
const IMG_BLUE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23A8B8D8'/%3E%3Cstop offset='1' stop-color='%236B8EC4'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E";
const IMG_RED =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3ClinearGradient id='g' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23D8A8A8'/%3E%3Cstop offset='1' stop-color='%23C47070'/%3E%3C/linearGradient%3E%3Crect width='100' height='100' fill='url(%23g)'/%3E%3C/svg%3E";

// ─── Cohort group ─────────────────────────────────────────────────────────────
const DEMO_COHORT: PanoramixCohortGroup = {
  city:       { _id: 'city_rennes', name: 'Rennes',   type: 'city' },
  curriculum: { _id: 'cur_msc1',    name: 'MSc 1',    type: 'curriculum' },
  promotion:  { _id: 'promo_2027',  name: 'Promo 2027', type: 'promotion' },
};

// ─── Courses ──────────────────────────────────────────────────────────────────
const mkCourse = (
  id: number, shortcode: string, name: string, summary: string,
  start: number, end: number, progress: number, image: string,
  semester: string, fav = false, timeaccess = d(0),
): Course => ({
  id,
  fullname: `${shortcode} - ${name}`,
  shortname: `${shortcode}_msc2027`,
  idnumber: shortcode,
  summary,
  startdate: start,
  enddate: end,
  visible: true,
  fullnamedisplay: `${shortcode} - ${name}`,
  viewurl: '#',
  courseimage: image,
  progress,
  hasprogress: true,
  isfavourite: fav,
  hidden: false,
  showshortname: true,
  coursecategory: semester,
  timeaccess,
});

// Active projects — deadlines spread from +30d to +120d
const COURSE_1001 = mkCourse(1001, 'T-DEV-810', 'Zoidberg 2.0',
  'Backend API in Rust — multi-service architecture with CQRS and event sourcing.',
  d(-30), d(+37), 65, IMG_GREEN, 'S9');
const COURSE_1002 = mkCourse(1002, 'T-WEB-900', 'Babel Fish',
  'Full-stack multilingual platform with real-time collaboration — React + WebSockets.',
  d(-20), d(+68), 40, IMG_PURPLE, 'S9', true);
const COURSE_1003 = mkCourse(1003, 'T-AI-902', 'NeuralDump',
  'Modular LLM inference pipeline with automated evaluation harness and benchmarking.',
  d(-14), d(+128), 18, IMG_TEAL, 'S9');

// Past / graded
const COURSE_1004 = mkCourse(1004, 'T-SEC-101', 'CryptoVault',
  'Security project — AES-256 encryption vault with tamper-evident audit trails.',
  d(-210), d(-150), 100, IMG_ORANGE, 'S8', false, d(-120));
const COURSE_1005 = mkCourse(1005, 'T-OPS-702', 'DevOps Pipeline',
  'Infrastructure as code — Kubernetes cluster with full observability stack and GitOps workflow.',
  d(-150), d(-90), 100, IMG_BLUE, 'S8', false, d(-80));
// Recently graded — shows in recent courses
const COURSE_1006 = mkCourse(1006, 'T-NET-601', 'EiffelTower',
  'Custom TCP/IP stack implementation in C — reliable transport protocol over lossy links.',
  d(-75), d(-10), 100, IMG_RED, 'S7', false, d(-2));

const DEMO_ACTIVE_COURSES = [COURSE_1001, COURSE_1002, COURSE_1003];
const DEMO_PAST_COURSES   = [COURSE_1004, COURSE_1005, COURSE_1006];
const DEMO_ALL_COURSES    = [...DEMO_ACTIVE_COURSES, ...DEMO_PAST_COURSES];

// ─── Calendar events ──────────────────────────────────────────────────────────
// isFinal=true → modulename 'assign' → flag icon on Gantt
// isFinal=false → modulename 'feedback' → day-number dot on Gantt
const mkCalEv = (
  id: number, name: string, timesort: number, course: Course,
  overdue: boolean, actionable: boolean, isFinal = false,
): CalendarEvent => ({
  id, name, description: '',
  component: isFinal ? 'mod_assign' : 'mod_feedback',
  modulename: isFinal ? 'assign' : 'feedback',
  activityname: isFinal ? 'assign' : 'feedback',
  activitystr: isFinal ? 'Assignment' : 'Feedback',
  instance: id, eventtype: 'user',
  timestart: timesort, timeduration: 0, timesort, overdue,
  icon: { key: isFinal ? 'assign' : 'feedback', component: isFinal ? 'mod_assign' : 'mod_feedback', iconurl: '' },
  course, isactionevent: true, iscourseevent: false, purpose: 'event', url: '#',
  action: { name: actionable ? 'Add submission' : 'View submission', url: '#', itemcount: 1, actionable },
});

const DEMO_EVENTS: CalendarEvent[] = [
  // Zoidberg 2.0 — final at +30d (flag only on final)
  mkCalEv(10011, 'Zoidberg 2.0 — Setup & Architecture', d(-12), COURSE_1001, false, false),
  mkCalEv(10012, 'Zoidberg 2.0 — Core Services',        d(+10), COURSE_1001, false, true),
  mkCalEv(10013, 'Zoidberg 2.0 — Integration & Tests',  d(+20), COURSE_1001, false, true),
  mkCalEv(10014, 'Zoidberg 2.0 — Rendu final',          d(+30), COURSE_1001, false, true, true),

  // Babel Fish — final at +60d
  mkCalEv(10021, 'Babel Fish — Architecture & Specs',    d(-5),  COURSE_1002, false, false),
  mkCalEv(10022, 'Babel Fish — API & Backend',           d(+16), COURSE_1002, false, true),
  mkCalEv(10023, 'Babel Fish — Frontend & Integration',  d(+38), COURSE_1002, false, true),
  mkCalEv(10024, 'Babel Fish — Rendu final',             d(+60), COURSE_1002, false, true, true),

  // NeuralDump — final at +120d
  mkCalEv(10031, 'NeuralDump — Data Pipeline',           d(+7),   COURSE_1003, false, true),
  mkCalEv(10032, 'NeuralDump — Model Architecture',      d(+35),  COURSE_1003, false, true),
  mkCalEv(10033, 'NeuralDump — Training & Evaluation',   d(+75),  COURSE_1003, false, true),
  mkCalEv(10034, 'NeuralDump — Rendu final',             d(+120), COURSE_1003, false, true, true),
];

// ─── Grading results — active projects (not yet graded, rater_name null) ─────

const ACHIEVEMENTS_1001: GradingResult[] = [{
  grading_id: 1, grading_name: 'Critères de notation', count_achievements: 15, count_achievements_success: 0,
  achievements: [
    { achievement_name: 'CQRS pattern', achievement_description: 'Commands and queries cleanly separated with dedicated handlers', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Event sourcing', achievement_description: 'Domain events persisted as source of truth with replay capability', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Service isolation', achievement_description: 'Each microservice has its own data store, no shared DB', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'API gateway', achievement_description: 'Centralized routing, rate limiting and authentication', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'No memory leaks', achievement_description: 'Valgrind / ASAN clean — 0 errors, 0 warnings', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Clippy compliance', achievement_description: 'No clippy warnings, idiomatic Rust code throughout', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Test coverage > 80%', achievement_description: 'Unit + integration tests across all services', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Error handling', achievement_description: 'Typed error propagation with proper context — no unwrap() in prod code', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Docker multi-stage', achievement_description: 'Optimized Docker images with multi-stage builds (<100MB)', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'CI pipeline', achievement_description: 'Automated build + test + lint on every PR', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Database migrations', achievement_description: 'Versioned schema migrations with rollback support', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Health checks', achievement_description: 'Readiness + liveness probes for all services', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Architecture Decision Records', achievement_description: 'ADRs for all major technical decisions', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'API documentation', achievement_description: 'OpenAPI / Swagger spec for all endpoints', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'README & setup guide', achievement_description: 'One-command dev setup with clear contribution guidelines', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
  ],
}];

const ACHIEVEMENTS_1002: GradingResult[] = [{
  grading_id: 1, grading_name: 'Critères de notation', count_achievements: 15, count_achievements_success: 0,
  achievements: [
    { achievement_name: 'Component architecture', achievement_description: 'Reusable, composable React components with clear props API', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Real-time sync', achievement_description: 'WebSocket-based live collaboration with conflict resolution', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'i18n support', achievement_description: 'At least 3 languages with dynamic locale switching', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Responsive design', achievement_description: 'Mobile-first UI, functional on all screen sizes', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'REST API design', achievement_description: 'RESTful endpoints with proper status codes and pagination', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Authentication', achievement_description: 'JWT auth with refresh tokens and role-based access', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'WebSocket server', achievement_description: 'Scalable WS server with room management and heartbeat', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Database design', achievement_description: 'Normalized schema with proper indexes and constraints', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Unit tests', achievement_description: 'Component and utility unit tests with >70% coverage', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'E2E tests', achievement_description: 'Playwright tests covering critical user flows', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Accessibility', achievement_description: 'WCAG 2.1 AA compliance, keyboard navigation, screen reader support', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Performance', achievement_description: 'Lighthouse performance score >90, bundle size optimized', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'CI/CD pipeline', achievement_description: 'Automated deployment on merge to main', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Environment management', achievement_description: 'Staging + production environments with proper config', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Monitoring', achievement_description: 'Error tracking, uptime monitoring and alerting', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
  ],
}];

const ACHIEVEMENTS_1003: GradingResult[] = [{
  grading_id: 1, grading_name: 'Critères de notation', count_achievements: 15, count_achievements_success: 0,
  achievements: [
    { achievement_name: 'Data ingestion', achievement_description: 'Scalable data loading with format validation and error handling', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Preprocessing', achievement_description: 'Tokenization, cleaning, deduplication pipeline', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Dataset versioning', achievement_description: 'DVC or equivalent for reproducible dataset management', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Data quality metrics', achievement_description: 'Automated checks for data drift and quality regression', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Modular design', achievement_description: 'Swappable model components (encoder, decoder, attention)', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Inference optimization', achievement_description: 'Quantization and/or distillation for production inference', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Multi-GPU support', achievement_description: 'Distributed training with proper gradient synchronization', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Config management', achievement_description: 'Hydra / YAML configs for reproducible experiments', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Automated eval harness', achievement_description: 'Reproducible evaluation pipeline with standard benchmarks', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Custom metrics', achievement_description: 'Domain-specific evaluation metrics beyond perplexity', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Baseline comparison', achievement_description: 'Systematic comparison against published baselines', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Ablation studies', achievement_description: 'Documented ablation experiments for key design choices', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Experiment tracking', achievement_description: 'MLflow / W&B with logged metrics, params and artifacts', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Technical report', achievement_description: 'Paper-quality report with methodology, results and analysis', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
    { achievement_name: 'Reproducibility', achievement_description: 'Full pipeline reproducible from scratch with single command', achievement_grade: 0, achievement_remark: null, grade_date: null, rater_name: null },
  ],
}];

// ─── Grading results — past projects (rater_name non-null → trophy) ──────────
const ACHIEVEMENTS_1004: GradingResult[] = [{
  grading_id: 1, grading_name: 'Critères de notation', count_achievements: 12, count_achievements_success: 12,
  achievements: [
    { achievement_name: 'AES-256-GCM', achievement_description: 'Authenticated encryption with verified key derivation (PBKDF2)', achievement_grade: 1, achievement_remark: 'Implémentation conforme aux specs NIST.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Key management', achievement_description: 'Secure key generation, storage and rotation mechanism', achievement_grade: 1, achievement_remark: 'Bonne gestion des clés avec rotation automatique.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Envelope encryption', achievement_description: 'Data keys wrapped with master key — separate key hierarchy', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Side-channel protection', achievement_description: 'Constant-time comparison, no timing leaks in crypto ops', achievement_grade: 1, achievement_remark: 'Bon travail sur la résistance aux attaques par canal auxiliaire.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'HMAC chain', achievement_description: 'Tamper-evident audit log with chained HMAC signatures', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Access logging', achievement_description: 'All vault operations logged with timestamp, user and action', achievement_grade: 1, achievement_remark: 'Logs complets et exploitables.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Integrity verification', achievement_description: 'CLI tool to verify full chain integrity from genesis block', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'No memory leaks', achievement_description: 'Valgrind clean — 0 errors, 0 warnings', achievement_grade: 1, achievement_remark: 'Excellent travail sur la gestion mémoire.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Clean code', achievement_description: 'No clippy warnings, idiomatic Rust throughout', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Test coverage > 80%', achievement_description: 'Unit + integration tests with mocked crypto primitives', achievement_grade: 1, achievement_remark: 'Bonne couverture de tests.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'Threat model', achievement_description: 'Documented threat model covering key attack scenarios', achievement_grade: 1, achievement_remark: 'Modèle de menaces complet et bien structuré.', grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
    { achievement_name: 'CLI usability', achievement_description: 'Intuitive CLI with help, autocompletion and error messages', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-145), rater_name: 'Sophie Bernard' },
  ],
}];

const ACHIEVEMENTS_1005: GradingResult[] = [{
  grading_id: 1, grading_name: 'Critères de notation', count_achievements: 12, count_achievements_success: 10,
  achievements: [
    { achievement_name: 'Kubernetes deployment', achievement_description: 'Multi-replica pods with HPA autoscaling', achievement_grade: 1, achievement_remark: 'Bonne configuration HPA.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'GitOps workflow', achievement_description: 'ArgoCD syncing infra from Git — declarative deployments', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Helm charts', achievement_description: 'Parameterized Helm charts for all services with values per env', achievement_grade: 1, achievement_remark: 'Charts bien structurés et réutilisables.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Network policies', achievement_description: 'Kubernetes NetworkPolicies restricting inter-pod communication', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Metrics collection', achievement_description: 'Prometheus scraping with custom application metrics', achievement_grade: 1, achievement_remark: 'Métriques pertinentes et bien nommées.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Dashboards', achievement_description: 'Grafana dashboards with SLI/SLO tracking', achievement_grade: 1, achievement_remark: 'Dashboards clairs et pertinents.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Alerting rules', achievement_description: 'Alertmanager rules for SLO breaches with PagerDuty integration', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Automated tests', achievement_description: 'Unit + integration + e2e tests running on every PR', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Canary deployment', achievement_description: 'Progressive rollout with automated rollback on error spike', achievement_grade: 1, achievement_remark: 'Bon mécanisme de canary avec Argo Rollouts.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Secret management', achievement_description: 'Sealed Secrets or external-secrets for sensitive values', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Load testing', achievement_description: 'k6 stress test with SLO validation in CI', achievement_grade: 0, achievement_remark: 'Tests de charge insuffisants — SLO non validé sous 1000 RPS.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
    { achievement_name: 'Runbook', achievement_description: 'Incident response runbook with troubleshooting procedures', achievement_grade: 0, achievement_remark: 'Runbook incomplet — manque les procédures de rollback DB.', grade_date: dateStr(-85), rater_name: 'Marc Bertrand' },
  ],
}];

const ACHIEVEMENTS_1006: GradingResult[] = [{
  grading_id: 1, grading_name: 'Critères de notation', count_achievements: 12, count_achievements_success: 7,
  achievements: [
    { achievement_name: 'TCP handshake', achievement_description: '3-way handshake (SYN, SYN-ACK, ACK) and connection teardown', achievement_grade: 1, achievement_remark: 'Correct, conforme à la RFC 793.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Reliable transmission', achievement_description: 'ARQ with sliding window over lossy link (Go-Back-N)', achievement_grade: 1, achievement_remark: 'Bonne implémentation du sliding window.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Flow control', achievement_description: 'Receiver-advertised window with proper backpressure', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'IP packet parsing', achievement_description: 'Correct parsing and construction of IPv4 headers', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Checksum verification', achievement_description: 'Internet checksum calculation and validation', achievement_grade: 1, achievement_remark: 'Implémentation correcte.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Memory safety', achievement_description: 'No buffer overflows, use-after-free or memory leaks', achievement_grade: 1, achievement_remark: 'Valgrind clean.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Test suite', achievement_description: 'Unit tests for packet parsing + integration tests for protocol', achievement_grade: 1, achievement_remark: null, grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Congestion control', achievement_description: 'AIMD algorithm (slow start, congestion avoidance, fast retransmit)', achievement_grade: 0, achievement_remark: 'Congestion window non fonctionnel sous stress — fast retransmit absent.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Fragmentation', achievement_description: 'IP fragmentation and reassembly for oversized packets', achievement_grade: 0, achievement_remark: 'Fragmentation partielle — reassembly échoue avec paquets out-of-order.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Error handling', achievement_description: 'Graceful handling of malformed packets and connection timeouts', achievement_grade: 0, achievement_remark: 'Timeout handling incomplet — connexion bloquée sur paquets perdus.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'RFC-style spec', achievement_description: 'Protocol specification document following RFC format', achievement_grade: 0, achievement_remark: 'Manque de rigueur — les diagrammes d\'état sont absents.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
    { achievement_name: 'Architecture doc', achievement_description: 'Component diagram and data flow documentation', achievement_grade: 0, achievement_remark: 'Documentation insuffisante — pas de schéma d\'architecture.', grade_date: dateStr(-7), rater_name: 'Isabelle Leclerc' },
  ],
}];

// ─── Profile projects ─────────────────────────────────────────────────────────
const DEMO_PROFILE_PROJECTS: ProfileProject[] = [
  { courseShortname: 'T-DEV-810_msc2027', courseName: 'T-DEV-810 - Zoidberg 2.0', courseId: 1001, semester: 'S9',
    grades: [{ name: 'Project', grade: null, gradeMax: 100, feedback: null }],
    group: { name: 'Team Zoidberg', members: ['alex.martin@epitech.eu', 'leo.dupont@epitech.eu', 'emma.rousseau@epitech.eu'] } },
  { courseShortname: 'T-WEB-900_msc2027', courseName: 'T-WEB-900 - Babel Fish', courseId: 1002, semester: 'S9',
    grades: [{ name: 'Project', grade: null, gradeMax: 100, feedback: null }],
    group: { name: 'Team Babel', members: ['alex.martin@epitech.eu', 'clara.renaud@epitech.eu', 'julien.lambert@epitech.eu', 'sofia.moreira@epitech.eu'] } },
  { courseShortname: 'T-AI-902_msc2027', courseName: 'T-AI-902 - NeuralDump', courseId: 1003, semester: 'S9',
    grades: [{ name: 'Project', grade: null, gradeMax: 100, feedback: null }],
    group: { name: 'Team Neural', members: ['alex.martin@epitech.eu', 'leo.dupont@epitech.eu', 'thomas.simon@epitech.eu'] } },
  { courseShortname: 'T-SEC-101_msc2027', courseName: 'T-SEC-101 - CryptoVault', courseId: 1004, semester: 'S8',
    grades: [{ name: 'Project', grade: 80, gradeMax: 100, feedback: 'Excellent travail sur la gestion mémoire et la sécurité. Implémentation AES-256-GCM conforme aux specs NIST. Architecture claire et bien documentée. Bonne résistance aux attaques par canal auxiliaire.' }],
    group: { name: 'Team Crypto', members: ['alex.martin@epitech.eu', 'emma.rousseau@epitech.eu', 'leo.dupont@epitech.eu'] } },
  { courseShortname: 'T-OPS-702_msc2027', courseName: 'T-OPS-702 - DevOps Pipeline', courseId: 1005, semester: 'S8',
    grades: [{ name: 'Project', grade: 70, gradeMax: 100, feedback: 'Bonne maîtrise de Kubernetes et de l\'observabilité. Pipeline CI/CD fonctionnel et GitOps bien implémenté. Les tests de charge sont insuffisants — SLO non validé sous 1000 RPS. Runbook incomplet.' }],
    group: { name: 'Team Pipeline', members: ['alex.martin@epitech.eu', 'clara.renaud@epitech.eu', 'thomas.simon@epitech.eu'] } },
  { courseShortname: 'T-NET-601_msc2027', courseName: 'T-NET-601 - EiffelTower', courseId: 1006, semester: 'S7',
    grades: [{ name: 'Project', grade: 58, gradeMax: 100, feedback: 'Projet fonctionnel sur les cas nominaux. Handshake TCP et transmission fiable corrects. Congestion control non fonctionnel sous stress. Fragmentation IP partielle. Documentation insuffisante — pas de schéma d\'architecture ni de diagrammes d\'état.' }],
    group: { name: 'Team Eiffel', members: ['alex.martin@epitech.eu', 'julien.lambert@epitech.eu'] } },
];

// ─── Panoramix helpers ────────────────────────────────────────────────────────
const mkApptEv = (
  id: string, title: string, start: string, end: string,
  courseId: string, code: string, modName: string, actName: string,
  seats: number, registered: boolean, roomName = '203',
): PanoramixEvent => ({
  _id: id, title, start, end,
  type: 'appointment', registrationType: 'group',
  roomsRef: [{ _id: `room_${id}`, name: roomName, seats, city: 'Rennes', disabled: false, tpIds: [] }],
  seats,
  moduleRef: {
    _id: `mod_${courseId}`, name: modName, code,
    tpIds: [{ id: courseId, source: 'gandalf' as const }],
    activityRef: { _id: `act_${id}`, name: actName, tpIds: [] },
    groupingsRef: [],
  },
  cohortGroups: [DEMO_COHORT], visible: true,
  isRegistered: registered ? { start, end: new Date(new Date(start).getTime() + 30 * 60000).toISOString() } : null,
});

const mkCourseEv = (
  id: string, title: string, start: string, end: string,
  code: string, modName: string, rooms: string[] = [], registered = false,
): PanoramixEvent => ({
  _id: id, title, start, end,
  type: 'course', registrationType: 'individual',
  roomsRef: rooms.map((name, i) => ({ _id: `room_${id}_${i}`, name, seats: 30, city: 'Rennes', disabled: false, tpIds: [] })),
  seats: null,
  moduleRef: { _id: `mod_${id}`, name: modName, code, tpIds: [], activityRef: undefined, groupingsRef: [] },
  cohortGroups: [DEMO_COHORT], visible: true,
  isRegistered: registered ? { start, end } : null,
});

// ─── Panoramix events (school-day-adjusted, except hackathons on weekends) ───
const DEMO_PANORAMIX_EVENTS: PanoramixEvent[] = [
  // ── Zoidberg (1001) follow-ups: registered / not / registered ─────────────
  mkApptEv('px_1001_1', 'Follow-Up — Zoidberg 2.0',
    iso(school(2), 10), iso(school(2), 11),
    '1001', 'T-DEV-810', 'T-DEV-810 — Zoidberg 2.0', 'Follow-Up', 6, true, '203'),
  mkApptEv('px_1001_2', 'Follow-Up — Zoidberg 2.0',
    iso(school(15), 14), iso(school(15), 15),
    '1001', 'T-DEV-810', 'T-DEV-810 — Zoidberg 2.0', 'Follow-Up', 6, false, '205'),
  mkApptEv('px_1001_3', 'Follow-Up — Zoidberg 2.0',
    iso(school(25), 9), iso(school(25), 11),
    '1001', 'T-DEV-810', 'T-DEV-810 — Zoidberg 2.0', 'Follow-Up', 8, true, '210'),

  // ── Babel Fish (1002) follow-ups: registered / not / registered ───────────
  mkApptEv('px_1002_1', 'Follow-Up — Babel Fish',
    iso(school(5), 14), iso(school(5), 15),
    '1002', 'T-WEB-900', 'T-WEB-900 — Babel Fish', 'Follow-Up', 4, true, '204'),
  mkApptEv('px_1002_2', 'Follow-Up — Babel Fish',
    iso(school(26), 10), iso(school(26), 11),
    '1002', 'T-WEB-900', 'T-WEB-900 — Babel Fish', 'Follow-Up', 4, false, '204'),
  mkApptEv('px_1002_3', 'Follow-Up — Babel Fish',
    iso(school(50), 9), iso(school(50), 11),
    '1002', 'T-WEB-900', 'T-WEB-900 — Babel Fish', 'Follow-Up', 8, true, '215'),

  // ── NeuralDump (1003) follow-ups: not / not ──────────────────────────────
  mkApptEv('px_1003_1', 'Follow-Up — NeuralDump',
    iso(school(12), 9), iso(school(12), 10),
    '1003', 'T-AI-902', 'T-AI-902 — NeuralDump', 'Follow-Up', 6, false, '208'),
  mkApptEv('px_1003_2', 'Follow-Up — NeuralDump',
    iso(school(55), 10), iso(school(55), 11),
    '1003', 'T-AI-902', 'T-AI-902 — NeuralDump', 'Follow-Up', 6, false, '208'),

  // ── Alternance ────────────────────────────────────────────────────────────
  mkApptEv('px_alt', 'Suivi entreprise — point d\'avancement',
    iso(school(41), 14), iso(school(41), 15),
    'alt', 'ALT-900', 'Alternance', 'Suivi entreprise', 1, true, '201'),

  // ── Hackathons (on weekends) — first one registered ──────────────────────
  mkCourseEv('px_hack_1', 'Hackathon — IA pour le Bien',
    iso(we(3), 8), iso(we(3) + 1, 18),
    'HACK-001', 'Hackathon IA pour le Bien', ['200', '201', '215'], true),
  mkCourseEv('px_hack_2', 'Hackathon — DevOps & Cloud Challenge',
    iso(we(31), 8), iso(we(31) + 1, 18),
    'HACK-002', 'Hackathon DevOps & Cloud Challenge', ['200', '201']),
  mkCourseEv('px_hack_3', 'Hackathon — CTF Security War Games',
    iso(we(66), 8), iso(we(66) + 1, 18),
    'HACK-003', 'CTF Security War Games', ['200', '201', '202']),

  // ── HubTalks (school days, every ~2-3 weeks) ───────────────────────────────
  mkCourseEv('px_hub_1', 'HubTalk — Rust en production : retour Cloudflare',
    iso(school(8), 15), iso(school(8), 17), 'HUB-001', 'HubTalks', ['215']),
  mkCourseEv('px_hub_2', 'HubTalk — ML à grande échelle : défis et solutions',
    iso(school(21), 15), iso(school(21), 17), 'HUB-002', 'HubTalks', ['215']),
  mkCourseEv('px_hub_3', 'HubTalk — Sécurité offensive en 2026',
    iso(school(35), 15), iso(school(35), 17), 'HUB-003', 'HubTalks', ['215']),
  mkCourseEv('px_hub_4', 'HubTalk — Open Source & business : le modèle GitLab',
    iso(school(51), 15), iso(school(51), 17), 'HUB-004', 'HubTalks', ['215']),
  mkCourseEv('px_hub_5', 'HubTalk — Kubernetes en prod : retours terrain',
    iso(school(79), 15), iso(school(79), 17), 'HUB-005', 'HubTalks', ['215']),
  mkCourseEv('px_hub_6', 'HubTalk — Blockchain & Web3 : au-delà du hype',
    iso(school(100), 15), iso(school(100), 17), 'HUB-006', 'HubTalks', ['215']),

  // ── Keynotes (school days, ~10d after each project's final deadline) ───────
  mkCourseEv('px_key_1001', 'Keynote — Architecture distribuée avec Rust',
    iso(school(40), 14), iso(school(40), 17), 'KEY-001', 'Keynotes', ['215']),
  mkCourseEv('px_key_1002', 'Keynote — WebSockets et collaboration temps réel',
    iso(school(70), 14), iso(school(70), 17), 'KEY-002', 'Keynotes', ['215']),
  mkCourseEv('px_key_1003', 'Keynote — LLMs en production : évaluation et déploiement',
    iso(school(130), 14), iso(school(130), 17), 'KEY-003', 'Keynotes', ['215']),

  // ── Other school events ─────────────────────────────────────────────────────
  mkCourseEv('px_forum', 'Forum des entreprises MSc',
    iso(school(15), 8, 30), iso(school(15), 18),
    'FORUM-001', 'Forum des entreprises', ['200', '210']),
  mkCourseEv('px_atelier', 'Atelier CV & LinkedIn — préparer sa recherche',
    iso(school(10), 9), iso(school(10), 12),
    'ATL-001', 'Ateliers carrière', ['203']),
];

// ─── Event descriptions ──────────────────────────────────────────────────────
const DEMO_DESCRIPTIONS: Record<string, string> = {
  // Follow-ups
  px_1001_1: 'Point d\'avancement sur l\'architecture CQRS et le setup du monorepo Rust. Apportez vos questions techniques.',
  px_1001_2: 'Revue de code des services principaux. Préparer la documentation technique et le schéma d\'architecture.',
  px_1001_3: 'Bilan d\'avancement Zoidberg 2.0. Démonstration live des services et retour sur les choix techniques.',
  px_1002_1: 'Revue de l\'architecture React et du protocole WebSocket. Préparer un schéma d\'architecture.',
  px_1002_2: 'Avancement sur l\'API backend. Revue des endpoints REST et de l\'authentification JWT.',
  px_1002_3: 'Bilan d\'avancement Babel Fish. Démonstration de la plateforme multilingue et tests de charge.',
  px_1003_1: 'Setup du pipeline de données et premiers résultats de preprocessing. Notebook Jupyter à partager.',
  px_1003_2: 'Avancement sur l\'architecture du modèle. Métriques d\'évaluation et benchmarks à présenter.',
  px_alt: 'Point trimestriel avec le tuteur entreprise. Bilan des missions réalisées et objectifs du prochain trimestre.',
  // Hackathons
  px_hack_1: '48h pour concevoir une solution IA à impact social positif. Équipes de 3-5 personnes. Pitch final dimanche 17h. Repas et boissons fournis.',
  px_hack_2: 'Challenge DevOps : déployer une infra complète K8s en 48h. Monitoring, CI/CD et GitOps. Prix pour la meilleure stack.',
  px_hack_3: 'Capture The Flag en équipes. Challenges progressifs : web, crypto, forensics, reverse engineering. Classement en temps réel.',
  // HubTalks
  px_hub_1: 'Intervenant : James Smith, Staff Engineer @ Cloudflare. Comment Rust a remplacé C++ dans l\'infrastructure edge.',
  px_hub_2: 'Intervenant : Dr. Marie Chen, ML Lead @ Mistral AI. Entraîner et déployer des modèles à l\'échelle.',
  px_hub_3: 'Intervenant : Alex Dubois, Red Team Lead @ OVHcloud. Nouvelles surfaces d\'attaque et techniques de défense en 2026.',
  px_hub_4: 'Intervenant : Sarah Lévy, VP Engineering @ GitLab. Concilier open source, communauté et rentabilité.',
  px_hub_5: 'Intervenant : Pierre Martin, SRE Lead @ Doctolib. Retour d\'expérience sur la migration vers Kubernetes en production.',
  px_hub_6: 'Intervenant : Léa Nguyen, CTO @ Cometh. Les cas d\'usage concrets de la blockchain au-delà de la spéculation.',
  // Keynotes
  px_key_1001: 'Keynote de clôture du module T-DEV-810. Retour sur les architectures distribuées en Rust et les patterns CQRS / Event Sourcing.',
  px_key_1002: 'Keynote de clôture du module T-WEB-900. WebSockets, CRDTs et synchronisation temps réel à grande échelle.',
  px_key_1003: 'Keynote de clôture du module T-AI-902. Pipelines d\'inférence LLM, évaluation automatisée et stratégies de déploiement.',
  // Other
  px_forum: 'Rencontre avec les entreprises partenaires. Stands, entretiens speed dating et ateliers. Venir avec un CV imprimé.',
  px_atelier: 'Atelier animé par le service carrière. Optimiser son profil LinkedIn, rédiger un CV tech efficace et préparer le forum.',
};

// ─── Event details (appointment slots) ────────────────────────────────────────
const ALEX = { _id: 's0', login: 'alex.martin', firstName: 'Alex', lastName: 'Martin' };

const mkDetail = (
  ev: PanoramixEvent,
  slots: PanoramixEventDetail['slots'],
  studentLogins: string[],
  staffName: { first: string; last: string; login: string },
): PanoramixEventDetail => ({
  ...ev,
  description: DEMO_DESCRIPTIONS[ev._id] ?? null,
  slots,
  registeredStudents: studentLogins.map((login, i) => ({
    _id: `s_${i}`, login,
    firstName: login.split('.')[0].replace(/^\w/, c => c.toUpperCase()),
    lastName: (login.split('.')[1] ?? '').replace(/^\w/, c => c.toUpperCase()),
  })),
  registeredStaff: [{ _id: 'staff_1', login: staffName.login, firstName: staffName.first, lastName: staffName.last }],
});

const PROF_BERTRAND = { first: 'Marc',     last: 'Bertrand', login: 'marc.bertrand' };
const PROF_LECLERC  = { first: 'Isabelle', last: 'Leclerc',  login: 'isabelle.leclerc' };
const PROF_MOREAU   = { first: 'Claire',   last: 'Moreau',   login: 'claire.moreau' };
const PROF_SIMON    = { first: 'Thomas',   last: 'Simon',    login: 'thomas.simon.prof' };

const evById = (id: string) => DEMO_PANORAMIX_EVENTS.find(e => e._id === id)!;

const DEMO_EVENT_DETAILS = new Map<string, PanoramixEventDetail>([
  // px_1001_1: Zoidberg FU 1 — REGISTERED
  ['px_1001_1', mkDetail(evById('px_1001_1'),
    [
      { start: iso(school(2), 10), end: iso(school(2), 10, 30), type: 'slot', slotNumber: 1,
        registeredStudents: [ALEX, { _id: 's1', login: 'leo.dupont', firstName: 'Léo', lastName: 'Dupont' }],
        registeredStaff: [{ _id: 'st1', login: 'marc.bertrand', firstName: 'Marc', lastName: 'Bertrand' }] },
      { start: iso(school(2), 10, 30), end: iso(school(2), 11), type: 'slot', slotNumber: 2,
        registeredStudents: [], registeredStaff: [] },
    ],
    ['alex.martin', 'leo.dupont', 'emma.rousseau'], PROF_BERTRAND)],

  // px_1001_2: Zoidberg FU 2 — NOT registered
  ['px_1001_2', mkDetail(evById('px_1001_2'),
    [
      { start: iso(school(15), 14), end: iso(school(15), 14, 30), type: 'slot', slotNumber: 1, registeredStudents: [], registeredStaff: [] },
      { start: iso(school(15), 14, 30), end: iso(school(15), 15), type: 'slot', slotNumber: 2, registeredStudents: [], registeredStaff: [] },
    ],
    [], PROF_BERTRAND)],

  // px_1001_3: Zoidberg FU 3 — REGISTERED
  ['px_1001_3', mkDetail(evById('px_1001_3'),
    [
      { start: iso(school(25), 9), end: iso(school(25), 10), type: 'slot', slotNumber: 1,
        registeredStudents: [ALEX],
        registeredStaff: [{ _id: 'st1', login: 'marc.bertrand', firstName: 'Marc', lastName: 'Bertrand' }] },
    ],
    ['alex.martin', 'leo.dupont', 'emma.rousseau'], PROF_BERTRAND)],

  // px_1002_1: Babel Fish FU 1 — REGISTERED
  ['px_1002_1', mkDetail(evById('px_1002_1'),
    [
      { start: iso(school(5), 14), end: iso(school(5), 14, 30), type: 'slot', slotNumber: 1,
        registeredStudents: [ALEX],
        registeredStaff: [{ _id: 'st1', login: 'isabelle.leclerc', firstName: 'Isabelle', lastName: 'Leclerc' }] },
      { start: iso(school(5), 14, 30), end: iso(school(5), 15), type: 'slot', slotNumber: 2, registeredStudents: [], registeredStaff: [] },
    ],
    ['alex.martin', 'clara.renaud'], PROF_LECLERC)],

  // px_1002_2: Babel Fish FU 2 — NOT registered
  ['px_1002_2', mkDetail(evById('px_1002_2'),
    [
      { start: iso(school(26), 10), end: iso(school(26), 10, 30), type: 'slot', slotNumber: 1, registeredStudents: [], registeredStaff: [] },
      { start: iso(school(26), 10, 30), end: iso(school(26), 11), type: 'slot', slotNumber: 2, registeredStudents: [], registeredStaff: [] },
    ],
    [], PROF_LECLERC)],

  // px_1002_3: Babel Fish FU 3 — REGISTERED
  ['px_1002_3', mkDetail(evById('px_1002_3'),
    [
      { start: iso(school(50), 9), end: iso(school(50), 10), type: 'slot', slotNumber: 1,
        registeredStudents: [ALEX],
        registeredStaff: [{ _id: 'st1', login: 'isabelle.leclerc', firstName: 'Isabelle', lastName: 'Leclerc' }] },
    ],
    ['alex.martin', 'clara.renaud', 'julien.lambert', 'sofia.moreira'], PROF_LECLERC)],

  // px_1003_1: NeuralDump FU 1 — NOT registered
  ['px_1003_1', mkDetail(evById('px_1003_1'),
    [
      { start: iso(school(12), 9), end: iso(school(12), 9, 30), type: 'slot', slotNumber: 1, registeredStudents: [], registeredStaff: [] },
      { start: iso(school(12), 9, 30), end: iso(school(12), 10), type: 'slot', slotNumber: 2, registeredStudents: [], registeredStaff: [] },
    ],
    [], PROF_MOREAU)],

  // px_1003_2: NeuralDump FU 2 — NOT registered
  ['px_1003_2', mkDetail(evById('px_1003_2'),
    [
      { start: iso(school(55), 10), end: iso(school(55), 10, 30), type: 'slot', slotNumber: 1, registeredStudents: [], registeredStaff: [] },
      { start: iso(school(55), 10, 30), end: iso(school(55), 11), type: 'slot', slotNumber: 2, registeredStudents: [], registeredStaff: [] },
    ],
    [], PROF_MOREAU)],

  // px_alt: Alternance — REGISTERED
  ['px_alt', mkDetail(evById('px_alt'),
    [
      { start: iso(school(41), 14), end: iso(school(41), 14, 30), type: 'slot', slotNumber: 1,
        registeredStudents: [ALEX],
        registeredStaff: [{ _id: 'st1', login: 'thomas.simon.prof', firstName: 'Thomas', lastName: 'Simon' }] },
    ],
    ['alex.martin'], PROF_SIMON)],
]);

// ─── Demo API classes ─────────────────────────────────────────────────────────

export class DemoGandalfAPI extends GandalfAPI {
  constructor() {
    super('__demo__');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).sesskey = '__demo__';
  }

  override async init() {
    return { userid: DEMO_USER.id, sesskey: '__demo__' };
  }

  override async getUserProfile(): Promise<UserProfile> {
    return DEMO_USER;
  }

  override async getCourses(classification: CourseClassification = 'all'): Promise<CoursesResponse> {
    let courses: Course[];
    switch (classification) {
      case 'inprogress': courses = DEMO_ACTIVE_COURSES; break;
      case 'past':       courses = DEMO_PAST_COURSES;   break;
      default:           courses = DEMO_ALL_COURSES;
    }
    return { courses, nextoffset: 0 };
  }

  override async getRecentCourses(): Promise<Course[]> {
    return [...DEMO_ACTIVE_COURSES, COURSE_1006];
  }

  override async getActionEvents(): Promise<EventsResponse> {
    return {
      events: DEMO_EVENTS,
      firstid: DEMO_EVENTS[0].id,
      lastid: DEMO_EVENTS[DEMO_EVENTS.length - 1].id,
    };
  }

  override async getAchievements(courseid: number): Promise<GradingResult[]> {
    if (courseid === 1001) return ACHIEVEMENTS_1001;
    if (courseid === 1002) return ACHIEVEMENTS_1002;
    if (courseid === 1003) return ACHIEVEMENTS_1003;
    if (courseid === 1004) return ACHIEVEMENTS_1004;
    if (courseid === 1005) return ACHIEVEMENTS_1005;
    if (courseid === 1006) return ACHIEVEMENTS_1006;
    return [];
  }

  override async getNotifications() {
    return { notifications: [], unreadcount: 0 };
  }

  override async searchCourses() {
    return { total: DEMO_ALL_COURSES.length, courses: [...DEMO_ALL_COURSES], warnings: [] };
  }

  override async getCourseState(courseid: number): Promise<CourseState> {
    return {
      course: { id: String(courseid), numsections: 0, sectionlist: [], baseurl: '#' },
      section: [], cm: [],
    };
  }

  override async getProfileProjects(_mscYear?: 1 | 2): Promise<ProfileProject[]> {
    return DEMO_PROFILE_PROJECTS;
  }
}

export class DemoPanoramixAPI extends PanoramixAPI {
  constructor() { super('__demo__'); }

  override async init(): Promise<void> {}

  override async getEvents(): Promise<PanoramixEvent[]> {
    return DEMO_PANORAMIX_EVENTS;
  }

  override async getEventDetail(eventId: string): Promise<PanoramixEventDetail> {
    const detail = DEMO_EVENT_DETAILS.get(eventId);
    if (detail) return detail;
    // Fallback for course-type events (hackathons, HubTalks, keynotes…)
    const ev = DEMO_PANORAMIX_EVENTS.find(e => e._id === eventId) ?? DEMO_PANORAMIX_EVENTS[0];
    return { ...ev, description: DEMO_DESCRIPTIONS[eventId] ?? null, slots: [], registeredStudents: [], registeredStaff: [] };
  }

  override async getUserCohortGroups(): Promise<PanoramixCohortGroup[]> {
    return [DEMO_COHORT];
  }
}
