# Sectioned Workout Sessions

Phase 3C evolves an immutable workout-template version from a flat exercise list to a versioned section document. It does not change the DynamoDB partition/sort keys, metadata pointer, idempotency receipt, API routes, or OwnerAdmin authorization.

## Version snapshot

Each new version has `schemaVersion: 2` and an ordered `sections` array. A section contains:

- stable `sectionId` and array-derived `order`
- `type`, `format`, optional custom `title`, and `instructions`
- optional `rounds`, `duration`, and `durationUnit`
- ordered `exercises`, each retaining its exercise ID, name, measurement type, and full prescription

Exercise prescriptions support reps, a `repQualifier` of `total`, `each-side`, or `alternating`, load/unit, distance/unit, duration, calories, rest, tempo, RPE, percentage, and Coach instruction.

## Coach workflow defaults

The Add Section shortcut maps common Coach choices to the existing type/format model. Superset creates `Strength` + `Superset`; the other shortcuts create the matching type with `Standard` format. Auto-generated titles are unique within the workout: `SS 1`, `SS 2`, and `SS 3`; then `Strength`, `Strength 2`; `Metcon`, `Metcon 2`; and equivalent numbering for other repeated shortcuts.

Auto-title tracking exists only in local browser state and is never serialized. If a Coach edits a title, it becomes a custom title and later type/format changes do not overwrite it. An untouched generated title may be recalculated after a type or format change. Section display titles are shared by builder headings, Exercise Library destinations, and Move to Section choices.

New Workout clears only the local builder state after confirmation when meaningful work exists. It does not call a delete API or remove a saved DynamoDB template. A brand-new workout begins with no implicit section.

## Phase 3B compatibility

Historical Phase 3B version records remain untouched. When the Coach opens a flat version, the browser:

1. orders exercises by their existing `order`;
2. creates a new section whenever the legacy `section` label changes, preserving non-contiguous runs as separate sections;
3. retains exercise ordering inside each resulting section and labels repeated runs naturally, such as `Strength 2`;
4. maps unknown labels to a Custom section; and
5. writes the normalized nested structure only if the Coach explicitly saves a new immutable version.

The write API temporarily continues accepting the legacy flat request shape so an older loaded client cannot be broken during a staged rollout. All Phase 3C clients submit the nested shape.

## Future Athlete compatibility

The immutable exercise snapshot retains `measurementType`. A future Athlete result model can use that field to request only applicable results—weight, reps, time, distance, calories, completion, or rounds—without changing historical Coach prescriptions.
