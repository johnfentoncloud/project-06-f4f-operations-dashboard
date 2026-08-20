"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const calls = [];
const context = { window: { F4F_CONFIG: { apiBaseUrl: "https://api.example.test" }, F4F_AUTH: { getAccessToken: async () => "token", expireSession() {} } }, fetch: async (url, options = {}) => { calls.push({ url, options }); return { ok: true, status: 200, json: async () => ({ ok: true, items: [] }) }; }, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../js/api.js"), "utf8"), context);

(async () => {
  await context.window.F4F_API.listExercises();
  await context.window.F4F_API.createWorkoutTemplate({ name: "Test", exercises: [] }, "idem-12345678");
  await context.window.F4F_API.updateWorkoutTemplate("template-1", { name: "Test", exercises: [], expectedCurrentVersion: 1 }, "idem-87654321");
  assert.ok(calls[0].url.endsWith("/exercises"));
  assert.strictEqual(calls[1].options.method, "POST");
  assert.strictEqual(calls[2].options.method, "PUT");
  assert.ok(calls[2].url.endsWith("/workout-templates/template-1"));
  console.log("Authenticated training API list/create/version-update flow passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
