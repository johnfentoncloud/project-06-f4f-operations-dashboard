(function (root) {
  "use strict";

  const CREATED_AT = "2026-08-16T00:00:00.000Z";
  const EXISTING_ALIASES = Object.freeze({
    "Bulgarian Split Squat": ["RFESS", "Rear-Foot-Elevated Split Squat", "Rear Foot Elevated Split Squat"],
    "Romanian Deadlift": ["RDL", "Romanian Dead Lift"],
    "Single-Leg Romanian Deadlift": ["Single-Leg RDL", "Single Leg RDL"],
    "Kettlebell Swing": ["KB Swing"],
    "Incline Dumbbell Press": ["Incline DB Bench Press", "Incline Dumbbell Bench Press"],
    "Dumbbell Floor Press": ["DB Floor Press"],
    "Push-Up": ["Push Ups", "Push-Ups", "Pushup", "Pushups"],
    "Strict Press": ["Overhead Press", "Barbell Overhead Press", "OHP"],
    "Push Press": ["Barbell Push Press"],
    "Pull-Up": ["Pull Ups", "Pull-Ups", "Pullup"],
    "Chin-Up": ["Chin Ups", "Chin-Ups", "Chinup"],
    "Bent-Over Row": ["Bent Over Row", "Barbell Row"],
    "Chest-Supported Row": ["Chest Supported Row"],
    "Single-Arm Cable Row": ["One-Arm Cable Row", "1-Arm Cable Row"],
    "Farmer Carry": ["Farmer's Carry", "Farmers Carry", "Farmer Walk"],
    "Suitcase Carry": ["Suitcase Walk"],
    "Front-Rack Carry": ["Front Rack Carry"],
    "Hang Power Clean": ["HPC", "Hang Clean"],
    "Dumbbell Snatch": ["DB Snatch"],
    "Box Jump": ["Box Jumps"],
    "Broad Jump": ["Broad Jumps", "Standing Broad Jump"],
    "Pogo Jump": ["Pogo Jumps", "Pogos"],
    "Med-Ball Chest Pass": ["Medicine Ball Chest Pass", "Med Ball Chest Pass", "Medball Chest Pass"],
    "Med-Ball Rotational Throw": ["Medicine Ball Rotational Throw", "Med Ball Rotational Throw"],
    "Med-Ball Overhead Slam": ["Medicine Ball Overhead Slam", "Med Ball Slam", "Medball Slam"],
    "Pro Agility Shuttle": ["5-10-5", "5 10 5 Shuttle"],
    "T-Drill": ["T Drill"],
    "Row": ["Row Erg", "Concept2 Row"],
    "Bike": ["Stationary Bike", "Exercise Bike"],
    "Ski Erg": ["SkiErg", "Ski Machine"],
    "Jump Rope": ["Skipping Rope"],
    "Burpee": ["Burpees"],
    "Wall Ball": ["Wall Balls"],
    "Mountain Climber": ["Mountain Climbers"],
    "Dead Bug": ["Deadbug"],
    "Ab Wheel Rollout": ["Ab Rollout", "Ab-Wheel Rollout"],
    "Pallof Press": ["Palloff Press"],
    "Hanging Knee Raise": ["Hanging Knee Raises"],
    "World's Greatest Stretch": ["Worlds Greatest Stretch", "WGS"],
    "Mini-Band Lateral Walk": ["Mini Band Lateral Walk", "Lateral Band Walk"],
    "Band Pull-Apart": ["Band Pull Apart", "Banded Pull-Apart"],
    "High-Knee March": ["High Knee March"]
  });
  const definitions = [
    ["Back Squat", "Strength", "Squat", "Barbell", "weight_reps", "lb", ["bilateral", "lower body"]],
    ["Front Squat", "Strength", "Squat", "Barbell", "weight_reps", "lb", ["anterior load", "lower body"]],
    ["Goblet Squat", "Strength", "Squat", "Kettlebell", "weight_reps", "lb", ["beginner friendly", "lower body"]],
    ["Box Squat", "Strength", "Squat", "Barbell", "weight_reps", "lb", ["posterior chain", "lower body"]],
    ["Split Squat", "Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", ["unilateral", "lower body"]],
    ["Reverse Lunge", "Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", ["unilateral", "lower body"]],
    ["Forward Lunge", "Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", ["unilateral", "lower body"]],
    ["Lateral Lunge", "Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", ["frontal plane", "lower body"]],
    ["Bulgarian Split Squat", "Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", ["rear-foot elevated", "lower body"]],
    ["Step-Up", "Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", ["unilateral", "lower body"]],
    ["Conventional Deadlift", "Strength", "Hinge", "Barbell", "weight_reps", "lb", ["posterior chain", "bilateral"]],
    ["Trap Bar Deadlift", "Strength", "Hinge", "Trap Bar", "weight_reps", "lb", ["posterior chain", "power"]],
    ["Romanian Deadlift", "Strength", "Hinge", "Barbell", "weight_reps", "lb", ["hamstrings", "posterior chain"]],
    ["Single-Leg Romanian Deadlift", "Strength", "Hinge", "Dumbbell", "weight_reps", "lb", ["unilateral", "balance"]],
    ["Hip Thrust", "Strength", "Hinge", "Barbell", "weight_reps", "lb", ["glutes", "posterior chain"]],
    ["Glute Bridge", "Strength", "Hinge", "Bodyweight", "reps", "reps", ["activation", "glutes"]],
    ["Kettlebell Swing", "Strength", "Hinge", "Kettlebell", "weight_reps", "lb", ["power", "posterior chain"]],
    ["Bench Press", "Strength", "Horizontal Push", "Barbell", "weight_reps", "lb", ["upper body", "bilateral"]],
    ["Incline Dumbbell Press", "Strength", "Horizontal Push", "Dumbbell", "weight_reps", "lb", ["upper body", "incline"]],
    ["Dumbbell Floor Press", "Strength", "Horizontal Push", "Dumbbell", "weight_reps", "lb", ["upper body", "floor"]],
    ["Push-Up", "Strength", "Horizontal Push", "Bodyweight", "bodyweight", "reps", ["upper body", "bodyweight"]],
    ["Strict Press", "Strength", "Vertical Push", "Barbell", "weight_reps", "lb", ["overhead", "upper body"]],
    ["Push Press", "Strength", "Vertical Push", "Barbell", "weight_reps", "lb", ["power", "overhead"]],
    ["Half-Kneeling Dumbbell Press", "Strength", "Vertical Push", "Dumbbell", "weight_reps", "lb", ["unilateral", "core"]],
    ["Pull-Up", "Strength", "Vertical Pull", "Pull-Up Bar", "bodyweight", "reps", ["upper body", "bodyweight"]],
    ["Chin-Up", "Strength", "Vertical Pull", "Pull-Up Bar", "bodyweight", "reps", ["upper body", "bodyweight"]],
    ["Lat Pulldown", "Strength", "Vertical Pull", "Cable", "weight_reps", "lb", ["upper body", "back"]],
    ["Bent-Over Row", "Strength", "Horizontal Pull", "Barbell", "weight_reps", "lb", ["upper body", "back"]],
    ["Chest-Supported Row", "Strength", "Horizontal Pull", "Dumbbell", "weight_reps", "lb", ["upper body", "back"]],
    ["Single-Arm Cable Row", "Strength", "Horizontal Pull", "Cable", "weight_reps", "lb", ["unilateral", "back"]],
    ["Inverted Row", "Strength", "Horizontal Pull", "Bodyweight", "bodyweight", "reps", ["upper body", "bodyweight"]],
    ["Farmer Carry", "Strength", "Carry", "Dumbbell", "distance", "yd", ["grip", "total body"]],
    ["Suitcase Carry", "Strength", "Carry", "Kettlebell", "distance", "yd", ["anti-lateral flexion", "unilateral"]],
    ["Front-Rack Carry", "Strength", "Carry", "Kettlebell", "distance", "yd", ["core", "posture"]],
    ["Sled Push", "Strength", "Carry", "Sled", "distance", "yd", ["acceleration", "lower body"]],
    ["Hang Power Clean", "Power", "Olympic / Power", "Barbell", "weight_reps", "lb", ["explosive", "total body"]],
    ["High Pull", "Power", "Olympic / Power", "Barbell", "weight_reps", "lb", ["explosive", "total body"]],
    ["Dumbbell Snatch", "Power", "Olympic / Power", "Dumbbell", "weight_reps", "lb", ["unilateral", "explosive"]],
    ["Box Jump", "Plyometrics", "Plyometrics", "Box", "reps", "reps", ["vertical power", "jump"]],
    ["Broad Jump", "Plyometrics", "Plyometrics", "None", "distance", "in", ["horizontal power", "jump"]],
    ["Countermovement Jump", "Plyometrics", "Plyometrics", "None", "reps", "reps", ["vertical power", "jump"]],
    ["Pogo Jump", "Plyometrics", "Plyometrics", "None", "reps", "reps", ["ankle stiffness", "reactive"]],
    ["Lateral Bound", "Plyometrics", "Plyometrics", "None", "reps", "reps", ["lateral power", "single leg"]],
    ["Skater Jump", "Plyometrics", "Plyometrics", "None", "reps", "reps", ["lateral power", "balance"]],
    ["Med-Ball Chest Pass", "Power", "Olympic / Power", "Medicine Ball", "reps", "reps", ["upper-body power", "throw"]],
    ["Med-Ball Rotational Throw", "Power", "Rotation", "Medicine Ball", "reps", "reps", ["rotational power", "throw"]],
    ["Med-Ball Overhead Slam", "Power", "Olympic / Power", "Medicine Ball", "reps", "reps", ["total-body power", "throw"]],
    ["Wall Acceleration Drill", "Speed", "Acceleration", "Wall", "reps", "reps", ["sprint mechanics", "warm-up"]],
    ["Falling Start Sprint", "Speed", "Acceleration", "None", "distance", "yd", ["sprint", "first step"]],
    ["Three-Point Start Sprint", "Speed", "Acceleration", "None", "distance", "yd", ["sprint", "start"]],
    ["Flying Sprint", "Speed", "Speed", "None", "distance", "yd", ["max velocity", "sprint"]],
    ["A-Skip", "Speed", "Speed", "None", "distance", "yd", ["sprint mechanics", "rhythm"]],
    ["Lateral Shuffle", "Agility / Change of Direction", "Agility", "Cones", "distance", "yd", ["lateral movement", "defense"]],
    ["Carioca", "Agility / Change of Direction", "Agility", "Cones", "distance", "yd", ["coordination", "rotation"]],
    ["Pro Agility Shuttle", "Agility / Change of Direction", "Change of Direction", "Cones", "time", "sec", ["5-10-5", "change of direction"]],
    ["T-Drill", "Agility / Change of Direction", "Change of Direction", "Cones", "time", "sec", ["agility", "multidirectional"]],
    ["Deceleration Stick", "Agility / Change of Direction", "Change of Direction", "Cones", "reps", "reps", ["braking", "body control"]],
    ["Run", "Conditioning", "Running", "None", "distance", "mi", ["aerobic", "conditioning"]],
    ["Sprint", "Conditioning", "Running", "None", "distance", "yd", ["anaerobic", "speed"]],
    ["Tempo Run", "Conditioning", "Running", "None", "time", "min", ["aerobic", "tempo"]],
    ["Row", "Conditioning", "Rowing", "Rower", "distance", "m", ["erg", "total body"]],
    ["Bike", "Conditioning", "Bike", "Bike", "calories", "cal", ["erg", "lower body"]],
    ["Ski Erg", "Conditioning", "Ski", "Ski Erg", "distance", "m", ["erg", "upper body"]],
    ["Jump Rope", "Conditioning", "Jump Rope", "Jump Rope", "time", "sec", ["footwork", "conditioning"]],
    ["Burpee", "Conditioning", "Bodyweight Conditioning", "Bodyweight", "reps", "reps", ["total body", "conditioning"]],
    ["Wall Ball", "Conditioning", "Bodyweight Conditioning", "Medicine Ball", "reps", "reps", ["squat", "conditioning"]],
    ["Mountain Climber", "Conditioning", "Bodyweight Conditioning", "Bodyweight", "time", "sec", ["core", "conditioning"]],
    ["Bear Crawl", "Conditioning", "Bodyweight Conditioning", "Bodyweight", "distance", "yd", ["locomotion", "total body"]],
    ["Plank", "Core", "Anti-extension", "Bodyweight", "hold_duration", "sec", ["trunk", "isometric"]],
    ["Dead Bug", "Core", "Anti-extension", "Bodyweight", "reps", "reps", ["trunk", "control"]],
    ["Ab Wheel Rollout", "Core", "Anti-extension", "Ab Wheel", "reps", "reps", ["trunk", "advanced"]],
    ["Pallof Press", "Core", "Anti-rotation", "Cable", "reps", "reps", ["trunk", "anti-rotation"]],
    ["Half-Kneeling Pallof Hold", "Core", "Anti-rotation", "Band", "hold_duration", "sec", ["trunk", "isometric"]],
    ["Cable Chop", "Core", "Rotation", "Cable", "reps", "reps", ["rotation", "trunk"]],
    ["Russian Twist", "Core", "Rotation", "Medicine Ball", "reps", "reps", ["rotation", "trunk"]],
    ["Hanging Knee Raise", "Core", "Flexion", "Pull-Up Bar", "reps", "reps", ["trunk", "hanging"]],
    ["Side Plank", "Core", "Carry", "Bodyweight", "hold_duration", "sec", ["anti-lateral flexion", "isometric"]],
    ["World's Greatest Stretch", "Mobility / Warm-up", "Dynamic Mobility", "None", "reps", "reps", ["hips", "thoracic"]],
    ["Walking Quad Stretch", "Mobility / Warm-up", "Dynamic Mobility", "None", "distance", "yd", ["quads", "dynamic"]],
    ["Inchworm", "Mobility / Warm-up", "Movement Preparation", "None", "reps", "reps", ["hamstrings", "shoulders"]],
    ["Lunge with Rotation", "Mobility / Warm-up", "Dynamic Mobility", "None", "reps", "reps", ["hips", "thoracic"]],
    ["Mini-Band Lateral Walk", "Mobility / Warm-up", "Activation", "Mini Band", "distance", "yd", ["glutes", "lateral"]],
    ["Glute Bridge March", "Mobility / Warm-up", "Activation", "Bodyweight", "reps", "reps", ["glutes", "core"]],
    ["Scapular Push-Up", "Mobility / Warm-up", "Activation", "Bodyweight", "reps", "reps", ["shoulders", "scapula"]],
    ["Band Pull-Apart", "Mobility / Warm-up", "Activation", "Band", "reps", "reps", ["upper back", "posture"]],
    ["Ankle Rocker", "Mobility / Warm-up", "Dynamic Mobility", "None", "reps", "reps", ["ankle", "mobility"]],
    ["Hip Airplane", "Mobility / Warm-up", "Movement Preparation", "None", "reps", "reps", ["hip", "balance"]],
    ["High-Knee March", "Mobility / Warm-up", "Movement Preparation", "None", "distance", "yd", ["running", "coordination"]],
    ["Lateral Lunge Walk", "Mobility / Warm-up", "Movement Preparation", "None", "distance", "yd", ["groin", "lateral"]]
  ];

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function normalizeSearchText(value) {
    return String(value || "").toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }

  let exercises = Object.freeze(definitions.map((item, index) => Object.freeze({
    exerciseId: `f4f-${String(index + 1).padStart(3, "0")}-${slug(item[0])}`,
    name: item[0], category: item[1], movementPattern: item[2], equipment: item[3],
    measurementType: item[4], defaultUnit: item[5],
    instructions: `Perform ${item[0]} with controlled technique and the prescribed intent. Stop the set if position or movement quality breaks down.`,
    tags: Object.freeze(item[6]), aliases: Object.freeze(EXISTING_ALIASES[item[0]] || []), active: true, customExercise: false, createdBy: "F4F_LIBRARY",
    createdAt: CREATED_AT, updatedAt: CREATED_AT, demoMedia: null
  })));

  function filterExercises(items, filters = {}) {
    const query = normalizeSearchText(filters.query);
    return items.filter(exercise => exercise.active !== false)
      .filter(exercise => !query || normalizeSearchText([exercise.name, ...(exercise.aliases || []), ...exercise.tags].join(" ")).includes(query))
      .filter(exercise => !filters.category || filters.category === "all" || exercise.category === filters.category)
      .filter(exercise => !filters.equipment || filters.equipment === "all" || exercise.equipment === filters.equipment)
      .filter(exercise => !filters.movementPattern || filters.movementPattern === "all" || exercise.movementPattern === filters.movementPattern);
  }

  function uniqueValues(items, field) {
    return [...new Set(items.map(item => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  function setExercises(items) {
    if (!Array.isArray(items)) throw new Error("Exercise payload must be an array.");
    exercises = Object.freeze(items.map(item => Object.freeze({ ...item, tags: Object.freeze([...(item.tags || [])]), aliases: Object.freeze([...(item.aliases || [])]) })));
    return exercises;
  }

  const api = Object.freeze({ get exercises() { return exercises; }, filterExercises, uniqueValues, normalizeSearchText, setExercises });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.F4F_EXERCISES = api;
})(typeof window !== "undefined" ? window : globalThis);
