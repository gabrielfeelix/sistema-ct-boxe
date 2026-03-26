# Web E2E Authenticated Design

## Goal
Criar uma base de testes E2E autenticados para o painel web que valide sessão real, middleware de proteção e seis fluxos logados de alto valor sem depender de suposições frágeis sobre dados existentes.

## Scope
- Configurar Playwright no `packages/web`.
- Implementar login real pela UI com reaproveitamento de sessão via `storageState`.
- Cobrir seis jornadas:
  1. Login real e dashboard.
  2. Alunos: criação e abertura do detalhe.
  3. Feed: criação de post textual.
  4. Financeiro: acesso à inadimplência e rendering do estado da tela.
  5. Notificações: acesso à inbox logada e rendering principal.
  6. Stories: acesso à biblioteca de trilhas e rendering principal.

## Approach
Usar Playwright com um projeto de `setup` que autentica uma vez em `/login` e grava `.auth/admin.json`. Os testes principais reutilizam esse estado para entrar direto nas rotas protegidas, reduzindo tempo e instabilidade sem abrir mão da autenticação real.

O desenho evita dependência rígida de massa de dados existente. Onde possível, o fluxo cria seu próprio dado mínimo pelo próprio sistema, como no caso de `Alunos` e `Feed`. Nas páginas mais analíticas, o teste valida que a rota protegida abre, o título principal aparece e a tela renderiza corretamente tanto com dados quanto em estado vazio.

## Test Data
- Credenciais padrão de E2E:
  - `admin@ctdoboxe.com.br`
  - `Ctdoboxe123`
- Essas credenciais já existem no bootstrap administrativo atual em `packages/web/scripts/setup_admins.mjs`.
- O desenho prevê override por variáveis de ambiente:
  - `E2E_ADMIN_EMAIL`
  - `E2E_ADMIN_PASSWORD`
  - `E2E_BASE_URL`

## Files
- `packages/web/package.json`
- `packages/web/playwright.config.ts`
- `packages/web/tests/e2e/auth.setup.ts`
- `packages/web/tests/e2e/fixtures.ts`
- `packages/web/tests/e2e/auth-dashboard.spec.ts`
- `packages/web/tests/e2e/alunos-create-detail.spec.ts`
- `packages/web/tests/e2e/feed-create-post.spec.ts`
- `packages/web/tests/e2e/financeiro-inadimplencia.spec.ts`
- `packages/web/tests/e2e/notificacoes.spec.ts`
- `packages/web/tests/e2e/stories.spec.ts`
- `packages/web/.gitignore`
- `packages/web/.env.e2e.example`

## Validation
- `pnpm --filter @ct-boxe/web exec playwright test --list`
- `pnpm --filter @ct-boxe/web exec playwright test`
- `pnpm --filter @ct-boxe/web lint`
- `pnpm --filter @ct-boxe/web typecheck`

## Risks and Handling
- Dados variáveis do banco:
  - Preferir criação via UI quando o fluxo exigir entidade concreta.
  - Nas telas de listagem analítica, aceitar tanto estado vazio quanto tabela/população.
- Sessão Supabase:
  - Resolver com login real no setup e `storageState`.
- Flakiness de transição Next/Sonner:
  - Esperar por URL final, headings e textos estruturais em vez de sleeps arbitrários.
