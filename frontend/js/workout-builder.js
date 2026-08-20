(function (root) {
  "use strict";

  const SECTION_TYPES = Object.freeze(["Stretch / Mobility", "Warm-Up", "Power", "Strength", "Conditioning", "Metcon", "Accessory", "Core", "Finisher", "Cooldown", "Custom"]);
  const SECTION_FORMATS = Object.freeze(["Standard", "Superset", "Circuit", "AMRAP", "For Time", "EMOM", "E2MOM", "Intervals", "Rounds", "Steady State", "Freeform / Instructions Only"]);
  const MEASUREMENT_FIELDS = Object.freeze({
    weight_reps: ["sets", "reps", "repQualifier", "load", "loadUnit", "rest", "tempo", "rpe", "percentage"],
    reps: ["sets", "reps", "repQualifier", "rest", "tempo", "rpe"],
    bodyweight: ["sets", "reps", "repQualifier", "rest", "tempo", "rpe"],
    time: ["sets", "duration", "rest", "rpe"],
    hold_duration: ["sets", "duration", "rest"],
    distance: ["sets", "distance", "distanceUnit", "rest", "rpe"],
    calories: ["sets", "calories", "rest", "rpe"],
    rounds: ["rounds", "duration", "rest", "rpe"],
    completion: ["sets"]
  });
  const FIELD_META = Object.freeze({
    sets: ["Sets", "number", "1"], reps: ["Reps", "number", "1"], repQualifier: ["Rep style", "select", ["total", "each-side", "alternating"]],
    load: ["Load", "number", "0"], loadUnit: ["Load unit", "select", ["lb", "kg"]], duration: ["Duration", "number", "1"],
    distance: ["Distance", "number", "0"], distanceUnit: ["Distance unit", "select", ["yd", "m", "mi", "km"]],
    calories: ["Calories", "number", "1"], rounds: ["Rounds", "number", "1"], rest: ["Rest (sec)", "number", "0"],
    tempo: ["Tempo", "text", ""], rpe: ["RPE", "number", "1"], percentage: ["% max", "number", "1"]
  });
  const FORMAT_FIELD_RULES = Object.freeze({
    Standard: {}, Superset: { rounds: true }, Circuit: { rounds: true }, AMRAP: { duration: true },
    "For Time": { rounds: true, duration: true, durationLabel: "Time cap" }, EMOM: { duration: true }, E2MOM: { duration: true },
    Intervals: { duration: true, instructionsEmphasis: true }, Rounds: { rounds: true }, "Steady State": { duration: true, instructionsEmphasis: true },
    "Freeform / Instructions Only": { instructionsEmphasis: true }
  });
  const QUICK_SECTION_PRESETS = Object.freeze({
    "Warm-Up": Object.freeze({ type: "Warm-Up", format: "Standard", baseTitle: "Warm-Up" }),
    Strength: Object.freeze({ type: "Strength", format: "Standard", baseTitle: "Strength" }),
    Superset: Object.freeze({ type: "Strength", format: "Superset", baseTitle: "SS", numberFirst: true }),
    Metcon: Object.freeze({ type: "Metcon", format: "Standard", baseTitle: "Metcon" }),
    Conditioning: Object.freeze({ type: "Conditioning", format: "Standard", baseTitle: "Conditioning" }),
    Core: Object.freeze({ type: "Core", format: "Standard", baseTitle: "Core" }),
    Finisher: Object.freeze({ type: "Finisher", format: "Standard", baseTitle: "Finisher" }),
    Custom: Object.freeze({ type: "Custom", format: "Standard", baseTitle: "Custom" })
  });
  let sequence = 0;
  const nextId = prefix => `${prefix}-${Date.now()}-${++sequence}`;
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  function createWorkout({ name = "", description = "", createdBy = "LOCAL_OWNER_PREVIEW" } = {}) {
    return { workoutId: nextId("local"), name, description, createdBy, sections: [] };
  }

  function createSection({ sectionId = nextId("section"), type = "Strength", format = "Standard", title = "", instructions = "", rounds = "", duration = "", durationUnit = "min", exercises = [], autoTitle = false, autoTitleKey = "" } = {}) {
    if (!SECTION_TYPES.includes(type)) throw new Error("Invalid section type.");
    if (!SECTION_FORMATS.includes(format)) throw new Error("Invalid section format.");
    return { sectionId, type, format, title, instructions, rounds, duration, durationUnit, exercises, autoTitle, autoTitleKey };
  }

  function addSection(workout, values = {}) {
    workout.sections.push(createSection(values));
    return workout.sections[workout.sections.length - 1];
  }

  function sectionDisplayTitle(section) {
    return String(section.title || section.type || "Section");
  }

  function presetKeyForSection(section) {
    if (section.type === "Strength" && section.format === "Superset") return "Superset";
    return Object.keys(QUICK_SECTION_PRESETS).find(key => {
      const preset = QUICK_SECTION_PRESETS[key];
      return preset.type === section.type && preset.format === section.format;
    }) || "Custom";
  }

  function presetMatchesSection(section, key) {
    return presetKeyForSection(section) === key;
  }

  function nextAutoTitle(workout, key, excludedSectionId = "") {
    const preset = QUICK_SECTION_PRESETS[key] || QUICK_SECTION_PRESETS.Custom;
    const count = workout.sections.filter(section => section.sectionId !== excludedSectionId && presetMatchesSection(section, key)).length + 1;
    return count === 1 && !preset.numberFirst ? preset.baseTitle : `${preset.baseTitle} ${count}`;
  }

  function addQuickSection(workout, key) {
    const preset = QUICK_SECTION_PRESETS[key];
    if (!preset) throw new Error("Invalid quick section choice.");
    return addSection(workout, { type: preset.type, format: preset.format, title: nextAutoTitle(workout, key), autoTitle: true, autoTitleKey: key });
  }

  function sectionAt(workout, index) {
    const section = workout.sections[index];
    if (!section) throw new Error("Invalid section position.");
    return section;
  }

  function moveSection(workout, index, direction) {
    const next = index + direction;
    if (!Number.isInteger(index) || ![-1, 1].includes(direction) || index < 0 || next < 0 || next >= workout.sections.length) return workout;
    [workout.sections[index], workout.sections[next]] = [workout.sections[next], workout.sections[index]];
    return workout;
  }

  function duplicateSection(workout, index) {
    const source = sectionAt(workout, index);
    const copy = JSON.parse(JSON.stringify(source));
    copy.sectionId = nextId("section");
    copy.title = source.title ? `${source.title} Copy` : `${source.type} Copy`;
    copy.exercises.forEach(item => { item.instanceId = nextId("item"); });
    workout.sections.splice(index + 1, 0, copy);
    return copy;
  }

  function deleteSection(workout, index) {
    sectionAt(workout, index);
    workout.sections.splice(index, 1);
    return workout;
  }

  function findExercise(exerciseId) {
    const exercise = root.F4F_EXERCISES?.exercises.find(item => item.exerciseId === exerciseId);
    if (!exercise) throw new Error("Invalid exercise selection.");
    return exercise;
  }

  function fieldsForMeasurement(measurementType) {
    return [...(MEASUREMENT_FIELDS[measurementType] || [])];
  }

  function fieldsForFormat(format) {
    return { rounds: false, duration: false, instructionsEmphasis: false, durationLabel: "Duration", ...(FORMAT_FIELD_RULES[format] || {}) };
  }

  function sectionMetaDisplay(section) {
    const duration = section.duration ? `${section.duration} ${section.durationUnit || "min"}` : "";
    const rounds = section.rounds ? `${section.rounds} rounds` : "";
    if (["AMRAP", "EMOM", "E2MOM"].includes(section.format)) return [duration, section.format].filter(Boolean).join(" ");
    if (section.format === "Steady State") return [duration, "Steady State"].filter(Boolean).join(" ");
    if (section.format === "Rounds") return rounds || "Rounds";
    if (section.format === "For Time") return [rounds, duration ? `${duration} cap` : "", "For Time"].filter(Boolean).join(" · ");
    if (section.format === "Freeform / Instructions Only") return section.format;
    return [section.format !== "Standard" ? section.format : "", rounds, duration].filter(Boolean).join(" · ") || "Standard";
  }

  function prescriptionDisplay(item) {
    const value = item.prescription || {};
    if (value.distance) return `${value.distance} ${value.distanceUnit || "m"}`;
    if (value.calories) return `${value.calories} cal`;
    if (value.duration) return `${value.duration} sec`;
    if (value.reps) {
      const qualifier = value.repQualifier === "each-side" ? " each" : value.repQualifier === "alternating" ? " alternating" : value.repQualifier === "total" ? " total" : "";
      return `${value.reps}${qualifier}`;
    }
    if (value.rounds) return `${value.rounds} rounds`;
    return "Coach prescription";
  }

  function defaultPrescription(exercise) {
    const prescription = { coachInstruction: "" };
    fieldsForMeasurement(exercise.measurementType).forEach(field => {
      if (field === "loadUnit") prescription[field] = exercise.defaultUnit === "kg" ? "kg" : "lb";
      else if (field === "distanceUnit") prescription[field] = exercise.defaultUnit || "yd";
      else if (field === "repQualifier") prescription[field] = "total";
      else prescription[field] = "";
    });
    return prescription;
  }

  function addExercise(workout, exerciseId, sectionId) {
    const exercise = findExercise(exerciseId);
    const section = workout.sections.find(item => item.sectionId === sectionId);
    if (!section) throw new Error("Choose a valid destination section before adding an exercise.");
    section.exercises.push({ instanceId: nextId("item"), exerciseId, exerciseName: exercise.name, measurementType: exercise.measurementType, prescription: defaultPrescription(exercise) });
    return workout;
  }

  function removeExercise(workout, sectionIndex, exerciseIndex) {
    const section = sectionAt(workout, sectionIndex);
    if (!Number.isInteger(exerciseIndex) || exerciseIndex < 0 || exerciseIndex >= section.exercises.length) throw new Error("Invalid exercise position.");
    section.exercises.splice(exerciseIndex, 1);
    return workout;
  }

  function moveExercise(workout, sectionIndex, exerciseIndex, direction) {
    const section = sectionAt(workout, sectionIndex);
    const next = exerciseIndex + direction;
    if (!Number.isInteger(exerciseIndex) || ![-1, 1].includes(direction) || exerciseIndex < 0 || next < 0 || next >= section.exercises.length) return workout;
    [section.exercises[exerciseIndex], section.exercises[next]] = [section.exercises[next], section.exercises[exerciseIndex]];
    return workout;
  }

  function moveExerciseToSection(workout, fromSectionIndex, exerciseIndex, targetSectionId) {
    const source = sectionAt(workout, fromSectionIndex);
    const target = workout.sections.find(section => section.sectionId === targetSectionId);
    if (!target || !source.exercises[exerciseIndex]) throw new Error("Invalid exercise move.");
    target.exercises.push(source.exercises.splice(exerciseIndex, 1)[0]);
    return workout;
  }

  function updateSection(workout, index, field, value) {
    const section = sectionAt(workout, index);
    if (field === "type" && !SECTION_TYPES.includes(value)) throw new Error("Invalid section type.");
    if (field === "format" && !SECTION_FORMATS.includes(value)) throw new Error("Invalid section format.");
    if (!["type", "format", "title", "instructions", "rounds", "duration", "durationUnit"].includes(field)) throw new Error("Invalid section field.");
    section[field] = String(value);
    if (field === "title") {
      section.autoTitle = false;
      section.autoTitleKey = "";
    } else if (["type", "format"].includes(field) && section.autoTitle) {
      section.autoTitleKey = presetKeyForSection(section);
      section.title = nextAutoTitle(workout, section.autoTitleKey, section.sectionId);
    }
    return workout;
  }

  function itemExercise(item) {
    return item.exerciseSnapshot || root.F4F_EXERCISES?.exercises.find(exercise => exercise.exerciseId === item.exerciseId) || { name: item.exerciseName, measurementType: item.measurementType || "reps", defaultUnit: "reps", tags: [] };
  }

  function updatePrescription(workout, sectionIndex, exerciseIndex, field, value) {
    const item = sectionAt(workout, sectionIndex).exercises[exerciseIndex];
    if (!item) throw new Error("Invalid exercise position.");
    const allowed = new Set([...fieldsForMeasurement(itemExercise(item).measurementType), "coachInstruction"]);
    if (!allowed.has(field)) throw new Error("Field is not valid for this exercise.");
    item.prescription[field] = String(value);
    return workout;
  }

  function validatePrescription(exercise, prescription) {
    const errors = [];
    const numeric = field => prescription[field] === "" || prescription[field] == null || (Number.isFinite(Number(prescription[field])) && Number(prescription[field]) >= 0);
    fieldsForMeasurement(exercise.measurementType).filter(field => FIELD_META[field]?.[1] === "number").forEach(field => { if (!numeric(field)) errors.push(`${field} must be a non-negative number`); });
    if (prescription.repQualifier && !["total", "each-side", "alternating"].includes(prescription.repQualifier)) errors.push("invalid rep style");
    if (prescription.rpe && (Number(prescription.rpe) < 1 || Number(prescription.rpe) > 10)) errors.push("RPE must be between 1 and 10");
    if (prescription.percentage && (Number(prescription.percentage) < 1 || Number(prescription.percentage) > 100)) errors.push("percentage must be between 1 and 100");
    return errors;
  }

  function normalizeTemplate(item) {
    const workout = createWorkout({ name: item.name || "", description: item.description || "", createdBy: item.createdBy || "OwnerAdmin" });
    workout.workoutId = item.templateId || workout.workoutId;
    workout.templateId = item.templateId;
    workout.version = item.version || item.currentVersion;
    if (Array.isArray(item.sections) && item.sections.some(section => section && typeof section === "object")) {
      workout.sections = item.sections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(section => createSection({
        sectionId: section.sectionId,
        type: section.type,
        format: section.format,
        title: section.title || "",
        instructions: section.instructions || "",
        rounds: section.rounds ?? "",
        duration: section.duration ?? "",
        durationUnit: section.durationUnit || "min",
        exercises: [...(section.exercises || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(entry => ({ instanceId: nextId("item"), exerciseId: entry.exerciseId, exerciseName: entry.exerciseName, measurementType: entry.measurementType || itemExercise(entry).measurementType, prescription: { ...entry.prescription } }))
      }));
      return workout;
    }
    const typeCounts = new Map();
    let currentSection = null;
    [...(item.exercises || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach(entry => {
      const legacyType = SECTION_TYPES.includes(entry.section) ? entry.section : "Custom";
      if (!currentSection || currentSection.type !== legacyType) {
        const count = (typeCounts.get(legacyType) || 0) + 1; typeCounts.set(legacyType, count);
        currentSection = addSection(workout, { type: legacyType, format: "Standard", title: count === 1 ? legacyType : `${legacyType} ${count}` });
      }
      currentSection.exercises.push({ instanceId: nextId("legacy"), exerciseId: entry.exerciseId, exerciseName: entry.exerciseName, measurementType: entry.measurementType || itemExercise(entry).measurementType, prescription: { ...entry.prescription } });
    });
    return workout;
  }

  function serializeTemplate(workout, { templateId = `template-${Date.now()}`, version = 1, timestamp = new Date().toISOString() } = {}) {
    if (!String(workout.name || "").trim()) throw new Error("Workout name is required.");
    if (!workout.sections.length) throw new Error("Add at least one section.");
    const seen = new Set();
    const sections = workout.sections.map((section, order) => {
      if (!section.sectionId || seen.has(section.sectionId)) throw new Error("Every section requires a unique stable ID.");
      seen.add(section.sectionId);
      if (!SECTION_TYPES.includes(section.type) || !SECTION_FORMATS.includes(section.format)) throw new Error("Section type or format is invalid.");
      if (!section.exercises.length && !String(section.instructions || "").trim()) throw new Error(`${section.title || section.type}: add an exercise or instructions.`);
      const exercises = section.exercises.map((item, exerciseOrder) => {
        const exercise = itemExercise(item);
        const errors = validatePrescription(exercise, item.prescription);
        if (errors.length) throw new Error(`${exercise.name}: ${errors.join(", ")}`);
        return Object.freeze({ order: exerciseOrder, exerciseId: item.exerciseId, exerciseName: exercise.name, measurementType: exercise.measurementType, prescription: Object.freeze({ ...item.prescription }) });
      });
      return Object.freeze({ sectionId: section.sectionId, order, type: section.type, format: section.format, title: String(section.title || "").trim(), instructions: String(section.instructions || "").trim(), rounds: section.rounds, duration: section.duration, durationUnit: section.durationUnit || "min", exercises: Object.freeze(exercises) });
    });
    return Object.freeze({ schemaVersion: 2, templateId, name: workout.name.trim(), description: String(workout.description || "").trim(), sections: Object.freeze(sections), createdBy: workout.createdBy, createdAt: timestamp, updatedAt: timestamp, version });
  }

  const state = { workout: null, favorites: new Set(), recent: [], targetSectionId: "" };

  function optionMarkup(values, selected = "all") {
    return [`<option value="all">All</option>`, ...values.map(value => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`)].join("");
  }

  function destinationLabels(sections) {
    const counts = new Map();
    sections.forEach(section => counts.set(sectionDisplayTitle(section), (counts.get(sectionDisplayTitle(section)) || 0) + 1));
    return new Map(sections.map((section, index) => {
      const title = sectionDisplayTitle(section);
      return [section.sectionId, counts.get(title) > 1 ? `${title} · ${section.type} · Section ${index + 1}` : title];
    }));
  }

  function resolveTargetSectionId(workout, preferredId = "") {
    return workout.sections.some(section => section.sectionId === preferredId) ? preferredId : (workout.sections[0]?.sectionId || "");
  }

  function refreshTargetSections() {
    const select = document.querySelector("#exercise-target-section");
    if (!select || !state.workout) return;
    state.targetSectionId = resolveTargetSectionId(state.workout, state.targetSectionId || select.value);
    const labels = destinationLabels(state.workout.sections);
    select.innerHTML = state.workout.sections.length
      ? state.workout.sections.map(section => `<option value="${section.sectionId}"${section.sectionId === state.targetSectionId ? " selected" : ""}>${escapeHtml(labels.get(section.sectionId))}</option>`).join("")
      : '<option value="">Add a section first</option>';
    select.disabled = !state.workout.sections.length;
  }

  function renderLibrary() {
    const container = document.querySelector("#exercise-results");
    if (!container) return;
    const filters = { query: document.querySelector("#exercise-search").value, category: document.querySelector("#exercise-category").value, equipment: document.querySelector("#exercise-equipment").value, movementPattern: document.querySelector("#exercise-pattern").value };
    let items = root.F4F_EXERCISES.filterExercises(root.F4F_EXERCISES.exercises, filters);
    if (document.querySelector("#exercise-favorites").checked) items = items.filter(item => state.favorites.has(item.exerciseId));
    document.querySelector("#exercise-count").textContent = `${items.length} exercises`;
    const disabled = state.workout.sections.length ? "" : " disabled";
    document.querySelector("#recent-exercises").innerHTML = state.recent.length ? state.recent.map(id => `<button type="button" data-add-exercise="${id}"${disabled}>${escapeHtml(findExercise(id).name)}</button>`).join("") : "<span>No exercises selected yet.</span>";
    container.innerHTML = items.map(exercise => `<article class="exercise-card"><div><span class="library-source">F4F Library</span><h3>${escapeHtml(exercise.name)}</h3><p>${escapeHtml(exercise.category)} · ${escapeHtml(exercise.movementPattern)}</p><small>${escapeHtml(exercise.equipment)} · ${escapeHtml(exercise.measurementType.replaceAll("_", " "))}</small></div><div class="exercise-actions"><button class="icon-button" type="button" data-favorite-exercise="${exercise.exerciseId}" aria-label="${state.favorites.has(exercise.exerciseId) ? "Remove from" : "Add to"} favorites" aria-pressed="${state.favorites.has(exercise.exerciseId)}">★</button><button class="secondary-button compact-button" type="button" data-add-exercise="${exercise.exerciseId}"${disabled}>Add</button></div></article>`).join("") || "<div class=\"empty-state\"><strong>No exercises match those filters.</strong></div>";
  }

  function fieldMarkup(field, value) {
    const [label, type, options] = FIELD_META[field];
    if (type === "select") return `<label>${label}<select data-prescription="${field}">${options.map(option => `<option value="${option}"${value === option ? " selected" : ""}>${option.replace("-", " ")}</option>`).join("")}</select></label>`;
    return `<label>${label}<input data-prescription="${field}" type="${type}" min="0" step="${options || "any"}" value="${escapeHtml(value)}"></label>`;
  }

  function sectionOptions(selected, values) {
    return values.map(value => `<option${value === selected ? " selected" : ""}>${escapeHtml(value)}</option>`).join("");
  }

  function fieldEditRequiresRender(field) {
    return field === "format";
  }

  function refreshEditedSection(sectionNode, section) {
    const heading = sectionNode.querySelector(".section-header h2");
    const meta = sectionNode.querySelector(".section-header p");
    if (heading) heading.textContent = section.title || section.type;
    if (meta) meta.textContent = sectionMetaDisplay(section);
    refreshTargetSections();
  }

  function refreshEditedPrescription(exerciseNode, item) {
    const summary = exerciseNode.querySelector(".prescription-summary");
    if (summary) summary.textContent = prescriptionDisplay(item);
  }

  function renderBuilder(message = "") {
    const list = document.querySelector("#workout-exercise-list");
    if (!list || !state.workout) return;
    document.querySelector("#workout-name").value = state.workout.name;
    document.querySelector("#workout-description").value = state.workout.description;
    const exerciseCount = state.workout.sections.reduce((sum, current) => sum + current.exercises.length, 0);
    document.querySelector("#builder-count").textContent = `${state.workout.sections.length} sections · ${exerciseCount} exercises`;
    document.querySelector("#builder-status").textContent = message;
    const destinationNames = destinationLabels(state.workout.sections);
    list.innerHTML = state.workout.sections.map((current, sectionIndex) => {
      const exerciseMarkup = current.exercises.map((item, exerciseIndex) => {
        const exercise = itemExercise(item);
        const fields = fieldsForMeasurement(exercise.measurementType).map(field => fieldMarkup(field, item.prescription[field] ?? "")).join("");
        const targets = state.workout.sections.map(target => `<option value="${target.sectionId}"${target.sectionId === current.sectionId ? " selected" : ""}>${escapeHtml(destinationNames.get(target.sectionId))}</option>`).join("");
        return `<article class="builder-exercise" data-exercise-index="${exerciseIndex}"><header><div><span class="exercise-order">${exerciseIndex + 1}</span><h3>${escapeHtml(exercise.name)}</h3><small>${escapeHtml(exercise.measurementType.replaceAll("_", " "))} · <strong class="prescription-summary">${escapeHtml(prescriptionDisplay(item))}</strong></small></div><div class="reorder-actions"><button type="button" data-exercise-move="-1" aria-label="Move ${escapeHtml(exercise.name)} up">↑</button><button type="button" data-exercise-move="1" aria-label="Move ${escapeHtml(exercise.name)} down">↓</button><button type="button" data-remove-exercise aria-label="Remove ${escapeHtml(exercise.name)}">Remove</button></div></header><div class="prescription-grid">${fields}<label>Move to section<select data-move-to-section>${targets}</select></label></div><label class="coach-instruction">Coach instruction<textarea data-prescription="coachInstruction" rows="2">${escapeHtml(item.prescription.coachInstruction || "")}</textarea></label></article>`;
      }).join("") || "<div class=\"section-empty\">Add exercises from the library or keep this section instruction-only.</div>";
      const rules = fieldsForFormat(current.format);
      const roundsField = rules.rounds ? `<label>Rounds<input data-section-field="rounds" type="number" min="0" value="${escapeHtml(current.rounds)}"></label>` : "";
      const durationFields = rules.duration ? `<label>${rules.durationLabel}<input data-section-field="duration" type="number" min="0" value="${escapeHtml(current.duration)}"></label><label>Time unit<select data-section-field="durationUnit"><option${current.durationUnit === "min" ? " selected" : ""}>min</option><option${current.durationUnit === "sec" ? " selected" : ""}>sec</option></select></label>` : "";
      return `<section class="workout-section" data-section-index="${sectionIndex}" data-section-id="${current.sectionId}"><header class="section-header"><div><span class="section-number">Section ${sectionIndex + 1}</span><h2>${escapeHtml(current.title || current.type)}</h2><p>${escapeHtml(sectionMetaDisplay(current))}</p></div><div class="section-actions"><button type="button" data-section-move="-1" aria-label="Move section up">↑</button><button type="button" data-section-move="1" aria-label="Move section down">↓</button><button type="button" data-duplicate-section>Duplicate</button><button type="button" data-delete-section>Delete</button></div></header><div class="section-settings"><label>Type<select data-section-field="type">${sectionOptions(current.type, SECTION_TYPES)}</select></label><label>Format<select data-section-field="format">${sectionOptions(current.format, SECTION_FORMATS)}</select></label><label>Custom title<input data-section-field="title" maxlength="100" value="${escapeHtml(current.title)}"></label>${roundsField}${durationFields}</div><label class="section-instructions${rules.instructionsEmphasis ? " emphasized" : ""}">Section instructions / Coach note<textarea data-section-field="instructions" maxlength="500" rows="${rules.instructionsEmphasis ? 4 : 2}">${escapeHtml(current.instructions)}</textarea></label><div class="section-exercises">${exerciseMarkup}</div></section>`;
    }).join("") || "<div class=\"empty-state\"><strong>Add a section to begin building the session.</strong></div>";
    refreshTargetSections();
  }

  function apiPayload(workout, extra = {}) {
    const snapshot = serializeTemplate(workout, { templateId: extra.templateId || `template-${Date.now()}` });
    return { name: snapshot.name, description: snapshot.description, sections: snapshot.sections.map(section => ({ ...section, exercises: section.exercises.map(exercise => ({ ...exercise, prescription: { ...exercise.prescription } })) })), ...extra };
  }

  function templateListMarkup(items) {
    return items.map(item => `<article class="template-card"><div class="template-summary"><h2 class="template-name">${escapeHtml(item.name)}</h2><span class="template-version">Version ${escapeHtml(item.currentVersion)}</span></div><button class="template-open" type="button" data-open-template="${escapeHtml(item.templateId)}">Open Template</button></article>`).join("");
  }

  async function loadTemplates() {
    const list = document.querySelector("#template-list");
    if (!list) return;
    if (root.F4F_AUTH.isLocalPreviewAllowed()) { list.innerHTML = "<div class=\"empty-state\"><strong>Production templates are not loaded in local preview.</strong></div>"; return; }
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
        renderBuilder(`Sectioned template ready locally: ${template.name} · ${template.sections.length} sections.`);
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

  function addLibraryExercise(exerciseId) {
    const target = resolveTargetSectionId(state.workout, state.targetSectionId || document.querySelector("#exercise-target-section")?.value);
    if (!target) throw new Error("Add a workout section before assigning exercises.");
    state.targetSectionId = target;
    addExercise(state.workout, exerciseId, target);
    state.recent = [exerciseId, ...state.recent.filter(id => id !== exerciseId)].slice(0, 5);
    renderLibrary(); renderBuilder(`${findExercise(exerciseId).name} added.`);
  }

  function hasMeaningfulWorkout(workout) {
    return Boolean(workout && (String(workout.name || "").trim() || String(workout.description || "").trim() || workout.sections.length || workout.templateId));
  }

  function freshWorkoutAfterConfirmation(workout, confirmReset) {
    if (hasMeaningfulWorkout(workout) && !confirmReset("Clear this in-progress workout and start a new one? Saved templates will not be deleted.")) return null;
    return createWorkout();
  }

  function resetWorkout() {
    state.workout = createWorkout();
    state.targetSectionId = "";
    document.querySelector("#section-quick-chooser").hidden = true;
    document.querySelector("#add-section").setAttribute("aria-expanded", "false");
    renderLibrary();
    renderBuilder("Add your first section to begin building the session.");
    return state.workout;
  }

  function requestNewWorkout(confirmReset = root.confirm?.bind(root)) {
    const next = freshWorkoutAfterConfirmation(state.workout, confirmReset || (() => true));
    if (!next) return false;
    resetWorkout();
    return true;
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
    state.workout = createWorkout();
    renderLibrary(); renderBuilder("Add your first section to begin building the session.");
    document.querySelectorAll("#exercise-search,#exercise-category,#exercise-equipment,#exercise-pattern,#exercise-favorites").forEach(control => control.addEventListener(control.tagName === "INPUT" ? "input" : "change", renderLibrary));
    document.querySelector("#exercise-results").addEventListener("click", event => { const add = event.target.closest("[data-add-exercise]"); const favorite = event.target.closest("[data-favorite-exercise]"); if (add) addLibraryExercise(add.dataset.addExercise); if (favorite) { state.favorites.has(favorite.dataset.favoriteExercise) ? state.favorites.delete(favorite.dataset.favoriteExercise) : state.favorites.add(favorite.dataset.favoriteExercise); renderLibrary(); } });
    document.querySelector("#recent-exercises").addEventListener("click", event => { const add = event.target.closest("[data-add-exercise]"); if (add) addLibraryExercise(add.dataset.addExercise); });
    document.querySelector("#workout-name").addEventListener("input", event => { state.workout.name = event.target.value; });
    document.querySelector("#workout-description").addEventListener("input", event => { state.workout.description = event.target.value; });
    document.querySelector("#exercise-target-section").addEventListener("change", event => { state.targetSectionId = resolveTargetSectionId(state.workout, event.target.value); });
    document.querySelector("#add-section").addEventListener("click", event => { const chooser = document.querySelector("#section-quick-chooser"); chooser.hidden = !chooser.hidden; event.currentTarget.setAttribute("aria-expanded", String(!chooser.hidden)); });
    document.querySelector("#section-quick-chooser").addEventListener("click", event => { const choice = event.target.closest("[data-section-preset]"); if (!choice) return; const section = addQuickSection(state.workout, choice.dataset.sectionPreset); state.targetSectionId = section.sectionId; event.currentTarget.hidden = true; document.querySelector("#add-section").setAttribute("aria-expanded", "false"); renderLibrary(); renderBuilder(`${sectionDisplayTitle(section)} added and selected for exercise assignment.`); });
    document.querySelector("#new-workout").addEventListener("click", () => requestNewWorkout());
    document.querySelector("#load-demo-workout")?.addEventListener("click", () => { const key = document.querySelector("#demo-workout-select").value; state.workout = root.F4F_WORKOUT_FIXTURES[key](); state.targetSectionId = state.workout.sections[0]?.sectionId || ""; renderLibrary(); renderBuilder(`${state.workout.name} loaded for local review.`); });
    document.querySelector("#save-template").addEventListener("click", event => saveTemplate(event.currentTarget));
    document.querySelector("#workout-exercise-list").addEventListener("input", event => {
      const sectionNode = event.target.closest("[data-section-index]"); const exerciseNode = event.target.closest("[data-exercise-index]"); if (!sectionNode) return;
      const sectionIndex = Number(sectionNode.dataset.sectionIndex);
      if (event.target.dataset.sectionField) {
        const field = event.target.dataset.sectionField;
        updateSection(state.workout, sectionIndex, field, event.target.value);
        if (fieldEditRequiresRender(field)) renderBuilder();
        else refreshEditedSection(sectionNode, state.workout.sections[sectionIndex]);
      } else if (exerciseNode && event.target.dataset.prescription) {
        const exerciseIndex = Number(exerciseNode.dataset.exerciseIndex);
        updatePrescription(state.workout, sectionIndex, exerciseIndex, event.target.dataset.prescription, event.target.value);
        refreshEditedPrescription(exerciseNode, state.workout.sections[sectionIndex].exercises[exerciseIndex]);
      }
    });
    document.querySelector("#workout-exercise-list").addEventListener("change", event => {
      if (!event.target.matches("[data-move-to-section]")) return;
      const sectionNode = event.target.closest("[data-section-index]"); const exerciseNode = event.target.closest("[data-exercise-index]");
      moveExerciseToSection(state.workout, Number(sectionNode.dataset.sectionIndex), Number(exerciseNode.dataset.exerciseIndex), event.target.value); renderBuilder("Exercise moved.");
    });
    document.querySelector("#workout-exercise-list").addEventListener("click", event => {
      const sectionNode = event.target.closest("[data-section-index]"); if (!sectionNode) return; const sectionIndex = Number(sectionNode.dataset.sectionIndex); const exerciseNode = event.target.closest("[data-exercise-index]");
      if (event.target.closest("[data-section-move]")) moveSection(state.workout, sectionIndex, Number(event.target.closest("[data-section-move]").dataset.sectionMove));
      else if (event.target.closest("[data-duplicate-section]")) duplicateSection(state.workout, sectionIndex);
      else if (event.target.closest("[data-delete-section]")) deleteSection(state.workout, sectionIndex);
      else if (exerciseNode && event.target.closest("[data-exercise-move]")) moveExercise(state.workout, sectionIndex, Number(exerciseNode.dataset.exerciseIndex), Number(event.target.closest("[data-exercise-move]").dataset.exerciseMove));
      else if (exerciseNode && event.target.closest("[data-remove-exercise]")) removeExercise(state.workout, sectionIndex, Number(exerciseNode.dataset.exerciseIndex));
      else return;
      state.targetSectionId = resolveTargetSectionId(state.workout, state.targetSectionId);
      renderLibrary(); renderBuilder();
    });
    document.querySelector("#template-list")?.addEventListener("click", async event => {
      const button = event.target.closest("[data-open-template]"); if (!button) return;
      try { const { item } = await root.F4F_API.getWorkoutTemplate(button.dataset.openTemplate); state.workout = normalizeTemplate(item); state.targetSectionId = state.workout.sections[0]?.sectionId || ""; root.location.hash = "workout-builder"; renderLibrary(); renderBuilder(`Opened version ${item.version}. Your next save creates a new immutable version.`); }
      catch (error) { document.querySelector("#template-list").innerHTML = `<p class="data-state" data-state="error">${escapeHtml(error.message)}</p>`; }
    });
    await loadTemplates();
  }

  const api = Object.freeze({ SECTION_TYPES, SECTION_FORMATS, MEASUREMENT_FIELDS, QUICK_SECTION_PRESETS, createWorkout, createSection, addSection, addQuickSection, nextAutoTitle, sectionDisplayTitle, destinationLabels, resolveTargetSectionId, moveSection, duplicateSection, deleteSection, findExercise, fieldsForMeasurement, fieldsForFormat, fieldEditRequiresRender, sectionMetaDisplay, prescriptionDisplay, defaultPrescription, addExercise, removeExercise, moveExercise, moveExerciseToSection, updateSection, updatePrescription, validatePrescription, normalizeTemplate, serializeTemplate, hasMeaningfulWorkout, freshWorkoutAfterConfirmation, templateListMarkup, initializeUI });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.F4F_WORKOUTS = api;
  if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", initializeUI);
})(typeof window !== "undefined" ? window : globalThis);
