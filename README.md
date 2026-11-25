# Workout Builder and Progressive Overload Logger

A full-stack workout planning and training-history application. The backend provides database-backed authentication, account management, workout templates, exercise logging, and workout history. The frontend remains the Phase 1 UI foundation.

## Technology

- Frontend: React, Vite, React Router, CSS.
- Backend: Node.js, Express, Mongoose.
- Database: MongoDB.
- Authentication: bcrypt password hashes and short-lived JWT bearer tokens.

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

The health endpoint remains available if MongoDB is not connected. Data endpoints return `503 database_unavailable` until `MONGODB_URI` points to a running database.

Run backend integration tests with `npm test`. Tests start an isolated MongoDB replica set in memory.

For backend endpoint details, example bodies, authentication, and response formats, see [backend/README.md](./backend/README.md).
