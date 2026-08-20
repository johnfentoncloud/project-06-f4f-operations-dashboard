"use strict";
const assert = require("assert");

const library = require("../js/exercise-library.js");
global.F4F_EXERCISES = library;
const workouts = require("../js/workout-builder.js");

assert.ok(library.exercises.length >= 75 && library.exercises.length <= 100, "Starter library should contain 75-100 exercises");
assert.strictEqual(new Set(library.exercises.map(item => item.exerciseId)).size, library.exercises.length, "Exercise IDs must be unique");
assert.ok(library.exercises.every(item => item.exerciseId && item.name && item.category && item.movementPattern && item.equipment && item.measurementType && item.defaultUnit && item.instructions && Array.isArray(item.tags) && item.active && item.customExercise === false && item.createdBy && item.createdAt && item.updatedAt && Object.hasOwn(item, "demoMedia")));
for (const category of ["Strength", "Power", "Plyometrics", "Speed", "Agility / Change of Direction", "Conditioning", "Core", "Mobility / Warm-up"]) {
  assert.ok(library.exercises.some(item => item.category === category), `Starter library must include ${category}`);
}

const squatSearch = library.filterExercises(library.exercises, { query: "front squat" });
assert.ok(squatSearch.some(item => item.name === "Front Squat"), "Search should find exercises by name");
const strengthBarbell = library.filterExercises(library.exercises, { category: "Strength", equipment: "Barbell" });
assert.ok(strengthBarbell.length > 5 && strengthBarbell.every(item => item.category === "Strength" && item.equipment === "Barbell"));
const acceleration = library.filterExercises(library.exercises, { movementPattern: "Acceleration" });
assert.ok(acceleration.length >= 3 && acceleration.every(item => item.movementPattern === "Acceleration"));

assert.deepStrictEqual(workouts.fieldsForMeasurement("weight_reps"), ["sets", "reps", "load", "loadUnit", "rest", "tempo", "rpe", "percentage"]);
assert.deepStrictEqual(workouts.fieldsForMeasurement("distance"), ["sets", "distance", "distanceUnit", "rest", "rpe"]);
assert.ok(!workouts.fieldsForMeasurement("hold_duration").includes("load"));

const workout = workouts.createWorkout({ name: "Test Strength Session", description: "Synthetic test workout" });
const frontSquat = library.exercises.find(item => item.name === "Front Squat");
const plank = library.exercises.find(item => item.name === "Plank");
workouts.addExercise(workout, frontSquat.exerciseId, "Strength");
workouts.addExercise(workout, plank.exerciseId, "Core");
assert.deepStrictEqual(workout.exercises.map(item => item.exerciseId), [frontSquat.exerciseId, plank.exerciseId]);
workouts.moveExercise(workout, 1, -1);
assert.deepStrictEqual(workout.exercises.map(item => item.exerciseId), [plank.exerciseId, frontSquat.exerciseId]);
workouts.updatePrescription(workout, 0, "sets", "3");
workouts.updatePrescription(workout, 0, "duration", "45");
workouts.updatePrescription(workout, 1, "sets", "4");
workouts.updatePrescription(workout, 1, "reps", "6");
workouts.updatePrescription(workout, 1, "load", "135");
workouts.updatePrescription(workout, 1, "loadUnit", "lb");
assert.deepStrictEqual(workouts.validatePrescription(plank, workout.exercises[0].prescription), []);
workouts.updatePrescription(workout, 1, "rpe", "11");
assert.ok(workouts.validatePrescription(frontSquat, workout.exercises[1].prescription).some(error => error.includes("RPE")));
workouts.updatePrescription(workout, 1, "rpe", "8");

const template = workouts.serializeTemplate(workout, { templateId: "template-test", version: 1, timestamp: "2026-08-16T12:00:00.000Z" });
assert.strictEqual(template.templateId, "template-test");
assert.strictEqual(template.exercises.length, 2);
assert.strictEqual(template.exercises[0].exerciseSnapshot.name, "Plank");
assert.ok(Object.isFrozen(template.exercises[0].exerciseSnapshot), "Assigned exercise foundation should serialize as an immutable snapshot");
assert.throws(() => workouts.addExercise(workout, "missing-exercise"), /Invalid exercise/);
assert.throws(() => workouts.removeExercise(workout, 99), /Invalid exercise position/);

const demo = workouts.realisticDemoWorkout();
assert.strictEqual(demo.name, "F4F Total-Body Performance");
assert.strictEqual(demo.exercises.length, 6);
assert.deepStrictEqual([...new Set(demo.exercises.map(item => item.section))], ["Warm-Up", "Power", "Strength", "Conditioning", "Core"]);

const templateMarkup = workouts.templateListMarkup([
  { templateId: "template-one", name: "F4F Total-Body Performance", currentVersion: 2 },
  { templateId: "template-two", name: "Speed Development", currentVersion: 1 }
]);
assert.strictEqual((templateMarkup.match(/class="template-card"/g) || []).length, 2, "Each saved template must render as a separate card");
assert.strictEqual((templateMarkup.match(/class="template-name"/g) || []).length, 2, "Each template name must have its own high-emphasis element");
assert.strictEqual((templateMarkup.match(/class="template-version"/g) || []).length, 2, "Each version must render as separate metadata");
assert.ok(templateMarkup.includes('data-open-template="template-one"') && templateMarkup.includes("Open Template"), "Each card must retain an explicit open action");

console.log(`Exercise search/filtering, ${library.exercises.length}-record seed bank, measurement handling, workout ordering, validation, and template serialization passed.`);
