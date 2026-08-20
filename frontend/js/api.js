(function () {
  "use strict";

  async function request(path, options = {}) {
    const baseUrl = window.F4F_CONFIG.apiBaseUrl;
    if (!baseUrl) throw new Error("The production API is not configured.");
    const token = await window.F4F_AUTH.getAccessToken();
    if (!token || token === "local-preview") {
      const error = new Error("Your dashboard session has expired.");
      error.name = "AuthenticationExpiredError";
      throw error;
    }
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
      credentials: "omit"
    });
    if (response.status === 401 || response.status === 403) {
      window.F4F_AUTH.expireSession();
      const error = new Error("Your dashboard session has expired or lacks OwnerAdmin access.");
      error.name = "AuthenticationExpiredError";
      throw error;
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const error = new Error(payload.message || `Dashboard API returned HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  const json = (method, payload, idempotencyKey) => ({ method, headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, body: JSON.stringify(payload) });
  window.F4F_API = Object.freeze({
    health: () => request("/health"),
    listLeads: cursor => request(`/leads${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    listExercises: cursor => request(`/exercises${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    getExercise: exerciseId => request(`/exercises/${encodeURIComponent(exerciseId)}`),
    listWorkoutTemplates: cursor => request(`/workout-templates${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    getWorkoutTemplate: (templateId, version) => request(`/workout-templates/${encodeURIComponent(templateId)}${version ? `/versions/${encodeURIComponent(version)}` : ""}`),
    createWorkoutTemplate: (payload, key) => request("/workout-templates", json("POST", { ...payload, idempotencyKey: key }, key)),
    updateWorkoutTemplate: (templateId, payload, key) => request(`/workout-templates/${encodeURIComponent(templateId)}`, json("PUT", { ...payload, idempotencyKey: key }, key))
  });
})();
