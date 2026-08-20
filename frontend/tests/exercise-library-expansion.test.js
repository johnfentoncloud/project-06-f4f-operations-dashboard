"use strict";

const assert = require("assert");
const crypto = require("crypto");
const approvedSeed = require("../../seed/exercises.json");
const library = require("../js/exercise-library.js");
const workouts = require("../js/workout-builder.js");
const { candidates } = require("../../seed/exercise-expansion-candidates.js");
const triage = require("../../seed/exercise-expansion-triage.js");
const readySeed = require("../../seed/exercise-expansion-ready.json");
const aliasBackfill = require("../../seed/exercise-alias-backfill.json");
const excludedSeed = require("../../seed/exercise-expansion-excluded.json");

const approvedIds = library.exercises.map(item => item.exerciseId);
assert.strictEqual(library.exercises.length, 89, "Expansion must not alter the approved library count");
assert.strictEqual(new Set(approvedIds).size, 89, "Approved IDs must remain unique");
assert.strictEqual(
  crypto.createHash("sha256").update(approvedIds.join("\n")).digest("hex"),
  "64280dc63c98f7d78d2b26c93f323d8b9658cb1a8fd274605d8d6c10e9bd4cf9",
  "Existing exercise IDs must remain byte-for-byte stable"
);
assert.deepStrictEqual(approvedSeed.map(item => item.exerciseId), approvedIds, "Exported seed IDs must match the approved library");

const searchNames = query => library.filterExercises(library.exercises, { query }).map(item => item.name);
for (const query of ["Push-Up", "push ups", "PUSHUPS", "pushup"]) assert.ok(searchNames(query).includes("Push-Up"), `${query} should find Push-Up`);
assert.ok(searchNames("RDL").includes("Romanian Deadlift"));
assert.ok(searchNames("RFESS").includes("Bulgarian Split Squat"));
assert.ok(searchNames("medicine ball").includes("Med-Ball Rotational Throw"));
assert.ok(searchNames("med ball").includes("Med-Ball Rotational Throw"));
assert.ok(searchNames("anti rotation").includes("Pallof Press"), "Tags remain searchable");

assert.ok(candidates.length >= 150 && candidates.length <= 250, "Candidate proposal must remain reviewable");
assert.strictEqual(new Set(candidates.map(item => item.candidateId)).size, candidates.length);
assert.strictEqual(new Set(candidates.map(item => library.normalizeSearchText(item.name))).size, candidates.length);
const approvedNames = new Set(library.exercises.map(item => library.normalizeSearchText(item.name)));
assert.ok(candidates.every(item => !approvedNames.has(library.normalizeSearchText(item.name))), "Candidates must not duplicate approved canonical names");
for (const required of ["Leg Press", "Hack Squat", "Calf Raise", "Rear-Foot-Elevated Split Squat", "Dumbbell Bench Press", "Power Clean", "Air Bike", "StairMaster"]) {
  assert.ok(candidates.some(item => item.name === required), `${required} must be represented`);
}
assert.ok(candidates.some(item => item.reviewStatus === "NEEDS_TAXONOMY_REVIEW"), "Questionable names must be explicitly flagged");
assert.strictEqual(triage.classified.length, candidates.length);
assert.strictEqual(triage.readyToApprove.length, 182);
assert.strictEqual(triage.coachReview.length, 30);
assert.strictEqual(triage.hold.length, 21);
assert.strictEqual(new Set(triage.classified.map(item => item.candidateId)).size, candidates.length, "Every candidate must be classified exactly once");
assert.strictEqual(readySeed.length, triage.readyToApprove.length);
assert.strictEqual(excludedSeed.length, triage.coachReview.length + triage.hold.length);
assert.strictEqual(excludedSeed.filter(item => item.approvalStatus === "COACH_REVIEW").length, 30);
assert.strictEqual(excludedSeed.filter(item => item.approvalStatus === "HOLD").length, 21);
assert.strictEqual(new Set(readySeed.map(item => item.exerciseId)).size, readySeed.length);
assert.ok(readySeed.every(item => item.exerciseId.startsWith("f4f-exp1-")), "Approved seed IDs must use a deterministic expansion namespace");
assert.ok(!readySeed.some(item => item.name === "Rear-Foot-Elevated Split Squat"), "Existing Bulgarian Split Squat aliases must prevent a duplicate record");
assert.ok(aliasBackfill.every(item => approvedIds.includes(item.exerciseId)), "Backfills must target exact existing IDs");
const allowedCategories = new Set(["Strength", "Power", "Plyometrics", "Speed", "Agility / Change of Direction", "Conditioning", "Core", "Mobility / Warm-up"]);
const allowedEquipment = new Set(["Barbell", "Dumbbell", "Kettlebell", "Bodyweight", "Medicine Ball", "Resistance Band", "Cable", "Machine", "Pull-Up Bar", "Bench", "Box", "Sled", "Rower", "Ski Erg", "Air Bike", "Bike", "Treadmill", "StairMaster", "Landmine", "Trap Bar", "Cones", "None"]);
const allowedMeasurements = new Set(["reps", "weight_reps", "time", "distance", "calories", "hold_duration", "bodyweight"]);
assert.ok(candidates.every(item => allowedCategories.has(item.category)), "Candidates must use approved categories");
assert.ok(candidates.every(item => allowedEquipment.has(item.equipment)), "Candidates must use reviewed equipment values");
assert.ok(candidates.every(item => allowedMeasurements.has(item.measurementType)), "Candidates must use builder-compatible measurement types");
assert.ok(candidates.every(item => item.candidateId === `f4f-candidate-${String(item.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`), "Candidate IDs must be deterministic");

