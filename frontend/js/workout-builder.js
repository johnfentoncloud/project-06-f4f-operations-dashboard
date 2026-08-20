(function (root) {
  "use strict";

  const SECTION_TYPES = Object.freeze(["Warm-Up", "Strength", "Power", "Conditioning", "Accessory", "Core", "Cooldown"]);
  const MEASUREMENT_FIELDS = Object.freeze({
    weight_reps: ["sets", "reps", "load", "loadUnit", "rest", "tempo", "rpe", "percentage"],
    reps: ["sets", "reps", "rest", "tempo", "rpe"],
    bodyweight: ["sets", "reps", "rest", "tempo", "rpe"],
    time: ["sets", "duration", "rest", "rpe"],
    hold_duration: ["sets", "duration", "rest"],
    distance: ["sets", "distance", "distanceUnit", "rest", "rpe"],
    calories: ["sets", "calories", "rest", "rpe"],
    rounds: ["rounds", "duration", "rest", "rpe"],
    completion: ["sets"]
  });
  const FIELD_META = Object.freeze({
    sets: ["Sets", "number", "1"], reps: ["Reps", "number", "1"], load: ["Load", "number", "0"],
    loadUnit: ["Load unit", "select", ["lb", "kg"]], duration: ["Duration", "number", "1"],
    distance: ["Distance", "number", "0"], distanceUnit: ["Distance unit", "select", ["yd", "m", "mi", "km"]],
    calories: ["Calories", "number", "1"], rounds: ["Rounds", "number", "1"], rest: ["Rest (sec)", "number", "0"],
    tempo: ["Tempo", "text", ""], rpe: ["RPE", "number", "1"], percentage: ["% max", "number", "1"]
  });

  function createWorkout({ name = "", description = "", createdBy = "LOCAL_OWNER_PREVIEW" } = {}) {
    return { workoutId: `local-${Date.now()}`, name, description, createdBy, exercises: [] };
  }

  function findExercise(exerciseId) {
    const exercise = root.F4F_EXERCISES?.exercises.find(item => item.exerciseId === exerciseId);
    if (!exercise) throw new Error("Invalid exercise selection.");
    return exercise;
  }

  function fieldsForMeasurement(measurementType) {
    return [...(MEASUREMENT_FIELDS[measurementType] || [])];
  }

  function defaultPrescription(exercise) {
    const prescription = { coachInstruction: "" };
    fieldsForMeasurement(exercise.measurementType).forEach(field => {
      if (field === "loadUnit") prescription[field] = exercise.defaultUnit === "kg" ? "kg" : "lb";
      else if (field === "distanceUnit") prescription[field] = exercise.defaultUnit || "yd";
      else prescription[field] = "";
    });
    return prescription;
  }

  function addExercise(workout, exerciseId, section = "Strength") {
    const exercise = findExercise(exerciseId);
    if (!SECTION_TYPES.includes(section)) throw new Error("Invalid workout section.");
    workout.exercises.push({ instanceId: `item-${Date.now()}-${workout.exercises.length}`, exerciseId, section, prescription: defaultPrescription(exercise) });
    return workout;
  }

  function removeExercise(workout, index) {
    if (!Number.isInteger(index) || index < 0 || index >= workout.exercises.length) throw new Error("Invalid exercise position.");
    workout.exercises.splice(index, 1);
    return workout;
  }

  function moveExercise(workout, index, direction) {
    const next = index + direction;
    if (!Number.isInteger(index) || ![-1, 1].includes(direction) || index < 0 || index >= workout.exercises.length || next < 0 || next >= workout.exercises.length) return workout;
    [workout.exercises[index], workout.exercises[next]] = [workout.exercises[next], workout.exercises[index]];
    return workout;
  }

  function updatePrescription(workout, index, field, value) {
    const item = workout.exercises[index];
    if (!item) throw new Error("Invalid exercise position.");
    const exercise = findExercise(item.exerciseId);
    const allowed = new Set([...fieldsForMeasurement(exercise.measurementType), "coachInstruction"]);
    if (field === "section") {
      if (!SECTION_TYPES.includes(value)) throw new Error("Invalid workout section.");
      item.section = value;
    } else if (allowed.has(field)) item.prescription[field] = String(value).trim();
    else throw new Error("Field is not valid for this exercise.");
    return workout;
  }

  function validatePrescription(exercise, prescription) {
    const errors = [];
    const numeric = field => prescription[field] === "" || prescription[field] == null || (Number.isFinite(Number(prescription[field])) && Number(prescription[field]) >= 0);
    fieldsForMeasurement(exercise.measurementType).filter(field => FIELD_META[field]?.[1] === "number").forEach(field => { if (!numeric(field)) errors.push(`${field} must be a non-negative number`); });
    if (prescription.rpe && (Number(prescription.rpe) < 1 || Number(prescription.rpe) > 10)) errors.push("RPE must be between 1 and 10");
    if (prescription.percentage && (Number(prescription.percentage) < 1 || Number(prescription.percentage) > 100)) errors.push("percentage must be between 1 and 100");
    return errors;
  }

  function serializeTemplate(workout, { templateId = `template-${Date.now()}`, version = 1, timestamp = new Date().toISOString() } = {}) {
    if (!String(workout.name || "").trim()) throw new Error("Workout name is required.");
    if (!workout.exercises.length) throw new Error("Add at least one exercise.");
    const exercises = workout.exercises.map((item, order) => {
      const exercise = findExercise(item.exerciseId);
      const errors = validatePrescription(exercise, item.prescription);
      if (errors.length) throw new Error(`${exercise.name}: ${errors.join(", ")}`);
      return Object.freeze({ order, section: item.section, exerciseSnapshot: Object.freeze({ ...exercise, tags: [...exercise.tags] }), prescription: Object.freeze({ ...item.prescription }) });
    });
    return Object.freeze({ templateId, name: workout.name.trim(), description: String(workout.description || "").trim(), sections: [...new Set(exercises.map(item => item.section))], exercises: Object.freeze(exercises), createdBy: workout.createdBy, createdAt: timestamp, updatedAt: timestamp, version });
  }

  function realisticDemoWorkout() {
    const workout = createWorkout({ name: "F4F Total-Body Performance", description: "Movement prep, explosive power, foundational strength, and a concise conditioning finish." });
    const add = (name, section, values) => {
      const exercise = root.F4F_EXERCISES.exercises.find(item => item.name === name);
      addExercise(workout, exercise.exerciseId, section);
      Object.entries(values).forEach(([field, value]) => updatePrescription(workout, workout.exercises.length - 1, field, value));
    };
    add("World's Greatest Stretch", "Warm-Up", { sets: 1, reps: 5, coachInstruction: "Move smoothly through each side." });
    add("Box Jump", "Power", { sets: 4, reps: 3, rest: 75, coachInstruction: "Reset between reps; land quietly." });
    add("Trap Bar Deadlift", "Strength", { sets: 4, reps: 5, load: 185, loadUnit: "lb", rest: 120, rpe: 7, coachInstruction: "Fast, controlled reps." });
    add("Incline Dumbbell Press", "Strength", { sets: 3, reps: 8, load: 40, loadUnit: "lb", rest: 75 });
    add("Row", "Conditioning", { sets: 4, distance: 250, distanceUnit: "m", rest: 60, rpe: 8 });
    add("Pallof Press", "Core", { sets: 3, reps: 10, rest: 30, coachInstruction: "Ten controlled reps per side." });
    return workout;
  }

  const state = { workout: null, favorites: new Set(), recent: [] };
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  function optionMarkup(values, selected = "all") {
    return [`<option value="all">All</option>`, ...values.map(value => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`)].join("");
  }

  function renderLibrary() {
    const container = document.querySelector("#exercise-results");
    if (!container) return;
    const filters = { query: document.querySelector("#exercise-search").value, category: document.querySelector("#exercise-category").value, equipment: document.querySelector("#exercise-equipment").value, movementPattern: document.querySelector("#exercise-pattern").value };
    let items = root.F4F_EXERCISES.filterExercises(root.F4F_EXERCISES.exercises, filters);
    if (document.querySelector("#exercise-favorites").checked) items = items.filter(item => state.favorites.has(item.exerciseId));
    document.querySelector("#exercise-count").textContent = `${items.length} exercises`;
    document.querySelector("#recent-exercises").innerHTML = state.recent.length ? state.recent.map(id => `<button type="button" data-add-exercise="${id}">${escapeHtml(findExercise(id).name)}</button>`).join("") : "<span>No exercises selected yet.</span>";
    container.innerHTML = items.map(exercise => `<article class="exercise-card"><div><span class="library-source">F4F Library</span><h3>${escapeHtml(exercise.name)}</h3><p>${escapeHtml(exercise.category)} · ${escapeHtml(exercise.movementPattern)}</p><small>${escapeHtml(exercise.equipment)} · ${escapeHtml(exercise.measurementType.replaceAll("_", " "))}</small></div><div class="exercise-actions"><button class="icon-button" type="button" data-favorite-exercise="${exercise.exerciseId}" aria-label="${state.favorites.has(exercise.exerciseId) ? "Remove from" : "Add to"} favorites" aria-pressed="${state.favorites.has(exercise.exerciseId)}">★</button><button class="secondary-button compact-button" type="button" data-add-exercise="${exercise.exerciseId}">Add</button></div></article>`).join("") || "<div class=\"empty-state\"><strong>No exercises match those filters.</strong></div>";
  }

  function fieldMarkup(field, value) {
    const [label, type, options] = FIELD_META[field];
    if (type === "select") return `<label>${label}<select data-prescription="${field}">${options.map(option => `<option value="${option}"${value === option ? " selected" : ""}>${option}</option>`).join("")}</select></label>`;
    return `<label>${label}<input data-prescription="${field}" type="${type}" min="0" step="${options || "any"}" value="${escapeHtml(value)}"></label>`;
  }

  function renderBuilder(message = "") {
    const list = document.querySelector("#workout-exercise-list");
    if (!list || !state.workout) return;
    document.querySelector("#workout-name").value = state.workout.name;
    document.querySelector("#workout-description").value = state.workout.description;
    document.querySelector("#builder-count").textContent = `${state.workout.exercises.length} exercises`;
    document.querySelector("#builder-status").textContent = message;
    list.innerHTML = state.workout.exercises.map((item, index) => {
      const exercise = findExercise(item.exerciseId);
      const fields = fieldsForMeasurement(exercise.measurementType).map(field => fieldMarkup(field, item.prescription[field] || "")).join("");
      return `<article class="builder-exercise" data-builder-index="${index}"><header><div><span class="exercise-order">${index + 1}</span><h3>${escapeHtml(exercise.name)}</h3><small>${escapeHtml(exercise.measurementType.replaceAll("_", " "))}</small></div><div class="reorder-actions"><button type="button" data-move="-1" aria-label="Move ${escapeHtml(exercise.name)} up">↑</button><button type="button" data-move="1" aria-label="Move ${escapeHtml(exercise.name)} down">↓</button><button type="button" data-remove aria-label="Remove ${escapeHtml(exercise.name)}">Remove</button></div></header><div class="prescription-grid"><label>Section<select data-prescription="section">${SECTION_TYPES.map(section => `<option${section === item.section ? " selected" : ""}>${section}</option>`).join("")}</select></label>${fields}</div><label class="coach-instruction">Coach instruction<textarea data-prescription="coachInstruction" rows="2">${escapeHtml(item.prescription.coachInstruction || "")}</textarea></label></article>`;
    }).join("") || "<div class=\"empty-state\"><strong>Add exercises from the library to begin.</strong></div>";
  }

  function apiPayload(workout, extra = {}) {
    const snapshot = serializeTemplate(workout, { templateId: extra.templateId || `template-${Date.now()}` });
    return { name: snapshot.name, description: snapshot.description, exercises: snapshot.exercises.map(item => ({ order: item.order, section: item.section, exerciseId: item.exerciseSnapshot.exerciseId, exerciseName: item.exerciseSnapshot.name, prescription: item.prescription })), ...extra };
  }

  function templateListMarkup(items) {
    return items.map(item => `<article class="template-card"><div class="template-summary"><h2 class="template-name">${escapeHtml(item.name)}</h2><span class="template-version">Version ${escapeHtml(item.currentVersion)}</span></div><button class="template-open" type="button" data-open-template="${escapeHtml(item.templateId)}">Open Template</button></article>`).join("");
  }

  async function loadTemplates() {
    const list = document.querySelector("#template-list");
    if (!list) return;
    if (root.F4F_AUTH.isLocalPreviewAllowed()) {
      list.innerHTML = "<div class=\"empty-state\"><strong>No local templates saved yet.</strong></div>";
      return;
    }
    list.innerHTML = "<p class=\"data-state\">Loading saved templates…</p>";
    try {
      const payload = await root.F4F_API.listWorkoutTemplates();
      list.innerHTML = payload.items.length ? templateListMarkup(payload.items) : "<div class=\"empty-state\"><strong>No templates saved yet.</strong></div>";
    } catch (error) {
      list.innerHTML = `<p class="data-state" data-state="${error.name === "AuthenticationExpiredError" ? "auth-expired" : "error"}">${escapeHtml(error.message)}</p>`;
    }
  }

  async function saveTemplate(button) {
    const original = button.textContent;
    button.disabled = true; button.textContent = "Saving…";
    try {
      if (root.F4F_AUTH.isLocalPreviewAllowed()) {
        const template = serializeTemplate(state.workout);
        renderBuilder(`Template ready locally: ${template.name} · version ${template.version}.`);
      } else {
        const key = root.crypto?.randomUUID?.() || `save-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const result = state.workout.templateId
          ? await root.F4F_API.updateWorkoutTemplate(state.workout.templateId, apiPayload(state.workout, { templateId: state.workout.templateId, expectedCurrentVersion: state.workout.version }), key)
          : await root.F4F_API.createWorkoutTemplate(apiPayload(state.workout), key);
        state.workout.templateId = result.templateId; state.workout.version = result.version;
        renderBuilder(`Saved ${state.workout.name} as version ${result.version}.`);
        await loadTemplates();
      }
    } catch (error) {
      renderBuilder(`${error.name === "AuthenticationExpiredError" ? "Session expired. " : "Save failed. "}${error.message} Your in-progress workout is still here.`);
    } finally { button.disabled = false; button.textContent = original; }
  }

  async function initializeUI() {
    if (!document.querySelector("#exercise-results")) return;
    if (!root.F4F_AUTH.isLocalPreviewAllowed()) {
      const status = document.querySelector("#exercise-count"); status.textContent = "Loading exercises…";
      try { root.F4F_EXERCISES.setExercises((await root.F4F_API.listExercises()).items); }
      catch (error) { status.textContent = error.name === "AuthenticationExpiredError" ? "Session expired" : "Exercise library unavailable"; return; }
    }
    const library = root.F4F_EXERCISES.exercises;
    document.querySelector("#exercise-category").innerHTML = optionMarkup(root.F4F_EXERCISES.uniqueValues(library, "category"));
    document.querySelector("#exercise-equipment").innerHTML = optionMarkup(root.F4F_EXERCISES.uniqueValues(library, "equipment"));
    document.querySelector("#exercise-pattern").innerHTML = optionMarkup(root.F4F_EXERCISES.uniqueValues(library, "movementPattern"));
    state.workout = root.F4F_AUTH.isLocalPreviewAllowed() ? realisticDemoWorkout() : createWorkout();
    state.recent = state.workout.exercises.slice(-3).map(item => item.exerciseId).reverse();
    renderLibrary(); renderBuilder(root.F4F_AUTH.isLocalPreviewAllowed() ? "Realistic fictional F4F workout loaded for review." : "Start with a name, then add exercises from the library.");
    document.querySelectorAll("#exercise-search,#exercise-category,#exercise-equipment,#exercise-pattern,#exercise-favorites").forEach(control => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", renderLibrary));
    document.querySelector("#exercise-results").addEventListener("click", event => {
      const add = event.target.closest("[data-add-exercise]"); const favorite = event.target.closest("[data-favorite-exercise]");
      if (add) { addExercise(state.workout, add.dataset.addExercise, "Strength"); state.recent = [add.dataset.addExercise, ...state.recent.filter(id => id !== add.dataset.addExercise)].slice(0, 5); renderLibrary(); renderBuilder(`${findExercise(add.dataset.addExercise).name} added.`); }
      if (favorite) { state.favorites.has(favorite.dataset.favoriteExercise) ? state.favorites.delete(favorite.dataset.favoriteExercise) : state.favorites.add(favorite.dataset.favoriteExercise); renderLibrary(); }
    });
    document.querySelector("#recent-exercises").addEventListener("click", event => { const add = event.target.closest("[data-add-exercise]"); if (add) { addExercise(state.workout, add.dataset.addExercise); renderBuilder(`${findExercise(add.dataset.addExercise).name} added.`); } });
    document.querySelector("#workout-exercise-list").addEventListener("click", event => { const row = event.target.closest("[data-builder-index]"); if (!row) return; const index = Number(row.dataset.builderIndex); if (event.target.closest("[data-remove]")) removeExercise(state.workout, index); else if (event.target.closest("[data-move]")) moveExercise(state.workout, index, Number(event.target.closest("[data-move]").dataset.move)); else return; renderBuilder(); });
    document.querySelector("#workout-exercise-list").addEventListener("input", event => { const row = event.target.closest("[data-builder-index]"); if (row && event.target.dataset.prescription) updatePrescription(state.workout, Number(row.dataset.builderIndex), event.target.dataset.prescription, event.target.value); });
    document.querySelector("#workout-name").addEventListener("input", event => { state.workout.name = event.target.value; });
    document.querySelector("#workout-description").addEventListener("input", event => { state.workout.description = event.target.value; });
    document.querySelector("#load-demo-workout").addEventListener("click", () => { state.workout = realisticDemoWorkout(); renderBuilder("Realistic fictional F4F workout restored."); });
    document.querySelector("#save-template").addEventListener("click", event => saveTemplate(event.currentTarget));
    document.querySelector("#template-list")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-open-template]"); if (!button) return;
      try {
        const { item } = await root.F4F_API.getWorkoutTemplate(button.dataset.openTemplate);
        state.workout = { workoutId: item.templateId, templateId: item.templateId, version: item.version, name: item.name, description: item.description, createdBy: item.createdBy, exercises: item.exercises.map(entry => ({ instanceId: `item-${entry.order}`, exerciseId: entry.exerciseId, section: entry.section, prescription: { ...entry.prescription } })) };
        root.location.hash = "workout-builder"; renderBuilder(`Opened version ${item.version}. Your next save creates a new immutable version.`);
      } catch (error) { document.querySelector("#template-list").innerHTML = `<p class="data-state" data-state="error">${escapeHtml(error.message)}</p>`; }
    });
    await loadTemplates();
  }

  const api = Object.freeze({ SECTION_TYPES, MEASUREMENT_FIELDS, createWorkout, findExercise, fieldsForMeasurement, defaultPrescription, addExercise, removeExercise, moveExercise, updatePrescription, validatePrescription, serializeTemplate, realisticDemoWorkout, templateListMarkup, initializeUI });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.F4F_WORKOUTS = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", initializeUI);
})(typeof window !== "undefined" ? window : globalThis);
