(function () {
  "use strict";

  const routes = new Set(["athlete-today", "athlete-workouts", "athlete-progress", "athlete-profile"]);

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function viewForHash(hash) {
    return routes.has(String(hash || "").replace(/^#/, "")) ? String(hash).replace(/^#/, "") : "athlete-today";
  }

  function workoutActionLabel(started) {
    return started ? "Continue workout" : "Start workout";
  }

  function render(data) {
    if (!data) return;
    document.querySelectorAll("[data-demo-athlete-name]").forEach(node => { node.textContent = data.firstName; });
    document.querySelector("#athlete-initials").textContent = data.initials;
    document.querySelector("#athlete-workout-title").textContent = data.currentWorkout.title;
    document.querySelector("#athlete-workout-meta").textContent = `${data.currentWorkout.schedule} · ${data.currentWorkout.duration}`;
    document.querySelector("#athlete-workout-progress").textContent = data.currentWorkout.progress;
    document.querySelector("#athlete-coach-note").textContent = data.currentWorkout.coachNote;
    document.querySelector("#athlete-exercises").innerHTML = data.currentWorkout.exercises.map((exercise, index) => `<li><span>${index + 1}</span>${escapeHtml(exercise)}</li>`).join("");
    document.querySelector("#athlete-last-workout").innerHTML = `<strong>${escapeHtml(data.lastWorkout.title)}</strong><span>${escapeHtml(data.lastWorkout.date)} · ${escapeHtml(data.lastWorkout.result)}</span><small>${escapeHtml(data.lastWorkout.highlight)}</small>`;
    document.querySelector("#athlete-upcoming-list").innerHTML = data.upcoming.map(item => `<li><time><strong>${escapeHtml(item.day)}</strong>${escapeHtml(item.date)}</time><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div></li>`).join("");
    document.querySelector("#athlete-pr-list").innerHTML = data.personalRecords.map(item => `<li><div><strong>${escapeHtml(item.metric)}</strong><span>${escapeHtml(item.value)}</span></div><small>${escapeHtml(item.change)}</small></li>`).join("");
    document.querySelector("#athlete-profile-name").textContent = `${data.firstName} · ${data.label}`;
    document.querySelector("#athlete-profile-focus").textContent = data.trainingFocus;
  }

  function route(hash = window.location.hash) {
    const selected = viewForHash(hash);
    document.querySelectorAll("[data-athlete-view]").forEach(view => { view.hidden = view.dataset.athleteView !== selected; });
    document.querySelectorAll("[data-athlete-route]").forEach(link => link.setAttribute("aria-current", link.dataset.athleteRoute === selected ? "page" : "false"));
    window.scrollTo(0, 0);
    return selected;
  }

  function setWorkoutStarted(started) {
    const button = document.querySelector("#athlete-start-workout");
    button.textContent = workoutActionLabel(started);
    button.dataset.started = String(started);
    document.querySelector("#athlete-workout-state").textContent = started ? "Demo session started · results are not saved" : "Preview only · no results will be saved";
  }

  function initialize(data) {
    render(data);
    route();
    const button = document.querySelector("#athlete-start-workout");
    button.addEventListener("click", () => setWorkoutStarted(true));
  }

  window.F4F_ATHLETE = Object.freeze({ initialize, route, viewForHash, workoutActionLabel, render, setWorkoutStarted });
})();
