# Web Branding and Badge Fixes Design

**Objective**

Apply focused fixes to the web app without broad refactors: stabilize the user avatar display in the header, fix broken badge rendering in the dashboard metrics and profile labels, replace the textual brand with the `logo-ct` asset, and update browser tab branding to `CT de Boxe - Argel Riboli`.

**Scope**

- Reuse existing avatar logic instead of introducing a new profile system.
- Fix only the visibly broken badges and badge-like pills shown in the current UI.
- Update web branding assets and metadata with minimal file movement.
- Validate the web app with smoke tests plus `lint`, `typecheck`, and `build`.

**Approach**

1. Use the existing professor data source and shared avatar component to support photo rendering with a safe initials fallback.
2. Replace fragile inline badge styling in header and metric cards with tighter utility classes and ASCII-safe icons/text.
3. Copy `logo-ct.png` into the web app public assets and use it in sidebar branding and tab icons.
4. Keep all changes localized to the web package to avoid regressions in the mobile app.

**Validation**

- Manual checks on login/header/dashboard/sidebar.
- Automated checks with `pnpm --filter @ct-boxe/web lint`, `typecheck`, and `build`.
- Final git review before commit and push.
