## Objetivo

Estabilizar a UX do app e fechar a integração entre app, web e banco para comentários, agenda/home, notificações por audiência e eventos.

## Fases

1. Corrigir comentários no app com atualização otimista e sem warnings de ciclo de vida.
2. Corrigir o carregamento da próxima aula e das próximas aulas na home.
3. Evoluir o schema de notificações para suportar audiência e configuração por papel.
4. Atualizar o painel web de notificações para separar aluno, gestão e professor.
5. Evoluir o CRUD web de eventos com categoria, valor e imagem padrão/custom.
6. Validar typecheck/build e revisar riscos residuais.

## Restrições

- Não reintroduzir NativeWind/CssInterop no caminho crítico do app.
- Manter mudanças incrementais e compatíveis com os dados já existentes.
- Preservar compatibilidade com notificações antigas onde possível.
