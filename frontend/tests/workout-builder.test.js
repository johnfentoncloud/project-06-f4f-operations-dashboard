"use strict";
const assert = require("assert");
const library = require("../js/exercise-library.js");
global.F4F_EXERCISES = library;
const workouts = require("../js/workout-builder.js");
const fixtures = require("../js/workout-fixtures.js");

assert.strictEqual(library.exercises.length, 89);
assert.deepStrictEqual(workouts.SECTION_TYPES, ["Stretch / Mobility", "Warm-Up", "Power", "Strength", "Conditioning", "Metcon", "Accessory", "Core", "Finisher", "Cooldown", "Custom"]);
for (const format of ["Standard", "Superset", "Circuit", "AMRAP", "For Time", "EMOM", "E2MOM", "Intervals", "Rounds", "Steady State", "Freeform / Instructions Only"]) assert.ok(workouts.SECTION_FORMATS.includes(format));
assert.ok(workouts.fieldsForMeasurement("weight_reps").includes("repQualifier"));
assert.deepStrictEqual(workouts.fieldsForFormat("Superset"), { rounds: true, duration: false, instructionsEmphasis: false, durationLabel: "Duration" });
assert.strictEqual(workouts.fieldsForFormat("AMRAP").duration, true);
assert.strictEqual(workouts.fieldsForFormat("EMOM").duration, true);
assert.strictEqual(workouts.fieldsForFormat("E2MOM").duration, true);
assert.strictEqual(workouts.fieldsForFormat("Steady State").duration, true);
assert.strictEqual(workouts.fieldsForFormat("For Time").durationLabel, "Time cap");
assert.strictEqual(workouts.fieldsForFormat("Freeform / Instructions Only").instructionsEmphasis, true);
for (const field of ["type", "title", "instructions", "rounds", "duration", "durationUnit", "reps", "repQualifier", "load", "distance", "calories", "rest", "tempo", "rpe", "percentage", "coachInstruction"]) {
  assert.strictEqual(workouts.fieldEditRequiresRender(field), false, `${field} edits must not structurally rerender the builder`);
}
assert.strictEqual(workouts.fieldEditRequiresRender("format"), true, "Format changes may rerender controls that become relevant");

const quickWorkout = workouts.createWorkout({ name: "Quick section workflow" });
const quickWarmup = workouts.addQuickSection(quickWorkout, "Warm-Up");
const quickStrength1 = workouts.addQuickSection(quickWorkout, "Strength");
const quickStrength2 = workouts.addQuickSection(quickWorkout, "Strength");
const quickSs1 = workouts.addQuickSection(quickWorkout, "Superset");
const quickSs2 = workouts.addQuickSection(quickWorkout, "Superset");
const quickSs3 = workouts.addQuickSection(quickWorkout, "Superset");
const quickMetcon1 = workouts.addQuickSection(quickWorkout, "Metcon");
const quickMetcon2 = workouts.addQuickSection(quickWorkout, "Metcon");
assert.deepStrictEqual([quickWarmup.title, quickStrength1.title, quickStrength2.title], ["Warm-Up", "Strength", "Strength 2"]);
assert.deepStrictEqual([quickSs1.title, quickSs2.title, quickSs3.title], ["SS 1", "SS 2", "SS 3"]);
assert.strictEqual(quickSs1.type, "Strength");
assert.strictEqual(quickSs1.format, "Superset");
assert.deepStrictEqual([quickMetcon1.title, quickMetcon2.title], ["Metcon", "Metcon 2"]);
workouts.updateSection(quickWorkout, 3, "title", "Heavy Pair");
workouts.updateSection(quickWorkout, 3, "format", "Standard");
assert.strictEqual(quickSs1.title, "Heavy Pair", "Coach titles must survive later type or format changes");
const quickLabels = workouts.destinationLabels(quickWorkout.sections);
assert.strictEqual(quickLabels.get(quickSs2.sectionId), "SS 2");
assert.strictEqual(workouts.resolveTargetSectionId(quickWorkout, quickSs3.sectionId), quickSs3.sectionId, "An existing destination must remain selected");
workouts.deleteSection(quickWorkout, quickWorkout.sections.indexOf(quickSs3));
assert.strictEqual(workouts.resolveTargetSectionId(quickWorkout, quickSs3.sectionId), quickWorkout.sections[0].sectionId, "A deleted destination must fall back safely");
const duplicateLabelsWorkout = workouts.createWorkout();
const duplicateLabelA = workouts.addSection(duplicateLabelsWorkout, { type: "Strength", title: "Work" });
const duplicateLabelB = workouts.addSection(duplicateLabelsWorkout, { type: "Core", title: "Work" });
const duplicateLabels = workouts.destinationLabels(duplicateLabelsWorkout.sections);
assert.notStrictEqual(duplicateLabels.get(duplicateLabelA.sectionId), duplicateLabels.get(duplicateLabelB.sectionId), "Duplicate display titles must receive distinguishing context");
const blankResetSource = workouts.createWorkout();
assert.throws(() => workouts.addExercise(blankResetSource, library.exercises[0].exerciseId, ""), /valid destination section/);
assert.strictEqual(blankResetSource.sections.length, 0, "Adding an exercise must not create an implicit Strength section");
let blankConfirmCalls = 0;
const blankReset = workouts.freshWorkoutAfterConfirmation(blankResetSource, () => { blankConfirmCalls += 1; return false; });
assert.ok(blankReset && blankReset.sections.length === 0 && blankConfirmCalls === 0, "An empty builder resets immediately to a blank slate");
const dirtyResetSource = workouts.createWorkout({ name: "Unsaved work" }); dirtyResetSource.templateId = "saved-template-remains-in-dynamodb";
assert.strictEqual(workouts.freshWorkoutAfterConfirmation(dirtyResetSource, () => false), null, "Meaningful work requires confirmation before reset");
const confirmedReset = workouts.freshWorkoutAfterConfirmation(dirtyResetSource, () => true);
assert.ok(confirmedReset && !confirmedReset.templateId && confirmedReset.sections.length === 0, "Confirmed reset clears only the local builder identity and content");

