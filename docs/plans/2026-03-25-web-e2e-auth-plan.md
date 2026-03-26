# Web E2E Authenticated Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add authenticated Playwright end-to-end coverage for six critical web journeys.

**Architecture:** Use Playwright with one real-login setup project that saves authenticated browser state, then run six logged-in specs against protected routes using stable page assertions and minimal self-created data.

**Tech Stack:** Next.js 16, Supabase Auth, Playwright, TypeScript, pnpm

---

### Task 1: Add Playwright Tooling

**Files:**
- Modify: `packages/web/package.json`
- Modify: `packages/web/.gitignore`
- Create: `packages/web/playwright.config.ts`
- Create: `packages/web/.env.e2e.example`

**Step 1: Add the dependency and scripts**

Add `@playwright/test` to `devDependencies` and scripts for `e2e`, `e2e:ui`, and `e2e:headed`.

**Step 2: Configure Playwright**

Set `testDir` to `tests/e2e`, base URL from `E2E_BASE_URL || http://127.0.0.1:3000`, define a `setup` project and a main `chromium` project using `.auth/admin.json`.

**Step 3: Ignore generated auth artifacts**

Ignore `tests/e2e/.auth/` so authenticated session files never enter git.

**Step 4: Provide env template**

Create `.env.e2e.example` with:
- `E2E_BASE_URL=http://127.0.0.1:3000`
- `E2E_ADMIN_EMAIL=admin@ctdoboxe.com.br`
- `E2E_ADMIN_PASSWORD=Ctdoboxe123`

**Step 5: Validate config loads**

Run: `pnpm --filter @ct-boxe/web exec playwright test --list`
Expected: Playwright lists `setup` plus six specs.

### Task 2: Build Auth Setup and Shared Helpers

**Files:**
- Create: `packages/web/tests/e2e/auth.setup.ts`
- Create: `packages/web/tests/e2e/fixtures.ts`

**Step 1: Create auth setup**

Implement a setup test that:
- opens `/login`
- fills `#email` and `#senha`
- submits
- waits for `/dashboard`
- writes storage state to `tests/e2e/.auth/admin.json`

**Step 2: Create shared helpers**

Add helpers for:
- generating unique test strings
- waiting for one of several stable headings
- handling empty-or-populated list states cleanly

**Step 3: Validate auth reuse**

Run: `pnpm --filter @ct-boxe/web exec playwright test tests/e2e/auth.setup.ts`
Expected: login succeeds and `.auth/admin.json` is created.

### Task 3: Cover Login and Dashboard

**Files:**
- Create: `packages/web/tests/e2e/auth-dashboard.spec.ts`

**Step 1: Add protected-route assertions**

Test should:
- open `/dashboard`
- confirm dashboard title or key dashboard widgets
- confirm sidebar/header presence
- confirm the login screen is not shown

**Step 2: Validate navigation shell**

Assert the authenticated layout contains:
- sidebar logo
- search or header shell
- at least one main metric card

**Step 3: Run the spec**

Run: `pnpm --filter @ct-boxe/web exec playwright test tests/e2e/auth-dashboard.spec.ts`
Expected: pass.

### Task 4: Cover Alunos Creation and Detail

**Files:**
- Create: `packages/web/tests/e2e/alunos-create-detail.spec.ts`
- Reference: `packages/web/src/app/(dashboard)/alunos/page.tsx`
- Reference: `packages/web/src/app/(dashboard)/alunos/novo/page.tsx`

**Step 1: Create a new aluno through the UI**

Fill required fields with unique values and submit.

**Step 2: Assert redirect or presence in listing**

Confirm success by one of:
- redirect to detail page
- row with created name visible in list

**Step 3: Open the detail page**

Assert key detail elements render:
- student name
- ficha/info block
- status badge or details shell

**Step 4: Run the spec**

Run: `pnpm --filter @ct-boxe/web exec playwright test tests/e2e/alunos-create-detail.spec.ts`
Expected: pass.

### Task 5: Cover Feed Post Creation

**Files:**
- Create: `packages/web/tests/e2e/feed-create-post.spec.ts`
- Reference: `packages/web/src/app/(dashboard)/feed/page.tsx`
- Reference: `packages/web/src/components/feed/FeedComposer.tsx`

**Step 1: Open the feed page**

Assert feed heading and composer are visible.

**Step 2: Publish a text-only post**

Use a unique message string, click publish, and wait for the post to appear.

**Step 3: Assert post visibility**

Confirm the new content renders in the timeline.

**Step 4: Run the spec**

Run: `pnpm --filter @ct-boxe/web exec playwright test tests/e2e/feed-create-post.spec.ts`
Expected: pass.

### Task 6: Cover Financeiro Inadimplência

**Files:**
- Create: `packages/web/tests/e2e/financeiro-inadimplencia.spec.ts`
- Reference: `packages/web/src/app/(dashboard)/financeiro/inadimplencia/page.tsx`

**Step 1: Open the protected route**

Go to `/financeiro/inadimplencia`.

**Step 2: Assert stable rendering**

Accept either:
- title plus totals card and rows
- title plus empty state

**Step 3: Run the spec**

Run: `pnpm --filter @ct-boxe/web exec playwright test tests/e2e/financeiro-inadimplencia.spec.ts`
Expected: pass.

### Task 7: Cover Notificações and Stories

**Files:**
- Create: `packages/web/tests/e2e/notificacoes.spec.ts`
- Create: `packages/web/tests/e2e/stories.spec.ts`
- Reference: `packages/web/src/app/(dashboard)/notificacoes/page.tsx`
- Reference: `packages/web/src/app/(dashboard)/stories/page.tsx`

**Step 1: Add notificações coverage**

Assert page shell loads and inbox/filter/search controls render.

**Step 2: Add stories coverage**

Assert page shell loads and either list cards or empty state render.

**Step 3: Run both specs**

Run: `pnpm --filter @ct-boxe/web exec playwright test tests/e2e/notificacoes.spec.ts tests/e2e/stories.spec.ts`
Expected: pass.

### Task 8: Full Validation and Delivery

**Files:**
- Review staged changes only

**Step 1: Run full E2E suite**

Run: `pnpm --filter @ct-boxe/web exec playwright test`
Expected: all six specs plus setup pass.

**Step 2: Re-run quality gates**

Run:
- `pnpm --filter @ct-boxe/web lint`
- `pnpm --filter @ct-boxe/web typecheck`

Expected: both pass.

**Step 3: Commit**

```bash
git add packages/web/package.json packages/web/.gitignore packages/web/playwright.config.ts packages/web/.env.e2e.example packages/web/tests/e2e docs/plans/2026-03-25-web-e2e-auth-design.md docs/plans/2026-03-25-web-e2e-auth-plan.md
git commit -m "test(web): add authenticated e2e coverage"
```
