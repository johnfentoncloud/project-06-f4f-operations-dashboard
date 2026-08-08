(function () {
  "use strict";

  async function request(path, options = {}) {
    const baseUrl = window.F4F_CONFIG.apiBaseUrl;
    if (!baseUrl) throw new Error("The production API is not configured.");
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { Accept: "application/json", ...(options.headers || {}) },
      credentials: "omit"
    });
    if (!response.ok) throw new Error(`Dashboard API returned HTTP ${response.status}.`);
    return response.json();
  }

  window.F4F_API = Object.freeze({ health: () => request("/health"), listLeads: () => request("/leads") });
})();
