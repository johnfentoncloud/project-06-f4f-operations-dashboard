(function () {
  "use strict";
  const PREVIEW_KEY = "f4f-dashboard-preview-session";

  function isConfiguredForCognito() {
    const config = window.F4F_CONFIG;
    return config.authMode === "cognito" && Boolean(config.cognito.userPoolId && config.cognito.clientId);
  }

  function isAuthenticated() {
    if (isConfiguredForCognito()) {
      return false;
    }
    return window.sessionStorage.getItem(PREVIEW_KEY) === "active";
  }

  function enterLocalPreview() {
    if (window.F4F_CONFIG.authMode !== "local-preview") {
      throw new Error("Local preview authentication is disabled.");
    }
    window.sessionStorage.setItem(PREVIEW_KEY, "active");
  }

  function logout() {
    window.sessionStorage.removeItem(PREVIEW_KEY);
  }

  window.F4F_AUTH = Object.freeze({ isAuthenticated, enterLocalPreview, logout, isConfiguredForCognito });
})();
