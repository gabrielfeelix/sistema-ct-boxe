# Contract Templates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a versioned contract template center in web settings and emit app-signable documents from the active template when a contract is created.

**Architecture:** Introduce a dedicated `contrato_modelos` table and a small rendering utility for placeholder substitution. The web admin gets a new settings page for contract versions, while `/contratos/novo` generates an `aluno_documentos` snapshot from the active template so the app consumes the same contract text.

**Tech Stack:** Next.js 16, Supabase, TypeScript, React, pnpm

---

### Task 1: Add database support for contract templates

**Files:**
- Create: `packages/web/migrations/20260325_create_contrato_modelos.sql`
- Modify: `packages/web/runSQL_fase_app.cjs`

**Step 1: Create the new table migration**

Add `contrato_modelos` with title, slug, version, summary, body text, optional PDF URL, active flag, and timestamps.

**Step 2: Add indexes and sane uniqueness**

Use uniqueness on `(slug, versao)` and an index for active templates.

**Step 3: Update the bootstrap SQL script**

Keep local setup scripts aware of the new table so the environment can be rebuilt consistently.

**Step 4: Seed one default active version**

Insert a default `contrato-padrao` if none exists.

### Task 2: Add types and rendering utilities

**Files:**
- Modify: `packages/web/src/types/index.ts`
- Create: `packages/web/src/lib/contracts/template.ts`

**Step 1: Add contract template types**

Define the row and form types used by the admin page and generation flow.

**Step 2: Add placeholder rendering**

Create a pure renderer that replaces supported variables with concrete values.

**Step 3: Add preview helpers**

Include sample data helpers for previewing the text in the settings UI.

### Task 3: Add data hooks for contract templates

**Files:**
- Create: `packages/web/src/hooks/useContratoModelos.ts`

**Step 1: Load history and active version**

Expose a hook for listing, creating, editing, and activating template versions.

**Step 2: Keep the API thin**

Use direct Supabase access in the hook and return strongly typed rows.

### Task 4: Add the new settings page

**Files:**
- Modify: `packages/web/src/app/(dashboard)/configuracoes/page.tsx`
- Create: `packages/web/src/app/(dashboard)/configuracoes/contratos/page.tsx`
- Modify: `packages/web/src/constants/routes.ts`
- Modify: `packages/web/src/components/layout/Header.tsx`

**Step 1: Add the settings card and route constant**

Expose `Configurações > Contratos`.

**Step 2: Build the contract template page**

Add:

- summary cards
- create/edit form
- preview panel
- version history list
- activate action

**Step 3: Keep the UX text-first**

Use textarea editing and readable preview blocks rather than a heavy editor.

### Task 5: Link contract creation to the active template

**Files:**
- Modify: `packages/web/src/app/(dashboard)/contratos/novo/page.tsx`

**Step 1: Load the active template**

Before saving the contract, fetch the active `contrato_modelos` row.

**Step 2: Render the document body**

Use student and plan data to generate a snapshot text.

**Step 3: Emit `aluno_documentos`**

After the contract row is created, insert a pending document for the same student.

**Step 4: Guard against missing templates**

If there is no active template, fail fast with a clear admin-facing toast.

### Task 6: Extend E2E coverage for the new settings flow

**Files:**
- Modify: `packages/web/tests/e2e/helpers.ts`
- Create: `packages/web/tests/e2e/config-contratos-template.spec.ts`

**Step 1: Add cleanup helper for template test rows**

Allow removal of E2E template versions by slug prefix.

**Step 2: Add the spec**

Validate:

- config center card navigation
- template creation
- history visibility
- activation state

### Task 7: Validate and publish

**Files:**
- Verify: `packages/web/src/app/(dashboard)/configuracoes/contratos/page.tsx`
- Verify: `packages/web/src/app/(dashboard)/contratos/novo/page.tsx`
- Verify: `packages/web/tests/e2e/config-contratos-template.spec.ts`

**Step 1: Run lint**

Run: `pnpm --filter @ct-boxe/web lint`
Expected: PASS

**Step 2: Run typecheck**

Run: `pnpm --filter @ct-boxe/web typecheck`
Expected: PASS

**Step 3: Run build**

Run: `pnpm --filter @ct-boxe/web build`
Expected: PASS

**Step 4: Run E2E**

Run: `pnpm --filter @ct-boxe/web test:e2e`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/web docs/plans pnpm-lock.yaml
git commit -m "feat(web): add versioned contract templates"
```

**Step 6: Push and verify deploy**

Run:

```bash
git push origin main
vercel ls --yes
```

Expected: production deployment reaches `Ready`.
