import Exercise from '../models/Exercise.js';
import WorkoutTemplate from '../models/WorkoutTemplate.js';

const starterExercises = [
  { name: 'Barbell bench press', muscleGroup: 'chest', targetMuscles: ['pectorals', 'triceps', 'front deltoids'], equipment: 'barbell, bench', difficulty: 'intermediate', instructions: 'Lower the bar under control to mid-chest, then press until your elbows are extended.' },
  { name: 'Push-up', muscleGroup: 'chest', targetMuscles: ['pectorals', 'triceps', 'core'], equipment: 'bodyweight', difficulty: 'beginner', instructions: 'Keep a straight line from head to heels while lowering your chest toward the floor.' },
  { name: 'Dumbbell shoulder press', muscleGroup: 'shoulders', targetMuscles: ['shoulders', 'triceps'], equipment: 'dumbbells', difficulty: 'beginner', instructions: 'Press the dumbbells overhead without arching your lower back.' },
  { name: 'Dumbbell lateral raise', muscleGroup: 'shoulders', targetMuscles: ['side deltoids'], equipment: 'dumbbells', difficulty: 'beginner', instructions: 'Raise the weights out to the sides with a slight elbow bend and controlled tempo.' },
  { name: 'Cable triceps pushdown', muscleGroup: 'arms', targetMuscles: ['triceps'], equipment: 'cable machine', difficulty: 'beginner', instructions: 'Keep your upper arms close to your sides while extending your elbows.' },
  { name: 'Pull-up', muscleGroup: 'back', targetMuscles: ['lats', 'upper back', 'biceps'], equipment: 'pull-up bar', difficulty: 'advanced', instructions: 'Pull your chest toward the bar while keeping your shoulders controlled.' },
  { name: 'Lat pulldown', muscleGroup: 'back', targetMuscles: ['lats', 'biceps'], equipment: 'cable machine', difficulty: 'beginner', instructions: 'Pull the bar toward your upper chest and avoid swinging your torso.' },
  { name: 'Barbell row', muscleGroup: 'back', targetMuscles: ['upper back', 'lats', 'biceps'], equipment: 'barbell', difficulty: 'intermediate', instructions: 'Hinge at the hips and row the bar toward your lower ribs with a braced trunk.' },
  { name: 'Seated cable row', muscleGroup: 'back', targetMuscles: ['upper back', 'lats', 'biceps'], equipment: 'cable machine', difficulty: 'beginner', instructions: 'Pull the handle toward your torso while keeping your spine neutral.' },
  { name: 'Dumbbell curl', muscleGroup: 'arms', targetMuscles: ['biceps'], equipment: 'dumbbells', difficulty: 'beginner', instructions: 'Curl the weights without swinging your torso; lower them under control.' },
  { name: 'Barbell back squat', muscleGroup: 'legs', targetMuscles: ['quadriceps', 'glutes', 'core'], equipment: 'barbell, squat rack', difficulty: 'intermediate', instructions: 'Brace, sit between your hips, and keep your feet planted throughout the squat.' },
  { name: 'Goblet squat', muscleGroup: 'legs', targetMuscles: ['quadriceps', 'glutes', 'core'], equipment: 'dumbbell or kettlebell', difficulty: 'beginner', instructions: 'Hold the weight at your chest and squat while keeping your torso steady.' },
  { name: 'Romanian deadlift', muscleGroup: 'legs', targetMuscles: ['hamstrings', 'glutes', 'back'], equipment: 'barbell or dumbbells', difficulty: 'intermediate', instructions: 'Push your hips back with a soft knee bend, then stand by driving your hips forward.' },
  { name: 'Leg press', muscleGroup: 'legs', targetMuscles: ['quadriceps', 'glutes'], equipment: 'leg press machine', difficulty: 'beginner', instructions: 'Lower the platform with control and press through your whole foot without locking your knees.' },
  { name: 'Reverse lunge', muscleGroup: 'legs', targetMuscles: ['quadriceps', 'glutes'], equipment: 'bodyweight or dumbbells', difficulty: 'beginner', instructions: 'Step back, lower under control, and return to standing through the front foot.' },
  { name: 'Standing calf raise', muscleGroup: 'legs', targetMuscles: ['calves'], equipment: 'bodyweight or calf raise machine', difficulty: 'beginner', instructions: 'Rise onto the balls of your feet, pause briefly, and lower through a comfortable range.' },
  { name: 'Plank', muscleGroup: 'core', targetMuscles: ['abdominals', 'core'], equipment: 'bodyweight', difficulty: 'beginner', instructions: 'Maintain a straight body line and brace your midsection while breathing steadily.' },
  { name: 'Dead bug', muscleGroup: 'core', targetMuscles: ['abdominals', 'core'], equipment: 'bodyweight', difficulty: 'beginner', instructions: 'Keep your lower back gently grounded as you extend opposite limbs under control.' }
];

