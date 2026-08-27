ALLOWED_SCORE_TYPES = {
    "LOAD", "REPS", "TIME", "DISTANCE", "CALORIES", "COMPLETION", "ROUNDS",
    "ROUNDS_REPS", "LOAD_REPS_BY_SET", "DISTANCE_TIME", "DURATION_DISTANCE"
}


def number(value, minimum=0):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value >= minimum


def validate_result(item):
    if not isinstance(item, dict) or item.get("resultScope") not in {"EXERCISE", "SECTION"}:
        return False
    score = item.get("scoreType")
    if score not in ALLOWED_SCORE_TYPES or not item.get("sectionInstanceId"):
        return False
    if item["resultScope"] == "EXERCISE" and (not item.get("exerciseInstanceId") or not item.get("exerciseId")):
        return False
    checks = {
        "LOAD": lambda: number(item.get("load")) and item.get("loadUnit") in {"lb", "kg"},
        "REPS": lambda: number(item.get("reps")),
        "TIME": lambda: number(item.get("durationMs")),
        "DISTANCE": lambda: number(item.get("distance")) and bool(item.get("distanceUnit")),
        "CALORIES": lambda: number(item.get("calories")),
        "COMPLETION": lambda: isinstance(item.get("completed"), bool),
        "ROUNDS": lambda: number(item.get("rounds")),
        "ROUNDS_REPS": lambda: number(item.get("rounds")) and number(item.get("extraReps")),
        "LOAD_REPS_BY_SET": lambda: isinstance(item.get("sets"), list) and bool(item["sets"]) and all(number(x.get("set"), 1) and number(x.get("load")) and number(x.get("reps")) for x in item["sets"]) and item.get("loadUnit") in {"lb", "kg"},
        "DISTANCE_TIME": lambda: number(item.get("distance")) and bool(item.get("distanceUnit")) and number(item.get("completionTimeMs")),
        "DURATION_DISTANCE": lambda: number(item.get("durationMs")) and number(item.get("distance")) and bool(item.get("distanceUnit")),
    }
    return checks[score]()


def validate_results(results):
    return isinstance(results, list) and len(results) <= 200 and all(validate_result(x) for x in results)
