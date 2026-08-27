(function () {
  "use strict";
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  async function initialize() {
    const container = document.querySelector("#athlete-admin-list");
    if (!container) return;
    try {
      const payload = await window.F4F_API.listAthleteProfiles();
      container.innerHTML = payload.items?.length ? payload.items.map(athlete => `<article class="template-card"><div><h2>${escapeHtml(athlete.displayName || "Athlete")}</h2><span class="version-badge">${escapeHtml(athlete.status || "active")}</span></div><button type="button" class="secondary-button compact-button" data-athlete-id="${escapeHtml(athlete.athleteId)}">Manage athlete</button></article>`).join("") : '<div class="empty-state"><strong>No beta athletes provisioned</strong><p>Use the approved provisioning runbook after deployment approval.</p></div>';
      container.querySelectorAll("[data-athlete-id]").forEach(button => button.addEventListener("click", async () => {
        const athleteId = button.dataset.athleteId;
        const [assignments, templates] = await Promise.all([window.F4F_API.athleteAdminAssignments(athleteId), window.F4F_API.listWorkoutTemplates()]);
        const form = document.querySelector("#athlete-assignment-form"); form.hidden = false;
        document.querySelector("#assignment-athlete-id").value = athleteId;
        document.querySelector("#assignment-template").innerHTML = (templates.items || []).map(template => `<option value="${escapeHtml(template.templateId)}" data-version="${Number(template.currentVersion)}">${escapeHtml(template.name)} — Version ${Number(template.currentVersion)}</option>`).join("");
        const output = document.querySelector("#athlete-admin-results");
        output.innerHTML = (assignments.items || []).map(item => `<button type="button" class="secondary-button compact-button" data-result-date="${escapeHtml(item.scheduledDate)}" data-result-assignment="${escapeHtml(item.assignmentId)}">${escapeHtml(item.workoutName || item.assignmentId)} — ${escapeHtml(item.scheduledDate)}</button>`).join("") || "No assignments found.";
        output.querySelectorAll("[data-result-assignment]").forEach(resultButton => resultButton.addEventListener("click", async () => {
          const result = await window.F4F_API.athleteResults(athleteId, resultButton.dataset.resultDate, resultButton.dataset.resultAssignment);
          output.textContent = JSON.stringify(result.session || result.assignment, null, 2);
        }));
      }));
      document.querySelector("#athlete-assignment-form")?.addEventListener("submit", async event => {
        event.preventDefault();
        const option = document.querySelector("#assignment-template").selectedOptions[0];
        const status = document.querySelector("#assignment-status"); status.textContent = "Assigning…";
        try {
          await window.F4F_API.assignWorkout(document.querySelector("#assignment-athlete-id").value, { assignmentId: window.crypto.randomUUID(), templateId: option.value, templateVersion: Number(option.dataset.version), scheduledDate: document.querySelector("#assignment-date").value });
          status.textContent = "Workout assigned.";
        } catch (error) { status.textContent = error.status === 409 ? "Assignment conflict. Refresh and try again." : "Assignment failed safely."; }
      }, { once: true });
    } catch (error) { container.innerHTML = '<div class="data-state" data-state="error">Athlete profiles are temporarily unavailable.</div>'; }
  }
  window.F4F_ATHLETE_ADMIN = Object.freeze({ initialize });
})();