const starterTemplates = [
  { systemKey: 'full-body', name: 'Full Body', category: 'strength', difficulty: 'beginner', durationMinutes: 50, description: 'A balanced full-body starting point.', exercises: [['Barbell back squat', 3, 8], ['Barbell bench press', 3, 8], ['Seated cable row', 3, 10], ['Romanian deadlift', 3, 8], ['Plank', 3, 30]] },
  { systemKey: 'upper-body', name: 'Upper Body', category: 'strength', difficulty: 'beginner', durationMinutes: 45, description: 'A balanced upper-body session.', exercises: [['Barbell bench press', 3, 8], ['Lat pulldown', 3, 10], ['Dumbbell shoulder press', 3, 10], ['Dumbbell curl', 3, 12]] },
  { systemKey: 'lower-body', name: 'Lower Body', category: 'strength', difficulty: 'beginner', durationMinutes: 50, description: 'A practical lower-body session.', exercises: [['Goblet squat', 3, 10], ['Romanian deadlift', 3, 8], ['Reverse lunge', 3, 10], ['Standing calf raise', 3, 12]] },
  { systemKey: 'push-day', name: 'Push Day', category: 'hypertrophy', difficulty: 'intermediate', durationMinutes: 45, description: 'Chest, shoulder, and triceps movements.', exercises: [['Barbell bench press', 4, 8], ['Dumbbell shoulder press', 3, 10], ['Dumbbell lateral raise', 3, 12], ['Cable triceps pushdown', 3, 12]] },
  { systemKey: 'pull-day', name: 'Pull Day', category: 'hypertrophy', difficulty: 'intermediate', durationMinutes: 45, description: 'Back and biceps movements.', exercises: [['Lat pulldown', 4, 10], ['Barbell row', 3, 8], ['Seated cable row', 3, 10], ['Dumbbell curl', 3, 12]] },
  { systemKey: 'leg-day', name: 'Leg Day', category: 'hypertrophy', difficulty: 'intermediate', durationMinutes: 55, description: 'A focused lower-body session.', exercises: [['Barbell back squat', 4, 8], ['Romanian deadlift', 3, 8], ['Leg press', 3, 10], ['Standing calf raise', 3, 12]] }
];

export default async function seedStarterCatalog() {
  await WorkoutTemplate.updateMany(
    { isTemplate: { $exists: false }, isBuiltIn: { $ne: true } },
    {
      $set: {
        isTemplate: false,
        isBuiltIn: false,
        category: 'custom',
        difficulty: 'intermediate',
        durationMinutes: 45
      }
    }
  );

  const exercisesByName = new Map();
  for (const exercise of starterExercises) {
    const normalizedName = exercise.name.toLocaleLowerCase('en-US');
    const savedExercise = await Exercise.findOneAndUpdate(
      { createdBy: null, isCustom: false, normalizedName },
      { $set: { ...exercise, normalizedName, createdBy: null, isCustom: false } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    exercisesByName.set(exercise.name, savedExercise);
  }

  for (const template of starterTemplates) {
    const exercises = template.exercises.map(([name, sets, repetitions], order) => {
      const exercise = exercisesByName.get(name);
      return {
        exercise: exercise._id,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        order,
        sets,
        repetitions,
        weight: 0,
        restSeconds: 90,
        targetSets: sets,
        targetRepsMin: repetitions,
        targetRepsMax: repetitions
      };
    });

    await WorkoutTemplate.findOneAndUpdate(
      { systemKey: template.systemKey, isBuiltIn: true },
      {
        $set: {
          user: null,
          name: template.name,
          category: template.category,
          difficulty: template.difficulty,
          durationMinutes: template.durationMinutes,
          description: template.description,
          isTemplate: true,
          isBuiltIn: true,
          exercises
        }
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }
}
