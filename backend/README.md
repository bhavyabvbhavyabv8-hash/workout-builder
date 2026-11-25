# Backend API

Express REST API for the Workout Builder application. MongoDB data is accessed through Mongoose. All user-specific routes require a valid bearer JWT and scope reads/writes to the authenticated user.

At startup the API seeds 18 catalog exercises and six read-only starter templates if absent, and migrates legacy workout records in place. Custom exercises, personal templates, goals, plans, and sessions remain user-scoped in MongoDB.

## Setup

Requirements: Node.js 20.19+ or 22.12+, npm 10+, and MongoDB.

From the project root:

```bash
npm install
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API port; defaults to `5000`. |
| `NODE_ENV` | No | Use `production` to suppress startup diagnostic details. |
| `MONGODB_URI` | Yes for data endpoints | MongoDB connection string. Never put credentials in source control. |
| `JWT_SECRET` | Yes for authentication | Random secret of at least 32 bytes. Generate with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. |
| `JWT_EXPIRES_IN` | No | JWT lifetime accepted by `jsonwebtoken`; defaults to `1h`. |
| `CORS_ORIGIN` | No | Comma-separated allowed browser origins; defaults to `http://localhost:5173`. |

Account deletion is transactional. Use MongoDB Atlas or a MongoDB replica set. For local MongoDB, run `mongod --replSet rs0 --bind_ip 127.0.0.1 --port 27017`, initialize once with `mongosh --eval "rs.initiate()"`, and set:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/workout_builder?replicaSet=rs0
```

Create required unique, query, and TTL indexes:

```bash
npm run db:indexes --workspace @workout-builder/backend
```

Start the API:

```bash
npm run dev --workspace @workout-builder/backend
```

Or from the project root run `npm run dev` to start the frontend and backend together. `GET /api/health` works without MongoDB; authenticated and data endpoints return `503` until the database is connected.

## Authentication

1. Register with `POST /api/auth/register`.
2. Log in with `POST /api/auth/login` and retain the returned token securely in the client.
3. Send it on private routes using `Authorization: Bearer <token>`.
4. Call `POST /api/auth/logout` to revoke the current token. Tokens are signed with HS256, expire by `JWT_EXPIRES_IN`, and logout revocations expire from MongoDB at the token expiry.

Passwords are validated (10–128 characters, upper- and lowercase letters, and a number) and hashed with bcrypt. Password hashes and token version fields are excluded from normal reads and never returned. Registration and login are each limited to 10 attempts per IP per 15 minutes.

## Response and error format

Successful requests use `{ "data": ... }`. Errors use:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed.",
    "details": [{ "field": "email", "message": "Invalid email" }]
  }
}
```

Validation errors return `400`; invalid credentials/tokens return `401`; cross-user access returns `403`; missing resources return `404`; duplicate email or conflicting operations return `409`; rate limits return `429`; unavailable MongoDB returns `503`; unexpected errors return a generic `500` message. Production responses never include stack traces.

## API endpoints

