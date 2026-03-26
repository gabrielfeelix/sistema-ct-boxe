# Favicon Sizing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the oversized favicon assets with a square, padded version of `logo-ct` that renders cleanly in browser tabs and on Apple icons.

**Architecture:** Keep the existing metadata wiring and regenerate the asset files only. Produce a transparent square canvas, scale `logo-ct` down with margin, export `icon.png`, `apple-icon.png`, and `favicon.ico`, then redeploy and verify production.

**Tech Stack:** Python, Pillow, Next.js App Router, Vercel

---

### Task 1: Generate favicon assets

**Files:**
- Modify: `packages/web/src/app/icon.png`
- Modify: `packages/web/src/app/apple-icon.png`
- Modify: `packages/web/src/app/favicon.ico`

**Step 1:** Load `logo-ct.png` and fit it into a transparent square canvas with generous padding.

**Step 2:** Export 512x512 `icon.png` and 180x180 `apple-icon.png`.

**Step 3:** Export a multi-size `favicon.ico`.

### Task 2: Validate and publish

**Files:**
- Review: generated asset files and deployment status

**Step 1:** Confirm asset dimensions and that the local web build still passes.

**Step 2:** Commit only the favicon-related changes.

**Step 3:** Push to `origin/main` and verify the Vercel production deployment is `Ready`.