const session = workouts.createWorkout({ name: "Section Model Test", description: "Synthetic test session" });
const first = workouts.addSection(session, { type: "Strength", format: "Superset", title: "SS 1", rounds: 4 });
const second = workouts.addSection(session, { type: "Strength", format: "Superset", title: "SS 2", rounds: 3 });
const metcon = workouts.addSection(session, { type: "Metcon", format: "AMRAP", title: "Metcon", duration: 15 });
assert.strictEqual(session.sections.filter(item => item.type === "Strength").length, 2, "Repeated section types must remain independent");
assert.notStrictEqual(first.sectionId, second.sectionId, "Sections need stable unique IDs");
workouts.addExercise(session, library.exercises.find(item => item.name === "Front Squat").exerciseId, first.sectionId);
workouts.addExercise(session, library.exercises.find(item => item.name === "Bench Press").exerciseId, first.sectionId);
workouts.addExercise(session, library.exercises.find(item => item.name === "Split Squat").exerciseId, second.sectionId);
workouts.addExercise(session, library.exercises.find(item => item.name === "Push Press").exerciseId, second.sectionId);
workouts.addExercise(session, library.exercises.find(item => item.name === "Ski Erg").exerciseId, metcon.sectionId);
workouts.updatePrescription(session, 1, 0, "reps", "8");
workouts.updatePrescription(session, 1, 0, "repQualifier", "each-side");
assert.strictEqual(second.exercises[0].prescription.repQualifier, "each-side");
workouts.updateSection(session, 1, "title", "S");
workouts.updateSection(session, 1, "title", "SS");
workouts.updateSection(session, 1, "title", "SS ");
workouts.updateSection(session, 1, "title", "SS 2");
assert.strictEqual(second.title, "SS 2", "Multiple keystrokes must update state without stripping an in-progress space");
workouts.updatePrescription(session, 1, 0, "reps", "1");
workouts.updatePrescription(session, 1, 0, "reps", "12");
workouts.updatePrescription(session, 1, 0, "reps", "1");
workouts.updatePrescription(session, 1, 0, "reps", "10");
assert.strictEqual(second.exercises[0].prescription.reps, "10", "Repeated number edits must retain the final state");

