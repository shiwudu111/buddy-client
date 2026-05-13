# AGENTS.md

## Execution rules for this repo

- Treat `./PLAN.md` as the product source of truth.
- For the current cycle, only implement the items listed under `## Today`.
- Do not expand scope beyond the files, modules, and acceptance criteria listed in `PLAN.md`.
- Respect the existing constraints in `PLAN.md`:
  - student side only
  - do not implement complex AI generation
  - do not modify stable flows outside Main unless explicitly required
- Before editing code:
  1. restate today's scope
  2. list files to touch
  3. list validation commands
- Implement milestone by milestone.
- After each milestone, run validation.
- If backend integration blocks progress, ship the local preset fallback first.
- Keep diffs minimal and localized.
- Do not perform unrelated refactors, renames, dependency upgrades, or style rewrites.
- Update progress in `PLAN.md` as milestones are completed.