# Rika

Sri's personal dashboard: tasks, calendar, shopping list and FMGE study, in one place.
Built for iPhone first, with a two-column layout on iPad.

## What's inside

- **Home**: FMGE countdown and syllabus progress, today's study time, tasks due today, shopping list.
- **Tasks**: Todoist tasks grouped by Overdue, Today, Tomorrow, Next 7 days, Later, No date. Add, edit, complete, delete. Shopping list (any Todoist section named "Shopping").
- **Calendar**: month view of task due dates; add a task on any day.
- **Study**: focus timer (study or PYQs) that logs to the medx study log shared with the iPhone app, the 19-subject FMGE syllabus tracker with grand tests, and a 7-day chart.
- **studytimer/**: the native iOS "Lock In" study timer (SwiftUI, Screen Time shields, Live Activity). Built by `.github/workflows/ios.yml`. Untouched by the web rebuild.

## Stack

Vite + React + TypeScript, no UI framework. Serverless functions in `api/` hold every key; the browser only talks to `/api/*`.

| Route | Talks to | Needs |
| --- | --- | --- |
| `/api/todoist` | Todoist API v1 | `TODOIST_API_TOKEN` |
| `/api/study` | medx study time API | `MEDX_STUDYTIME_PASSWORD` |
| `/api/tracker` | medx tracker API | `MEDX_USER_ID` |

See `.env.example`. `VITE_FMGE_EXAM_DATE` (default 2026-10-31) sets the countdown.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev:api               # local /api on :3001
npm run dev                   # app on :5173 (proxies /api)
```

`npm run build` and `npm run lint` should both be clean.

## History

The first version (Telegram Mini App with AI usage, AC power and gym widgets) is kept at the `v1-archive` tag.
