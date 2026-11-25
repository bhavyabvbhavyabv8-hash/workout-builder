# Workout Builder and Progressive Overload Logger

A full-stack foundation for planning workouts and tracking training progress. Phase 1 provides a responsive frontend, backend health check, and initial MongoDB data models. Workout editing, account authentication, and saved progress are not connected yet.

## Features

- Dark, responsive landing page with lime-green accents.
- Navigation layouts for Home, Workout Builder, Progress, login, and registration.
- Express REST API with a health-check endpoint and centralized error handling.
- Mongoose models for users, exercises, workout templates, workout sessions, exercise sets, and progress records.
- Vite development server proxies `/api` requests to Express.

## Technology stack

- Frontend: React, Vite, React Router, and CSS.
- Backend: Node.js, Express, and Mongoose.
- Database: MongoDB.
- API: REST over JSON.

## Project structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/       # Database connection
│   │   ├── middleware/   # Not-found and error handling
│   │   ├── models/       # Mongoose schemas
│   │   ├── routes/       # REST API routes
│   │   ├── app.js
│   │   └── server.js
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   └── index.html
├── package.json
└── README.md
```

## Requirements

- Node.js 20.19+ or 22.12+.
- npm 10+.
- MongoDB, if you want the backend to connect to a database.

## Installation

From the project root:

```bash
npm install
```

Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` to your MongoDB connection string. The API can also start without MongoDB configured; it logs that the database is disconnected, and the health endpoint reports the connection state.

## Run the application

Start the frontend and backend in development mode:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- API health check: `http://localhost:5000/api/health`

Build the frontend with `npm run build`. Start only the backend with `npm start`.

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Express server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | unset (database connection disabled) |
| `NODE_ENV` | Runtime environment | `development` |

Authentication, workout CRUD, and progress calculation are intentionally outside this foundation phase.
