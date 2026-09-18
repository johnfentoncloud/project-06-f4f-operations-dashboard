(function () {
  "use strict";
  let profile = null;
  let assignments = [];
  let activeSession = null;
  let autosave = null;
  let visibilityBound = false;
  let recoveryBound = false;
  let loadGeneration = 0;
  let profileLoading = false;
  let assignmentsLoading = false;
  let profileFailed = false;
  let assignmentsFailed = false;

  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const scoreTypes = Object.freeze({ load: "LOAD", reps: "REPS", bodyweight: "REPS", time: "TIME", hold_duration: "TIME", distance: "DISTANCE", calories: "CALORIES", completion: "COMPLETION", rounds: "ROUNDS", rounds_reps: "ROUNDS_REPS", weight_reps: "LOAD_REPS_BY_SET", load_reps_sets: "LOAD_REPS_BY_SET", load_reps_by_set: "LOAD_REPS_BY_SET", distance_time: "DISTANCE_TIME", duration_distance: "DURATION_DISTANCE" });
  const resultFields = Object.freeze({ LOAD: ["load"], REPS: ["reps"], TIME: ["durationMs"], DISTANCE: ["distance"], CALORIES: ["calories"], COMPLETION: ["completed"], ROUNDS: ["rounds"], ROUNDS_REPS: ["rounds", "extraReps"], LOAD_REPS_BY_SET: ["load", "reps"], DISTANCE_TIME: ["distance", "completionTimeMs"], DURATION_DISTANCE: ["durationMs", "distance"] });

  function todayInProgramTimeZone(date = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  const todaysAssignments = () => assignments.filter(item => item.scheduledDate === todayInProgramTimeZone());
  const profileName = () => profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Athlete";
  const failureMarkup = (message, scope) => `<div class="empty-state" role="alert"><strong>${escapeHtml(message)}</strong><p>No workout or account data was changed.</p><div class="athlete-profile-actions"><button class="secondary-button" type="button" data-athlete-retry="${scope}">Retry</button><button class="text-button" type="button" data-athlete-sign-out>Sign Out</button></div></div>`;

  function withTimeout(request, milliseconds = 15000) {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Athlete request timed out.")), milliseconds);
      Promise.resolve(request).then(value => { window.clearTimeout(timer); resolve(value); }, error => { window.clearTimeout(timer); reject(error); });
    });
  }

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
    document.querySelector("#athlete-greeting").textContent = profile ? `Welcome, ${profileName()}` : "Welcome";
    const container = document.querySelector("#athlete-today-card");
    if (assignmentsLoading) {
      container.innerHTML = '<div class="empty-state"><strong>Loading today\'s training…</strong></div>';
      return;
    }
    if (assignmentsFailed) {
      container.innerHTML = failureMarkup("We couldn't load your workouts. Please try again.", "assignments");
      return;
    }
    const today = todaysAssignments();
    container.innerHTML = today.length ? today.map((assignment, index) => {
      const status = String(assignment.status || "ASSIGNED").toUpperCase();
      const action = status === "ASSIGNED" || status === "IN_PROGRESS" ? `<button class="primary-button" type="button" data-athlete-start-index="${index}">${status === "IN_PROGRESS" ? "Continue workout" : "Start workout"}</button>` : "";
      return `<section class="${today.length > 1 ? "athlete-list-card" : ""}"><div><p class="eyebrow">Today's training${today.length > 1 ? ` ${index + 1} of ${today.length}` : ""}</p><h2>${escapeHtml(assignment.workoutName || "Assigned workout")}</h2><p>${escapeHtml(assignment.summary || "Your assigned session is ready.")}</p><small>${escapeHtml(status)}</small></div>${action}</section>`;
    }).join("") : '<div class="empty-state"><strong>No workout assigned today</strong><p>Your coach will post your next session here.</p></div>';
  }

  function renderWorkouts() {
    const container = document.querySelector("#athlete-workout-list");
    if (assignmentsLoading) {
      container.innerHTML = '<div class="empty-state"><strong>Loading workouts…</strong></div>';
    } else if (assignmentsFailed) {
      container.innerHTML = failureMarkup("We couldn't load your workout list. Please try again.", "assignments");
    } else {
      container.innerHTML = assignments.length ? assignments.map(item => `<article class="athlete-list-card"><div><strong>${escapeHtml(item.workoutName || "Assigned workout")}</strong><small>${escapeHtml(item.status || "assigned")}</small></div><span>${escapeHtml(item.scheduledDate || "Unscheduled")}</span></article>`).join("") : '<div class="empty-state"><strong>No workouts yet</strong></div>';
    }
  }

  function renderProfile() {
    const container = document.querySelector("#athlete-profile-card");
    if (profileLoading) {
      container.innerHTML = '<div class="empty-state"><strong>Loading profile…</strong></div>';
    } else if (profileFailed) {
      container.innerHTML = failureMarkup("We couldn't load your profile. Please try again.", "profile");
    } else {
      container.innerHTML = profile ? `<h2>${escapeHtml(profileName())}</h2><p>${escapeHtml(profile.program || "F4F Athlete")}</p>` : "";
    }
  }

  function renderAll() {
    renderToday();
    renderWorkouts();
    renderProfile();
    renderSession();
    route();
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

  async function handleShellClick(event) {
    const retry = event.target.closest?.("[data-athlete-retry]");
    if (retry) {
      await initialize();
      return;
    }
    if (event.target.closest?.("[data-athlete-sign-out]")) {
      document.querySelector("#athlete-production-logout")?.click();
      return;
    }
    const startButton = event.target.closest?.("[data-athlete-start-index]");
    if (startButton) {
      const assignment = todaysAssignments()[Number(startButton.dataset.athleteStartIndex)];
      if (assignment) await start(assignment);
    }
  }

  async function initialize() {
    const generation = ++loadGeneration;
    profileLoading = true;
    assignmentsLoading = true;
    profileFailed = false;
    assignmentsFailed = false;
    renderAll();
    const [profileResult, assignmentResult] = await Promise.allSettled([withTimeout(window.F4F_API.athleteProfile()), withTimeout(window.F4F_API.athleteAssignments())]);
    if (generation !== loadGeneration) return;
    profileLoading = false;
    assignmentsLoading = false;
    if (profileResult.status === "fulfilled") {
      profile = profileResult.value.profile || null;
    } else {
      profile = null;
      profileFailed = true;
    }
    if (assignmentResult.status === "fulfilled") {
      assignments = assignmentResult.value.items || [];
    } else {
      assignments = [];
      assignmentsFailed = true;
    }
    renderAll();
    if (!visibilityBound) {
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && autosave) autosave.flush(); });
      visibilityBound = true;
    }
    if (!recoveryBound) {
      document.querySelector("#athlete-production-shell").addEventListener("click", handleShellClick);
      recoveryBound = true;
    }
  }
  window.F4F_ATHLETE_PRODUCTION = Object.freeze({ initialize, route });
})();
