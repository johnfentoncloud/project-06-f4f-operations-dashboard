"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const frontend = path.resolve(__dirname, "..");
const productionHtml = fs.readFileSync(path.join(frontend, "index.production.html"), "utf8");
const terraform = fs.readFileSync(path.resolve(frontend, "..", "terraform", "main.tf"), "utf8");

for (const forbidden of ["css/athlete.css", "js/athlete.js", "js/data.js", "Preview as Athlete", "data-athlete-route", "Fictional demo athlete"]) {
  assert.ok(!productionHtml.includes(forbidden), `Production HTML must exclude ${forbidden}`);
}

for (const required of ["id=\"production-login\"", "js/auth.js", "js/api.js", "js/app-state.js", "js/app.js"]) {
  assert.ok(productionHtml.includes(required), `Production HTML must include ${required}`);
}

for (const excludedAsset of ["index.html", "index.production.html", "js/data.js", "js/athlete.js", "css/athlete.css"]) {
  assert.ok(terraform.includes(`\"${excludedAsset}\"`), `Terraform must explicitly exclude ${excludedAsset} from bulk upload`);
}

assert.ok(terraform.includes('key           = "index.html"'));
assert.ok(terraform.includes('source        = "${local.frontend_path}/index.production.html"'));
console.log("Coach-only production entry and Athlete asset exclusions passed.");
