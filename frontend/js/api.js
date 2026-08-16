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
    if (!response.ok) throw new Error(`Dashboard API returned HTTP ${response.status}.`);
    return response.json();
  }

  window.F4F_API = Object.freeze({ health: () => request("/health"), listLeads: cursor => request(`/leads${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`) });
})();
