# Home Rebuild Stable Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the app home screen using the latest complete historical design as reference, while keeping the screen stable without NativeWind/CSS interop in the home path.

**Architecture:** Recover the visual structure from the historical `a8da2fe` home and rebuild it with React Native primitives and inline styles. Keep navigation and data loading reintroduced in isolated steps so regressions can be caught immediately.

**Tech Stack:** Expo Router, React Native, Expo Vector Icons, Supabase-backed app data, TypeScript

---

### Task 1: Recover Historical UI Reference

**Files:**
- Modify: `packages/app/app/(tabs)/index.tsx`
- Reference: historical commit `a8da2fe`

**Step 1:** Inspect the historical home implementation from `a8da2fe`.

**Step 2:** Extract the structural sections to preserve:
- header
- stories rail
- hero/next class card
- today's classes section
- notices section

**Step 3:** Keep the current stable home as the baseline until the rebuilt layout is ready.

### Task 2: Rebuild Home Layout Without NativeWind

**Files:**
- Modify: `packages/app/app/(tabs)/index.tsx`

**Step 1:** Recreate the section hierarchy with React Native `View`, `Text`, `ScrollView`, `FlatList`, `TouchableOpacity`, and inline `style`.

**Step 2:** Reintroduce real data bindings for:
- stories
- unread notifications count
- next class
- today's classes
- notices

**Step 3:** Keep risky features disabled until layout stability is confirmed:
- story viewer modal
- push navigation from cards/buttons
- NativeWind `className`

**Step 4:** Run `pnpm --filter @ct-boxe/app typecheck`.

### Task 3: Replace Floating Navbar With Fixed Bottom Bar

**Files:**
- Modify: `packages/app/app/(tabs)/_layout.tsx`

**Step 1:** Rebuild the tab bar style so it is fixed to the bottom instead of floating.

**Step 2:** Preserve the current dark theme and red active state.

**Step 3:** Use modern rounded corners and safe spacing without relying on CSS interop.

**Step 4:** Run `pnpm --filter @ct-boxe/app typecheck`.

### Task 4: Reintroduce Navigation Safely

**Files:**
- Modify: `packages/app/app/(tabs)/index.tsx`

**Step 1:** Re-enable one navigation action at a time:
- notifications
- class details
- check-in

**Step 2:** After each step, verify that the screen still mounts without the navigation context error.

### Task 5: Validate and Hand Off

**Files:**
- Modify: `packages/app/app/(tabs)/index.tsx`
- Modify: `packages/app/app/(tabs)/_layout.tsx`

**Step 1:** Run `pnpm --filter @ct-boxe/app typecheck`.

**Step 2:** Summarize which parts were rebuilt from the old design and which risky behaviors remain intentionally disabled.
