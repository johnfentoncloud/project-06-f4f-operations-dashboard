"use strict";

const fs = require("fs");
const path = require("path");
const library = require("../frontend/js/exercise-library.js");
const { readyToApprove, coachReview, hold } = require("../seed/exercise-expansion-triage.js");

const root = path.resolve(__dirname, "..");
const seedPath = path.join(root, "seed", "exercise-expansion-ready.json");
const backfillPath = path.join(root, "seed", "exercise-alias-backfill.json");
const excludedPath = path.join(root, "seed", "exercise-expansion-excluded.json");
const reportPath = path.join(root, "docs", "EXERCISE-EXPANSION-COACH-REVIEW.md");
const productionRecord = item => ({
  exerciseId: item.candidateId.replace("f4f-candidate-", "f4f-exp1-"),
  name: item.name,
  category: item.category,
  movementPattern: item.movementPattern,
  equipment: item.equipment,
  measurementType: item.measurementType,
  defaultUnit: item.defaultUnit,
  instructions: `Perform ${item.name} with controlled technique and the prescribed intent. Stop the set if position or movement quality breaks down.`,
  tags: item.tags,
  aliases: item.aliases,
  active: true,
  customExercise: false,
  createdBy: "F4F_LIBRARY",
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
  demoMedia: null
});
const readyRecords = readyToApprove.map(productionRecord);
const aliasBackfill = library.exercises.filter(item => item.aliases.length).map(item => ({ exerciseId: item.exerciseId, expectedName: item.name, aliases: item.aliases }));
fs.writeFileSync(seedPath, `${JSON.stringify(readyRecords, null, 2)}\n`);
fs.writeFileSync(backfillPath, `${JSON.stringify(aliasBackfill, null, 2)}\n`);
fs.writeFileSync(excludedPath, `${JSON.stringify([...coachReview, ...hold].map(item => ({ candidateId: item.candidateId, name: item.name, approvalStatus: item.approvalStatus })), null, 2)}\n`);

const categoryOrder = ["Strength", "Power", "Plyometrics", "Speed", "Agility / Change of Direction", "Conditioning", "Core", "Mobility / Warm-up"];
const lineFor = item => `- ${item.name} — ${item.equipment}; ${item.measurementType}${item.aliases.length ? `; aliases: ${item.aliases.join(", ")}` : ""}`;
const report = [
  "# Exercise Expansion 1 — Coach Approval Review",
  "",
  `Existing production library: **89 unchanged exercises**. Proposed READY_TO_APPROVE additions: **${readyToApprove.length}**. Expected total after approval: **${89 + readyToApprove.length}**.`,
  "",
  "## READY_TO_APPROVE",
  "",
  ...categoryOrder.flatMap(category => {
    const group = readyToApprove.filter(item => item.category === category);
    const patterns = [...new Set(group.map(item => item.movementPattern))];
    return [`### ${category}`, "", ...patterns.flatMap(pattern => [`#### ${pattern}`, "", ...group.filter(item => item.movementPattern === pattern).map(lineFor), ""])];
  }),
  "## COACH_REVIEW",
  "",
  ...coachReview.map(item => `- **${item.name}** — ${item.reviewReason}`),
  "",
  "## HOLD",
  "",
  ...hold.map(item => `- **${item.name}** — ${item.reviewReason}`),
  ""
].join("\n");
fs.writeFileSync(reportPath, report);
console.log(JSON.stringify({ ready: readyToApprove.length, coachReview: coachReview.length, hold: hold.length, expectedTotal: 89 + readyToApprove.length }));
