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
  if (window.F4F_ATHLETE_ADMIN) functionalRoutes.add("athletes");
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

  function activeLeadFilters() {
    return { leadType: document.querySelector("#lead-filter")?.value || "all", source: document.querySelector("#source-filter")?.value || "all", location: document.querySelector("#location-filter")?.value || "all", program: document.querySelector("#program-filter")?.value || "all" };
  }

  function selectedLeads(filters = activeLeadFilters()) {
    return window.F4F_APP_STATE.filterLeads(leads, filters);
  }

  function renderLeads() {
    const filtered = selectedLeads();
    const body = document.querySelector("#leads-table-body");
    body.innerHTML = filtered.map(lead => `<tr><td>${escapeHtml(displayName(lead))}</td><td>${escapeHtml(lead.email)}<small>${escapeHtml(lead.phone || "No phone provided")}</small></td><td><strong>${escapeHtml(window.F4F_APP_STATE.friendlyLabel("program", lead.program))}</strong><small>${escapeHtml(window.F4F_APP_STATE.friendlyLabel("location", lead.location))}</small></td><td>${escapeHtml(window.F4F_APP_STATE.friendlyLabel("source", lead.source))}<small>${lead.campaign ? `Campaign: ${escapeHtml(lead.campaign)}` : ""}</small></td><td>${escapeHtml(formatDate(lead.submittedAt))}</td><td><span class="lead-status">${escapeHtml(lead.status || "New")}</span></td><td>${escapeHtml(lead.followUpStatus || "Not started")}</td></tr>`).join("");
    document.querySelector("#leads-empty").hidden = filtered.length > 0 || document.querySelector("#leads-state").dataset.state === "loading";
  }

  function renderOverview() {
    const summary = window.F4F_APP_STATE.summarize(leads);
    document.querySelector("#new-leads-value").textContent = String(summary.newLeadCount);
    document.querySelector("#new-leads-note").textContent = "Read-only production lead records";
    const sourceSummary = document.querySelector("#leads-by-source");
    if (sourceSummary) sourceSummary.innerHTML = summary.leadsBySource.length ? summary.leadsBySource.map(item => `<li><span>${escapeHtml(item.label)}</span><strong>${item.count}</strong></li>`).join("") : "<li><span>Direct / Unknown</span><strong>0</strong></li>";
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

  function addAttributionControls() {
    const toolbar = document.querySelector("#view-leads .toolbar");
    if (!toolbar || document.querySelector("#source-filter")) return;
    const headingRow = document.querySelector("#view-leads thead tr");
    if (headingRow) headingRow.innerHTML = "<th>Name</th><th>Contact</th><th>Program / location</th><th>Source</th><th>Submitted</th><th>Status</th><th>Follow-up</th>";
    [["source-filter", "Source", window.F4F_APP_STATE.labels.source], ["location-filter", "Location", window.F4F_APP_STATE.labels.location], ["program-filter", "Program", window.F4F_APP_STATE.labels.program]].forEach(([id, label, values]) => {
      const wrapper = document.createElement("label"); wrapper.textContent = label;
      const select = document.createElement("select"); select.id = id;
      select.innerHTML = `<option value="all">All ${escapeHtml(label.toLowerCase())}s</option>${Object.entries(values).map(([value, text]) => `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`).join("")}${id === "source-filter" ? '<option value="unknown">Direct / Unknown</option>' : ""}`;
      wrapper.appendChild(select); toolbar.appendChild(wrapper);
    });
    const panel = document.querySelector("#view-leads .table-panel");
    const summary = document.createElement("section"); summary.className = "lead-source-summary"; summary.setAttribute("aria-labelledby", "leads-by-source-title");
    summary.innerHTML = '<h2 id="leads-by-source-title">Leads by source</h2><ul id="leads-by-source"></ul>';
    panel.parentNode.insertBefore(summary, panel);
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
      renderLeads();
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
    const authorized = !authenticated || window.F4F_AUTH.getExperience() !== "unauthorized";
    const localPreview = window.F4F_AUTH.isLocalPreviewAllowed();
    document.querySelector("#auth-gate").hidden = authenticated && authorized;
    document.querySelector("#auth-message").textContent = message || (!authorized ? "This account does not have exactly one approved F4F application role." : localPreview ? "Choose a fictional localhost experience. This is not a production login." : "Sign in through the protected Fenton4Fitness identity service.");
    const localChoices = document.querySelector("#local-preview-choices");
    if (localChoices) localChoices.hidden = !localPreview;
    document.querySelector("#production-login").hidden = localPreview;
  }

  async function showExperience({ loadCoachData = true } = {}) {
    const authenticated = window.F4F_AUTH.isAuthenticated();
    const experience = authenticated ? window.F4F_AUTH.getExperience() : "unauthenticated";
    const athlete = experience === "athlete";
    const headerLogout = document.querySelector("#header-logout-button");
    if (headerLogout) headerLogout.hidden = !authenticated || athlete;
    document.querySelector("#coach-shell").hidden = athlete || !authenticated;
    const athleteShell = document.querySelector("#athlete-shell");
    if (athleteShell) athleteShell.hidden = !athlete;
    const productionAthleteShell = document.querySelector("#athlete-production-shell");
    if (productionAthleteShell) productionAthleteShell.hidden = !athlete;
    if (athlete) {
      const athleteApp = window.F4F_AUTH.isLocalPreviewAllowed() ? window.F4F_ATHLETE : window.F4F_ATHLETE_PRODUCTION;
      if (!athleteApp || (!athleteShell && !productionAthleteShell)) throw new Error("The Athlete experience is unavailable.");
      if (!window.location.hash.startsWith("#athlete-")) window.location.hash = "athlete-today";
      await athleteApp.initialize?.();
      athleteApp.route();
    } else if (experience === "coach") {
      if (window.location.hash.startsWith("#athlete-")) window.location.hash = "dashboard";
      route();
      if (loadCoachData) await loadLeadData();
      await window.F4F_ATHLETE_ADMIN?.initialize();
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
    const productionAthleteShell = document.querySelector("#athlete-production-shell");
    if (productionAthleteShell) productionAthleteShell.hidden = true;
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
    addAttributionControls();
    renderLeads();
    await showExperience();
    window.addEventListener("hashchange", () => window.F4F_AUTH.getExperience() === "athlete" ? (window.F4F_AUTH.isLocalPreviewAllowed() ? window.F4F_ATHLETE : window.F4F_ATHLETE_PRODUCTION)?.route() : route());
    document.querySelectorAll("#lead-filter,#source-filter,#location-filter,#program-filter").forEach(control => control.addEventListener("change", renderLeads));
    document.querySelector("#menu-button").addEventListener("click", event => { const sidebar = document.querySelector("#sidebar"); const open = sidebar.classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
    document.querySelector("#preview-coach-login")?.addEventListener("click", () => localLogin("coach"));
    document.querySelector("#preview-athlete-login")?.addEventListener("click", () => localLogin("athlete"));
    document.querySelector("#production-login").addEventListener("click", () => window.F4F_AUTH.login());
    document.querySelector("#logout-button").addEventListener("click", logout);
    document.querySelector("#header-logout-button")?.addEventListener("click", logout);
    document.querySelector("#athlete-logout-button")?.addEventListener("click", logout);
    document.querySelector("#athlete-production-logout")?.addEventListener("click", logout);
    document.querySelector("#athlete-profile-logout")?.addEventListener("click", logout);
    document.querySelectorAll("[data-switch-role]").forEach(button => button.addEventListener("click", async () => {
      if (!window.F4F_AUTH.setLocalExperience(button.dataset.switchRole)) return;
      await showExperience({ loadCoachData: button.dataset.switchRole === "coach" });
    }));
  });
})();
