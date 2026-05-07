# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install   # Install dependencies
npm start     # Start the server (node server.js) on port 3000
```

No build step — the frontend is vanilla HTML/CSS/JS served directly as static files.

Default credentials: `partner1` / `partner1` and `partner2` / `partner2`.

## Architecture

**Couple Spinner** is a local-network slot-machine decision app for couples. Stack: Node.js + Express backend, SQLite (via Node's built-in `node:sqlite` — requires Node 22+), vanilla JS frontend.

### Backend

- **`server.js`** — Express app with session auth (`express-session` + `bcrypt`). Defines all API routes and serves static files from `public/`. Session secret is random per startup (sessions are lost on restart). `requireAuth()` middleware guards all `/api/` routes except login/logout.
- **`db.js`** — Opens `data/spinner.db`, runs schema migrations on startup (WAL mode + foreign keys enabled), and exposes query helpers. Uses synchronous SQLite API.
- **`seeds.js`** — Default wheel and option data loaded only on a fresh database (no users or wheels present).

### API routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Authenticate |
| POST | `/api/logout` | End session |
| GET | `/api/me` | Current user info |
| POST | `/api/me/username` | Change username (requires current password) |
| POST | `/api/me/password` | Change password (requires current password) |
| GET | `/api/wheels` | All wheels with their options |
| POST | `/api/wheels/:id/options` | Add option to a wheel (max 80 chars) |
| DELETE | `/api/options/:id` | Delete an option |

### Database schema

- **`users`**: `id`, `username` (unique), `password_hash`
- **`wheels`**: `id`, `name`, `emoji`, `sort_order`
- **`options`**: `id`, `wheel_id` (FK → wheels, cascade delete), `text`, `added_by`, `created_at`

Wheels and options are shared across both users — there is no per-user data model for wheels.

### Frontend

- **`public/app.js`** — Single-page app logic. `Reel` class manages animation state for each wheel column. `init()` fetches `/api/wheels`, builds DOM, and wires event listeners. Reel spin uses staggered CSS transform animation with constants `ITEM_H=72`, `VISIBLE=5`, `CENTER=2`, `REPEATS=20`. Auth guard at top redirects to `login.html` if `/api/me` fails.
- **`public/index.html`** — Main page shell; reel DOM is injected by `app.js`.
- **`public/account.html`** — Change username/password forms with inline AJAX feedback.
- **`public/login.html`** — Login form; auto-redirects if already authenticated.

The `data/` directory (SQLite files) is git-ignored and created automatically on first run.
