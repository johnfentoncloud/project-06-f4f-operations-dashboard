(function () {
  "use strict";

  function leadsFromPayload(payload) {
    return payload && Array.isArray(payload.items) ? payload.items : [];
  }

  const LABELS = Object.freeze({
    source: Object.freeze({ old_line_lobby: "Old Line Lobby", old_line_team_flyer: "Old Line Team Flyer", rise_lobby: "Rise Lobby", rise_small_group_flyer: "Rise Small Group Flyer", coffee_shop: "Coffee Shop", lacrosse_event: "Lacrosse Event", instagram: "Instagram", facebook: "Facebook" }),
    location: Object.freeze({ old_line: "Old Line CrossFit", rise: "Rise Fitness & Kickboxing", community: "Community", event: "Event", online: "Online" }),
    program: Object.freeze({ team_training: "Team Training", small_group_athlete_development: "Small Group Athlete Development", athlete_development: "Athlete Development", individual_training: "Individual Training", not_sure: "Not Sure Yet" })
  });

  function friendlyLabel(kind, value) {
    return LABELS[kind]?.[value] || (kind === "source" ? "Direct / Unknown" : "Not specified");
  }

  function filterLeads(leads, filters = {}) {
    const safe = Array.isArray(leads) ? leads : [];
    return safe.filter(lead => Object.entries(filters).every(([field, value]) => !value || value === "all" || (field === "leadType" ? (value === "training" ? lead.submissionType === "lead" : lead.submissionType === value) : (lead[field] || "unknown") === value)));
  }

  function summarize(leads) {
    const safe = Array.isArray(leads) ? leads : [];
    const sourceCounts = new Map();
    safe.forEach(lead => sourceCounts.set(lead.source || "unknown", (sourceCounts.get(lead.source || "unknown") || 0) + 1));
    return {
      newLeadCount: safe.filter(lead => (lead.status || "New") === "New").length,
      recent: [...safe].sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))).slice(0, 5),
      leadsBySource: [...sourceCounts].map(([source, count]) => ({ source, label: friendlyLabel("source", source === "unknown" ? "" : source), count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    };
  }

  function resultState({ loading = false, authenticated = true, error = null, count = 0 } = {}) {
    if (!authenticated) return "auth-expired";
    if (loading) return "loading";
    if (error) return "error";
    return count > 0 ? "ready" : "empty";
  }

  window.F4F_APP_STATE = Object.freeze({ leadsFromPayload, summarize, resultState, friendlyLabel, filterLeads, labels: LABELS });
})();
