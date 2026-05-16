# Couple Spinner 🎰

A local-network slot machine decision maker for couples. Spin configurable reels to decide what to eat, what to do, and more — together.

## Origin Story

This started as my partner's idea — she wanted something fun to help us stop agonizing over "what do you want to do tonight?" We built the whole thing in a single evening: one bottle of cheap cab and two episodes of Ozark. It was a good excuse to show her how easy it was to build something quickly with [Claude Code](https://claude.ai/code).

## Features

- Two slot machine reels: **Food** and **Activity**
- Spin reels individually or all at once with a staggered cascade
- Both partners log in and share the same wheels in real time
- Add or remove options on any reel at any time
- Results appear as non-intrusive chips below the machine
- Works from any device on the same WiFi network

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite via the built-in `node:sqlite` module (Node 22+)
- **Auth:** express-session + bcrypt
- **Frontend:** Vanilla HTML/CSS/JS — no build step

## Getting Started

### Requirements

- Node.js 22 or higher

### Install & run

```bash
npm install
node server.js
```

The terminal will print your local network URL:

```
🎡 Couple Spinner is running!
   Local:   http://localhost:3000
   Network: http://192.168.x.x:3000  ← share this with your partner
```

Open the Local URL on your machine, share the Network URL with your partner so they can connect from their phone or laptop on the same WiFi.

### Default logins

| Username | Password |
|----------|----------|
| `partner1` | `partner1` |
| `partner2` | `partner2` |

## Project Structure

```
couple-spinner/
├── server.js        # Express app, API routes, session auth
├── db.js            # SQLite schema, seed data, query helpers
├── public/
│   ├── login.html   # Login page
│   ├── index.html   # Main dashboard
│   ├── style.css    # Styles
│   └── app.js       # Slot machine reel logic + API calls
└── data/            # SQLite database (auto-created, git-ignored)
```

## API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Authenticate |
| POST | `/api/logout` | End session |
| GET | `/api/me` | Current user |
| GET | `/api/wheels` | All wheels with options |
| POST | `/api/wheels/:id/options` | Add option to a wheel |
| DELETE | `/api/options/:id` | Remove an option |
