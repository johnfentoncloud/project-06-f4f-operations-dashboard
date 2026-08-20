import importlib.util
import json
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]
READ = ROOT / "lambda" / "training_read"
WRITE = ROOT / "lambda" / "training_write"


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


sys.path.insert(0, str(WRITE))
validation = load("training_validation", WRITE / "validation.py")
authz = load("training_authz", WRITE / "authz.py")


def owner(path="/exercises", params=None, method="GET"):
    return {"requestContext": {"authorizer": {"jwt": {"claims": {"sub": "owner-1", "cognito:groups": "[OwnerAdmin]"}}}, "http": {"path": path, "method": method}}, "pathParameters": params or {}}


class TrainingContentTests(unittest.TestCase):
    def test_client_error_logging_is_operational_and_sanitized(self):
        class DiagnosticClientError(Exception):
            def __init__(self):
                self.response = {
                    "Error": {"Code": "TransactionCanceledException", "Message": "Transaction cancelled"},
                    "ResponseMetadata": {"HTTPStatusCode": 400, "RequestId": "aws-request-123"},
                    "CancellationReasons": [
                        {"Code": "None", "Item": {"PK": {"S": "PRIVATE-PAYLOAD"}}},
                        {"Code": "ConditionalCheckFailed", "Message": "Condition did not match", "Item": {"token": {"S": "SECRET-TOKEN"}}},
                    ],
                    "RequestPayload": {"name": "PRIVATE-WORKOUT-NAME"},
                    "Authorization": "BEARER-SECRET",
                }

        fake_boto3 = types.ModuleType("boto3")
        fake_boto3.resource = lambda service: Mock(Table=lambda name: Mock())
        fake_boto3.client = lambda service: Mock()
        dynamodb_types = types.ModuleType("boto3.dynamodb.types")
        dynamodb_types.TypeSerializer = lambda: Mock(serialize=lambda value: value)
        sys.modules["boto3"] = fake_boto3
        sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
        sys.modules["boto3.dynamodb.types"] = dynamodb_types
        exceptions = types.ModuleType("botocore.exceptions")
        exceptions.ClientError = DiagnosticClientError
        sys.modules["botocore"] = types.ModuleType("botocore")
        sys.modules["botocore.exceptions"] = exceptions
        sys.modules["authz"] = authz
        sys.modules["validation"] = validation
        writer = load("training_writer_diagnostic_test", WRITE / "lambda_function.py")
        writer.LOGGER = Mock()
        writer.log_client_error(DiagnosticClientError())
        template, encoded = writer.LOGGER.error.call_args.args
        rendered = template % encoded
        for expected in ["DiagnosticClientError", "TransactionCanceledException", "Transaction cancelled", "400", "aws-request-123", "ConditionalCheckFailed", "Condition did not match"]:
            self.assertIn(expected, rendered)
        for forbidden in ["Item", "PRIVATE-PAYLOAD", "SECRET-TOKEN", "PRIVATE-WORKOUT-NAME", "BEARER-SECRET", "Authorization", "RequestPayload"]:
            self.assertNotIn(forbidden, rendered)

    def test_all_lambda_archives_exclude_python_bytecode(self):
        terraform = (ROOT.parent / "terraform" / "main.tf").read_text(encoding="utf-8")
        self.assertEqual(terraform.count("excludes    = local.lambda_archive_excludes"), 4)
        for pattern in ["__pycache__/**", "**/__pycache__/**", "*.pyc", "**/*.pyc", "*.pyo", "**/*.pyo"]:
            self.assertIn(f'"{pattern}"', terraform)

    def test_seed_is_idempotent_and_reports_conflicts(self):
        class ConditionalError(Exception):
            def __init__(self): self.response = {"Error": {"Code": "ConditionalCheckFailedException"}}
        fake_boto3 = types.ModuleType("boto3"); fake_boto3.Session = Mock()
        exceptions = types.ModuleType("botocore.exceptions"); exceptions.ClientError = ConditionalError
        sys.modules["boto3"] = fake_boto3; sys.modules["botocore"] = types.ModuleType("botocore"); sys.modules["botocore.exceptions"] = exceptions
        seeder = load("training_seed_test", ROOT.parent / "scripts" / "seed-training-content.py")
        record = {"exerciseId": "f4f-001", "name": "Jump", "category": "Power", "movementPattern": "Jump", "equipment": "None", "measurementType": "reps", "defaultUnit": "reps", "instructions": "Original", "tags": ["power"], "active": True, "customExercise": False}
        table = Mock(); table.put_item.side_effect = ConditionalError(); table.get_item.return_value = {"Item": seeder.item_for(record)}
        self.assertEqual(seeder.seed(table, [record]), {"inserted": 0, "skipped": 1, "conflicting": 0})
        table.get_item.return_value = {"Item": {**seeder.item_for(record), "name": "Coach edit"}}
        self.assertEqual(seeder.seed(table, [record])["conflicting"], 1)

    def test_owneradmin_only(self):
        self.assertEqual(authz.owner_subject(owner()), "owner-1")
        event = owner(); event["requestContext"]["authorizer"]["jwt"]["claims"]["cognito:groups"] = "[Coach]"
        self.assertIsNone(authz.owner_subject(event))

    def test_valid_and_invalid_prescriptions(self):
        good = {"name": "Power", "exercises": [{"exerciseId": "f4f-001", "exerciseName": "Jump", "section": "Power", "prescription": {"sets": 3, "reps": 4, "rpe": 7}}]}
        self.assertEqual(validation.validate_template(good), [])
        bad = json.loads(json.dumps(good)); bad["exercises"][0]["prescription"]["rpe"] = 11
        self.assertTrue(validation.validate_template(bad))

    def test_immutable_snapshot_keeps_complete_prescription(self):
        fake_boto3 = types.ModuleType("boto3")
        fake_boto3.resource = lambda service: Mock(Table=lambda name: Mock())
        fake_boto3.client = lambda service: Mock()
        dynamodb_types = types.ModuleType("boto3.dynamodb.types")
        dynamodb_types.TypeSerializer = lambda: Mock(serialize=lambda value: value)
        sys.modules["boto3"] = fake_boto3
        sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
        sys.modules["boto3.dynamodb.types"] = dynamodb_types
        botocore = types.ModuleType("botocore.exceptions")
        botocore.ClientError = type("ClientError", (Exception,), {})
        sys.modules["botocore"] = types.ModuleType("botocore")
        sys.modules["botocore.exceptions"] = botocore
        sys.modules["authz"] = authz
        sys.modules["validation"] = validation
        writer = load("training_writer_test", WRITE / "lambda_function.py")
        payload = {"name": "Power", "description": "Test", "exercises": [{"exerciseId": "f4f-001", "exerciseName": "Jump", "section": "Power", "prescription": {"sets": "3", "reps": "4", "coachInstruction": "Land quietly"}}]}
        first = writer.version_snapshot(payload, "id-1", 1, "owner-1", "now")
        second = writer.version_snapshot(payload, "id-1", 2, "owner-1", "later")
        self.assertEqual(first["SK"], "VERSION#000001")
        self.assertEqual(second["SK"], "VERSION#000002")
        self.assertEqual(first["exercises"][0]["prescription"]["coachInstruction"], "Land quietly")

    def test_exercise_list_get_and_missing(self):
        fake_boto3 = types.ModuleType("boto3")
        fake_boto3.resource = lambda service: Mock(Table=lambda name: Mock())
        conditions = types.ModuleType("boto3.dynamodb.conditions")
        conditions.Key = lambda name: Mock(eq=lambda value: (name, value))
        sys.modules["boto3"] = fake_boto3
        sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
        sys.modules["boto3.dynamodb.conditions"] = conditions
        sys.modules["authz"] = authz
        reader = load("training_reader_test", READ / "lambda_function.py")
        table = Mock()
        table.query.return_value = {"Items": [{"PK": "EXERCISE#one", "SK": "METADATA", "exerciseId": "one", "active": True}]}
        table.get_item.side_effect = [{"Item": {"PK": "EXERCISE#one", "SK": "METADATA", "exerciseId": "one"}}, {}]
        reader.TABLE = table
        listed = reader.lambda_handler(owner("/exercises"), None)
        found = reader.lambda_handler(owner("/exercises/one", {"exerciseId": "one"}), None)
        missing = reader.lambda_handler(owner("/exercises/missing", {"exerciseId": "missing"}), None)
        self.assertEqual(listed["statusCode"], 200)
        self.assertEqual(found["statusCode"], 200)
        self.assertEqual(missing["statusCode"], 404)

    def test_current_and_historical_template_reads(self):
        fake_boto3 = types.ModuleType("boto3")
        fake_boto3.resource = lambda service: Mock(Table=lambda name: Mock())
        conditions = types.ModuleType("boto3.dynamodb.conditions")
        conditions.Key = lambda name: Mock(eq=lambda value: (name, value))
        sys.modules["boto3"] = fake_boto3
        sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
        sys.modules["boto3.dynamodb.conditions"] = conditions
        sys.modules["authz"] = authz
        reader = load("training_template_reader_test", READ / "lambda_function.py")
        table = Mock()
        table.get_item.side_effect = [
            {"Item": {"PK": "TEMPLATE#one", "SK": "METADATA", "currentVersion": 2}},
            {"Item": {"PK": "TEMPLATE#one", "SK": "VERSION#000002", "templateId": "one", "version": 2}},
            {"Item": {"PK": "TEMPLATE#one", "SK": "VERSION#000001", "templateId": "one", "version": 1}},
            {},
        ]
        reader.TABLE = table
        current = reader.lambda_handler(owner("/workout-templates/one", {"templateId": "one"}), None)
        historical = reader.lambda_handler(owner("/workout-templates/one/versions/1", {"templateId": "one", "version": "1"}), None)
        missing = reader.lambda_handler(owner("/workout-templates/one/versions/9", {"templateId": "one", "version": "9"}), None)
        self.assertEqual(json.loads(current["body"])["item"]["version"], 2)
        self.assertEqual(json.loads(historical["body"])["item"]["version"], 1)
        self.assertEqual(missing["statusCode"], 404)

    def test_write_create_retry_versioning_and_conflicts(self):
        class FakeClientError(Exception):
            def __init__(self, code="TransactionCanceledException"):
                self.response = {"Error": {"Code": code}}

        def serialize(value):
            if isinstance(value, bool): return {"BOOL": value}
            if value is None: return {"NULL": True}
            if isinstance(value, str): return {"S": value}
            if isinstance(value, (int, float)): return {"N": str(value)}
            if isinstance(value, list): return {"L": [serialize(item) for item in value]}
            if isinstance(value, dict): return {"M": {key: serialize(item) for key, item in value.items()}}
            raise TypeError(value)

        def deserialize(value):
            if "S" in value: return value["S"]
            if "N" in value: return int(value["N"]) if value["N"].isdigit() else float(value["N"])
            if "BOOL" in value: return value["BOOL"]
            if "NULL" in value: return None
            if "L" in value: return [deserialize(item) for item in value["L"]]
            if "M" in value: return {key: deserialize(item) for key, item in value["M"].items()}
            raise TypeError(value)

        def deserialize_item(value):
            return {key: deserialize(item) for key, item in value.items()}

        class FakeTable:
            def __init__(self): self.items = {}
            def get_item(self, Key, **kwargs):
                item = self.items.get((Key["PK"], Key["SK"]))
                return {"Item": json.loads(json.dumps(item))} if item else {}

        class FakeClient:
            def __init__(self, table): self.table = table; self.calls = []
            def transact_write_items(self, TransactItems):
                self.calls.append(TransactItems)
                first = TransactItems[0]
                idem = deserialize_item(TransactItems[2]["Put"]["Item"])
                idem_key = (idem["PK"], idem["SK"])
                if idem_key in self.table.items: raise FakeClientError()
                if "Put" in first:
                    metadata_raw = first["Put"]["Item"]
                    self.assert_string_keys(metadata_raw)
                    metadata = deserialize_item(metadata_raw)
                    key = (metadata["PK"], metadata["SK"])
                    if key in self.table.items: raise FakeClientError()
                    self.table.items[key] = metadata
                else:
                    key_doc = deserialize_item(first["Update"]["Key"])
                    key = (key_doc["PK"], key_doc["SK"])
                    values = deserialize({"M": first["Update"]["ExpressionAttributeValues"]})
                    metadata = self.table.items.get(key)
                    if not metadata or metadata["currentVersion"] != values[":expected"]: raise FakeClientError()
                    metadata.update({"name": values[":name"], "description": values[":description"], "currentVersion": values[":next"], "updatedAt": values[":updated"], "updatedBy": values[":subject"], "GSI1SK": values[":gsi"]})
                for operation in TransactItems[1:]:
                    doc = deserialize_item(operation["Put"]["Item"])
                    key = (doc["PK"], doc["SK"])
                    if key in self.table.items: raise FakeClientError()
                    self.table.items[key] = doc
            @staticmethod
            def assert_string_keys(raw):
                if set(raw["PK"]) != {"S"} or set(raw["SK"]) != {"S"}: raise AssertionError("DynamoDB keys must be low-level String attributes")

        fake_boto3 = types.ModuleType("boto3")
        fake_boto3.resource = lambda service: Mock(Table=lambda name: Mock())
        fake_boto3.client = lambda service: Mock()
        dynamodb_types = types.ModuleType("boto3.dynamodb.types")
        dynamodb_types.TypeSerializer = lambda: Mock(serialize=serialize)
        sys.modules["boto3"] = fake_boto3
        sys.modules["boto3.dynamodb"] = types.ModuleType("boto3.dynamodb")
        sys.modules["boto3.dynamodb.types"] = dynamodb_types
        exceptions = types.ModuleType("botocore.exceptions")
        exceptions.ClientError = FakeClientError
        sys.modules["botocore"] = types.ModuleType("botocore")
        sys.modules["botocore.exceptions"] = exceptions
        sys.modules["authz"] = authz
        sys.modules["validation"] = validation
        writer = load("training_writer_create_test", WRITE / "lambda_function.py")
        table = FakeTable(); client = FakeClient(table)
        writer.TABLE = table; writer.CLIENT = client
        payload = {"name": "Power", "description": "Version one", "idempotencyKey": "abcdefgh", "exercises": [{"exerciseId": "f4f-001", "exerciseName": "Jump", "section": "Power", "prescription": {"sets": 3, "reps": 4}}]}
        event = owner("/workout-templates", method="POST"); event["body"] = json.dumps(payload)
        response = writer.lambda_handler(event, None)
        self.assertEqual(response["statusCode"], 201)
        created = json.loads(response["body"]); template_id = created["templateId"]
        self.assertEqual(len(client.calls[0]), 3)
        self.assertEqual(table.items[(f"TEMPLATE#{template_id}", "METADATA")]["currentVersion"], 1)
        version_one = json.loads(json.dumps(table.items[(f"TEMPLATE#{template_id}", "VERSION#000001")]))
        replay = writer.lambda_handler(event, None)
        self.assertEqual(replay["statusCode"], 200)
        self.assertTrue(json.loads(replay["body"])["idempotentReplay"])
        self.assertNotIn((f"TEMPLATE#{template_id}", "VERSION#000002"), table.items)
        conflicting = json.loads(json.dumps(payload)); conflicting["name"] = "Different"
        event["body"] = json.dumps(conflicting)
        self.assertEqual(writer.lambda_handler(event, None)["statusCode"], 409)
        updated = json.loads(json.dumps(payload)); updated.update({"description": "Version two", "idempotencyKey": "ijklmnop", "expectedCurrentVersion": 1})
        update_event = owner(f"/workout-templates/{template_id}", {"templateId": template_id}, "PUT"); update_event["body"] = json.dumps(updated)
        update_response = writer.lambda_handler(update_event, None)
        self.assertEqual(update_response["statusCode"], 200)
        self.assertEqual(json.loads(update_response["body"])["version"], 2)
        self.assertEqual(table.items[(f"TEMPLATE#{template_id}", "METADATA")]["currentVersion"], 2)
        self.assertEqual(table.items[(f"TEMPLATE#{template_id}", "VERSION#000001")], version_one)
        self.assertEqual(table.items[(f"TEMPLATE#{template_id}", "VERSION#000002")]["description"], "Version two")
        stale = json.loads(json.dumps(updated)); stale["idempotencyKey"] = "qrstuvwx"
        stale_event = owner(f"/workout-templates/{template_id}", {"templateId": template_id}, "PUT"); stale_event["body"] = json.dumps(stale)
        self.assertEqual(writer.lambda_handler(stale_event, None)["statusCode"], 409)
        denied = owner("/workout-templates", method="POST"); denied["requestContext"]["authorizer"]["jwt"]["claims"]["cognito:groups"] = "[Coach]"; denied["body"] = json.dumps(payload)
        self.assertEqual(writer.lambda_handler(denied, None)["statusCode"], 403)


if __name__ == "__main__":
    unittest.main()