const start = Date.now();
for (let index = 0; index < 1000; index += 1) library.filterExercises([...library.exercises, ...candidates], { query: index % 2 ? "press" : "med ball" });
assert.ok(Date.now() - start < 2000, "Normalized alias search should remain responsive at the proposed scale");

const original = library.exercises;
const proposedLegPress = candidates.find(item => item.name === "Leg Press");
library.setExercises([...original, { ...proposedLegPress, exerciseId: proposedLegPress.candidateId, active: true }]);
const workout = workouts.createWorkout({ name: "Candidate compatibility" });
const strength = workouts.addSection(workout, { type: "Strength", title: "Strength" });
workouts.addExercise(workout, proposedLegPress.candidateId, strength.sectionId);
const serialized = workouts.serializeTemplate(workout);
assert.strictEqual(serialized.schemaVersion, 2);
assert.strictEqual(serialized.sections[0].exercises[0].exerciseId, proposedLegPress.candidateId);
library.setExercises(original);

const searchableProposal = readySeed.map(item => ({ ...item, active: true }));
library.setExercises([...original, ...searchableProposal]);
const expectedSearches = {
  "RDL": "Romanian Deadlift",
  "RFESS": "Bulgarian Split Squat",
  "Bulgarian": "Bulgarian Split Squat",
  "Push Ups": "Push-Up",
  "DB Bench": "Dumbbell Bench Press",
  "Incline DB": "Incline Dumbbell Press",
  "Med Ball": "Med-Ball Chest Pass",
  "Leg Press": "Leg Press",
  "Hack Squat": "Hack Squat",
  "Straight Arm Pulldown": "Straight-Arm Pulldown",
  "Plank Pull Through": "Plank Pull-Through",
  "Burpee Broad Jump": "Burpee Broad Jump",
  "StairMaster": "StairMaster"
};
for (const [query, expectedName] of Object.entries(expectedSearches)) {
  assert.ok(library.filterExercises(library.exercises, { query }).some(item => item.name === expectedName), `${query} should resolve ${expectedName}`);
}
library.setExercises(original);

console.log(`Exercise expansion tests passed: 89 approved + ${candidates.length} review candidates.`);
