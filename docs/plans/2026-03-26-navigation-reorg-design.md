# Navigation Reorganization Design

**Contexto**

A central de configuracoes hoje mistura configuracao primaria, operacao recorrente e itens administrativos secundarios. Para um gestor de academia isso aumenta friccao, porque tarefas de receita e operacao acabam escondidas dentro de um hub genérico.

**Objetivo**

Reorganizar a navegacao lateral priorizando o fluxo mental de gestao de academia, mover `Planos e Precificacao`, `Contratos` e `Seguranca Operacional` para a sidebar e reduzir a central de configuracoes para apenas `Perfil do Administrador` e `Central de Notificacoes`.

**Referencias de mercado**

Softwares de gestao fitness como Zen Planner e Glofox tratam membros, agenda, cobranca, comunicacao e equipe como eixo principal da navegacao. A inferencia aplicada aqui e: um gestor precisa ver primeiro operacao, receita e riscos; depois comunicacao e administracao.

**Abordagens consideradas**

1. Mover apenas os itens pedidos e manter a ordem atual da sidebar.
   Pro: menor mudanca.
   Contra: melhora pouco a navegabilidade.

2. Reorganizar a sidebar por prioridade operacional e manter a central enxuta.
   Pro: melhor alinhamento com uso real do gestor.
   Contra: muda habito de navegacao.

3. Eliminar a central de configuracoes e espalhar tudo.
   Pro: navegacao totalmente direta.
   Contra: perde um ponto de administracao institucional.

**Escolha**

Seguir com a abordagem 2.

**Estrutura proposta**

- Visao executiva
  - Dashboard
  - Central de Notificacoes
  - Relatorios
- Operacao diaria
  - Alunos
  - Candidatos
  - Presenca
  - Aulas
  - Eventos
- Receita e contratos
  - Financeiro
  - Contratos
  - Planos e Precificacao
- Conteudo e comunidade
  - Feed
  - Stories
- Equipe e administracao
  - Professores
  - Perfil do Admin
  - Seguranca Operacional

**Comportamento da central de configuracoes**

- A pagina `/configuracoes` deixa de ser menu geral.
- Passa a ser uma central institucional enxuta com dois acessos:
  - Perfil do Administrador
  - Central de Notificacoes
- O texto da pagina deixa claro que operacao comercial e contratos agora ficam na navegacao principal.

**Seguranca Operacional**

- Criar uma tela dedicada para este item.
- Como ainda nao ha motor completo de permissao e auditoria, a tela deve ser profissional e util:
  - boas praticas operacionais
  - status de protecao da conta
  - atalhos para revisar perfil e notificacoes
  - orientacao de higiene de acesso

**UX**

- Sidebar com agrupamentos e titulos curtos para reduzir carga cognitiva.
- Ordem feita por frequencia e impacto de negocio.
- Itens administrativos menos frequentes ficam abaixo, mas ainda acessiveis.

**Riscos**

- Mudanca de ordem pode causar estranhamento inicial.
- Itens admin-only precisam continuar respeitando permissao.
- Titulos do header e rotas precisam acompanhar a nova estrutura.
