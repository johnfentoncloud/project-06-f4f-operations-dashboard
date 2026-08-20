"use strict";

const { candidates } = require("./exercise-expansion-candidates.js");

const coachReviewReasons = Object.freeze({
  "Pendulum Squat": "Confirm this machine is available and preferred over a broader machine-squat label.",
  "Smith Machine Squat": "Confirm Smith-machine terminology and likely F4F use.",
  "Deficit Reverse Lunge": "Confirm whether deficit height belongs in the canonical name or Coach prescription.",
  "Pistol Squat to Box": "Confirm progression naming and intended audience.",
  "Rack Pull": "Confirm rack/block height should remain prescription-specific.",
  "Standing Hamstring Curl": "Confirm machine versus cable/band equipment taxonomy.",
  "Back Extension": "Confirm equipment label; benches and GHD-style stations vary.",
  "Plyometric Push-Up": "Could be categorized as Strength or Plyometrics.",
  "Tall-Kneeling Dumbbell Press": "Confirm bilateral versus single-arm canonical intent.",
  "Machine High Row": "Machine naming and movement pattern vary by facility.",
  "Assisted Chin-Up": "Potential overlap with Assisted Pull-Up; confirm separate value.",
  "Hip Abduction": "Confirm machine is implied in the display name.",
  "Hip Adduction": "Confirm machine is implied in the display name.",
  "Cross-Body Carry": "Ambiguous load position; select a clearer Coach-preferred name.",
  "Clean from Blocks": "Block height may belong in the prescription rather than canonical name.",
  "Medicine Ball Shot-Put Throw": "Confirm hyphenation and preferred lacrosse-training terminology.",
  "Depth Jump": "Confirm distinction from Drop Jump in F4F coaching language.",
  "Drop Jump": "Confirm distinction from Depth Jump in F4F coaching language.",
  "Ins-and-Outs Sprint": "Terminology varies; define intended execution before approval.",
  "Stride Run": "Ambiguous intensity and distance prescription.",
  "Dribble Run": "Confirm sprint-drill terminology and progression level.",
  "High-Knee Run": "Potential overlap with existing High-Knee March.",
  "Box Drill": "Generic name needs cone layout or a clearer canonical label.",
  "Four-Cone Drill": "Generic name needs an agreed movement pattern/layout.",
  "Figure-Eight Drill": "Confirm cone spacing and whether setup belongs in instructions.",
  "Air Bike Tempo": "Confirm whether tempo is distinct enough from generic Air Bike intervals.",
  "Bike Tempo": "Confirm whether this should be a prescription on the existing Bike record.",
  "Sled Push-Pull": "Confirm whether combined push/pull should be one record or two prescriptions.",
  "Stability-Ball Rollout": "Add Stability Ball equipment only if F4F wants that taxonomy value.",
  "Cable Lift": "Ambiguous direction; consider Low-to-High Cable Lift."
});

const holdReasons = Object.freeze({
  "Rear-Foot-Elevated Split Squat": "Duplicate concept: the existing Bulgarian Split Squat now resolves RFESS and rear-foot-elevated aliases.",
  "Curtsy Lunge": "Lower priority and less central to current F4F programming.",
  "Crossover Step-Up": "Lower priority with substantial overlap with existing unilateral step-up work.",
  "Snatch-Grip Deadlift": "Specialized variation; hold until a programming need is demonstrated.",
  "Single-Arm Dumbbell Bench Press": "Useful but redundant for the first expansion given other DB press options.",
  "Dumbbell Squeeze Press": "Accessory variation can wait beyond the first production subset.",
  "Landmine Push Press": "Niche variation with overlap across landmine press and push press.",
  "Seal Row": "Requires a specialized setup and overlaps other supported rows.",
  "Half-Kneeling Cable Row": "Lower-priority positional variation of existing cable rows.",
  "Dumbbell Rear-Delt Raise": "Can be reconsidered with a broader shoulder-accessory expansion.",
  "Waiter Carry": "Terminology may be unclear; Overhead Carry covers the immediate need.",
  "Dumbbell Hang Clean": "Redundant for the initial set alongside Dumbbell Clean and Hang Clean.",
  "Dumbbell Push Jerk": "Lower-priority variation for the first production expansion.",
  "Double-Kettlebell Swing": "Specialized variation; the existing Kettlebell Swing covers the core movement.",
  "Medicine Ball Step-Behind Rotational Throw": "Useful but too specific before broader med-ball terminology review.",
  "Repeated Broad Jump": "Can be prescribed using the approved Broad Jump record.",
  "Tuck Jump": "Lower priority than landing, pogo, box, broad, and bound progressions.",
  "Flying 20": "Flying 10 is sufficient for the first expansion; add longer variants when needed.",
  "Crossover Start Sprint": "Lower-priority start variation.",
  "Bike Distance": "Existing Bike can already accept distance prescriptions.",
  "Walking Hamstring Sweep": "Redundant with Hamstring Sweep plus distance prescription."
});

const classified = candidates.map(candidate => {
  const status = Object.hasOwn(holdReasons, candidate.name) ? "HOLD" : Object.hasOwn(coachReviewReasons, candidate.name) ? "COACH_REVIEW" : "READY_TO_APPROVE";
  return Object.freeze({ ...candidate, approvalStatus: status, reviewReason: holdReasons[candidate.name] || coachReviewReasons[candidate.name] || "" });
});

const byStatus = status => Object.freeze(classified.filter(item => item.approvalStatus === status));
module.exports = Object.freeze({
  classified: Object.freeze(classified),
  readyToApprove: byStatus("READY_TO_APPROVE"),
  coachReview: byStatus("COACH_REVIEW"),
  hold: byStatus("HOLD")
});
