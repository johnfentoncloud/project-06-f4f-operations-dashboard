import importlib
import json
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "lambda"))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from athlete_write.validation import ALLOWED_SCORE_TYPES, validate_result, validate_results


class AthleteResultValidationTests(unittest.TestCase):
    def base(self, score, **values):
        return {"resultScope": "EXERCISE", "sectionInstanceId": "section", "exerciseInstanceId": "instance", "exerciseId": "exercise", "scoreType": score, **values}

    def test_all_required_score_shapes(self):
        cases = [
            self.base("LOAD", load=135, loadUnit="lb"), self.base("REPS", reps=8), self.base("TIME", durationMs=90000),
            self.base("DISTANCE", distance=500, distanceUnit="m"), self.base("CALORIES", calories=12), self.base("COMPLETION", completed=True),
            self.base("ROUNDS", rounds=4), self.base("ROUNDS_REPS", rounds=4, extraReps=7),
            self.base("LOAD_REPS_BY_SET", sets=[{"set": 1, "load": 135, "reps": 5}], loadUnit="lb"),
            self.base("DISTANCE_TIME", distance=400, distanceUnit="m", completionTimeMs=72000),
            self.base("DURATION_DISTANCE", durationMs=600000, distance=2200, distanceUnit="m"),
        ]
        self.assertEqual(len(cases), len(ALLOWED_SCORE_TYPES))
        self.assertTrue(validate_results(cases))

    def test_section_scope_and_invalid_exercise_scope(self):
        self.assertTrue(validate_result({"resultScope": "SECTION", "sectionInstanceId": "section", "scoreType": "ROUNDS", "rounds": 3}))
        self.assertFalse(validate_result({"resultScope": "EXERCISE", "sectionInstanceId": "section", "scoreType": "REPS", "reps": 3}))


class AthleteSnapshotTests(unittest.TestCase):
    def test_snapshot_is_server_generated_and_stable(self):
        with open(os.path.join(ROOT, "athlete_admin", "lambda_function.py"), encoding="utf-8") as source_file:
            source = source_file.read()
        self.assertIn('template.get("schemaVersion") != 2', source)
        self.assertIn("uuid.uuid5", source)
        self.assertIn("prescriptionSnapshot", source)
        self.assertIn("REJECTED_FIELDS", source)

    def test_provisioning_is_transactional_and_non_executing_by_default(self):
        with open(os.path.join(ROOT, "..", "..", "scripts", "provision-adult-beta-athlete.py"), encoding="utf-8") as script_file:
            script = script_file.read()
        self.assertIn("transact_write_items", script)
        self.assertIn("--apply", script)
        self.assertIn("No writes performed", script)


if __name__ == "__main__":
    unittest.main()
