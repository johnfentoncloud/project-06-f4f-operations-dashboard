"use strict";

// Review-only Phase Expansion 1 candidates. This file is not loaded by the
// production frontend or seed script until John/Jess approve a subset.
const groups = [
  ["Strength", "Squat", "Machine", "weight_reps", "lb", [
    "Leg Press", "Hack Squat", "Pendulum Squat", "Belt Squat", "Smith Machine Squat", "Leg Extension"
  ]],
  ["Strength", "Single-Leg", "Dumbbell", "weight_reps", "lb", [
    "Front-Rack Reverse Lunge", "Walking Lunge", "Deficit Reverse Lunge", "Curtsy Lunge", "Lateral Step-Up", "Crossover Step-Up", "Rear-Foot-Elevated Split Squat", "Front-Foot-Elevated Split Squat", "Single-Leg Box Squat", "Pistol Squat to Box"
  ]],
  ["Strength", "Hinge", "Barbell", "weight_reps", "lb", [
    "Sumo Deadlift", "Deficit Deadlift", "Rack Pull", "Snatch-Grip Deadlift", "Good Morning", "Barbell Glute Bridge"
  ]],
  ["Strength", "Hinge", "Dumbbell", "weight_reps", "lb", [
    "Dumbbell Romanian Deadlift", "Kickstand Romanian Deadlift", "Dumbbell Hip Thrust", "Single-Leg Hip Thrust"
  ]],
  ["Strength", "Hinge", "Resistance Band", "reps", "reps", [
    "Banded Good Morning", "Banded Pull-Through", "Banded Hip Thrust"
  ]],
  ["Strength", "Hinge", "Machine", "weight_reps", "lb", [
    "Seated Hamstring Curl", "Lying Hamstring Curl", "Standing Hamstring Curl", "Cable Pull-Through", "Back Extension"
  ]],
  ["Strength", "Horizontal Push", "Dumbbell", "weight_reps", "lb", [
    "Dumbbell Bench Press", "Decline Dumbbell Press", "Alternating Dumbbell Bench Press", "Single-Arm Dumbbell Bench Press", "Dumbbell Squeeze Press"
  ]],
  ["Strength", "Horizontal Push", "Bodyweight", "bodyweight", "reps", [
    "Incline Push-Up", "Decline Push-Up", "Hand-Release Push-Up", "Close-Grip Push-Up", "Plyometric Push-Up"
  ]],
  ["Strength", "Vertical Push", "Dumbbell", "weight_reps", "lb", [
    "Dumbbell Strict Press", "Dumbbell Push Press", "Arnold Press", "Tall-Kneeling Dumbbell Press", "Single-Arm Dumbbell Press"
  ]],
  ["Strength", "Vertical Push", "Landmine", "weight_reps", "lb", [
    "Half-Kneeling Landmine Press", "Standing Landmine Press", "Landmine Push Press"
  ]],
  ["Strength", "Horizontal Pull", "Dumbbell", "weight_reps", "lb", [
    "Single-Arm Dumbbell Row", "Renegade Row", "Seal Row", "Dumbbell Bent-Over Row"
  ]],
  ["Strength", "Horizontal Pull", "Cable", "weight_reps", "lb", [
    "Seated Cable Row", "Half-Kneeling Cable Row", "Face Pull", "Straight-Arm Pulldown"
  ]],
  ["Strength", "Vertical Pull", "Pull-Up Bar", "bodyweight", "reps", [
    "Neutral-Grip Pull-Up", "Eccentric Pull-Up", "Assisted Pull-Up", "Scapular Pull-Up"
  ]],
  ["Strength", "Vertical Pull", "Machine", "weight_reps", "lb", [
    "Assisted Chin-Up", "Neutral-Grip Lat Pulldown", "Single-Arm Lat Pulldown", "Machine High Row"
  ]],
  ["Strength", "Accessory", "Dumbbell", "weight_reps", "lb", [
    "Dumbbell Lateral Raise", "Dumbbell Rear-Delt Raise", "Dumbbell Curl", "Hammer Curl", "Dumbbell Triceps Extension"
  ]],
  ["Strength", "Accessory", "Cable", "weight_reps", "lb", [
    "Cable Lateral Raise", "Cable Curl", "Triceps Pressdown", "Cable External Rotation"
  ]],
  ["Strength", "Accessory", "Machine", "weight_reps", "lb", [
    "Machine Chest Press", "Machine Shoulder Press", "Machine Row", "Calf Raise", "Hip Abduction", "Hip Adduction"
  ]],
  ["Strength", "Carry", "Dumbbell", "distance", "yd", [
    "Front-Rack Farmer Carry", "Overhead Carry", "Waiter Carry", "Cross-Body Carry"
  ]],
  ["Strength", "Carry", "Trap Bar", "distance", "yd", ["Trap Bar Carry"]],

  ["Power", "Olympic / Power", "Barbell", "weight_reps", "lb", [
    "Power Clean", "Clean Pull", "Hang Clean", "Clean from Blocks", "Power Snatch", "Hang Power Snatch", "Snatch Pull", "Push Jerk", "Split Jerk"
  ]],
  ["Power", "Olympic / Power", "Dumbbell", "weight_reps", "lb", [
    "Dumbbell Clean", "Dumbbell Hang Clean", "Dumbbell Clean and Press", "Dumbbell Push Jerk"
  ]],
  ["Power", "Olympic / Power", "Kettlebell", "weight_reps", "lb", [
    "Kettlebell Clean", "Kettlebell Snatch", "Kettlebell Push Press", "Double-Kettlebell Swing"
  ]],
  ["Power", "Rotation", "Medicine Ball", "reps", "reps", [
    "Medicine Ball Shot-Put Throw", "Medicine Ball Scoop Toss", "Medicine Ball Step-Behind Rotational Throw", "Medicine Ball Half-Kneeling Rotational Throw", "Medicine Ball Reverse Throw"
  ]],
  ["Power", "Olympic / Power", "Medicine Ball", "reps", "reps", [
    "Medicine Ball Squat Throw", "Medicine Ball Overhead Backward Throw", "Medicine Ball Punch Throw", "Medicine Ball Thruster"
  ]],

  ["Plyometrics", "Plyometrics", "Bodyweight", "reps", "reps", [
    "Snap-Down", "Snap-Down to Jump", "Squat Jump", "Tuck Jump", "Split Jump", "Repeated Broad Jump", "Single-Leg Broad Jump", "Lateral Pogo Jump", "Single-Leg Pogo Jump", "Forward Pogo Jump", "Hurdle Hop", "Lateral Hurdle Hop", "Depth Drop", "Depth Jump", "Drop Jump", "Single-Leg Hop and Stick", "Lateral Bound and Stick", "Skater Bound", "Alternating Bound", "Power Skip for Height", "Power Skip for Distance"
  ]],
  ["Plyometrics", "Plyometrics", "Box", "reps", "reps", [
    "Seated Box Jump", "Lateral Box Jump", "Single-Leg Box Jump", "Box Jump Over", "Depth Drop to Box Jump"
  ]],

  ["Speed", "Acceleration", "None", "distance", "yd", [
    "Two-Point Start Sprint", "Half-Kneeling Start Sprint", "Push-Up Start Sprint", "Crossover Start Sprint", "Curved Acceleration Sprint", "Hill Sprint", "Build-Up Sprint"
  ]],
  ["Speed", "Speed", "None", "distance", "yd", [
    "Flying 10", "Flying 20", "Ins-and-Outs Sprint", "Stride Run", "B-Skip", "Straight-Leg Bound", "Dribble Run", "High-Knee Run"
  ]],
  ["Speed", "Acceleration", "Sled", "distance", "yd", [
    "Light Sled Sprint", "Heavy Sled March", "Heavy Sled Sprint"
  ]],
  ["Speed", "Acceleration", "Resistance Band", "distance", "yd", ["Partner-Resisted Sprint", "Banded Acceleration Sprint"]],

  ["Agility / Change of Direction", "Change of Direction", "Cones", "time", "sec", [
    "10-Yard Shuttle", "20-Yard Shuttle", "L-Drill", "Box Drill", "Four-Cone Drill", "Zig-Zag Cut Drill", "Figure-Eight Drill", "Three-Cone Deceleration Drill", "Sprint-to-Backpedal Drill", "Sprint-to-Lateral Shuffle Drill"
  ]],
  ["Agility / Change of Direction", "Change of Direction", "Cones", "reps", "reps", [
    "45-Degree Cut", "90-Degree Cut", "180-Degree Cut", "Lateral Shuffle to Sprint", "Backpedal to Sprint", "Crossover Run to Stick", "Single-Leg Deceleration Stick", "Lateral Deceleration Stick"
  ]],
  ["Agility / Change of Direction", "Agility", "Cones", "time", "sec", [
    "Mirror Drill", "Partner Point Drill", "Reactive Cone Callout", "Reactive Shuffle Drill", "Closeout Drill"
  ]],

  ["Conditioning", "Running", "Treadmill", "time", "min", [
    "Treadmill Run", "Treadmill Incline Walk", "Treadmill Sprint", "Treadmill Tempo Run"
  ]],
  ["Conditioning", "Bike", "Air Bike", "calories", "cal", [
    "Air Bike", "Air Bike Sprint", "Air Bike Intervals", "Air Bike Tempo"
  ]],
  ["Conditioning", "Bike", "Bike", "distance", "mi", ["Stationary Bike", "Bike Distance", "Bike Tempo"]],
  ["Conditioning", "Rowing", "Rower", "calories", "cal", ["Row Calories", "Row Sprint", "Row Intervals"]],
  ["Conditioning", "Ski", "Ski Erg", "calories", "cal", ["Ski Erg Calories", "Ski Erg Sprint", "Ski Erg Intervals"]],
  ["Conditioning", "Stair Climb", "StairMaster", "time", "min", ["StairMaster", "StairMaster Intervals"]],
  ["Conditioning", "Carry", "Sled", "distance", "yd", ["Sled Drag", "Backward Sled Drag", "Lateral Sled Drag", "Sled Push-Pull"]],
  ["Conditioning", "Bodyweight Conditioning", "Bodyweight", "reps", "reps", [
    "Burpee Broad Jump", "Burpee Box Jump", "Burpee Over Bar", "Lateral Burpee", "Shuttle Run", "Walking Lunge"
  ]],
  ["Conditioning", "Bodyweight Conditioning", "Medicine Ball", "reps", "reps", ["Medicine Ball Squat", "Medicine Ball Lunge", "Medicine Ball Dead Bug"]],

  ["Core", "Anti-extension", "Bodyweight", "reps", "reps", [
    "Bird Dog", "Hollow-Body Rock", "Body Saw", "Plank Walkout", "Stability-Ball Rollout"
  ]],
  ["Core", "Anti-extension", "Bodyweight", "hold_duration", "sec", ["Hollow-Body Hold", "RKC Plank", "Long-Lever Plank"]],
  ["Core", "Anti-rotation", "Cable", "reps", "reps", [
    "Standing Pallof Press", "Split-Stance Pallof Press", "Pallof Press Walkout", "Cable Lift"
  ]],
  ["Core", "Anti-rotation", "Dumbbell", "reps", "reps", ["Plank Pull-Through", "Renegade Row Hold"]],
  ["Core", "Rotation", "Medicine Ball", "reps", "reps", ["Medicine Ball Russian Twist", "Medicine Ball Sit-Up Throw"]],
  ["Core", "Flexion", "Bodyweight", "reps", "reps", [
    "Alternating V-Up", "V-Up", "Reverse Crunch", "Bicycle Crunch", "Toe Touch", "Sit-Up"
  ]],
  ["Core", "Flexion", "Pull-Up Bar", "reps", "reps", ["Hanging Leg Raise", "Toes-to-Bar"]],
  ["Core", "Carry", "Dumbbell", "distance", "yd", ["Bear-Hug Carry", "Offset Farmer Carry"]],

  ["Mobility / Warm-up", "Dynamic Mobility", "None", "reps", "reps", [
    "Open Book Rotation", "Thread the Needle", "Quadruped T-Spine Rotation", "Adductor Rock-Back", "90/90 Hip Switch", "Shin Box Rotation", "Hip Flexor Rock", "Hamstring Sweep", "Knee Hug to Lunge", "Spiderman Lunge"
  ]],
  ["Mobility / Warm-up", "Dynamic Mobility", "None", "hold_duration", "sec", [
    "Half-Kneeling Hip Flexor Stretch", "Couch Stretch", "Calf Stretch", "Lat Stretch", "Pectoral Stretch"
  ]],
  ["Mobility / Warm-up", "Activation", "Resistance Band", "reps", "reps", [
    "Banded Glute Bridge", "Banded Clamshell", "Banded Monster Walk", "Banded External Rotation", "Banded Face Pull", "Banded Row", "Banded Lat Pulldown"
  ]],
  ["Mobility / Warm-up", "Activation", "Bodyweight", "reps", "reps", [
    "Single-Leg Glute Bridge", "Fire Hydrant", "Bird Dog", "Prone Y-T-W", "Wall Slide", "Serratus Wall Slide"
  ]],
  ["Mobility / Warm-up", "Movement Preparation", "None", "distance", "yd", [
    "Walking Hamstring Sweep", "Walking Knee Hug", "Walking Lunge with Reach", "Toy Soldier Walk", "Heel-to-Glute Walk", "Carioca Walk", "Backpedal", "Side Shuffle", "Skipping", "Jog"
  ]],
  ["Mobility / Warm-up", "Movement Preparation", "Medicine Ball", "reps", "reps", [
    "Medicine Ball Squat", "Medicine Ball Lunge", "Medicine Ball Thruster", "Medicine Ball Dead Bug"
  ]]
];

