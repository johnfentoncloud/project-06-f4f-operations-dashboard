"use strict";
const fs = require("fs");
const path = require("path");
const library = require("../frontend/js/exercise-library.js");
if (library.exercises.length !== 89) throw new Error("Approved seed must contain exactly 89 exercises.");
const target = path.resolve(__dirname, "..", "seed", "exercises.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(library.exercises, null, 2)}\n`, "utf8");
console.log(`Exported ${library.exercises.length} approved exercises to ${target}`);
