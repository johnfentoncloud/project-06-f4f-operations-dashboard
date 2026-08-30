"use strict";
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const frontend = path.resolve(__dirname, "..");
const productionHtml = fs.readFileSync(path.join(frontend, "index.production.html"), "utf8");
const terraform = fs.readFileSync(path.resolve(frontend, "..", "terraform", "main.tf"), "utf8");
const terraformVariables = fs.readFileSync(path.resolve(frontend, "..", "terraform", "variables.tf"), "utf8");
const exampleVariables = fs.readFileSync(path.resolve(frontend, "..", "terraform", "terraform.tfvars.example"), "utf8");
const athleteTerraform = fs.readFileSync(path.resolve(frontend, "..", "terraform", "athlete.tf"), "utf8");
const sharedApp = fs.readFileSync(path.join(frontend, "js", "app.js"), "utf8");
const workoutBuilder = fs.readFileSync(path.join(frontend, "js", "workout-builder.js"), "utf8");

for (const forbidden of ["css/athlete.css", "js/athlete.js", "js/data.js", "Preview as Athlete", "Fictional demo athlete"]) {
  assert.ok(!productionHtml.includes(forbidden), `Production HTML must exclude ${forbidden}`);
}
for (const localFixtureControl of ["demo-workout-select", "load-demo-workout", "Local session example"]) assert.ok(!productionHtml.includes(localFixtureControl), `Production HTML must exclude local fixture control ${localFixtureControl}`);

for (const required of ["id=\"production-login\"", "js/auth.js", "js/api.js", "js/app-state.js", "js/exercise-library.js", "js/workout-builder.js", "css/training.css", "css/athlete-production.css", "js/athlete-production.js", "Exercise Library", "Workout Builder", "Workout Templates", "js/app.js"]) {
  assert.ok(productionHtml.includes(required), `Production HTML must include ${required}`);
}
for (const workflowControl of ['id="add-section"', 'id="section-quick-chooser"', 'data-section-preset="Superset"', 'id="new-workout"']) assert.ok(productionHtml.includes(workflowControl), `Production Coach bundle must include ${workflowControl}`);
assert.ok(workoutBuilder.includes('state.targetSectionId = target'), "Exercise destination must persist after assignment");
assert.ok(workoutBuilder.includes('destinationLabels(state.workout.sections)'), "Builder and movement selectors must use shared display titles");

for (const excludedAsset of ["index.html", "index.production.html", "js/data.js", "js/athlete.js", "js/workout-fixtures.js", "css/athlete.css"]) {
  assert.ok(terraform.includes(`\"${excludedAsset}\"`), `Terraform must explicitly exclude ${excludedAsset} from bulk upload`);
}

assert.ok(terraform.includes('key           = "index.html"'));
assert.ok(terraform.includes('source        = "${local.frontend_path}/index.production.html"'));
assert.ok(sharedApp.includes('if (window.F4F_WORKOUTS)'), "Training routes must activate only when the approved training module is bundled");
assert.ok(productionHtml.includes('id="header-logout-button"') && productionHtml.includes(">Sign Out</button>"), "Authenticated production UI must include a visible Sign Out control");
assert.ok(sharedApp.includes('document.querySelector("#header-logout-button")?.addEventListener("click", logout)'), "Header Sign Out must reuse the existing logout handler");
assert.ok(sharedApp.includes("window.F4F_AUTH.logout()"), "Sign Out must invoke the existing Cognito logout flow");
assert.ok(sharedApp.includes("headerLogout.hidden = !authenticated || athlete"), "Sign Out must remain hidden outside the authenticated Coach experience");
assert.ok(workoutBuilder.includes('event.target.closest("[data-open-template]")'), "Template open event delegation must remain active");

const corsBlock = terraform.match(/cors_configuration\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";
assert.ok(corsBlock.includes('allow_headers     = ["authorization", "content-type", "idempotency-key"]'), "Production CORS must allow the authenticated write headers");
assert.ok(corsBlock.includes('allow_methods     = ["GET", "OPTIONS", "POST", "PUT"]'), "Production CORS must allow the required read and write methods");
assert.ok(corsBlock.includes("allow_origins     = var.allowed_origins"), "Production CORS must use the approved origin allowlist");
assert.ok(!corsBlock.includes('"*"'), "Production CORS must not allow wildcard origins");
assert.ok(terraformVariables.includes('"https://app.fenton4fitness.com"'), "The approved production origin must remain allowlisted");
assert.ok(!terraformVariables.includes("localhost:8080") && !terraformVariables.includes("127.0.0.1:8080"), "Terraform defaults must not allow localhost origins");
assert.ok(exampleVariables.includes('"https://app.fenton4fitness.com"') && !exampleVariables.includes("localhost"), "The tracked deployment example must allow only the custom application origin");
assert.ok(athleteTerraform.includes('projection_type = "INCLUDE"'), "Active Athlete profile GSI must use a minimal INCLUDE projection");
for (const internalField of ['"cognitoSub"', '"createdBy"']) assert.ok(!athleteTerraform.match(new RegExp(`non_key_attributes[\\s\\S]{0,180}${internalField}`)), `GSI must not project ${internalField}`);
const athleteReadPolicy = athleteTerraform.match(/resource "aws_iam_role_policy" "athlete_read"[\s\S]*?\n\}/)?.[0] || "";
assert.ok(athleteReadPolicy.includes("aws_dynamodb_table.athlete_training[0].arn"), "Athlete read must target the base table");
assert.ok(!athleteReadPolicy.includes("/index/GSI1"), "Athlete read must not access the active-profile GSI");
for (const route of [...athleteTerraform.matchAll(/"(?:GET|POST|PUT) \/(?:me|athletes)[^"]+"/g)].map(match => match[0])) assert.ok(athleteTerraform.includes('authorization_type = "JWT"'), `${route} must use JWT authorization`);
console.log("Coach training production bundle and Athlete asset exclusions passed.");
