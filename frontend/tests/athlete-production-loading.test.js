"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "js", "athlete-production.js"), "utf8");

function element(dataset = {}) {
  return {
    dataset,
    hidden: false,
    innerHTML: "",
    textContent: "",
    attributes: {},
    listeners: {},
    clicked: false,
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, listener) { this.listeners[name] = listener; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    click() { this.clicked = true; this.listeners.click?.({ target: this, currentTarget: this }); },
  };
}

function harness(api) {
  const elements = {
    "#athlete-production-shell": element(),
    "#athlete-greeting": element(),
    "#athlete-today-card": element(),
    "#athlete-workout-list": element(),
    "#athlete-profile-card": element(),
    "#athlete-session-card": element(),
    "#athlete-production-logout": element(),
  };
  const views = [element({ athleteView: "today" }), element({ athleteView: "workouts" }), element({ athleteView: "profile" })];
  const routes = [element({ athleteRoute: "today" }), element({ athleteRoute: "workouts" }), element({ athleteRoute: "profile" })];
  const document = {
    visibilityState: "visible",
    querySelector(selector) { return elements[selector] || null; },
    querySelectorAll(selector) {
      if (selector === "#athlete-production-shell [data-athlete-view]") return views;
      if (selector === "#athlete-production-shell [data-athlete-route]") return routes;
      return [];
    },
    addEventListener() {},
  };
  class FixedDate extends Date {
    constructor(...args) { super(args.length ? args[0] : "2026-09-18T16:00:00Z"); }
    static now() { return new Date("2026-09-18T16:00:00Z").getTime(); }
  }
  const window = {
    F4F_API: api,
    F4F_ATHLETE_SESSION: { createAutosave: () => ({ schedule() {}, async flush() {} }) },
    location: { hash: "#athlete-today" },
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(source, { window, document, console, Intl, Date: FixedDate, Object, Promise, Number, String });
  return { app: window.F4F_ATHLETE_PRODUCTION, elements };
}

const assignments = [
  { assignmentId: "assignment-one", scheduledDate: "2026-09-18", status: "ASSIGNED", workoutName: "Sanitized Strength" },
  { assignmentId: "assignment-two", scheduledDate: "2026-09-18", status: "ASSIGNED", workoutName: "Sanitized Conditioning" },
  { assignmentId: "assignment-future", scheduledDate: "2026-09-19", status: "ASSIGNED", workoutName: "Future Workout" },
];

(async () => {
  let assignmentFailure = true;
  const partialAssignmentFailure = harness({
    async athleteProfile() { return { profile: { displayName: "Test Athlete", status: "ACTIVE", adultBeta: true } }; },
    async athleteAssignments() {
      if (assignmentFailure) throw new Error("sensitive backend detail");
      return { items: assignments };
    },
  });

  await partialAssignmentFailure.app.initialize();
  assert.equal(partialAssignmentFailure.elements["#athlete-greeting"].textContent, "Welcome, Test Athlete");
  assert.match(partialAssignmentFailure.elements["#athlete-profile-card"].innerHTML, /Test Athlete/);
  assert.match(partialAssignmentFailure.elements["#athlete-today-card"].innerHTML, /couldn&#39;t load your workouts/i);
  assert.match(partialAssignmentFailure.elements["#athlete-today-card"].innerHTML, /data-athlete-retry/);
  assert.match(partialAssignmentFailure.elements["#athlete-today-card"].innerHTML, /data-athlete-sign-out/);
  assert.doesNotMatch(partialAssignmentFailure.elements["#athlete-today-card"].innerHTML, /sensitive backend detail/);

  assignmentFailure = false;
  const retryTarget = { closest: selector => selector === "[data-athlete-retry]" ? retryTarget : null };
  await partialAssignmentFailure.elements["#athlete-production-shell"].listeners.click({ target: retryTarget });
  const retriedToday = partialAssignmentFailure.elements["#athlete-today-card"].innerHTML;
  assert.match(retriedToday, /Sanitized Strength/);
  assert.match(retriedToday, /Sanitized Conditioning/);
  assert.match(retriedToday, /1 of 2/);
  assert.doesNotMatch(retriedToday, /Future Workout/);
  assert.equal((retriedToday.match(/data-athlete-start-index=/g) || []).length, 2);

  const profileFailure = harness({
    async athleteProfile() { throw new Error("raw profile failure"); },
    async athleteAssignments() { return { items: assignments }; },
  });
  await profileFailure.app.initialize();
  assert.equal(profileFailure.elements["#athlete-greeting"].textContent, "Welcome");
  assert.match(profileFailure.elements["#athlete-profile-card"].innerHTML, /couldn&#39;t load your profile/i);
  assert.match(profileFailure.elements["#athlete-profile-card"].innerHTML, /data-athlete-retry/);
  assert.match(profileFailure.elements["#athlete-profile-card"].innerHTML, /data-athlete-sign-out/);
  assert.doesNotMatch(profileFailure.elements["#athlete-profile-card"].innerHTML, /raw profile failure/);
  assert.match(profileFailure.elements["#athlete-today-card"].innerHTML, /Sanitized Strength/);
  assert.match(profileFailure.elements["#athlete-workout-list"].innerHTML, /Future Workout/);

  const signOutTarget = { closest: selector => selector === "[data-athlete-sign-out]" ? signOutTarget : null };
  await profileFailure.elements["#athlete-production-shell"].listeners.click({ target: signOutTarget });
  assert.equal(profileFailure.elements["#athlete-production-logout"].clicked, true);

  const totalFailure = harness({
    async athleteProfile() { throw new Error("raw profile failure"); },
    async athleteAssignments() { throw new Error("raw assignment failure"); },
  });
  await totalFailure.app.initialize();
  assert.match(totalFailure.elements["#athlete-profile-card"].innerHTML, /data-athlete-retry/);
  assert.match(totalFailure.elements["#athlete-today-card"].innerHTML, /data-athlete-retry/);
  assert.match(totalFailure.elements["#athlete-workout-list"].innerHTML, /data-athlete-sign-out/);
  assert.doesNotMatch(totalFailure.elements["#athlete-production-shell"].innerHTML, /raw (profile|assignment) failure/);

  console.log("Athlete production loading and recovery tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
