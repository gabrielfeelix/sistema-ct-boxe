# Monorepo Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit the current monorepo state, identify reproducible failures, and fix the highest-signal validation blockers without disturbing unrelated local work.

**Architecture:** Use validation commands as the source of truth. Fix configuration/package issues first because they block reliable review results, then separate residual lint debt from hard build/typecheck failures.

**Tech Stack:** pnpm workspaces, Next.js, Expo, TypeScript

---

### Task 1: Reproduce current failures

**Files:**
- Review: package scripts and current git status

**Step 1:** Run web and app validation commands.

**Step 2:** Record which failures are reproducible now.

### Task 2: Fix workspace validation blockers

**Files:**
- Modify: `packages/app/tsconfig.json`
- Modify: `packages/shared/src/utils/index.ts`
- Modify: `packages/shared/src/validations/serie-aula.ts`

**Step 1:** Exclude generated Expo export directories from app typechecking.

**Step 2:** Remove duplicate exports in shared utils.

**Step 3:** Replace cross-package alias dependency in shared validation with a local helper.

### Task 3: Revalidate and report residual risk

**Files:**
- Review: command outputs for `typecheck`, `build`, and `lint`

**Step 1:** Rerun workspace typecheck and package builds.

**Step 2:** Document remaining lint debt and testing limits.
