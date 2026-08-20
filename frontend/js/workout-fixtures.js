(function (root) {
  "use strict";
  const workouts = root.F4F_WORKOUTS || (typeof require === "function" ? require("./workout-builder.js") : null);
  let sequence = 0;

  function exercise(name, measurementType, prescription, defaultUnit = "reps") {
    return {
      instanceId: `fixture-${++sequence}`,
      exerciseId: `fixture-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
      exerciseName: name,
      measurementType,
      exerciseSnapshot: { name, measurementType, defaultUnit },
      prescription: { coachInstruction: "", ...prescription }
    };
  }

  function build(name, description, sections) {
    const workout = workouts.createWorkout({ name, description });
    sections.forEach(spec => {
      const section = workouts.addSection(workout, spec);
      section.exercises = (spec.exerciseSpecs || []).map(args => exercise(...args));
    });
    return workout;
  }

  function day1() {
    return build("DAY 1 – UPPER / LOWER PUSH", "Sectioned F4F push session fixture using synthetic programming data.", [
      { type: "Stretch / Mobility", format: "Freeform / Instructions Only", title: "Stretch", instructions: "Complete the prescribed movement-preparation sequence." },
      { type: "Warm-Up", format: "Rounds", title: "Warm-Up", rounds: 2, exerciseSpecs: [
        ["Row", "distance", { distance: 250, distanceUnit: "m" }, "m"], ["Med Ball Squat", "reps", { reps: 12, repQualifier: "total" }],
        ["Med Ball Lunge", "reps", { reps: 12, repQualifier: "total" }], ["Med Ball Thruster", "reps", { reps: 12, repQualifier: "total" }], ["Med Ball Deadbug", "reps", { reps: 12, repQualifier: "total" }]
      ] },
      { type: "Strength", format: "Superset", title: "SS 1", rounds: 4, exerciseSpecs: [["Front Squat", "weight_reps", { reps: 6, repQualifier: "total", loadUnit: "lb" }, "lb"], ["Bench Press", "weight_reps", { reps: 8, repQualifier: "total", loadUnit: "lb" }, "lb"]] },
      { type: "Strength", format: "Superset", title: "SS 2", rounds: 3, exerciseSpecs: [["Split Squat", "weight_reps", { reps: 8, repQualifier: "each-side", loadUnit: "lb" }, "lb"], ["Push Press", "weight_reps", { reps: 8, repQualifier: "total", loadUnit: "lb" }, "lb"]] },
      { type: "Strength", format: "Superset", title: "SS 3", rounds: 3, exerciseSpecs: [["Leg Press", "weight_reps", { reps: 12, repQualifier: "total", loadUnit: "lb" }, "lb"], ["Push-Ups", "bodyweight", { reps: 12, repQualifier: "total" }]] },
      { type: "Metcon", format: "Rounds", title: "Metcon", rounds: 2, exerciseSpecs: [["Run", "distance", { distance: 800, distanceUnit: "m" }, "m"], ["Wall Balls", "reps", { reps: 50, repQualifier: "total" }], ["Walking Lunges", "reps", { reps: 40, repQualifier: "total" }], ["Burpee Broad Jumps", "reps", { reps: 30, repQualifier: "total" }]] }
    ]);
  }

  function day2() {
    return build("DAY 2", "Sectioned F4F pull and conditioning fixture using synthetic programming data.", [
      { type: "Stretch / Mobility", format: "Freeform / Instructions Only", title: "Stretch", instructions: "Complete the prescribed movement-preparation sequence." },
      { type: "Warm-Up", format: "Rounds", title: "Warm-Up", rounds: 2, exerciseSpecs: [["Bike", "calories", { calories: 10 }], ["Banded Good Mornings", "reps", { reps: 10, repQualifier: "total" }], ["Straight-Arm Pulldowns", "reps", { reps: 10, repQualifier: "total" }], ["Four-Way Med Ball", "reps", { reps: 10, repQualifier: "total" }]] },
      { type: "Strength", format: "Superset", title: "SS 1", rounds: 4, exerciseSpecs: [["RDL", "weight_reps", { reps: 6, repQualifier: "total", loadUnit: "lb" }, "lb"], ["Pull-Ups", "bodyweight", { reps: 6, repQualifier: "total" }]] },
      { type: "Strength", format: "Superset", title: "SS 2", rounds: 3, exerciseSpecs: [["Power Clean", "weight_reps", { reps: 8, repQualifier: "total", loadUnit: "lb" }, "lb"], ["Renegade Rows", "weight_reps", { reps: 8, repQualifier: "each-side", loadUnit: "lb" }, "lb"]] },
      { type: "Strength", format: "Superset", title: "SS 3", rounds: 3, exerciseSpecs: [["Bent-Over Row", "weight_reps", { reps: 8, repQualifier: "total", loadUnit: "lb" }, "lb"], ["Chin-Ups", "bodyweight", { reps: 8, repQualifier: "total" }]] },
      { type: "Metcon", format: "AMRAP", title: "Metcon", duration: 15, durationUnit: "min", exerciseSpecs: [["Ski Erg", "distance", { distance: 500, distanceUnit: "m" }, "m"], ["Plank Pull-Throughs", "reps", { reps: 20, repQualifier: "total" }], ["Row", "distance", { distance: 500, distanceUnit: "m" }, "m"], ["Alternating V-Ups", "reps", { reps: 20, repQualifier: "alternating" }]] }
    ]);
  }

  function day3() {
    return build("DAY 3", "Sectioned steady-state and station-work fixture using synthetic programming data.", [
      { type: "Conditioning", format: "Steady State", title: "Conditioning", duration: 45, durationUnit: "min", instructions: "StairMaster or run at a steady pace." },
      { type: "Finisher", format: "Freeform / Instructions Only", title: "Finisher", instructions: "Complete all reps of the assigned stations with quality movement." }
    ]);
  }

  const fixtures = Object.freeze({ day1, day2, day3 });
  if (typeof module !== "undefined" && module.exports) module.exports = fixtures;
  root.F4F_WORKOUT_FIXTURES = fixtures;
})(typeof window !== "undefined" ? window : globalThis);
