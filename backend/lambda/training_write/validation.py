import re

SECTIONS = {"Warm-Up", "Strength", "Power", "Conditioning", "Accessory", "Core", "Cooldown"}
PRESCRIPTION_FIELDS = {"sets", "reps", "load", "loadUnit", "duration", "distance", "distanceUnit", "calories", "rounds", "rest", "tempo", "rpe", "percentage", "coachInstruction"}
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{2,99}$")

def validate_template(payload):
    errors = []
    if not isinstance(payload, dict): return ["JSON body must be an object"]
    if not isinstance(payload.get("name"), str) or not payload["name"].strip() or len(payload["name"]) > 100: errors.append("name is required and must be at most 100 characters")
    if len(str(payload.get("description", ""))) > 500: errors.append("description must be at most 500 characters")
    exercises = payload.get("exercises")
    if not isinstance(exercises, list) or not exercises or len(exercises) > 100: return errors + ["exercises must contain 1 to 100 items"]
    for index, item in enumerate(exercises):
        if not isinstance(item, dict): errors.append(f"exercise {index + 1} must be an object"); continue
        if not ID_PATTERN.match(str(item.get("exerciseId", ""))): errors.append(f"exercise {index + 1} has an invalid exerciseId")
        if not str(item.get("exerciseName", "")).strip(): errors.append(f"exercise {index + 1} requires exerciseName")
        if item.get("section") not in SECTIONS: errors.append(f"exercise {index + 1} has an invalid section")
        prescription = item.get("prescription")
        if not isinstance(prescription, dict): errors.append(f"exercise {index + 1} requires prescription"); continue
        if set(prescription) - PRESCRIPTION_FIELDS: errors.append(f"exercise {index + 1} contains unsupported prescription fields")
        for field in {"sets", "reps", "load", "duration", "distance", "calories", "rounds", "rest", "rpe", "percentage"}:
            value = prescription.get(field)
            if value not in (None, ""):
                try:
                    number = float(value)
                    if number < 0: raise ValueError()
                    if field == "rpe" and not 1 <= number <= 10: raise ValueError()
                    if field == "percentage" and not 1 <= number <= 100: raise ValueError()
                except (TypeError, ValueError): errors.append(f"exercise {index + 1} has invalid {field}")
    return errors
