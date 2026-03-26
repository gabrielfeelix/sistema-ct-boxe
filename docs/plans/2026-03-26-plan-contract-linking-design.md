# Plan-Contract Linking Design

**Contexto**

Hoje o web trata o contrato como um modelo global com uma versao ativa unica. Isso resolve a emissao, mas nao atende a operacao real do CT, porque cada plano pode exigir um contrato diferente. Ao mesmo tempo, a tela de contratos ficou funcional, porem excessivamente fragmentada em cards, o que piora leitura, manutencao e compreensao dos estados.

**Objetivo**

Vincular contratos aos planos, permitir recorrencia customizavel por intervalo e unidade, reorganizar a tela de contratos para uma operacao mais profissional e garantir que a emissao do contrato no web e o documento exibido no app usem exatamente o contrato associado ao plano selecionado.

**Abordagens Consideradas**

1. Manter um contrato ativo global e apenas adicionar uma excecao por plano.
   Pro: menor mudanca imediata.
   Contra: continua ambiguidade operacional e aumenta regras especiais.

2. Mover a fonte do contrato para o plano, mantendo a central de contratos como biblioteca versionada.
   Pro: modelo claro, previsivel e extensivel.
   Contra: exige migracao e ajuste no fluxo de emissao.

3. Embutir o texto do contrato diretamente em cada plano.
   Pro: relacao direta simples.
   Contra: perde historico centralizado, reuso e governanca.

**Escolha**

Seguir com a abordagem 2. A central de contratos continua como biblioteca versionada, mas os planos passam a apontar para um contrato especifico. O fluxo de emissao deixa de depender do contrato ativo global e passa a renderizar o contrato vinculado ao plano.

**Modelo de Dados**

- Adicionar em `planos`:
  - `contrato_modelo_id`
  - `recorrencia_intervalo`
  - `recorrencia_unidade`
- Manter `tipo` como legado de compatibilidade, derivado da nova recorrencia quando necessario.
- Fazer backfill dos planos existentes:
  - `mensal` => `1 mes`
  - `trimestral` => `3 meses`
  - `semestral` => `6 meses`
  - `anual` => `1 ano`
- Associar planos legados ao contrato ativo atual quando existir um modelo unico operacional.

**Fluxo de Planos**

- Ao criar ou editar um plano, o operador informa:
  - nome
  - intervalo da recorrencia
  - unidade da recorrencia
  - valor
  - contrato associado
  - descricao
- A UI deve mostrar a recorrencia em linguagem natural e o contrato vinculado de forma objetiva.

**Fluxo de Contratos**

- A tela de contratos vira uma pagina editorial e operacional:
  - cabecalho mais limpo
  - faixa de status compacta
  - area principal de edicao
  - lateral com ajuda operacional, placeholders e contexto
  - historico em lista ou tabela mais densa, sem blocos grandes repetidos
- Tooltips explicam termos como versao ativa, snapshot, placeholders e PDF de referencia.

**Fluxo de Emissao**

- O contrato emitido passa a usar o `contrato_modelo_id` do plano selecionado.
- O snapshot salvo em `aluno_documentos` continua sendo a fonte para o app.
- Se o plano nao tiver contrato associado, o web bloqueia a emissao com feedback claro.
- A data final do contrato passa a ser calculada com base em `recorrencia_intervalo` + `recorrencia_unidade`.

**Leiturabilidade e UX**

- Reduzir dependencia de grids de cards altos.
- Melhorar hierarquia visual com cabecalho, secoes e densidade informacional consistente.
- Usar tooltips pequenos e discretos em informacoes sensiveis.
- Preservar o visual ja estabelecido do produto sem reinventar linguagem visual.

**Teste e Validacao**

- Atualizar hooks/tipos para refletir o novo modelo.
- Validar `lint`, `typecheck` e `build`.
- Ajustar ou ampliar E2E para cobrir:
  - cadastro de plano com contrato vinculado
  - emissao de contrato usando o contrato do plano
  - leitura do historico/versoes na central

**Riscos**

- A pagina de planos ja possui alteracoes locais fora deste escopo e precisa ser editada com integracao cuidadosa.
- Relacao Supabase entre `planos` e `contrato_modelos` pode exigir ajuste no `select`.
- Contratos legados sem associacao precisao de fallback coerente durante migracao.
