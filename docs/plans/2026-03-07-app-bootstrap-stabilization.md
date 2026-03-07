# App Bootstrap Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restaurar o boot do app Expo no `packages/app`, eliminando a tela branca e removendo regressões introduzidas nas últimas tentativas de correção.

**Architecture:** A correção será feita em três frentes: alinhar a pilha `nativewind`/`react-native-css-interop`, simplificar o provider customizado do Gluestack para não executar configuração desnecessária no native runtime, e restaurar o `AuthContext` para uma implementação estável e previsível. A validação final será feita com `tsc --noEmit` e `expo export` para garantir que o bundle compila e que o bootstrap não depende de estado inconsistente.

**Tech Stack:** Expo Router, Expo SDK 55, React Native 0.83, NativeWind 4, Supabase, TypeScript, pnpm

---

### Task 1: Corrigir dependências de estilo

**Files:**
- Modify: `packages/app/package.json`
- Modify: `pnpm-lock.yaml`

**Step 1: Ajustar dependência incompatível**

Remover a versão fixa antiga de `react-native-css-interop` e alinhar com a versão usada por `nativewind`.

**Step 2: Atualizar lockfile**

Run: `pnpm install --filter @ct-boxe/app...`
Expected: lockfile atualizado sem conflito de versão entre `nativewind` e `react-native-css-interop`

**Step 3: Commit**

```bash
git add packages/app/package.json pnpm-lock.yaml
git commit -m "fix(app): align nativewind runtime dependencies"
```

### Task 2: Simplificar provider nativo

**Files:**
- Modify: `packages/app/components/ui/gluestack-ui-provider/index.tsx`

**Step 1: Remover import e estado mortos**

Eliminar dependência em `config.ts` e qualquer lógica de `colorScheme` que não seja necessária no native runtime.

**Step 2: Manter apenas providers funcionais**

Preservar `OverlayProvider` e `ToastProvider` com um container mínimo e estável.

**Step 3: Commit**

```bash
git add packages/app/components/ui/gluestack-ui-provider/index.tsx
git commit -m "fix(app): simplify native gluestack provider"
```

### Task 3: Restaurar AuthContext estável

**Files:**
- Modify: `packages/app/contexts/AuthContext.tsx`

**Step 1: Remover timeouts especulativos**

Voltar para a estratégia estável de leitura de sessão e perfil do usuário sem `withTimeout` aplicado aos builders do Supabase.

**Step 2: Manter only defensive cleanup**

Preservar apenas a proteção segura no cleanup da subscription, se necessário.

**Step 3: Commit**

```bash
git add packages/app/contexts/AuthContext.tsx
git commit -m "fix(app): restore stable auth bootstrap"
```

### Task 4: Validar bootstrap

**Files:**
- No file changes required

**Step 1: Rodar typecheck**

Run: `pnpm --filter @ct-boxe/app typecheck`
Expected: PASS

**Step 2: Rodar export do Expo**

Run: `pnpm --filter @ct-boxe/app exec expo export --platform android --output-dir .expo-export-check`
Expected: bundle Android gerado sem erro de rota ou bootstrap

**Step 3: Revisar status**

Run: `git status --short`
Expected: apenas as mudanças planejadas no app e arquivos de documentação
