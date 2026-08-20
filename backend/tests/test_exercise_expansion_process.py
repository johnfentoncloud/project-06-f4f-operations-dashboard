"""Tests for dry-run-first Exercise Expansion 1 data operations."""
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

fake_boto3 = types.ModuleType("boto3")
fake_boto3.Session = object
fake_exceptions = types.ModuleType("botocore.exceptions")
fake_exceptions.ClientError = type("ClientError", (Exception,), {})
sys.modules.setdefault("boto3", fake_boto3)
sys.modules.setdefault("botocore", types.ModuleType("botocore"))
sys.modules.setdefault("botocore.exceptions", fake_exceptions)


def load_script(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


backfill_module = load_script("alias_backfill", "backfill-exercise-aliases.py")
seed_module = load_script("expansion_seed", "seed-approved-exercise-expansion.py")


class FakeTable:
    def __init__(self, items=None):
        self.items = items or {}
        self.updates = []
        self.puts = []

    def get_item(self, Key, ConsistentRead=False):
        return {"Item": self.items.get((Key["PK"], Key["SK"]))} if (Key["PK"], Key["SK"]) in self.items else {}

    def update_item(self, **kwargs):
        self.updates.append(kwargs)
        values = kwargs["ExpressionAttributeValues"]
        self.items[(kwargs["Key"]["PK"], kwargs["Key"]["SK"])]["aliases"] = values[":aliases"]

    def put_item(self, Item, ConditionExpression):
        self.puts.append((Item, ConditionExpression))
        self.items[(Item["PK"], Item["SK"])] = Item


class ExerciseExpansionProcessTests(unittest.TestCase):
    def test_alias_backfill_is_exact_id_dry_run_and_idempotent(self):
        record = {"exerciseId": "f4f-001-push-up", "expectedName": "Push-Up", "aliases": ["Push Ups", "Pushup"]}
        key = ("EXERCISE#f4f-001-push-up", "METADATA")
        table = FakeTable({key: {"exerciseId": record["exerciseId"], "name": "Push-Up"}})
        result = backfill_module.backfill(table, [record])
        self.assertEqual(result, {"updated": 0, "would_update": 1, "skipped": 0, "conflicting": 0, "missing": 0, "invalid": 0, "issues": []})
        self.assertEqual(table.updates, [])
        applied = backfill_module.backfill(table, [record], apply=True)
        self.assertEqual(applied["updated"], 1)
        self.assertIn("exerciseId = :exercise_id", table.updates[0]["ConditionExpression"])
        self.assertEqual(backfill_module.backfill(table, [record], apply=True)["skipped"], 1)

    def test_alias_backfill_reports_missing_and_invalid_separately(self):
        table = FakeTable()
        missing = {"exerciseId": "f4f-001-push-up", "expectedName": "Push-Up", "aliases": ["Push Ups"]}
        result = backfill_module.backfill(table, [missing, {"exerciseId": "", "expectedName": "", "aliases": []}])
        self.assertEqual(result["missing"], 1)
        self.assertEqual(result["invalid"], 1)
        self.assertEqual(result["conflicting"], 0)

    def test_alias_backfill_never_overwrites_conflicting_metadata(self):
        record = {"exerciseId": "f4f-001-push-up", "expectedName": "Push-Up", "aliases": ["Push Ups"]}
        key = ("EXERCISE#f4f-001-push-up", "METADATA")
        table = FakeTable({key: {"exerciseId": record["exerciseId"], "name": "Push-Up", "aliases": ["Coach Custom Alias"]}})
        self.assertEqual(backfill_module.backfill(table, [record], apply=True)["conflicting"], 1)
        self.assertEqual(table.updates, [])

    def test_expansion_seed_is_additive_dry_run_conflict_aware_and_idempotent(self):
        record = {"exerciseId": "f4f-exp1-leg-press", "name": "Leg Press", "category": "Strength", "movementPattern": "Squat", "equipment": "Machine", "measurementType": "weight_reps", "defaultUnit": "lb", "instructions": "Original F4F instruction.", "tags": ["strength"], "aliases": [], "active": True, "customExercise": False}
        table = FakeTable()
        self.assertEqual(seed_module.seed(table, [record])["would_insert"], 1)
        self.assertEqual(table.puts, [])
        self.assertEqual(seed_module.seed(table, [record], apply=True)["inserted"], 1)
        self.assertEqual(table.puts[0][1], "attribute_not_exists(PK)")
        self.assertEqual(seed_module.seed(table, [record], apply=True)["skipped"], 1)
        table.items[("EXERCISE#f4f-exp1-leg-press", "METADATA")]["name"] = "Conflicting Name"
        self.assertEqual(seed_module.seed(table, [record], apply=True)["conflicting"], 1)

    def test_expansion_seed_reports_invalid_records(self):
        result = seed_module.seed(FakeTable(), [{"exerciseId": "bad"}])
        self.assertEqual(result["invalid"], 1)
        self.assertEqual(result["would_insert"], 0)


if __name__ == "__main__":
    unittest.main()
