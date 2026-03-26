# Web E2E Auth Increment Design

## Goal

Expand the authenticated Playwright coverage in `packages/web` from 6 operational flows to 9 without introducing flaky selectors or sensitive account mutations.

## Chosen Flows

1. `Eventos`: create an event from `/eventos/novo` and validate the protected listing at `/eventos`.
2. `Aulas`: create a class from `/aulas/nova` and validate the redirect to the protected detail page.
3. `Candidatos`: seed a candidate record, open the protected detail page, and validate the review shell.

## Alternatives Considered

### 1. Read-only coverage only

Lower implementation risk, but weak value. The suite already covers multiple protected pages that merely render.

### 2. Mixed CRUD plus seeded protected detail

Best balance. It increases business coverage while keeping the test data isolated and removable.

### 3. Profile or password mutation

Rejected for this overnight pass. Changing account metadata or credentials is possible, but it is a worse trade-off because the same admin account is reused for all authenticated tests.

## Design

### Test strategy

- Reuse the existing authenticated `storageState`.
- Add three specs under `packages/web/tests/e2e`.
- Keep the selectors anchored on visible headings, buttons, and semantic fields.
- Avoid media uploads and irreversible actions through the UI.

### Data management

- Add helper functions to `packages/web/tests/e2e/helpers.ts` for:
  - deleting `eventos` by title prefix
  - deleting `aulas` by title prefix
  - inserting and deleting `candidatos`
- Use service-role cleanup and seeding only when needed.
- Prefix all generated test data with an E2E tag and current timestamp.

### Validation

- `pnpm --filter @ct-boxe/web lint`
- `pnpm --filter @ct-boxe/web typecheck`
- `pnpm --filter @ct-boxe/web build`
- `pnpm --filter @ct-boxe/web test:e2e`

## Safety Constraints

- Do not modify admin credentials.
- Do not commit unrelated workspace changes.
- Clean up created rows even when a spec fails.
