(function () {
  "use strict";

  function leadsFromPayload(payload) {
    return payload && Array.isArray(payload.items) ? payload.items : [];
  }

  function summarize(leads) {
    const safe = Array.isArray(leads) ? leads : [];
    return {
      newLeadCount: safe.filter(lead => (lead.status || "New") === "New").length,
      recent: [...safe].sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || ""))).slice(0, 5)
    };
  }

  function resultState({ loading = false, authenticated = true, error = null, count = 0 } = {}) {
    if (!authenticated) return "auth-expired";
    if (loading) return "loading";
    if (error) return "error";
    return count > 0 ? "ready" : "empty";
  }

  window.F4F_APP_STATE = Object.freeze({ leadsFromPayload, summarize, resultState });
})();
