(function () {
  "use strict";
  const functionalRoutes = new Set(["dashboard", "leads"]);
  const labels = { dashboard: "Dashboard overview", leads: "Lead viewer", athletes: "Athletes", clients: "Clients", teams: "Teams", training: "Training", schedule: "Schedule", revenue: "Revenue", messages: "Messages", settings: "Settings" };
  if (window.F4F_WORKOUTS) {
    functionalRoutes.add("exercises");
    functionalRoutes.add("workout-builder");
    labels.exercises = "Exercise Library";
    labels["workout-builder"] = "Workout Builder";
    functionalRoutes.add("workout-templates");
    labels["workout-templates"] = "Workout Templates";
  }
  let leads = [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function formatDate(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
  }

  function displayName(lead) {
    return [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Name unavailable";
  }

  function selectedLeads(filter = "all") {
    return leads.filter(lead => filter === "all" || (filter === "training" ? lead.submissionType === "lead" : lead.submissionType === filter));
  }

  function renderLeads(filter = "all") {
    const filtered = selectedLeads(filter);
    const body = document.querySelector("#leads-table-body");
    body.innerHTML = filtered.map(lead => `<tr><td>${escapeHtml(displayName(lead))}</td><td>${escapeHtml(lead.email)}<small>${escapeHtml(lead.phone || "No phone provided")}</small></td><td>${escapeHtml(lead.leadType)}<small>${escapeHtml(lead.submissionType)}</small></td><td>${escapeHtml(formatDate(lead.submittedAt))}</td><td><span class="lead-status">${escapeHtml(lead.status || "New")}</span></td><td>${escapeHtml(lead.followUpStatus || "Not started")}</td></tr>`).join("");
    document.querySelector("#leads-empty").hidden = filtered.length > 0 || document.querySelector("#leads-state").dataset.state === "loading";
  }

  function renderOverview() {
    const summary = window.F4F_APP_STATE.summarize(leads);
    document.querySelector("#new-leads-value").textContent = String(summary.newLeadCount);
    document.querySelector("#new-leads-note").textContent = "Read-only production lead records";
    const recent = summary.recent;
    const container = document.querySelector("#recent-inquiries");
    if (!recent.length) {
      container.innerHTML = "<div class=\"empty-state\"><strong>No inquiries found</strong><p>New production submissions will appear here after they are stored.</p></div>";
      return;
    }
    container.innerHTML = `<ul class="inquiry-list">${recent.map(lead => `<li><div><strong>${escapeHtml(displayName(lead))}</strong><small>${escapeHtml(lead.leadType)}</small></div><time>${escapeHtml(formatDate(lead.submittedAt))}</time></li>`).join("")}</ul>`;
  }

  function setDataState(state, message) {
    const status = document.querySelector("#leads-state");
    status.dataset.state = state;
    status.textContent = message;
    status.hidden = !message;
  }

  async function loadLeadData() {
    setDataState("loading", "Loading authenticated lead data…");
    document.querySelector("#new-leads-note").textContent = "Loading authenticated lead data…";
    try {
      if (window.F4F_AUTH.isLocalPreviewAllowed()) {
        leads = [...window.F4F_DATA.mockLeads];
      } else {
        const payload = await window.F4F_API.listLeads();
        leads = window.F4F_APP_STATE.leadsFromPayload(payload);
      }
      setDataState(leads.length ? "ready" : "empty", "");
      renderLeads(document.querySelector("#lead-filter").value);
      renderOverview();
    } catch (error) {
      leads = [];
      renderLeads();
      renderOverview();
      if (error.name === "AuthenticationExpiredError") {
        setDataState("auth-expired", "Your session expired. Sign in again to view leads.");
        updateAuthGate("Your session expired. Sign in again.");
      } else {
        setDataState("error", "Lead data is temporarily unavailable. No production data was changed.");
      }
    }
  }

  function route() {
    if (window.F4F_AUTH.getExperience() === "athlete") return;
    const requested = window.location.hash.slice(1) || "dashboard";
    const routeName = labels[requested] ? requested : "dashboard";
    document.querySelectorAll("[data-view]").forEach(view => { view.hidden = true; });
    const view = functionalRoutes.has(routeName) ? document.querySelector(`#view-${routeName}`) : document.querySelector("#view-coming-soon");
    view.hidden = false;
    document.querySelector("#coming-soon-title").textContent = `${labels[routeName]} — coming soon`;
    document.querySelector("#page-context").textContent = labels[routeName];
    document.querySelectorAll("[data-route]").forEach(link => link.setAttribute("aria-current", link.dataset.route === routeName ? "page" : "false"));
    document.querySelector("#sidebar").classList.remove("open");
    document.querySelector("#menu-button").setAttribute("aria-expanded", "false");
  }

  function updateAuthGate(message = "") {
    const authenticated = window.F4F_AUTH.isAuthenticated();
    const localPreview = window.F4F_AUTH.isLocalPreviewAllowed();
    document.querySelector("#auth-gate").hidden = authenticated;
    document.querySelector("#auth-message").textContent = message || (localPreview ? "Choose a fictional localhost experience. This is not a production login." : "Sign in through the protected Fenton4Fitness identity service.");
    const localChoices = document.querySelector("#local-preview-choices");
    if (localChoices) localChoices.hidden = !localPreview;
    document.querySelector("#production-login").hidden = localPreview;
  }

  async function showExperience({ loadCoachData = true } = {}) {
    const authenticated = window.F4F_AUTH.isAuthenticated();
    const athlete = authenticated && window.F4F_AUTH.getExperience() === "athlete";
    const headerLogout = document.querySelector("#header-logout-button");
    if (headerLogout) headerLogout.hidden = !authenticated || athlete;
    document.querySelector("#coach-shell").hidden = athlete || !authenticated;
    const athleteShell = document.querySelector("#athlete-shell");
    if (athleteShell) athleteShell.hidden = !athlete;
    if (athlete) {
      if (!athleteShell || !window.F4F_ATHLETE) throw new Error("The Athlete preview is available only in the localhost development entry.");
      if (!window.location.hash.startsWith("#athlete-")) window.location.hash = "athlete-today";
      window.F4F_ATHLETE.route();
    } else if (authenticated) {
      if (window.location.hash.startsWith("#athlete-")) window.location.hash = "dashboard";
      route();
      if (loadCoachData) await loadLeadData();
    }
  }

  async function localLogin(role) {
    const result = await window.F4F_AUTH.login(role);
    if (result === "local") {
      updateAuthGate();
      await showExperience();
    }
  }

  function logout() {
    window.F4F_AUTH.logout();
    if (window.F4F_AUTH.isLocalPreviewAllowed()) window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    document.querySelector("#coach-shell").hidden = true;
    const athleteShell = document.querySelector("#athlete-shell");
    if (athleteShell) athleteShell.hidden = true;
    updateAuthGate();
  }

  document.addEventListener("DOMContentLoaded", async () => {
    let authenticationMessage = "";
    try {
      await window.F4F_AUTH.initialize();
    } catch (error) {
      window.F4F_AUTH.expireSession();
      authenticationMessage = "Authentication could not be completed. Please sign in again.";
    }
    if (window.F4F_AUTH.isLocalPreviewAllowed() && window.F4F_ATHLETE && window.F4F_DATA?.demoAthlete) {
      window.F4F_ATHLETE.initialize(window.F4F_DATA.demoAthlete);
    }
    updateAuthGate(authenticationMessage);
    renderLeads();
    await showExperience();
    window.addEventListener("hashchange", () => window.F4F_AUTH.getExperience() === "athlete" && window.F4F_ATHLETE ? window.F4F_ATHLETE.route() : route());
    document.querySelector("#lead-filter").addEventListener("change", event => renderLeads(event.target.value));
    document.querySelector("#menu-button").addEventListener("click", event => { const sidebar = document.querySelector("#sidebar"); const open = sidebar.classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
    document.querySelector("#preview-coach-login")?.addEventListener("click", () => localLogin("coach"));
    document.querySelector("#preview-athlete-login")?.addEventListener("click", () => localLogin("athlete"));
    document.querySelector("#production-login").addEventListener("click", () => window.F4F_AUTH.login());
    document.querySelector("#logout-button").addEventListener("click", logout);
    document.querySelector("#header-logout-button")?.addEventListener("click", logout);
    document.querySelector("#athlete-logout-button")?.addEventListener("click", logout);
    document.querySelectorAll("[data-switch-role]").forEach(button => button.addEventListener("click", async () => {
      if (!window.F4F_AUTH.setLocalExperience(button.dataset.switchRole)) return;
      await showExperience({ loadCoachData: button.dataset.switchRole === "coach" });
    }));
  });
})();
