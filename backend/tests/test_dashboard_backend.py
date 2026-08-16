import importlib.util
import json
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock


ROOT = Path(__file__).resolve().parents[1]
HEALTH_PATH = ROOT / "lambda" / "health" / "lambda_function.py"
LEADS_PATH = ROOT / "lambda" / "leads"
sys.path.insert(0, str(LEADS_PATH))
os.environ["LEADS_TABLE_NAME"] = "test-f4f-leads"

fake_boto3 = types.ModuleType("boto3")
fake_boto3.resource = lambda service: Mock(Table=lambda name: Mock())
sys.modules.setdefault("boto3", fake_boto3)


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


health = load_module("health_lambda", HEALTH_PATH)
leads = load_module("leads_lambda", LEADS_PATH / "lambda_function.py")
from lead_normalizer import normalize_lead


def owner_event(query=None):
    return {
        "requestContext": {
            "authorizer": {
                "jwt": {"claims": {"cognito:groups": "[OwnerAdmin]"}}
            }
        },
        "queryStringParameters": query,
    }


class DashboardBackendTests(unittest.TestCase):
    def test_unauthenticated_health_request_is_denied(self):
        response = health.lambda_handler({}, None)
        self.assertEqual(response["statusCode"], 403)

    def test_invalid_or_non_owner_claim_is_denied(self):
        event = {
            "requestContext": {
                "authorizer": {"jwt": {"claims": {"cognito:groups": "[Coach]"}}}
            }
        }
        self.assertEqual(health.lambda_handler(event, None)["statusCode"], 403)
        self.assertEqual(leads.lambda_handler(event, None)["statusCode"], 403)

    def test_authenticated_owner_health_endpoint(self):
        response = health.lambda_handler(owner_event(), None)
        self.assertEqual(response["statusCode"], 200)
        self.assertTrue(json.loads(response["body"])["ok"])

    def test_lead_normalization_allowlists_fields(self):
        result = normalize_lead({"leadId": "abc", "name": "Sample Person", "email": "sample@example.test", "phone": "555", "leadType": "youth-athlete", "submissionType": "lead", "submittedAt": "2026-08-08T12:00:00Z", "injuryHistory": "must not be returned", "athleteGoals": "private", "message": "private"})
        self.assertEqual(result["status"], "New")
        self.assertEqual(result["firstName"], "Sample")
        self.assertEqual(result["lastName"], "Person")
        self.assertNotIn("injuryHistory", result)
        self.assertNotIn("athleteGoals", result)
        self.assertNotIn("message", result)

    def test_invalid_lead_is_rejected(self):
        self.assertIsNone(normalize_lead(None))
        self.assertIsNone(normalize_lead({"leadId": "missing-email"}))
        self.assertIsNone(normalize_lead({"email": "missing-id@example.test"}))

    def test_invalid_status_falls_back_to_new(self):
        result = normalize_lead({"leadId": "abc", "email": "sample@example.test", "status": "Invented"})
        self.assertEqual(result["status"], "New")

    def test_leads_endpoint_skips_malformed_records(self):
        table = Mock()
        table.scan.return_value = {"Items": [{"leadId": "good", "email": "good@example.test"}, {"leadId": "bad"}]}
        original = leads.TABLE
        leads.TABLE = table
        try:
            response = leads.lambda_handler(owner_event(), None)
        finally:
            leads.TABLE = original
        payload = json.loads(response["body"])
        self.assertEqual(response["statusCode"], 200)
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual([call[0] for call in table.method_calls], ["scan"])

    def test_leads_endpoint_handles_storage_failure(self):
        table = Mock()
        table.scan.side_effect = RuntimeError("synthetic failure")
        original = leads.TABLE
        leads.TABLE = table
        try:
            response = leads.lambda_handler(owner_event(), None)
        finally:
            leads.TABLE = original
        self.assertEqual(response["statusCode"], 500)
        self.assertNotIn("synthetic", response["body"])


if __name__ == "__main__":
    unittest.main()
