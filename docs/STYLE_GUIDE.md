# Style Guide

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| TailwindCSS | v4.2 | Utility-first CSS |
| `@tailwindcss/vite` | v4.2 | Vite plugin (NOT PostCSS) |
| lucide-react | latest | Icon library |
| date-fns | v4 | Date formatting |

## Design Tokens

All tokens are defined in `src/index.css` under `@theme { }`. Use token names in Tailwind classes.

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#6366f1` (indigo) | Buttons, active nav, links, accents |
| `primary-light` | `#818cf8` | Hover states |
| `primary-dark` | `#4f46e5` | Button hover, pressed states |
| `surface` | `#ffffff` | Card backgrounds |
| `surface-dim` | `#f8fafc` | Page background (light) |
| `surface-dark` | `#0f172a` | Page background (dark) |
| `surface-dark-dim` | `#1e293b` | Card backgrounds (dark) |
| `border` | `#e2e8f0` | Borders, dividers (light) |
| `border-dark` | `#334155` | Borders, dividers (dark) |
| `text` | `#0f172a` | Primary text (light) |
| `text-muted` | `#64748b` | Secondary text (light) |
| `text-dark` | `#f1f5f9` | Primary text (dark) |
| `text-dark-muted` | `#94a3b8` | Secondary text (dark) |
| `success` | `#22c55e` | Completion, positive |
| `warning` | `#f59e0b` | In-progress, attention |
| `danger` | `#ef4444` | Overdue, errors, destructive |

### Font

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
```

## Dark Mode

Uses `prefers-color-scheme` media query (automatic, no toggle yet).

**Every** visible element needs both light and dark classes:

```tsx
// CORRECT
<div className="bg-surface dark:bg-surface-dark-dim text-text dark:text-text-dark border-border dark:border-border-dark">

// WRONG — missing dark variant
<div className="bg-white text-gray-900">
```

### Common Dark Mode Pairs

| Light | Dark |
|-------|------|
| `bg-surface` | `dark:bg-surface-dark-dim` |
| `bg-surface-dim` | `dark:bg-surface-dark` |
| `text-text` | `dark:text-text-dark` |
| `text-text-muted` | `dark:text-text-dark-muted` |
| `border-border` | `dark:border-border-dark` |

## Component Patterns

### Card

```tsx
<div className="bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark p-4">
  {/* content */}
</div>
```

Hover variant (for clickable cards):
```tsx
<a className="group block bg-surface dark:bg-surface-dark-dim rounded-xl border border-border dark:border-border-dark hover:border-primary/50 hover:shadow-md transition-all">
```

### Section Header

```tsx
<h2 className="text-lg font-semibold text-text dark:text-text-dark flex items-center gap-2 mb-3">
  <Icon className="w-5 h-5 text-text-muted dark:text-text-dark-muted" />
  Section Title
</h2>
```

### Progress Bar

```tsx
<div className="w-full h-1.5 rounded-full bg-surface-dim dark:bg-surface-dark overflow-hidden">
  <div
    className="h-full rounded-full bg-primary transition-all duration-500"
    style={{ width: `${progress}%` }}
  />
</div>
```

Color logic: 100% → `bg-success`, ≥50% → `bg-primary`, >0% → `bg-warning`, 0% → `bg-border`.

### Badge / Tag

```tsx
<span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
  Label
</span>
```

### Loading State

```tsx
import { Loader2 } from 'lucide-react';

<div className="flex items-center justify-center min-h-[60vh]">
  <Loader2 className="w-8 h-8 animate-spin text-primary" />
</div>
```

### Error Alert

```tsx
import { AlertCircle } from 'lucide-react';

<div className="flex items-start gap-2 p-3 rounded-xl bg-danger/10 text-danger text-sm">
  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
  <span>{errorMessage}</span>
</div>
```

## Layout

- Max width: `max-w-7xl mx-auto px-4 sm:px-6`
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Spacing between sections: `space-y-8`
- Header height: `h-16`
- Header: `sticky top-0 z-40` with `backdrop-blur-xl`

## Responsive Breakpoints

| Prefix | Width | Usage |
|--------|-------|-------|
| (none) | 0+ | Mobile-first base |
| `sm:` | 640px+ | Show desktop nav, 2-col grid |
| `md:` | 768px+ | Show username in header |
| `lg:` | 1024px+ | 3-col grid |

## Icons

Always from `lucide-react`. Import individually:

```tsx
import { BookOpen, Calendar, Clock } from 'lucide-react';
<BookOpen className="w-5 h-5" />
```

Standard sizes: `w-4 h-4` (inline), `w-5 h-5` (section headers, nav).

## Epitech-Specific Display Logic

### Course Name Parsing

Moodle course names follow: `T-DEV-810 - Zoidberg2.0`

```ts
const projectCode = course.shortname.split('_')[0];       // "T-DEV-810"
const displayName = course.fullname.replace(/^T-\w+-\d+\s*-\s*/, ''); // "Zoidberg2.0"
const category = course.coursecategory;                     // "T8"
```

### Timestamps

All Moodle timestamps are **unix seconds** (not milliseconds).

```ts
import { fromUnixTime, format, formatDistanceToNow } from 'date-fns';
const date = fromUnixTime(event.timesort);       // NOT new Date(ts)
const relative = formatDistanceToNow(date, { addSuffix: true });
const formatted = format(date, 'MMM d, yyyy HH:mm');
```
