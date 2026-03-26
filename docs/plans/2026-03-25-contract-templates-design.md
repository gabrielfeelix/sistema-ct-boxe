# Contract Templates Design

## Goal

Add a new `Configurações > Contratos` area in the web admin so the team can manage contract template versions, write the full contract text in the panel, keep historical versions, and ensure the mobile app uses the same emitted contract document.

## Problem

Today the web admin manages the commercial contract relationship in `/contratos`, but the app contract experience is driven by `aluno_documentos`. That means the business agreement and the signature document are not managed from a single source of truth.

## Chosen Approach

Use a text-first contract template system with version history in the web admin, then emit `aluno_documentos` from the active template whenever a new contract is created.

### Why this approach

- It matches the app's existing document/signature flow with minimal disruption.
- It gives the admin editable contract content instead of a static binary-only file.
- It keeps history and activation simple: one active version, many archived versions.
- It leaves room for an optional PDF reference URL later without making the first version brittle.

## Alternatives Considered

### 1. PDF-only templates

Fast to store, poor to edit, and weak for app rendering because the current app signature screen expects text.

### 2. Rich text editor with heavy formatting

Too much complexity for the current stack and unnecessary for the legal text workflow right now.

### 3. Text-first templates with versioning

Best fit. It is operationally useful now and uses the tables and flows already present in the app.

## Data Model

Create a new table for template versions, for example `contrato_modelos`, with:

- `id`
- `titulo`
- `slug`
- `versao`
- `resumo`
- `conteudo`
- `pdf_url` nullable
- `ativo`
- `created_at`
- `updated_at`

Rules:

- Multiple versions can exist for the same `slug`.
- Only one version should be active at a time.
- The emitted student document stores a snapshot of the generated text, so future template edits do not mutate already-issued contracts.

## Template Rendering

Support simple placeholder replacement in the template body, such as:

- `{{aluno_nome}}`
- `{{aluno_email}}`
- `{{plano_nome}}`
- `{{plano_tipo}}`
- `{{valor}}`
- `{{data_inicio}}`
- `{{data_fim}}`
- `{{renovacao_automatica}}`

The renderer should live in shared web logic so the generation path is deterministic and testable.

## Web UX

### Config center

Add a new card in `Centro de Configuracoes`:

- title: `Contratos`
- description: manage template versions and publish the active legal text used by the app

### Contracts settings page

The new page should include:

- a summary area with total versions and active template
- a create/edit form with title, slug, summary, body text, optional PDF URL
- a history list with version badges, activation state, and publish/activate actions
- a preview panel showing rendered placeholders using sample values

The page should be text-first, readable, and optimized for legal content editing rather than decorative UI.

## Contract Emission Flow

When a new contract is created in `/contratos/novo`:

1. Fetch the active template.
2. Render the template text with the selected student and plan data.
3. Create the commercial contract row as before.
4. Create an `aluno_documentos` pending record with:
   - a title derived from the template and plan
   - the rendered text snapshot
   - the same end date as validity when applicable

That makes the app show the open contract immediately in `Meus Contratos`.

## App Integration

No redesign is required in the app for the first iteration because it already:

- lists pending `aluno_documentos`
- opens the signature screen
- shows the `texto`
- marks the document as signed

The improvement is structural: the app and web now point to the same emitted contract source.

## Validation

- web lint
- web typecheck
- web build
- targeted smoke tests for contract settings and contract creation
- existing authenticated Playwright suite

## Risks

- Missing template at contract creation time. Mitigation: block creation with a clear admin error message.
- Placeholder drift. Mitigation: centralize rendering keys in one utility.
- Existing app rows without template metadata. Mitigation: preserve current reads from `aluno_documentos` and only enhance future emissions.
