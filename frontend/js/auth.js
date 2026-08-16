(function () {
  "use strict";
  const KEYS = Object.freeze({
    preview: "f4f-dashboard-preview-session",
    previewRole: "f4f-dashboard-preview-role",
    accessToken: "f4f-dashboard-access-token",
    idToken: "f4f-dashboard-id-token",
    refreshToken: "f4f-dashboard-refresh-token",
    expiresAt: "f4f-dashboard-expires-at",
    verifier: "f4f-dashboard-pkce-verifier",
    state: "f4f-dashboard-oauth-state"
  });

  function isLocalHost() {
    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
  }

  function isLocalPreviewAllowed() {
    return isLocalHost() && window.F4F_CONFIG.authMode === "local-preview";
  }

  function isConfiguredForCognito() {
    const config = window.F4F_CONFIG;
    return config.authMode === "cognito" && Boolean(config.cognito.clientId && config.cognito.domain && config.cognito.redirectUri);
  }

  function clearSession() {
    [KEYS.accessToken, KEYS.idToken, KEYS.refreshToken, KEYS.expiresAt, KEYS.verifier, KEYS.state].forEach(key => window.sessionStorage.removeItem(key));
  }

  function tokenIsCurrent() {
    const expiresAt = Number(window.sessionStorage.getItem(KEYS.expiresAt) || 0);
    return Boolean(window.sessionStorage.getItem(KEYS.accessToken)) && expiresAt > Date.now() + 30000;
  }

  function randomValue(bytes = 32) {
    const values = new Uint8Array(bytes);
    window.crypto.getRandomValues(values);
    return Array.from(values, value => value.toString(16).padStart(2, "0")).join("");
  }

  function base64Url(bytes) {
    let binary = "";
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function challengeFor(verifier) {
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return base64Url(new Uint8Array(digest));
  }

  function tokenEndpoint() {
    return `${window.F4F_CONFIG.cognito.domain.replace(/\/$/, "")}/oauth2/token`;
  }

  async function exchange(parameters) {
    const response = await window.fetch(tokenEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parameters)
    });
    if (!response.ok) throw new Error("Cognito token exchange failed.");
    const payload = await response.json();
    if (!payload.access_token || !payload.expires_in) throw new Error("Cognito returned an incomplete token response.");
    window.sessionStorage.setItem(KEYS.accessToken, payload.access_token);
    if (payload.id_token) window.sessionStorage.setItem(KEYS.idToken, payload.id_token);
    if (payload.refresh_token) window.sessionStorage.setItem(KEYS.refreshToken, payload.refresh_token);
    window.sessionStorage.setItem(KEYS.expiresAt, String(Date.now() + Number(payload.expires_in) * 1000));
  }

  async function handleCallback() {
    if (!isConfiguredForCognito()) return;
    const query = new URLSearchParams(window.location.search);
    const code = query.get("code");
    const returnedState = query.get("state");
    if (!code) return;
    const expectedState = window.sessionStorage.getItem(KEYS.state);
    const verifier = window.sessionStorage.getItem(KEYS.verifier);
    if (!expectedState || returnedState !== expectedState || !verifier) {
      clearSession();
      throw new Error("The authentication response could not be verified.");
    }
    await exchange({ grant_type: "authorization_code", client_id: window.F4F_CONFIG.cognito.clientId, code, redirect_uri: window.F4F_CONFIG.cognito.redirectUri, code_verifier: verifier });
    window.sessionStorage.removeItem(KEYS.verifier);
    window.sessionStorage.removeItem(KEYS.state);
    window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
  }

  async function refresh() {
    const refreshToken = window.sessionStorage.getItem(KEYS.refreshToken);
    if (!refreshToken || !isConfiguredForCognito()) return false;
    try {
      await exchange({ grant_type: "refresh_token", client_id: window.F4F_CONFIG.cognito.clientId, refresh_token: refreshToken });
      return tokenIsCurrent();
    } catch (error) {
      clearSession();
      return false;
    }
  }

  async function initialize() {
    await handleCallback();
    if (!tokenIsCurrent() && window.sessionStorage.getItem(KEYS.refreshToken)) await refresh();
  }

  function isAuthenticated() {
    if (isLocalPreviewAllowed()) return window.sessionStorage.getItem(KEYS.preview) === "active";
    return isConfiguredForCognito() && tokenIsCurrent();
  }

  function getExperience() {
    if (!isLocalPreviewAllowed()) return "coach";
    return window.sessionStorage.getItem(KEYS.previewRole) === "athlete" ? "athlete" : "coach";
  }

  function setLocalExperience(role) {
    if (!isLocalPreviewAllowed() || !["coach", "athlete"].includes(role)) return false;
    window.sessionStorage.setItem(KEYS.previewRole, role);
    return true;
  }

  async function login(role = "coach") {
    if (isLocalPreviewAllowed()) {
      window.sessionStorage.setItem(KEYS.preview, "active");
      setLocalExperience(role);
      return "local";
    }
    if (!isConfiguredForCognito()) throw new Error("Production authentication is not configured.");
    const verifier = randomValue(48);
    const state = randomValue(24);
    window.sessionStorage.setItem(KEYS.verifier, verifier);
    window.sessionStorage.setItem(KEYS.state, state);
    const challenge = await challengeFor(verifier);
    const query = new URLSearchParams({ client_id: window.F4F_CONFIG.cognito.clientId, response_type: "code", scope: "openid email", redirect_uri: window.F4F_CONFIG.cognito.redirectUri, state, code_challenge: challenge, code_challenge_method: "S256" });
    window.location.assign(`${window.F4F_CONFIG.cognito.domain.replace(/\/$/, "")}/oauth2/authorize?${query}`);
    return "redirect";
  }

  async function getAccessToken() {
    if (isLocalPreviewAllowed()) return "local-preview";
    if (!tokenIsCurrent() && !(await refresh())) return null;
    return window.sessionStorage.getItem(KEYS.accessToken);
  }

  function expireSession() {
    clearSession();
  }

  function logout() {
    window.sessionStorage.removeItem(KEYS.preview);
    window.sessionStorage.removeItem(KEYS.previewRole);
    clearSession();
    if (isConfiguredForCognito()) {
      const query = new URLSearchParams({ client_id: window.F4F_CONFIG.cognito.clientId, logout_uri: window.F4F_CONFIG.cognito.logoutUri });
      window.location.assign(`${window.F4F_CONFIG.cognito.domain.replace(/\/$/, "")}/logout?${query}`);
    }
  }

  window.F4F_AUTH = Object.freeze({ initialize, isAuthenticated, login, logout, getAccessToken, expireSession, isConfiguredForCognito, isLocalPreviewAllowed, getExperience, setLocalExperience });
})();