const aliasOverrides = Object.freeze({
  "Rear-Foot-Elevated Split Squat": ["RFESS", "Bulgarian Split Squat", "Rear Foot Elevated Split Squat"],
  "Dumbbell Bench Press": ["DB Bench Press", "Dumbbell Flat Bench Press"],
  "Single-Arm Dumbbell Row": ["One-Arm Dumbbell Row", "1-Arm DB Row", "Single Arm DB Row"],
  "Medicine Ball Thruster": ["Med Ball Thruster", "Medball Thruster"],
  "Medicine Ball Squat": ["Med Ball Squat", "Medball Squat"],
  "Medicine Ball Lunge": ["Med Ball Lunge", "Medball Lunge"],
  "Medicine Ball Dead Bug": ["Med Ball Dead Bug", "Medball Deadbug"],
  "Air Bike": ["Assault Bike", "Fan Bike"],
  "StairMaster": ["Stair Master", "Stair Climber"],
  "Burpee Broad Jump": ["Burpee Broad Jumps"],
  "Plank Pull-Through": ["Plank Drag", "Dumbbell Plank Pull Through"]
});

const slug = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const categoryCaps = Object.freeze({ Strength: 90, Power: 20, Plyometrics: 20, Speed: 15, "Agility / Change of Direction": 15, Conditioning: 25, Core: 20, "Mobility / Warm-up": 30 });
const uncertainNames = new Set([
  "Cross-Body Carry",
  "Ins-and-Outs Sprint",
  "Partner-Resisted Sprint",
  "Reactive Cone Callout",
  "Closeout Drill",
  "Machine High Row",
  "Stability-Ball Rollout"
]);
const categoryCounts = new Map();
const seenNames = new Set();
const candidates = [];
groups.forEach(([category, movementPattern, equipment, measurementType, defaultUnit, names]) => names.forEach(name => {
  const normalizedName = slug(name);
  const count = categoryCounts.get(category) || 0;
  if (seenNames.has(normalizedName) || count >= categoryCaps[category]) return;
  seenNames.add(normalizedName);
  categoryCounts.set(category, count + 1);
  candidates.push(Object.freeze({
    candidateId: `f4f-candidate-${normalizedName}`,
    name,
    category,
    equipment,
    movementPattern,
    measurementType,
    defaultUnit,
    aliases: Object.freeze(aliasOverrides[name] || []),
    tags: Object.freeze([...new Set([category.toLowerCase(), movementPattern.toLowerCase(), equipment.toLowerCase()])]),
    reviewStatus: uncertainNames.has(name) ? "NEEDS_TAXONOMY_REVIEW" : "PENDING_COACH_REVIEW"
  }));
}));

module.exports = Object.freeze({ candidates: Object.freeze(candidates), aliasOverrides, categoryCaps });
