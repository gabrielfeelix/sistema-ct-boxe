# Web Branding and Badge Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken web avatar and badges, replace branding with `logo-ct`, update tab metadata/favicon usage, and fully validate the web app before commit and push.

**Architecture:** Keep the implementation inside the existing Next.js web package. Reuse current professor hooks and shared UI pieces instead of adding a new data path. Limit styling changes to the affected header, sidebar, and metric card surfaces.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Supabase client hooks

---

### Task 1: Branding assets and metadata

**Files:**
- Create: `packages/web/public/logo-ct.png`
- Modify: `packages/web/src/app/layout.tsx`

**Step 1:** Copy `logo-ct.png` into the web public directory.

**Step 2:** Update the root metadata title to `CT de Boxe - Argel Riboli`.

**Step 3:** Point app icons to the copied branding asset.

**Step 4:** Verify the tab title and icon load in the dev server.

### Task 2: Header avatar and profile pill fixes

**Files:**
- Modify: `packages/web/src/components/layout/Header.tsx`
- Modify: `packages/web/src/hooks/useProfessores.ts`
- Reference: `packages/web/src/components/shared/AvatarInitials.tsx`

**Step 1:** Include `foto_url` in the lightweight professors query used by the header.

**Step 2:** Replace the initials-only square avatar in the header with the shared avatar component.

**Step 3:** Tighten the profile role badge styling to avoid visual breakage.

**Step 4:** Verify the header with and without `foto_url`.

### Task 3: Sidebar logo and label fixes

**Files:**
- Modify: `packages/web/src/components/layout/Sidebar.tsx`

**Step 1:** Replace the textual CT Boxe mark with the `logo-ct` asset.

**Step 2:** Keep the admin pill compact and visually stable.

**Step 3:** Verify the sidebar at desktop width.

### Task 4: Dashboard metric badge fixes

**Files:**
- Modify: `packages/web/src/components/dashboard/MetricCard.tsx`

**Step 1:** Replace broken encoded arrow characters with safe icon rendering.

**Step 2:** Tighten spacing and wrapping so the trend badge does not break layout.

**Step 3:** Verify positive and negative trend states on the dashboard.

### Task 5: Validation, review, and delivery

**Files:**
- Review: `git log`, `git diff`, changed web files

**Step 1:** Run `lint`, `typecheck`, and `build` for the web package.

**Step 2:** Smoke test the main web routes in the local dev server.

**Step 3:** Review recent commits and summarize notable existing history.

**Step 4:** Commit only the intended files and push to `origin/main`.
