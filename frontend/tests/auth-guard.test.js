"use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const storage = new Map();
const context = {
  window: {
    F4F_CONFIG: { authMode: "local-preview", cognito: { userPoolId: "", clientId: "" } },
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve("../js/auth.js"), "utf8"), context);
assert.strictEqual(context.window.F4F_AUTH.isAuthenticated(), false);
context.window.F4F_AUTH.enterLocalPreview();
assert.strictEqual(context.window.F4F_AUTH.isAuthenticated(), true);
context.window.F4F_AUTH.logout();
assert.strictEqual(context.window.F4F_AUTH.isAuthenticated(), false);
console.log("Authentication guard tests passed.");
