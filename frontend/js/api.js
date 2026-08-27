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
      const error = new Error("Your session has expired or does not have access to this resource.");
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
    updateWorkoutTemplate: (templateId, payload, key) => request(`/workout-templates/${encodeURIComponent(templateId)}`, json("PUT", { ...payload, idempotencyKey: key }, key)),
    athleteProfile: () => request("/me/profile"),
    athleteAssignments: cursor => request(`/me/assignments${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    athleteAssignment: (date, assignmentId) => request(`/me/assignments/${encodeURIComponent(date)}/${encodeURIComponent(assignmentId)}`),
    athleteSession: (date, sessionId) => request(`/me/sessions/${encodeURIComponent(date)}/${encodeURIComponent(sessionId)}`),
    startAthleteSession: (date, assignmentId) => request(`/me/assignments/${encodeURIComponent(date)}/${encodeURIComponent(assignmentId)}/start`, json("POST", {})),
    saveAthleteSession: (date, sessionId, payload) => request(`/me/sessions/${encodeURIComponent(date)}/${encodeURIComponent(sessionId)}`, json("PUT", payload)),
    completeAthleteSession: (date, sessionId, payload) => request(`/me/sessions/${encodeURIComponent(date)}/${encodeURIComponent(sessionId)}/complete`, json("POST", payload)),
    listAthleteProfiles: cursor => request(`/athletes${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
    athleteAdminProfile: athleteId => request(`/athletes/${encodeURIComponent(athleteId)}`),
    athleteAdminAssignments: athleteId => request(`/athletes/${encodeURIComponent(athleteId)}/assignments`),
    assignWorkout: (athleteId, payload) => request(`/athletes/${encodeURIComponent(athleteId)}/assignments`, json("POST", payload)),
    athleteResults: (athleteId, date, assignmentId) => request(`/athletes/${encodeURIComponent(athleteId)}/sessions/${encodeURIComponent(date)}/${encodeURIComponent(assignmentId)}`)
  });
})();
