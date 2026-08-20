import re

SECTION_TYPES = {"Stretch / Mobility", "Warm-Up", "Power", "Strength", "Conditioning", "Metcon", "Accessory", "Core", "Finisher", "Cooldown", "Custom"}
SECTION_FORMATS = {"Standard", "Superset", "Circuit", "AMRAP", "For Time", "EMOM", "E2MOM", "Intervals", "Rounds", "Steady State", "Freeform / Instructions Only"}
PRESCRIPTION_FIELDS = {"sets", "reps", "repQualifier", "load", "loadUnit", "duration", "distance", "distanceUnit", "calories", "rounds", "rest", "tempo", "rpe", "percentage", "coachInstruction"}
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{2,99}$")


def _valid_number(value, *, minimum=0, maximum=None):
    if value in (None, ""):
        return True
    try:
        number = float(value)
        return number >= minimum and (maximum is None or number <= maximum)
    except (TypeError, ValueError):
        return False


def _validate_exercise(item, label):
    errors = []
    if not isinstance(item, dict):
        return [f"{label} must be an object"]
    if not ID_PATTERN.match(str(item.get("exerciseId", ""))): errors.append(f"{label} has an invalid exerciseId")
    if not str(item.get("exerciseName", "")).strip(): errors.append(f"{label} requires exerciseName")
    prescription = item.get("prescription")
    if not isinstance(prescription, dict): return errors + [f"{label} requires prescription"]
    if set(prescription) - PRESCRIPTION_FIELDS: errors.append(f"{label} contains unsupported prescription fields")
    if prescription.get("repQualifier") not in (None, "", "total", "each-side", "alternating"): errors.append(f"{label} has an invalid repQualifier")
    for field in {"sets", "reps", "load", "duration", "distance", "calories", "rounds", "rest"}:
        if not _valid_number(prescription.get(field)): errors.append(f"{label} has invalid {field}")
    if not _valid_number(prescription.get("rpe"), minimum=1, maximum=10): errors.append(f"{label} has invalid rpe")
    if not _valid_number(prescription.get("percentage"), minimum=1, maximum=100): errors.append(f"{label} has invalid percentage")
    return errors


def validate_template(payload):
    errors = []
    if not isinstance(payload, dict): return ["JSON body must be an object"]
    if not isinstance(payload.get("name"), str) or not payload["name"].strip() or len(payload["name"]) > 100: errors.append("name is required and must be at most 100 characters")
    if len(str(payload.get("description", ""))) > 500: errors.append("description must be at most 500 characters")
    sections = payload.get("sections")
    if isinstance(sections, list):
        if not sections or len(sections) > 30: return errors + ["sections must contain 1 to 30 items"]
        seen = set()
        total_exercises = 0
        for section_index, section in enumerate(sections):
            label = f"section {section_index + 1}"
            if not isinstance(section, dict): errors.append(f"{label} must be an object"); continue
            section_id = str(section.get("sectionId", ""))
            if not ID_PATTERN.match(section_id): errors.append(f"{label} has an invalid sectionId")
            elif section_id in seen: errors.append(f"{label} duplicates sectionId")
            seen.add(section_id)
            if section.get("type") not in SECTION_TYPES: errors.append(f"{label} has an invalid type")
            if section.get("format") not in SECTION_FORMATS: errors.append(f"{label} has an invalid format")
            if len(str(section.get("title", ""))) > 100: errors.append(f"{label} title must be at most 100 characters")
            if len(str(section.get("instructions", ""))) > 500: errors.append(f"{label} instructions must be at most 500 characters")
            if not _valid_number(section.get("rounds")): errors.append(f"{label} has invalid rounds")
            if not _valid_number(section.get("duration")): errors.append(f"{label} has invalid duration")
            exercises = section.get("exercises", [])
            if not isinstance(exercises, list) or len(exercises) > 100: errors.append(f"{label} exercises must be an array with at most 100 items"); continue
            total_exercises += len(exercises)
            for exercise_index, exercise in enumerate(exercises): errors.extend(_validate_exercise(exercise, f"{label} exercise {exercise_index + 1}"))
        if total_exercises > 100: errors.append("workout must contain at most 100 exercises")
        if total_exercises == 0 and not any(str(section.get("instructions", "")).strip() for section in sections if isinstance(section, dict)): errors.append("workout requires an exercise or section instructions")
        return errors
    exercises = payload.get("exercises")
    if not isinstance(exercises, list) or not exercises or len(exercises) > 100: return errors + ["sections or exercises must contain workout content"]
    for index, item in enumerate(exercises): errors.extend(_validate_exercise(item, f"exercise {index + 1}"))
    return errors
