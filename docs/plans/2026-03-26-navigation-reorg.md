# Navigation Reorganization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganizar a navegacao lateral do web para refletir a rotina de gestao da academia e reduzir a central de configuracoes a um hub institucional enxuto.

**Architecture:** A sidebar passa a ser estruturada por blocos de prioridade operacional. A central de configuracoes perde o papel de menu operacional e fica apenas com itens institucionais. Um novo destino de `Seguranca Operacional` cobre o espaco administrativo sem quebrar a navegacao.

**Tech Stack:** Next.js, React, TypeScript, Tailwind, Supabase

---

### Task 1: Atualizar o modelo de rotas e titulos

**Files:**
- Modify: `packages/web/src/constants/routes.ts`
- Modify: `packages/web/src/components/layout/Header.tsx`

**Step 1:** Adicionar rota para `Seguranca Operacional`.

**Step 2:** Atualizar os titulos do header para refletir a nova entrada.

### Task 2: Reorganizar a sidebar

**Files:**
- Modify: `packages/web/src/components/layout/Sidebar.tsx`

**Step 1:** Trocar a lista unica por secoes ordenadas por prioridade de gestor.

**Step 2:** Inserir `Planos e Precificacao`, `Contratos` e `Seguranca Operacional` na sidebar.

**Step 3:** Preservar badges e regras `adminOnly`.

### Task 3: Enxugar a central de configuracoes

**Files:**
- Modify: `packages/web/src/app/(dashboard)/configuracoes/page.tsx`

**Step 1:** Remover cards operacionais da pagina.

**Step 2:** Manter somente `Perfil do Administrador` e `Central de Notificacoes`.

**Step 3:** Ajustar o texto para indicar que contratos e planos estao na navegacao principal.

### Task 4: Criar a tela de seguranca operacional

**Files:**
- Create: `packages/web/src/app/(dashboard)/configuracoes/seguranca-operacional/page.tsx`

**Step 1:** Criar uma tela administrativa coerente com o design do painel.

**Step 2:** Exibir orientacoes operacionais, status e atalhos uteis.

### Task 5: Validacao e publicacao

**Files:**
- Modify: apenas arquivos do escopo

**Step 1:** Rodar `pnpm --filter @ct-boxe/web lint`.

**Step 2:** Rodar `pnpm --filter @ct-boxe/web build`.

**Step 3:** Commitar, dar push e confirmar deploy `Ready`.
