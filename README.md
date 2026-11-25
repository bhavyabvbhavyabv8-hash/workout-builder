# Workout Builder and Progressive Overload Logger

A full-stack workout planning and progressive-overload logging application. Users can create an account, build workout plans, log live sessions, review completed history, and view progress derived from their recorded training data.

## Technology

- Frontend: React, Vite, React Router, CSS.
- Backend: Node.js, Express, Mongoose.
- Database: MongoDB.
- Authentication: bcrypt password hashes and short-lived JWT bearer tokens.
- API: authenticated REST endpoints for account, workout, session, and progress operations.

## Features

- Account registration, login/logout, profile editing, password changes, and account deletion.
- Private workout templates with exercise targets, notes, rest, and duration.
- Live workout execution with per-set persistence, a rest timer, and session completion.
- Paginated completed-workout history and exercise-performance/weekly-frequency summaries.
- Responsive dark interface, loading and error states, and empty states based on real database records.

## Project structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── scripts/
│   │   ├── utils/
│   │   ├── validation/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   └── services/
│   ├── .env.example
│   └── package.json
└── package.json
```

## Install and configure

Requirements: Node.js 20.19+ or 22.12+, npm 10+, and MongoDB.

```bash
npm install
```

Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI`, then generate a unique JWT key:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Use the generated value for `JWT_SECRET`. Do not commit `backend/.env`.

The frontend defaults to the Vite `/api` proxy. Copy `frontend/.env.example` to `frontend/.env` to review the available settings. Set `API_PROXY_TARGET` if the backend is not listening at `http://localhost:5000`; set `VITE_API_BASE_URL` only when the browser should call a different API origin directly. Configure the backend `CORS_ORIGIN` to allow that frontend origin.

The account deletion endpoint uses a MongoDB transaction. Use MongoDB Atlas or a local replica set. For a local MongoDB installation, start `mongod` with `--replSet rs0`, run `mongosh --eval "rs.initiate()"` once, and use a URI ending in `?replicaSet=rs0`.

Create/update model indexes:

```bash
npm run db:indexes --workspace @workout-builder/backend
```

## Run

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- Health: `GET /api/health`

The health endpoint remains available if MongoDB is not connected. Authenticated/data endpoints return `503 database_unavailable` until `MONGODB_URI` points to a running database.

Run backend integration tests with `npm test`. Tests start an isolated MongoDB replica set in memory.

For backend endpoint details, example bodies, authentication, and response formats, see [backend/README.md](./backend/README.md).
