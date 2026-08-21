"use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../js/app-state.js"), "utf8"), context);
const state = context.window.F4F_APP_STATE;
const items = state.leadsFromPayload({ items: [{ leadId: "1", status: "New", submittedAt: "2026-08-08T12:00:00Z" }, { leadId: "2", status: "Contacted", submittedAt: "2026-08-07T12:00:00Z" }] });
assert.strictEqual(items.length, 2);
assert.strictEqual(state.summarize(items).newLeadCount, 1);
assert.strictEqual(state.summarize(items).recent[0].leadId, "1");
const attributed = [
  { leadId: "1", source: "rise_small_group_flyer", location: "rise", program: "small_group_athlete_development" },
  { leadId: "2", source: "rise_small_group_flyer", location: "rise", program: "small_group_athlete_development" },
  { leadId: "3", source: "instagram", location: "online", program: "team_training" },
  { leadId: "4" }
];
assert.strictEqual(state.friendlyLabel("source", "rise_small_group_flyer"), "Rise Small Group Flyer");
assert.strictEqual(state.friendlyLabel("source", ""), "Direct / Unknown");
assert.deepStrictEqual(JSON.parse(JSON.stringify(state.summarize(attributed).leadsBySource)), [
  { source: "rise_small_group_flyer", label: "Rise Small Group Flyer", count: 2 },
  { source: "unknown", label: "Direct / Unknown", count: 1 },
  { source: "instagram", label: "Instagram", count: 1 }
]);
assert.strictEqual(state.filterLeads(attributed, { source: "rise_small_group_flyer" }).length, 2);
assert.strictEqual(state.filterLeads(attributed, { location: "online" }).length, 1);
assert.strictEqual(state.filterLeads(attributed, { program: "team_training" }).length, 1);
assert.strictEqual(state.filterLeads(attributed, { source: "unknown" }).length, 1);
assert.strictEqual(state.leadsFromPayload({}).length, 0);
assert.strictEqual(state.resultState({ loading: true }), "loading");
assert.strictEqual(state.resultState({ count: 0 }), "empty");
assert.strictEqual(state.resultState({ count: 2 }), "ready");
assert.strictEqual(state.resultState({ error: new Error("synthetic") }), "error");
assert.strictEqual(state.resultState({ authenticated: false }), "auth-expired");
console.log("Live lead payload, attribution labels/summary/filters, loading, empty, API error, and auth-expiry state tests passed.");
