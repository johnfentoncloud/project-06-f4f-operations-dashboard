"use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const context = { window: {}, document: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../js/data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(require.resolve("../js/athlete.js"), "utf8"), context);

const athlete = context.window.F4F_DATA.demoAthlete;
const feature = context.window.F4F_ATHLETE;

assert.strictEqual(athlete.label, "Fictional demo athlete");
assert.strictEqual(athlete.currentWorkout.title, "Lower Body Power");
assert.strictEqual(athlete.currentWorkout.exercises.length, 5);
assert.strictEqual(athlete.upcoming.length, 2);
assert.strictEqual(athlete.personalRecords.length, 2);
assert.strictEqual(feature.viewForHash("#athlete-today"), "athlete-today");
assert.strictEqual(feature.viewForHash("#leads"), "athlete-today");
assert.strictEqual(feature.viewForHash("#athlete-progress"), "athlete-progress");
assert.strictEqual(feature.workoutActionLabel(false), "Start workout");
assert.strictEqual(feature.workoutActionLabel(true), "Continue workout");
assert.ok(!JSON.stringify(athlete).toLowerCase().includes("injury"));
assert.ok(!JSON.stringify(athlete).toLowerCase().includes("medical"));

console.log("Fictional workout data, Athlete navigation, and workout action states passed.");
