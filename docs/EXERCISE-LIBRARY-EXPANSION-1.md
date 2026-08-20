# Exercise Library Expansion 1

This is a local review artifact. It does not seed AWS or add candidates to the production Coach bundle.

## Baseline audit

The approved production library remains 89 exercises with 89 unique, unchanged IDs. The baseline is strongest in free-weight strength work, while machine strength, exercise synonyms, and several common conditioning and movement-preparation variations are underrepresented. Equipment naming also needs a future controlled normalization (`Band` versus `Resistance Band`, `Bike` versus `Air Bike`) rather than an ID-breaking edit.

## Candidate proposal

`seed/exercise-expansion-candidates.js` contains a review-only proposal spanning Strength, Power, Plyometrics, Speed, Agility / Change of Direction, Conditioning, Core, and Mobility / Warm-up. Every candidate has a deterministic candidate ID, measurement type, unit, equipment, movement pattern, aliases, tags, and review status. Records marked `NEEDS_TAXONOMY_REVIEW` require explicit Coach naming/taxonomy approval.

Recommended approval sequence:

1. Approve high-confidence missing staples and machine exercises.
2. Review canonical names, equipment taxonomy, measurement types, and duplicate movement intent.
3. Approve aliases separately from canonical display names.
4. Promote only the approved subset into `seed/exercises.json` through the source generator.
5. Add an explicit, idempotent metadata-backfill path for aliases on the existing 89 records; the current insert-only seed correctly skips existing DynamoDB items.
6. Plan and review Terraform/API/frontend impact before any production deployment or seed execution.

## Naming standard

- Use concise Title Case canonical names and singular exercise names.
- Use hyphens for established compound modifiers, such as `Push-Up` and `Single-Arm`.
- Spell out defining equipment in canonical names (`Dumbbell`, `Medicine Ball`); keep `DB`, `KB`, `Med Ball`, and similar variants as aliases.
- Prefer equipment followed by movement when equipment defines the variation (`Dumbbell Bench Press`).
- Preserve existing canonical names and IDs until an explicit migration is approved.
- Treat common alternate names (`RFESS`, `Bulgarian Split Squat`) as searchable aliases rather than duplicate exercises.

## Historical-program import workflow

Export historical programming without athlete names or personal data, normalize exercise text, count frequency, map exact and alias matches to existing IDs, and place unmatched terms into a Coach review queue. Coach approval must decide whether each term is an alias, a genuinely new exercise, or a typo. Only then should deterministic records be promoted through the idempotent seed process.

## Production boundary

The current DynamoDB schema, API routes, production authorization, and 89-item seed behavior require no structural change for aliases. Production rollout will require a reviewed alias metadata update strategy because existing items are intentionally protected from overwrite by the current seed script. No candidates should be seeded until John/Jess approve the list.
