import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import seedStarterCatalog from '../src/config/starterCatalog.js';
import Exercise from '../src/models/Exercise.js';
import ExerciseSet from '../src/models/ExerciseSet.js';
import PersonalGoal from '../src/models/PersonalGoal.js';
import ProgressRecord from '../src/models/ProgressRecord.js';
import RevokedToken from '../src/models/RevokedToken.js';
import User from '../src/models/User.js';
import WorkoutSession from '../src/models/WorkoutSession.js';
import WorkoutTemplate from '../src/models/WorkoutTemplate.js';

process.env.JWT_SECRET = 'test-secret-with-more-than-thirty-two-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

let replicaSet;
let server;
let baseUrl;

async function request(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function register(name, email, password = 'StrongerPass123') {
  const response = await request('POST', '/api/auth/register', {
    body: { name, email, password }
  });
  assert.equal(response.status, 201);
  return response.payload.data.user;
}

async function login(email, password = 'StrongerPass123') {
  const response = await request('POST', '/api/auth/login', {
    body: { email, password }
  });
  assert.equal(response.status, 200);
  return response.payload.data;
}

before(async () => {
  replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await connectDatabase(replicaSet.getUri('workout_builder_test'));
  await Promise.all(
    [
      User,
      Exercise,
      WorkoutTemplate,
      WorkoutSession,
      ExerciseSet,
      PersonalGoal,
      ProgressRecord,
      RevokedToken
    ].map((model) => model.init())
  );
  await seedStarterCatalog();
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
});

test('authentication, account security, workout CRUD, history, and user isolation', async () => {
  const forbiddenOrigin = await fetch(`${baseUrl}/api/health`, {
    headers: { origin: 'https://not-allowed.example' }
  });
  assert.equal(forbiddenOrigin.status, 403);
  assert.equal((await forbiddenOrigin.json()).error.code, 'forbidden_origin');

  const malformedJson = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{'
  });
  assert.equal(malformedJson.status, 400);
  assert.equal((await malformedJson.json()).error.code, 'invalid_json');

  const invalidRegistration = await request('POST', '/api/auth/register', {
    body: { name: 'Test User', email: 'not-an-email', password: 'short' }
  });
  assert.equal(invalidRegistration.status, 400);

  const owner = await register('Alex Morgan', 'Alex@Example.com');
  assert.equal(owner.email, 'alex@example.com');
  assert.equal('passwordHash' in owner, false);
  const ownerAuth = await login(owner.email);
  assert.equal(typeof ownerAuth.token, 'string');

  const legacyWorkoutId = new mongoose.Types.ObjectId();
  await WorkoutTemplate.collection.insertOne({
    _id: legacyWorkoutId,
    user: new mongoose.Types.ObjectId(owner.id),
    name: 'Legacy workout',
    description: '',
    exercises: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await seedStarterCatalog();
  const migratedLegacyWorkout = await request(
    'GET',
    `/api/workouts/${legacyWorkoutId}`,
    { token: ownerAuth.token }
  );
  assert.equal(migratedLegacyWorkout.status, 200);
  assert.equal(migratedLegacyWorkout.payload.data.workout.isTemplate, false);

  const duplicate = await request('POST', '/api/auth/register', {
    body: { name: 'Another Alex', email: 'alex@example.com', password: 'StrongerPass123' }
  });
  assert.equal(duplicate.status, 409);

  const invalidLogin = await request('POST', '/api/auth/login', {
    body: { email: 'alex@example.com', password: 'WrongPassword123' }
  });
  assert.equal(invalidLogin.status, 401);

  const anonymousProfile = await request('GET', '/api/auth/me');
  assert.equal(anonymousProfile.status, 401);

  assert.equal('passwordHash' in ownerAuth.user, false);

  const anonymousExerciseSearch = await request('GET', '/api/workouts/exercises?q=barbell');
  assert.equal(anonymousExerciseSearch.status, 401);
  const exerciseSearch = await request(
    'GET',
    '/api/workouts/exercises?q=barbell&muscleGroup=chest&equipment=barbell&difficulty=intermediate&page=1&limit=5',
    { token: ownerAuth.token }
  );
  assert.equal(exerciseSearch.status, 200);
  assert.equal(exerciseSearch.payload.data.total, 1);
  assert.equal(exerciseSearch.payload.data.exercises[0].name, 'Barbell bench press');
  assert.ok(exerciseSearch.payload.data.exercises[0].instructions);
  assert.deepEqual(exerciseSearch.payload.data.exercises[0].targetMuscles, [
    'pectorals',
    'triceps',
    'front deltoids'
  ]);
  const invalidExerciseSearch = await request(
    'GET',
    '/api/workouts/exercises?difficulty=expert',
    { token: ownerAuth.token }
  );
  assert.equal(invalidExerciseSearch.status, 400);
  const customExercise = await request('POST', '/api/workouts/exercises', {
    token: ownerAuth.token,
    body: {
      name: 'Cable fly',
      muscleGroup: 'chest',
      targetMuscles: ['pectorals'],
      equipment: 'cable machine',
      difficulty: 'beginner',
      instructions: 'Bring the handles together under control.'
    }
  });
  assert.equal(customExercise.status, 201);
  assert.equal(customExercise.payload.data.exercise.createdBy, owner.id);
  const duplicateCustomExercise = await request('POST', '/api/workouts/exercises', {
    token: ownerAuth.token,
    body: {
      name: 'Cable fly',
      muscleGroup: 'chest',
      targetMuscles: ['pectorals'],
      equipment: 'cable machine',
      difficulty: 'beginner'
    }
  });
  assert.equal(duplicateCustomExercise.status, 409);

  const goalUnauthenticated = await request('GET', '/api/goals');
  assert.equal(goalUnauthenticated.status, 401);
  const invalidGoal = await request('POST', '/api/goals', {
    token: ownerAuth.token,
    body: { weeklyWorkoutTarget: 0, totalWorkoutTarget: 10 }
  });
  assert.equal(invalidGoal.status, 400);
  const createdGoal = await request('POST', '/api/goals', {
    token: ownerAuth.token,
    body: { weeklyWorkoutTarget: 3, totalWorkoutTarget: 10 }
  });
  assert.equal(createdGoal.status, 201);
  assert.equal(createdGoal.payload.data.progress.weeklyPercent, 0);
  const duplicateGoal = await request('POST', '/api/goals', {
    token: ownerAuth.token,
    body: { weeklyWorkoutTarget: 4, totalWorkoutTarget: 12 }
  });
  assert.equal(duplicateGoal.status, 409);

  const profileUpdate = await request('PATCH', '/api/account', {
    token: ownerAuth.token,
    body: { name: 'Alex M.', email: 'alex.m@example.com' }
  });
  assert.equal(profileUpdate.status, 200);
  assert.equal(profileUpdate.payload.data.user.name, 'Alex M.');

  const invalidId = await request('GET', '/api/workouts/not-an-id', {
    token: ownerAuth.token
  });
  assert.equal(invalidId.status, 400);

  const invalidWorkout = await request('POST', '/api/workouts', {
    token: ownerAuth.token,
    body: {
      name: 'Invalid',
      exercises: [
        { name: 'Bench press', muscleGroup: 'chest', sets: 0, repetitions: 8 }
      ]
    }
  });
  assert.equal(invalidWorkout.status, 400);

  const createdWorkout = await request('POST', '/api/workouts', {
    token: ownerAuth.token,
    body: {
      name: 'Upper body A',
      description: 'Strength session',
      category: 'strength',
      difficulty: 'intermediate',
      durationMinutes: 45,
      exercises: [
        {
          exerciseId: exerciseSearch.payload.data.exercises[0]._id,
          name: 'Barbell bench press',
          muscleGroup: 'chest',
          sets: 3,
          repetitions: 8,
          weight: 60,
          restSeconds: 120
        }
      ]
    }
  });
  assert.equal(createdWorkout.status, 201);
  const workout = createdWorkout.payload.data.workout;
  const workoutId = workout._id;
  assert.equal(workout.exercises[0].name, 'Barbell bench press');
  assert.equal(workout.durationMinutes, 45);

  const builtInTemplates = await request('GET', '/api/workouts/templates', {
    token: ownerAuth.token
  });
  assert.equal(builtInTemplates.status, 200);
  assert.equal(builtInTemplates.payload.data.templates.filter((entry) => entry.isBuiltIn).length, 6);
  const fullBodyTemplate = builtInTemplates.payload.data.templates.find(
    (entry) => entry.systemKey === 'full-body'
  );
  const usedTemplate = await request(
    'POST',
    `/api/workouts/templates/${fullBodyTemplate._id}/use`,
    { token: ownerAuth.token }
  );
  assert.equal(usedTemplate.status, 201);
  assert.equal(usedTemplate.payload.data.workout.user, owner.id);
  assert.equal(usedTemplate.payload.data.workout.exercises.length, 5);
  await WorkoutTemplate.deleteOne({ _id: usedTemplate.payload.data.workout._id });

  const savedTemplate = await request('POST', `/api/workouts/${workoutId}/template`, {
    token: ownerAuth.token,
    body: { name: 'Saved upper body' }
  });
  assert.equal(savedTemplate.status, 201);
  const templateId = savedTemplate.payload.data.template._id;
  const updatedTemplate = await request('PATCH', `/api/workouts/templates/${templateId}`, {
    token: ownerAuth.token,
    body: { name: 'Saved upper body v2', durationMinutes: 50 }
  });
  assert.equal(updatedTemplate.status, 200);
  assert.equal(updatedTemplate.payload.data.template.name, 'Saved upper body v2');
  assert.equal(updatedTemplate.payload.data.template.durationMinutes, 50);

  const listedWorkouts = await request('GET', '/api/workouts', { token: ownerAuth.token });
  const listedWorkoutIds = listedWorkouts.payload.data.workouts.map((workout) => workout._id);
  assert.ok(listedWorkoutIds.includes(String(legacyWorkoutId)));
  assert.ok(listedWorkoutIds.includes(workoutId));
  const retrievedWorkout = await request('GET', `/api/workouts/${workoutId}`, {
    token: ownerAuth.token
  });
  assert.equal(retrievedWorkout.status, 200);

  const addedExercise = await request('POST', `/api/workouts/${workoutId}/exercises`, {
    token: ownerAuth.token,
    body: {
      name: 'Cable row',
      muscleGroup: 'back',
      sets: 3,
      repetitions: 10,
      weight: 35,
      restSeconds: 90
    }
  });
  assert.equal(addedExercise.status, 201);
  const addedExerciseId = addedExercise.payload.data.workout.exercises[1]._id;

  const updatedExercise = await request(
    'PATCH',
    `/api/workouts/${workoutId}/exercises/${addedExerciseId}`,
    { token: ownerAuth.token, body: { weight: 40, repetitions: 12 } }
  );
  assert.equal(updatedExercise.status, 200);
  assert.equal(updatedExercise.payload.data.workout.exercises[1].weight, 40);

  const removedExercise = await request(
    'DELETE',
    `/api/workouts/${workoutId}/exercises/${addedExerciseId}`,
    { token: ownerAuth.token }
  );
  assert.equal(removedExercise.status, 200);
  assert.equal(removedExercise.payload.data.workout.exercises.length, 1);

  const updatedWorkout = await request('PATCH', `/api/workouts/${workoutId}`, {
    token: ownerAuth.token,
    body: { name: 'Upper body strength' }
  });
  assert.equal(updatedWorkout.payload.data.workout.name, 'Upper body strength');

  const otherUser = await register('Jordan Lee', 'jordan@example.com');
  const otherAuth = await login(otherUser.email);
  const privateExerciseSearch = await request(
    'GET',
    '/api/workouts/exercises?q=cable%20fly',
    { token: otherAuth.token }
  );
  assert.equal(privateExerciseSearch.payload.data.total, 0);
  const foreignTemplate = await request('POST', `/api/workouts/templates/${templateId}/use`, {
    token: otherAuth.token
  });
  assert.equal(foreignTemplate.status, 403);
  const foreignTemplateEdit = await request('PATCH', `/api/workouts/templates/${templateId}`, {
    token: otherAuth.token,
    body: { name: 'Not allowed' }
  });
  assert.equal(foreignTemplateEdit.status, 403);
  const otherGoal = await request('GET', '/api/goals', { token: otherAuth.token });
  assert.equal(otherGoal.payload.data.goal, null);
  const duplicateProfileEmail = await request('PATCH', '/api/account', {
    token: ownerAuth.token,
    body: { email: 'jordan@example.com' }
  });
  assert.equal(duplicateProfileEmail.status, 409);

  const foreignWorkout = await request('GET', `/api/workouts/${workoutId}`, {
    token: otherAuth.token
  });
  assert.equal(foreignWorkout.status, 403);
  const foreignTemplateSession = await request('POST', '/api/workouts/sessions', {
    token: otherAuth.token,
    body: { templateId: workoutId }
  });
  assert.equal(foreignTemplateSession.status, 403);

  const ownerSession = await request('POST', '/api/workouts/sessions', {
    token: ownerAuth.token,
    body: { templateId: workoutId }
  });
  assert.equal(ownerSession.status, 201);
  const sessionId = ownerSession.payload.data.session._id;

  const foreignSession = await request('POST', '/api/workouts/sessions', {
    token: otherAuth.token,
    body: { name: 'Private session' }
  });
  assert.equal(foreignSession.status, 201);
  const foreignSessionRead = await request(
    'GET',
    `/api/workouts/sessions/${foreignSession.payload.data.session._id}`,
    { token: ownerAuth.token }
  );
  assert.equal(foreignSessionRead.status, 403);

  const loggedSet = await request('POST', `/api/workouts/sessions/${sessionId}/sets`, {
    token: ownerAuth.token,
    body: { exerciseName: 'Barbell bench press', setNumber: 1, reps: 8, weight: 60, rir: 2 }
  });
  assert.equal(loggedSet.status, 201);

  const duplicateSet = await request('POST', `/api/workouts/sessions/${sessionId}/sets`, {
    token: ownerAuth.token,
    body: { exerciseName: 'Barbell bench press', setNumber: 1, reps: 8, weight: 60 }
  });
  assert.equal(duplicateSet.status, 409);

  await WorkoutSession.updateOne(
    { _id: sessionId },
    { $set: { startedAt: new Date(Date.now() - 75_000) } }
  );
  const completedSession = await request(
    'PATCH',
    `/api/workouts/sessions/${sessionId}/complete`,
    { token: ownerAuth.token }
  );
  assert.equal(completedSession.status, 200);
  assert.ok(completedSession.payload.data.session.completedAt);

  const history = await request('GET', '/api/workouts/sessions/history', {
    token: ownerAuth.token
  });
  assert.equal(history.payload.data.total, 1);

  const historyDetails = await request('GET', `/api/workouts/sessions/${sessionId}`, {
    token: ownerAuth.token
  });
  assert.equal(historyDetails.payload.data.sets.length, 1);
  assert.equal(historyDetails.payload.data.sets[0].exerciseName, 'Barbell bench press');

  const stats = await request('GET', '/api/workouts/stats', { token: ownerAuth.token });
  assert.equal(stats.payload.data.completedWorkouts, 1);
  assert.equal(stats.payload.data.totalSets, 1);
  assert.equal(stats.payload.data.totalVolume, 480);
  assert.equal(stats.payload.data.totalReps, 8);
  assert.ok(stats.payload.data.totalDurationSeconds >= 75);
  assert.ok(Array.isArray(stats.payload.data.personalRecords));
  assert.equal(stats.payload.data.personalRecords[0].maxWeight, 60);
  assert.equal(stats.payload.data.workoutsThisWeek, 1);
  assert.equal(stats.payload.data.weeklyFrequency.length, 8);
  assert.equal(stats.payload.data.workoutsStarted, 1);
  assert.equal(stats.payload.data.completionRatePercent, 100);

  const performance = await request('GET', '/api/workouts/progress', {
    token: ownerAuth.token
  });
  assert.equal(performance.payload.data.exercises.length, 1);
  assert.equal(performance.payload.data.exercises[0].exerciseName, 'Barbell bench press');
  assert.equal(performance.payload.data.exercises[0].history[0].maxWeight, 60);
  assert.equal(performance.payload.data.exercises[0].history[0].maxReps, 8);
  const filteredPerformance = await request(
    'GET',
    `/api/workouts/progress?from=${new Date().toISOString().slice(0, 10)}&to=${new Date().toISOString().slice(0, 10)}&exerciseId=${loggedSet.payload.data.set.exercise}`,
    { token: ownerAuth.token }
  );
  assert.equal(filteredPerformance.payload.data.exercises.length, 1);
  const invalidProgressRange = await request(
    'GET',
    '/api/workouts/progress?from=2026-03-02&to=2026-03-01',
    { token: ownerAuth.token }
  );
  assert.equal(invalidProgressRange.status, 400);
  const goalProgress = await request('GET', '/api/goals', { token: ownerAuth.token });
  assert.equal(goalProgress.payload.data.progress.completedThisWeek, 1);
  assert.equal(goalProgress.payload.data.progress.weeklyPercent, 33);
  assert.equal(goalProgress.payload.data.progress.completedTotal, 1);
  const updatedGoal = await request('PATCH', '/api/goals', {
    token: ownerAuth.token,
    body: { weeklyWorkoutTarget: 2, totalWorkoutTarget: 2 }
  });
  assert.equal(updatedGoal.status, 200);
  assert.equal(updatedGoal.payload.data.progress.totalPercent, 50);
  const deletedGoal = await request('DELETE', '/api/goals', { token: ownerAuth.token });
  assert.equal(deletedGoal.status, 200);
  assert.equal((await request('GET', '/api/goals', { token: ownerAuth.token })).payload.data.goal, null);

  const sessionSetAfterCompletion = await request(
    'POST',
    `/api/workouts/sessions/${sessionId}/sets`,
    {
      token: ownerAuth.token,
      body: { exerciseName: 'Barbell bench press', setNumber: 2, reps: 8, weight: 60 }
    }
  );
  assert.equal(sessionSetAfterCompletion.status, 409);

  const deletedWorkout = await request('DELETE', `/api/workouts/${workoutId}`, {
    token: ownerAuth.token
  });
  assert.equal(deletedWorkout.status, 200);
  assert.equal(
    (await request('GET', `/api/workouts/${workoutId}`, { token: ownerAuth.token })).status,
    404
  );
  assert.equal(
    (await request('DELETE', `/api/workouts/templates/${templateId}`, {
      token: ownerAuth.token
    })).status,
    200
  );
  const preservedHistory = await request('GET', `/api/workouts/sessions/${sessionId}`, {
    token: ownerAuth.token
  });
  assert.equal(preservedHistory.payload.data.session.template, null);
  assert.equal(preservedHistory.payload.data.sets.length, 1);

  const changedPassword = await request('PATCH', '/api/account/password', {
    token: ownerAuth.token,
    body: { currentPassword: 'StrongerPass123', newPassword: 'EvenStronger456' }
  });
  assert.equal(changedPassword.status, 200);
  assert.equal(
    (await request('GET', '/api/account', { token: ownerAuth.token })).status,
    401
  );

  const newOwnerAuth = await login('alex.m@example.com', 'EvenStronger456');
  const wrongDeletePassword = await request('DELETE', '/api/account', {
    token: newOwnerAuth.token,
    body: { password: 'WrongPassword123' }
  });
  assert.equal(wrongDeletePassword.status, 401);

  const deletedAccount = await request('DELETE', '/api/account', {
    token: newOwnerAuth.token,
    body: { password: 'EvenStronger456' }
  });
  assert.equal(deletedAccount.status, 200);
  assert.equal(await User.countDocuments({ _id: owner.id }), 0);
  assert.equal(await WorkoutSession.countDocuments({ user: owner.id }), 0);
  assert.equal(await WorkoutTemplate.countDocuments({ user: owner.id }), 0);
  assert.equal(await ExerciseSet.countDocuments({ session: sessionId }), 0);
  assert.equal(await PersonalGoal.countDocuments({ user: owner.id }), 0);
  assert.equal(await Exercise.countDocuments({ createdBy: owner.id }), 0);
  assert.equal(await ProgressRecord.countDocuments({ user: owner.id }), 0);
  assert.equal(await RevokedToken.countDocuments({ user: owner.id }), 0);

  const logout = await request('POST', '/api/auth/logout', { token: otherAuth.token });
  assert.equal(logout.status, 200);
  assert.equal(
    (await request('GET', '/api/auth/me', { token: otherAuth.token })).status,
    401
  );

  const ninthAuthAttempt = await request('POST', '/api/auth/register', { body: {} });
  const tenthAuthAttempt = await request('POST', '/api/auth/register', { body: {} });
  const rateLimitedAttempt = await request('POST', '/api/auth/register', { body: {} });
  assert.equal(ninthAuthAttempt.status, 400);
  assert.equal(tenthAuthAttempt.status, 400);
  assert.equal(rateLimitedAttempt.status, 429);
});
