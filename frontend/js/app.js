(function () {
  "use strict";
  const functionalRoutes = new Set(["dashboard", "leads"]);
  const labels = { dashboard: "Dashboard overview", leads: "Lead viewer", athletes: "Athletes", clients: "Clients", teams: "Teams", training: "Training", schedule: "Schedule", revenue: "Revenue", messages: "Messages", settings: "Settings" };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function formatDate(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(parsed);
  }

  function renderLeads(filter = "all") {
    const leads = window.F4F_DATA.mockLeads.filter(lead => filter === "all" || (filter === "training" ? lead.submissionType === "lead" : lead.submissionType === filter));
    const body = document.querySelector("#leads-table-body");
    const empty = document.querySelector("#leads-empty");
    body.innerHTML = leads.map(lead => `<tr><td>${escapeHtml(lead.name)}</td><td>${escapeHtml(lead.email)}<small>${escapeHtml(lead.phone || "No phone provided")}</small></td><td>${escapeHtml(lead.leadType)}<small>${escapeHtml(lead.submissionType)}</small></td><td>${escapeHtml(formatDate(lead.submittedAt))}</td><td><span class="lead-status">${escapeHtml(lead.status)}</span></td><td>${escapeHtml(lead.followUpStatus)}</td></tr>`).join("");
    empty.hidden = leads.length > 0;
  }

  function route() {
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

  function updateAuthGate() {
    document.querySelector("#auth-gate").hidden = window.F4F_AUTH.isAuthenticated();
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateAuthGate();
    renderLeads();
    route();
    window.addEventListener("hashchange", route);
    document.querySelector("#lead-filter").addEventListener("change", event => renderLeads(event.target.value));
    document.querySelector("#menu-button").addEventListener("click", event => { const sidebar = document.querySelector("#sidebar"); const open = sidebar.classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
    document.querySelector("#preview-login").addEventListener("click", () => { window.F4F_AUTH.enterLocalPreview(); updateAuthGate(); });
    document.querySelector("#logout-button").addEventListener("click", () => { window.F4F_AUTH.logout(); updateAuthGate(); });
  });
})();