const editingSession = workouts.createWorkout({ name: "Editing stability", description: "Original description" });
const editingSection = workouts.addSection(editingSession, { type: "Strength", format: "Superset", title: "SS 1", rounds: "4" });
const distanceSection = workouts.addSection(editingSession, { type: "Metcon", format: "AMRAP", title: "Metcon", duration: "10", durationUnit: "min" });
const weightExercise = library.exercises.find(item => item.measurementType === "weight_reps");
const distanceExercise = library.exercises.find(item => item.measurementType === "distance");
const calorieExercise = library.exercises.find(item => item.measurementType === "calories");
workouts.addExercise(editingSession, weightExercise.exerciseId, editingSection.sectionId);
workouts.addExercise(editingSession, distanceExercise.exerciseId, distanceSection.sectionId);
workouts.addExercise(editingSession, calorieExercise.exerciseId, distanceSection.sectionId);
editingSession.name = "Editing stability final";
editingSession.description = "Edited without rerender";
workouts.updateSection(editingSession, 0, "title", "SS 1 final");
workouts.updateSection(editingSession, 0, "instructions", "Control the eccentric");
workouts.updateSection(editingSession, 0, "rounds", "5");
workouts.updateSection(editingSession, 1, "duration", "12");
for (const [field, value] of Object.entries({ reps: "8", repQualifier: "each-side", load: "135", rest: "90", tempo: "3010", rpe: "8", percentage: "75", coachInstruction: "Stay braced" })) {
  workouts.updatePrescription(editingSession, 0, 0, field, value);
}
for (const [field, value] of Object.entries({ distance: "500", distanceUnit: "m", rest: "60", coachInstruction: "Strong finish" })) {
  workouts.updatePrescription(editingSession, 1, 0, field, value);
}
workouts.updatePrescription(editingSession, 1, 1, "calories", "10");
const editedSnapshot = workouts.serializeTemplate(editingSession, { templateId: "editing-stability", version: 1 });
assert.strictEqual(editedSnapshot.name, "Editing stability final");
assert.strictEqual(editedSnapshot.description, "Edited without rerender");
assert.strictEqual(editedSnapshot.sections[0].title, "SS 1 final");
assert.strictEqual(editedSnapshot.sections[0].instructions, "Control the eccentric");
assert.strictEqual(editedSnapshot.sections[0].rounds, "5");
assert.strictEqual(editedSnapshot.sections[1].duration, "12");
assert.deepStrictEqual(editedSnapshot.sections[0].exercises[0].prescription, { sets: "", reps: "8", repQualifier: "each-side", load: "135", loadUnit: "lb", rest: "90", tempo: "3010", rpe: "8", percentage: "75", coachInstruction: "Stay braced" });
assert.strictEqual(editedSnapshot.sections[1].exercises[0].prescription.distance, "500");
assert.strictEqual(editedSnapshot.sections[1].exercises[1].prescription.calories, "10");

workouts.moveExercise(session, 0, 1, -1);
assert.strictEqual(first.exercises[0].exerciseName, "Bench Press");
workouts.moveExerciseToSection(session, 0, 0, second.sectionId);
assert.ok(second.exercises.some(item => item.exerciseName === "Bench Press"));
workouts.moveSection(session, 2, -1);
assert.strictEqual(session.sections[1].type, "Metcon");
const duplicate = workouts.duplicateSection(session, 0);
assert.notStrictEqual(duplicate.sectionId, first.sectionId);
assert.strictEqual(duplicate.exercises.length, first.exercises.length);
assert.deepStrictEqual(duplicate.exercises[0].prescription, first.exercises[0].prescription);
duplicate.exercises[0].prescription.reps = "99";
assert.notStrictEqual(duplicate.exercises[0].prescription.reps, first.exercises[0].prescription.reps, "A duplicate must be independently editable");
workouts.deleteSection(session, 1);
assert.ok(!session.sections.includes(duplicate));

const day1 = fixtures.day1();
const day2 = fixtures.day2();
const day3 = fixtures.day3();
assert.strictEqual(day1.sections.filter(item => item.format === "Superset").length, 3, "Day 1 needs three Superset sections");
assert.deepStrictEqual(day1.sections.filter(item => item.format === "Superset").map(item => item.title), ["SS 1", "SS 2", "SS 3"]);
assert.strictEqual(day1.sections.find(item => item.title === "SS 2").exercises[0].prescription.repQualifier, "each-side");
assert.strictEqual(day1.sections.find(item => item.type === "Metcon").format, "Rounds");
assert.strictEqual(day2.sections.find(item => item.type === "Metcon").format, "AMRAP");
assert.strictEqual(day2.sections.find(item => item.type === "Metcon").duration, 15);
assert.strictEqual(day2.sections.find(item => item.title === "SS 2").exercises[1].prescription.repQualifier, "each-side");
assert.strictEqual(day3.sections[0].format, "Steady State");
assert.strictEqual(day3.sections[0].duration, 45);
assert.strictEqual(day3.sections[1].format, "Freeform / Instructions Only");
assert.ok(day3.sections[1].instructions);
assert.strictEqual(workouts.sectionMetaDisplay(day1.sections[2]), "Superset · 4 rounds");
assert.strictEqual(workouts.sectionMetaDisplay(day1.sections.at(-1)), "2 rounds");
assert.strictEqual(workouts.sectionMetaDisplay(day2.sections.at(-1)), "15 min AMRAP");
assert.strictEqual(workouts.sectionMetaDisplay(day3.sections[0]), "45 min Steady State");
assert.strictEqual(workouts.prescriptionDisplay(day1.sections[3].exercises[0]), "8 each");
assert.strictEqual(workouts.prescriptionDisplay(day2.sections.at(-1).exercises.at(-1)), "20 alternating");
assert.strictEqual(workouts.prescriptionDisplay(day2.sections[1].exercises[0]), "10 cal");
assert.strictEqual(workouts.prescriptionDisplay(day2.sections.at(-1).exercises[0]), "500 m");

