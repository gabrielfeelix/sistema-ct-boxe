# Web E2E Auth Increment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the authenticated Playwright suite in `packages/web` from 6 to 9 protected business flows.

**Architecture:** Reuse the existing Playwright setup project and shared helpers, then add three more specs that exercise event creation, class creation, and candidate detail review. Seed and cleanup are handled in helper functions so tests remain deterministic and do not leak state into later runs.

**Tech Stack:** Next.js 16, Playwright, Supabase, pnpm, TypeScript

---

### Task 1: Extend E2E data helpers

**Files:**
- Modify: `packages/web/tests/e2e/helpers.ts`

**Step 1: Add cleanup helper for events**

Add a helper that deletes rows from `eventos` matching a generated title prefix.

**Step 2: Add cleanup helper for classes**

Add a helper that deletes rows from `aulas` matching a generated title prefix.

**Step 3: Add seed and cleanup helpers for candidates**

Add helper functions that insert a minimal `candidatos` row and delete it after the spec.

**Step 4: Run typecheck**

Run: `pnpm --filter @ct-boxe/web typecheck`
Expected: PASS

**Step 5: Commit later with spec changes**

Keep helper changes grouped with the new E2E specs.

### Task 2: Add event creation E2E coverage

**Files:**
- Create: `packages/web/tests/e2e/eventos-create.spec.ts`

**Step 1: Write the spec**

Open `/eventos/novo`, fill required fields, submit, and validate the protected listing shows the new event.

**Step 2: Ensure cleanup**

Wrap the spec in `try/finally` and remove the event by title prefix.

**Step 3: Run the spec**

Run: `pnpm --filter @ct-boxe/web test:e2e -- eventos-create.spec.ts`
Expected: PASS

### Task 3: Add class creation E2E coverage

**Files:**
- Create: `packages/web/tests/e2e/aulas-create.spec.ts`

**Step 1: Write the spec**

Open `/aulas/nova`, fill required fields, submit, and validate redirect to `/aulas/[id]` with the created title visible.

**Step 2: Ensure cleanup**

Remove the created `aulas` row by generated title prefix after the spec.

**Step 3: Run the spec**

Run: `pnpm --filter @ct-boxe/web test:e2e -- aulas-create.spec.ts`
Expected: PASS

### Task 4: Add candidate detail E2E coverage

**Files:**
- Create: `packages/web/tests/e2e/candidatos-detail.spec.ts`

**Step 1: Seed test candidate**

Insert a candidate with deterministic test data through the service-role helper.

**Step 2: Write the spec**

Open `/candidatos/[id]`, validate heading, status badge shell, and the candidate review sections.

**Step 3: Ensure cleanup**

Delete the seeded candidate in `finally`.

**Step 4: Run the spec**

Run: `pnpm --filter @ct-boxe/web test:e2e -- candidatos-detail.spec.ts`
Expected: PASS

### Task 5: Run full validation

**Files:**
- Verify: `packages/web/playwright.config.ts`
- Verify: `packages/web/tests/e2e`

**Step 1: Run lint**

Run: `pnpm --filter @ct-boxe/web lint`
Expected: PASS

**Step 2: Run typecheck**

Run: `pnpm --filter @ct-boxe/web typecheck`
Expected: PASS

**Step 3: Run build**

Run: `pnpm --filter @ct-boxe/web build`
Expected: PASS

**Step 4: Run the full authenticated suite**

Run: `pnpm --filter @ct-boxe/web test:e2e`
Expected: PASS with the setup project plus 9 authenticated flows.

### Task 6: Publish and verify deployment

**Files:**
- Verify: `packages/web/tests/e2e`
- Verify: `docs/plans/2026-03-25-web-e2e-auth-increment-design.md`
- Verify: `docs/plans/2026-03-25-web-e2e-auth-increment-plan.md`

**Step 1: Commit**

Run:

```bash
git add docs/plans/2026-03-25-web-e2e-auth-increment-design.md docs/plans/2026-03-25-web-e2e-auth-increment-plan.md packages/web/tests/e2e
git commit -m "test(web): expand authenticated e2e coverage"
```

Expected: commit created with only E2E increment changes.

**Step 2: Push**

Run: `git push origin main`
Expected: remote updated.

**Step 3: Verify production deployment**

Check the production URL after the push-triggered deployment reaches ready state.
