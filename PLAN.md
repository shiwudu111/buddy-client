# PLAN.md

## Today

Main home stability and experience closeout.

## Goal

Close the remaining Main home tasks in one scoped client pass:

1. Validate and keep the current `idleShow` life feedback and diagnostics gate changes.
2. Extend pet life feedback so idle bubbles react to hunger, energy, and mood snapshots.
3. Record the art-resource replacement inventory and avoid unsafe UI skin replacement before assets exist.
4. Keep DevLog visible in dev/staging, hide it by default in prod, and allow diagnostics override.
5. Run TypeScript validation and prepare a clean client commit without Cocos settings noise or `.tmp/`.

## Allowed Files

- `PLAN.md`
- `docs/main-art-replacement-inventory.md`
- `assets/scripts/core/config.ts`
- `assets/scripts/ui/login/LoginController.ts`
- `assets/scripts/ui/main/MainController.ts`
- `assets/scripts/ui/main/MainLifeFeedback.ts`
- `assets/scripts/ui/main/MainPetAnimator.ts`

## Out Of Scope

- Backend code.
- Hot update implementation internals.
- WSL sync script changes.
- Cocos settings noise:
  - `settings/v2/packages/cocos-service.json`
  - `settings/v2/packages/information.json`
- `.tmp/`
- New art assets that do not currently exist.

## Progress

- [x] State refresh and scope lock.
- [x] `idleShow` animator event and light idle bubble.
- [x] DevLog diagnostics gate for Login and Main.
- [x] Pet life stage 2: idle bubbles react to current pet status snapshot.
- [x] Art replacement inventory documented.
- [x] Diagnostics override supports local storage and `globalThis.BUDDY_DIAGNOSTICS_ENABLED`.
- [ ] TypeScript validation after final edits.
- [ ] Review diff.
- [ ] Commit allowed files only.

## Validation

```powershell
bunx tsc --noEmit --ignoreDeprecations 6.0
git diff --stat
git status -sb
```

Manual phone validation after Cocos build/hot update:

- Staging still shows Login/Main DevLog.
- Prod manifest build hides DevLog unless diagnostics override is enabled.
- Main home waits on pet stage and eventually shows idle feedback.
- Idle feedback does not overwrite high-priority return/offline bubbles.
- Core actions still reset idle timing and keep tap-lock behavior.

## Remaining Risk

- Phone validation still depends on a fresh Cocos build and hot update upload.
- UI skin replacement is intentionally blocked until panel/bubble/dock/button art assets are supplied.
