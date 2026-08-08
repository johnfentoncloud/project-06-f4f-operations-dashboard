(function () {
  "use strict";
  const MOCK_LEADS = Object.freeze([
    Object.freeze({ name: "Sample Youth Parent", email: "parent@example.test", phone: "(555) 010-0101", leadType: "youth-athlete", submissionType: "lead", submittedAt: "2026-08-08T14:00:00Z", status: "New", followUpStatus: "Not started" }),
    Object.freeze({ name: "Sample Adult Client", email: "adult@example.test", phone: "(555) 010-0102", leadType: "adult-personal-training", submissionType: "lead", submittedAt: "2026-08-07T18:30:00Z", status: "Contacted", followUpStatus: "Awaiting reply" }),
    Object.freeze({ name: "Sample Local Business", email: "owner@example.test", phone: "", leadType: "business-website", submissionType: "website-service-inquiry", submittedAt: "2026-08-06T12:15:00Z", status: "New", followUpStatus: "Not started" })
  ]);
  window.F4F_DATA = Object.freeze({ mockLeads: MOCK_LEADS });
})();