const v1 = workouts.serializeTemplate(day1, { templateId: "template-day-1", version: 1, timestamp: "2026-08-20T12:00:00.000Z" });
const frozenV1 = JSON.stringify(v1);
assert.strictEqual(v1.schemaVersion, 2);
assert.ok(!("autoTitle" in v1.sections[0]) && !("autoTitleKey" in v1.sections[0]), "Local auto-title metadata must not change schemaVersion 2 serialization");
assert.strictEqual(v1.sections[2].title, "SS 1");
assert.strictEqual(v1.sections[2].exercises[0].order, 0);
day1.sections[2].rounds = 5;
const v2 = workouts.serializeTemplate(day1, { templateId: "template-day-1", version: 2, timestamp: "2026-08-21T12:00:00.000Z" });
assert.strictEqual(v2.sections[2].rounds, 5);
assert.strictEqual(v2.sections[3].exercises[0].prescription.reps, 8, "Save serialization must include edited prescription values");
assert.strictEqual(JSON.stringify(v1), frozenV1, "Version 2 creation must not mutate the Version 1 snapshot");

const legacy = {
  templateId: "legacy-one", version: 1, name: "Legacy Flat Workout", description: "Phase 3B shape",
  exercises: [
    { order: 0, section: "Warm-Up", exerciseId: "f4f-061-row", exerciseName: "Row", measurementType: "distance", prescription: { distance: 250, distanceUnit: "m" } },
    { order: 1, section: "Strength", exerciseId: "f4f-002-front-squat", exerciseName: "Front Squat", measurementType: "weight_reps", prescription: { reps: 6, loadUnit: "lb" } },
    { order: 2, section: "Strength", exerciseId: "f4f-018-bench-press", exerciseName: "Bench Press", measurementType: "weight_reps", prescription: { reps: 8, loadUnit: "lb" } }
  ]
};
const normalized = workouts.normalizeTemplate(legacy);
assert.deepStrictEqual(normalized.sections.map(item => item.type), ["Warm-Up", "Strength"]);
assert.deepStrictEqual(normalized.sections[1].exercises.map(item => item.exerciseName), ["Front Squat", "Bench Press"]);
const reopenedV2 = workouts.serializeTemplate(normalized, { templateId: legacy.templateId, version: 2 });
assert.strictEqual(reopenedV2.schemaVersion, 2);
assert.strictEqual(reopenedV2.sections.length, 2);

const nonContiguousLegacy = {
  templateId: "legacy-runs", version: 1, name: "Non-contiguous legacy order", exercises: [
    { order: 0, section: "Strength", exerciseId: "f4f-002-front-squat", exerciseName: "Front Squat", measurementType: "weight_reps", prescription: { reps: 6 } },
    { order: 1, section: "Strength", exerciseId: "f4f-018-bench-press", exerciseName: "Bench Press", measurementType: "weight_reps", prescription: { reps: 8 } },
    { order: 2, section: "Conditioning", exerciseId: "f4f-061-row", exerciseName: "Row", measurementType: "distance", prescription: { distance: 250, distanceUnit: "m" } },
    { order: 3, section: "Strength", exerciseId: "f4f-005-split-squat", exerciseName: "Split Squat", measurementType: "weight_reps", prescription: { reps: 8, repQualifier: "each-side" } }
  ]
};
const normalizedRuns = workouts.normalizeTemplate(nonContiguousLegacy);
assert.deepStrictEqual(normalizedRuns.sections.map(item => item.type), ["Strength", "Conditioning", "Strength"]);
assert.deepStrictEqual(normalizedRuns.sections.map(item => item.title), ["Strength", "Conditioning", "Strength 2"]);
assert.strictEqual(new Set(normalizedRuns.sections.map(item => item.sectionId)).size, 3);

assert.throws(() => workouts.createSection({ type: "Invalid" }), /Invalid section type/);
assert.throws(() => workouts.createSection({ format: "Invalid" }), /Invalid section format/);
const invalid = workouts.createWorkout({ name: "Invalid" });
workouts.addSection(invalid, { type: "Strength", format: "Standard", title: "Empty" });
assert.throws(() => workouts.serializeTemplate(invalid), /add an exercise or instructions/);

const templateMarkup = workouts.templateListMarkup([
  { templateId: "template-one", name: "F4F Total-Body Performance", currentVersion: 2 },
  { templateId: "template-two", name: "Speed Development", currentVersion: 1 }
]);
assert.strictEqual((templateMarkup.match(/class="template-card"/g) || []).length, 2);
assert.ok(templateMarkup.includes('data-open-template="template-one"') && templateMarkup.includes("Open Template"));

console.log("Sectioned sessions, repeated supersets, formats, fixtures, serialization, version immutability, and legacy normalization passed.");
