# Plan-Contract Linking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Vincular contratos aos planos, suportar recorrencia customizavel e reorganizar a central de contratos sem quebrar a emissao no web nem a leitura no app.

**Architecture:** O contrato continua versionado em `contrato_modelos`, mas o plano passa a apontar para um modelo especifico. A emissao renderiza o snapshot a partir do contrato vinculado ao plano, enquanto a UI administrativa de planos e contratos passa a exibir e editar o novo modelo com mais clareza.

**Tech Stack:** Next.js, React, TypeScript, Supabase, Sonner, Tailwind, Playwright

---

### Task 1: Migrar o schema de planos

**Files:**
- Create: `packages/web/migrations/008_link_planos_to_contrato_modelos_and_custom_recurrence.sql`
- Modify: `packages/web/migrations/all-migrations.sql`
- Modify: `packages/web/migrations/database-setup-complete.sql`

**Step 1:** Escrever a migration com `contrato_modelo_id`, `recorrencia_intervalo` e `recorrencia_unidade`, incluindo `check`, `fk` e backfill.

**Step 2:** Atualizar os arquivos consolidados de migration para manter o bootstrap coerente.

**Step 3:** Aplicar a migration no banco do ambiente atual e verificar que os planos antigos foram convertidos.

**Step 4:** Commitar a migracao separadamente se a superficie de risco estiver alta.

### Task 2: Atualizar tipos e helpers de recorrencia

**Files:**
- Create: `packages/web/src/lib/planos/recorrencia.ts`
- Modify: `packages/web/src/types/index.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1:** Adicionar os novos campos de recorrencia e contrato no tipo `PlanoCompleto`.

**Step 2:** Criar helpers para formatar a recorrencia, derivar `tipo` legado e calcular proxima data.

**Step 3:** Rodar `typecheck` para garantir compatibilidade dos consumidores.

### Task 3: Ajustar hook de planos

**Files:**
- Modify: `packages/web/src/hooks/useContratos.ts`

**Step 1:** Atualizar o `select` para buscar os novos campos e o contrato vinculado.

**Step 2:** Normalizar o retorno para a UI sem perder compatibilidade com o campo `tipo`.

**Step 3:** Verificar que a tela de planos continua carregando e exibindo os dados antigos corretamente.

### Task 4: Refatorar a tela de planos

**Files:**
- Modify: `packages/web/src/app/(dashboard)/configuracoes/planos/page.tsx`

**Step 1:** Preservar as mudancas existentes no arquivo e substituir a recorrencia fixa por intervalo + unidade.

**Step 2:** Adicionar seletor do contrato associado.

**Step 3:** Atualizar resumo/listagem para mostrar recorrencia legivel e contrato vinculado.

**Step 4:** Validar criacao, edicao e ativacao de plano.

### Task 5: Reorganizar a central de contratos

**Files:**
- Create: `packages/web/src/components/shared/InfoTooltip.tsx`
- Modify: `packages/web/src/app/(dashboard)/configuracoes/contratos/page.tsx`

**Step 1:** Criar um tooltip reutilizavel leve e sem ruina visual.

**Step 2:** Reestruturar a pagina para reduzir blocos repetidos e melhorar hierarquia.

**Step 3:** Aplicar tooltips nos pontos de contexto operacional.

**Step 4:** Garantir que a criacao e ativacao de versao continuem funcionando.

### Task 6: Ajustar a emissao de contrato

**Files:**
- Modify: `packages/web/src/app/(dashboard)/contratos/novo/page.tsx`

**Step 1:** Parar de depender do contrato ativo global.

**Step 2:** Carregar o contrato a partir do plano selecionado.

**Step 3:** Calcular `dataFim` usando a nova recorrencia.

**Step 4:** Bloquear emissao quando o plano nao tiver contrato vinculado.

### Task 7: Atualizar testes

**Files:**
- Modify: `packages/web/tests/e2e/*`

**Step 1:** Ajustar os testes existentes que assumem contrato global ativo.

**Step 2:** Cobrir o fluxo de plano com contrato vinculado.

**Step 3:** Rodar a suite relevante e confirmar estabilidade.

### Task 8: Validacao final e publicacao

**Files:**
- Modify: apenas os arquivos do escopo

**Step 1:** Rodar `pnpm --filter @ct-boxe/web lint`.

**Step 2:** Rodar `pnpm --filter @ct-boxe/web typecheck`.

**Step 3:** Rodar `pnpm --filter @ct-boxe/web build`.

**Step 4:** Rodar os E2E relevantes.

**Step 5:** Fazer `git add` seletivo, `commit`, `push` e confirmar deploy `Ready`.
