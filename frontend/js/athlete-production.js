(function () {
  "use strict";
  let profile = null;
  let assignments = [];
  let activeSession = null;
  let autosave = null;
  let visibilityBound = false;

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const currentAssignment = () => assignments.find(item => item.status === "IN_PROGRESS") || assignments.find(item => item.status === "ASSIGNED") || null;
  const scoreTypes = Object.freeze({ load: "LOAD", reps: "REPS", bodyweight: "REPS", time: "TIME", hold_duration: "TIME", distance: "DISTANCE", calories: "CALORIES", completion: "COMPLETION", rounds: "ROUNDS", rounds_reps: "ROUNDS_REPS", weight_reps: "LOAD_REPS_BY_SET", load_reps_sets: "LOAD_REPS_BY_SET", load_reps_by_set: "LOAD_REPS_BY_SET", distance_time: "DISTANCE_TIME", duration_distance: "DURATION_DISTANCE" });
  const resultFields = Object.freeze({ LOAD: ["load"], REPS: ["reps"], TIME: ["durationMs"], DISTANCE: ["distance"], CALORIES: ["calories"], COMPLETION: ["completed"], ROUNDS: ["rounds"], ROUNDS_REPS: ["rounds", "extraReps"], LOAD_REPS_BY_SET: ["load", "reps"], DISTANCE_TIME: ["distance", "completionTimeMs"], DURATION_DISTANCE: ["durationMs", "distance"] });

  function resultFor(scope, section, exercise, requestedType) {
    const scoreType = scoreTypes[String(requestedType || "reps").toLowerCase()] || "REPS";
    let result = (activeSession.results || []).find(item => item.resultScope === scope && item.sectionInstanceId === section.sectionInstanceId && (!exercise || item.exerciseInstanceId === exercise.exerciseInstanceId));
    if (!result) {
      result = { resultScope: scope, sectionInstanceId: section.sectionInstanceId, scoreType };
      if (exercise) Object.assign(result, { exerciseInstanceId: exercise.exerciseInstanceId, exerciseId: exercise.exerciseId });
      if (["LOAD", "LOAD_REPS_BY_SET"].includes(scoreType)) result.loadUnit = "lb";
      if (["DISTANCE", "DISTANCE_TIME", "DURATION_DISTANCE"].includes(scoreType)) result.distanceUnit = "m";
      activeSession.results = [...(activeSession.results || []), result];
    }
    return result;
  }

  function scoreMarkup(scope, section, exercise, requestedType) {
    const result = resultFor(scope, section, exercise, requestedType);
    return (resultFields[result.scoreType] || resultFields.REPS).map(field => `<label>${escapeHtml(field.replace(/([A-Z])/g, " $1"))}<input data-result-scope="${scope}" data-section-id="${section.sectionInstanceId}" data-exercise-id="${exercise?.exerciseInstanceId || ""}" data-score-type="${result.scoreType}" data-score-field="${field}" value="${escapeHtml(result[field] ?? "")}" ${field === "completed" ? 'type="checkbox"' : 'inputmode="decimal"'}></label>`).join("");
  }

  function route() {
    const routeName = (window.location.hash.match(/^#athlete-(today|workouts|profile)$/) || [])[1] || "today";
    document.querySelectorAll("#athlete-production-shell [data-athlete-view]").forEach(view => { view.hidden = view.dataset.athleteView !== routeName; });
    document.querySelectorAll("#athlete-production-shell [data-athlete-route]").forEach(link => link.setAttribute("aria-current", link.dataset.athleteRoute === routeName ? "page" : "false"));
  }

  function renderToday() {
    const assignment = currentAssignment();
    document.querySelector("#athlete-greeting").textContent = profile ? `Welcome, ${profile.firstName || "Athlete"}` : "Welcome";
    document.querySelector("#athlete-today-card").innerHTML = assignment ? `<p class="eyebrow">Today's training</p><h2>${escapeHtml(assignment.workoutName || "Assigned workout")}</h2><p>${escapeHtml(assignment.summary || "Your assigned session is ready.")}</p><button class="primary-button" id="athlete-start-session" type="button">${assignment.status === "in_progress" ? "Continue workout" : "Start workout"}</button>` : '<div class="empty-state"><strong>No workout assigned today</strong><p>Your coach will post your next session here.</p></div>';
    document.querySelector("#athlete-start-session")?.addEventListener("click", () => start(assignment));
  }

  function renderWorkouts() {
    document.querySelector("#athlete-workout-list").innerHTML = assignments.length ? assignments.map(item => `<article class="athlete-list-card"><div><strong>${escapeHtml(item.workoutName || "Assigned workout")}</strong><small>${escapeHtml(item.status || "assigned")}</small></div><span>${escapeHtml(item.scheduledDate || "Unscheduled")}</span></article>`).join("") : '<div class="empty-state"><strong>No workouts yet</strong></div>';
  }

  function renderProfile() {
    document.querySelector("#athlete-profile-card").innerHTML = profile ? `<h2>${escapeHtml([profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Athlete")}</h2><p>${escapeHtml(profile.program || "F4F Athlete")}</p>` : "";
  }

  function renderSession() {
    const container = document.querySelector("#athlete-session-card");
    if (!activeSession) { container.hidden = true; return; }
    container.hidden = false;
    const sections = activeSession.prescriptionSnapshot?.sections || [];
    container.innerHTML = `<div class="athlete-session-heading"><div><p class="eyebrow">Workout in progress</p><h2>${escapeHtml(activeSession.workoutName)}</h2></div><span id="athlete-save-status">Saved</span></div>${sections.map(section => `<section class="athlete-workout-section"><h3>${escapeHtml(section.title || section.type)}</h3><p>${escapeHtml(section.instructions || "")}</p>${section.resultType ? `<div class="athlete-result-grid">${scoreMarkup("SECTION", section, null, section.resultType)}</div>` : ""}${(section.exercises || []).map(exercise => `<article><div><strong>${escapeHtml(exercise.exerciseName)}</strong><small>${escapeHtml(JSON.stringify(exercise.prescription || {}))}</small></div><div class="athlete-result-grid">${scoreMarkup("EXERCISE", section, exercise, exercise.measurementType || "reps")}</div></article>`).join("")}</section>`).join("")}<button class="primary-button" id="athlete-complete-session" type="button">Complete workout</button>`;
    container.querySelectorAll("[data-result-scope]").forEach(input => input.addEventListener("input", event => {
      const result = (activeSession.results || []).find(item => item.resultScope === event.target.dataset.resultScope && item.sectionInstanceId === event.target.dataset.sectionId && (!event.target.dataset.exerciseId || item.exerciseInstanceId === event.target.dataset.exerciseId));
      const numericValue = event.target.value === "" ? null : Number(event.target.value);
      result[event.target.dataset.scoreField] = event.target.type === "checkbox" ? event.target.checked : numericValue;
      if (result.scoreType === "LOAD_REPS_BY_SET") result.sets = [{ set: 1, load: result.load || 0, reps: result.reps || 0 }];
      document.querySelector("#athlete-save-status").textContent = "Saving…";
      autosave.schedule({ revision: activeSession.revision, results: activeSession.results });
    }));
    document.querySelector("#athlete-complete-session").addEventListener("click", complete);
  }

  async function persist(payload) {
    const saved = await window.F4F_API.saveAthleteSession(activeSession.scheduledDate, activeSession.sessionId, { expectedRevision: payload.revision, results: payload.results || [] });
    activeSession = saved.session;
    document.querySelector("#athlete-save-status").textContent = "Saved";
  }

  async function start(assignment) {
    const result = await window.F4F_API.startAthleteSession(assignment.scheduledDate, assignment.assignmentId);
    activeSession = result.session;
    autosave = window.F4F_ATHLETE_SESSION.createAutosave(persist, 900, () => { const status = document.querySelector("#athlete-save-status"); if (status) status.textContent = "Save failed — retry by editing"; });
    renderSession();
    document.querySelector("#athlete-session-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function complete() {
    await autosave.flush();
    const result = await window.F4F_API.completeAthleteSession(activeSession.scheduledDate, activeSession.sessionId, { expectedRevision: activeSession.revision, results: activeSession.results || [] });
    activeSession = result.session;
    document.querySelector("#athlete-save-status").textContent = "Completed";
    document.querySelector("#athlete-complete-session").disabled = true;
  }

  async function initialize() {
    const [profileResult, assignmentResult] = await Promise.all([window.F4F_API.athleteProfile(), window.F4F_API.athleteAssignments()]);
    profile = profileResult.profile; assignments = assignmentResult.items || [];
    renderToday(); renderWorkouts(); renderProfile(); renderSession(); route();
    if (!visibilityBound) {
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && autosave) autosave.flush(); });
      visibilityBound = true;
    }
  }
  window.F4F_ATHLETE_PRODUCTION = Object.freeze({ initialize, route });
})();
