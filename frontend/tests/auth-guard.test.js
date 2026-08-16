"use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const { webcrypto } = require("crypto");
const { TextEncoder } = require("util");

const source = fs.readFileSync(require.resolve("../js/auth.js"), "utf8");

function authContext({ hostname, config, fetch }) {
  const storage = new Map();
  const assigned = [];
  const context = {
    TextEncoder,
    URLSearchParams,
    Uint8Array,
    Date,
    window: {
      F4F_CONFIG: config,
      crypto: webcrypto,
      btoa: value => Buffer.from(value, "binary").toString("base64"),
      fetch,
      location: { hostname, search: "", pathname: "/", hash: "", assign: value => assigned.push(value) },
      history: { replaceState: () => {} },
      sessionStorage: {
        getItem: key => storage.get(key) || null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: key => storage.delete(key)
      }
    },
    document: { title: "Dashboard" }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { auth: context.window.F4F_AUTH, storage, assigned };
}

(async () => {
  const local = authContext({ hostname: "localhost", config: { authMode: "local-preview", cognito: {} } });
  assert.strictEqual(local.auth.isAuthenticated(), false);
  assert.strictEqual(await local.auth.login(), "local");
  assert.strictEqual(local.auth.isAuthenticated(), true);
  assert.strictEqual(local.auth.getExperience(), "coach");
  assert.strictEqual(local.auth.setLocalExperience("athlete"), true);
  assert.strictEqual(local.auth.getExperience(), "athlete");
  assert.strictEqual(local.auth.setLocalExperience("invalid"), false);
  local.auth.logout();
  assert.strictEqual(local.auth.isAuthenticated(), false);

  const blocked = authContext({ hostname: "app.fenton4fitness.com", config: { authMode: "local-preview", cognito: {} } });
  assert.strictEqual(blocked.auth.isLocalPreviewAllowed(), false);
  assert.strictEqual(blocked.auth.setLocalExperience("athlete"), false);
  assert.strictEqual(blocked.auth.getExperience(), "coach");
  await assert.rejects(() => blocked.auth.login(), /not configured/);

  const production = authContext({
    hostname: "app.fenton4fitness.com",
    config: { authMode: "cognito", cognito: { clientId: "public-client", domain: "https://example.auth.us-east-1.amazoncognito.com", redirectUri: "https://app.fenton4fitness.com/", logoutUri: "https://app.fenton4fitness.com/" } },
    fetch: async () => ({ ok: true, json: async () => ({ access_token: "refreshed-access", expires_in: 900 }) })
  });
  production.storage.set("f4f-dashboard-refresh-token", "opaque-refresh-token");
  production.storage.set("f4f-dashboard-expires-at", "1");
  await production.auth.initialize();
  assert.strictEqual(production.auth.isAuthenticated(), true);
  assert.strictEqual(await production.auth.getAccessToken(), "refreshed-access");
  production.auth.expireSession();
  assert.strictEqual(production.auth.isAuthenticated(), false);

  console.log("Coach/Athlete local roles, production bypass refusal, login, logout, and expiry tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