`Auth` indicates whether a bearer token is required. User-owned workouts, sessions, and account data are always queried with the authenticated user ID.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | API and MongoDB connection status. |
| `POST` | `/api/auth/register` | No | Create an account. |
| `POST` | `/api/auth/login` | No | Authenticate and issue a JWT. |
| `POST` | `/api/auth/logout` | Yes | Revoke the current JWT. |
| `GET` | `/api/auth/me` | Yes | Get the current profile. |
| `GET` | `/api/account` | Yes | Get account details. |
| `PATCH` | `/api/account` | Yes | Update `name` and/or `email`. |
| `PATCH` | `/api/account/password` | Yes | Verify current password and change it; invalidates all existing tokens. |
| `DELETE` | `/api/account` | Yes | Delete account and associated workout data; requires `{ "password": "..." }`. |
| `GET` | `/api/workouts` | Yes | List own workout plans. |
| `POST` | `/api/workouts` | Yes | Create a workout plan with category, difficulty, duration, and exercises. |
| `GET` | `/api/workouts/:id` | Yes | Get one own workout plan. |
| `PATCH` | `/api/workouts/:id` | Yes | Update workout metadata and/or replace exercises. |
| `DELETE` | `/api/workouts/:id` | Yes | Delete a workout; sessions keep their copied plan and history. |
| `GET` | `/api/workouts/exercises?q=&muscleGroup=&equipment=&difficulty=&page=1&limit=12` | Yes | Search/filter the paginated shared and own exercise library. |
| `POST` | `/api/workouts/exercises` | Yes | Add a custom exercise to the authenticated user's library. |
| `GET` | `/api/workouts/templates` | Yes | List built-in and own reusable templates. |
| `POST` | `/api/workouts/templates` | Yes | Create a personal template. |
| `GET` | `/api/workouts/templates/:id` | Yes | Get an available built-in or own template. |
| `PATCH` | `/api/workouts/templates/:id` | Yes | Edit an own personal template. |
| `DELETE` | `/api/workouts/templates/:id` | Yes | Delete an own personal template. |
| `POST` | `/api/workouts/templates/:id/use` | Yes | Create a workout plan from an available template. |
| `POST` | `/api/workouts/:id/template` | Yes | Save an existing workout plan as a personal template. |
| `POST` | `/api/workouts/:workoutId/exercises` | Yes | Add an exercise to a template. |
| `PATCH` | `/api/workouts/:workoutId/exercises/:exerciseId` | Yes | Update an exercise entry. |
| `DELETE` | `/api/workouts/:workoutId/exercises/:exerciseId` | Yes | Remove an exercise entry. |
| `GET` | `/api/workouts/stats` | Yes | Completion counts/rate, weekly frequency, duration, sets, reps, volume, streak, and personal records. |
| `GET` | `/api/workouts/progress?from=YYYY-MM-DD&to=YYYY-MM-DD&exerciseId=<id>` | Yes | Filtered per-exercise weight, reps, volume, and set history from completed workouts. |
| `GET` | `/api/goals` | Yes | Get the user's weekly and total workout targets with actual progress. |
| `POST` | `/api/goals` | Yes | Create the user's targets. |
| `PATCH` | `/api/goals` | Yes | Update one or both workout targets. |
| `DELETE` | `/api/goals` | Yes | Delete the user's targets. |
| `POST` | `/api/workouts/sessions` | Yes | Start a session from a template or a custom name. |
| `GET` | `/api/workouts/sessions?page=1&limit=20` | Yes | Paginated session list, including in-progress sessions. |
| `GET` | `/api/workouts/sessions/history?page=1&limit=20` | Yes | Paginated completed workout history. |
| `GET` | `/api/workouts/sessions/:sessionId` | Yes | Get an own session and its logged sets. |
| `POST` | `/api/workouts/sessions/:sessionId/sets` | Yes | Record one completed exercise set. |
| `PATCH` | `/api/workouts/sessions/:sessionId/complete` | Yes | Complete a session after at least one set is logged. |

### Example requests

Register:

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Alex Morgan",
  "email": "alex@example.com",
  "password": "StrongerPass123"
}
```

Login returns a profile and bearer token:

```json
{
  "data": {
    "user": { "id": "…", "name": "Alex Morgan", "email": "alex@example.com" },
    "token": "…",
    "tokenType": "Bearer",
    "expiresIn": "1h"
  }
}
```

Create a workout (send the login token as a bearer token):

```json
{
  "name": "Upper body A",
  "description": "Strength session",
  "exercises": [
    {
      "name": "Bench press",
      "muscleGroup": "chest",
      "sets": 4,
      "repetitions": 8,
      "weight": 60,
      "restSeconds": 120,
      "notes": "Controlled tempo"
    }
  ]
}
```

Start a session from a template:

```json
{ "templateId": "64f000000000000000000001" }
```

Log a set. For an unplanned session, provide `muscleGroup`; template sessions use the plan's exercise:

```json
{
  "exerciseName": "Bench press",
  "setNumber": 1,
  "reps": 8,
  "weight": 60,
  "rir": 2
}
```

Complete it with `PATCH /api/workouts/sessions/:sessionId/complete`. Stats aggregate only completed sessions and their recorded sets.

## Tests

```bash
npm test
```

The Node test runner uses `mongodb-memory-server` in replica-set mode to test registration, login, token revocation, account updates/deletion, workout and template CRUD, exercise filtering, goal progress, history, duration/PR statistics, validation, legacy workout migration, and cross-user authorization without touching a configured database.
