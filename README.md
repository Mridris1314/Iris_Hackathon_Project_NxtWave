# Iris — AI eyes, in your language (Python + React)

Point your phone or laptop camera, tap once, and Iris speaks aloud what's in front of you —
**in Telugu, Hindi, Tamil, and more.** Describes scenes, reads text, and identifies objects
and currency, for blind and low-vision users.

- **Backend:** Python + FastAPI — authentication (JWT), database (SQLite), and the Gemini vision call.
- **Frontend:** React + TypeScript (Vite) — the camera, voice, and UI.

You only need **one** free API key (Gemini). Auth and the database run inside your own Python code.

## Why Iris (the wedge)

Be My AI and Microsoft Seeing AI already describe scenes well — in English. Iris attacks the gap:
regional-language-first, no app install (open a link on any phone), and built around how blind
people actually use phones (voice-first, one giant tap target).

---

## Run it — two terminals

### Terminal 1 — the Python backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # then edit .env (see below)
uvicorn main:app --reload        # runs on http://localhost:8000
```

Edit `backend/.env` and fill in:

```
GEMINI_API_KEY=your-gemini-key          # free at https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash
JWT_SECRET=any-long-random-string-you-make-up
```

The database (`backend/iris.db`) is created automatically on first run — no setup.

### Terminal 2 — the React frontend

```bash
cd frontend
npm install
cp .env.example .env              # default points at http://localhost:8000
npm run dev                       # opens http://localhost:5173
```

Open http://localhost:5173, create an account, allow the camera, and tap to describe.

> Camera note: browsers only allow the camera on **https** or **localhost**. Localhost is fine for
> dev. To test on a phone, deploy the frontend (any static host) and the backend (e.g. Render,
> Railway, Fly.io), both over https, then set `VITE_API_URL` to your backend's https URL.

---

## How it works

```
React frontend                         Python backend (FastAPI)
  camera frame --> base64 jpeg ---POST /describe (Bearer token)-->  verify JWT
  Web Speech API speaks the reply <-------- text -----------------  call Gemini, save scan
  login/register ----------------POST /auth/* ------------------>  JWT + bcrypt + SQLite
```

The Gemini key lives only on the server, so it's never exposed to the browser.

## API (backend)

| Method | Path            | Purpose                                  |
|--------|-----------------|------------------------------------------|
| POST   | /auth/register  | create account, returns a token          |
| POST   | /auth/login     | returns an access token                  |
| GET    | /me             | current user (email, language)           |
| PATCH  | /me             | change saved language                    |
| POST   | /describe       | image + mode + lang → spoken description |
| GET    | /history        | the user's past descriptions             |

Interactive API docs are at http://localhost:8000/docs while the backend runs.

## Demo-day tips

- **The wow moment:** close your eyes, tap, let Iris speak the scene. Then point at text, then
  hold up a ₹500 note. Switch the language to Telugu and do it again.
- **Have a backup video** in case venue Wi-Fi is flaky.
- **Camera fails on a laptop?** Tapping with no camera opens a photo picker — you can still demo.

## Troubleshooting

- **"The vision model could not be reached"** — Google occasionally renames models. Set
  `GEMINI_MODEL=gemini-2.0-flash` in `backend/.env` and restart. Current list:
  https://ai.google.dev/gemini-api/docs/models
- **No voice / wrong accent for a regional language** — speech depends on the voices installed on
  the device; Android Chrome has the best Indian-language coverage. The text is always in the
  chosen language regardless.
- **Frontend can't reach backend (CORS / network error)** — make sure the backend is running and
  `VITE_API_URL` matches its address.

## Project map

```
backend/
  main.py         FastAPI app + all routes
  auth.py         bcrypt password hashing + JWT + the "current user" guard
  models.py       SQLAlchemy tables: users, scans
  schemas.py      request/response shapes
  database.py     SQLite connection
  gemini.py       the Gemini vision call (key stays here, server-side)
  prompts.py      the three modes + the regional-language list (the wedge)
frontend/
  src/pages/Login.tsx    email/password auth
  src/pages/Home.tsx     the core: camera -> backend -> speech, modes, language
  src/pages/History.tsx  past descriptions
  src/api.ts             fetch wrapper that attaches the JWT
  src/lib/               languages (the wedge) + modes
```
