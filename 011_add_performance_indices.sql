-- Índices de performance para otimizar queries do app mobile
-- Aplicar via SQL Editor do Supabase

-- Índices para tabela AULAS
CREATE INDEX IF NOT EXISTS idx_aulas_data ON aulas(data);
CREATE INDEX IF NOT EXISTS idx_aulas_status ON aulas(status);
CREATE INDEX IF NOT EXISTS idx_aulas_data_status ON aulas(data, status); -- Composite para queries com ambos

-- Índices para tabela PRESENCAS
CREATE INDEX IF NOT EXISTS idx_presencas_aluno_id ON presencas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_presencas_aula_id ON presencas(aula_id);
CREATE INDEX IF NOT EXISTS idx_presencas_status ON presencas(status);
CREATE INDEX IF NOT EXISTS idx_presencas_aluno_status ON presencas(aluno_id, status); -- Composite para histórico
CREATE INDEX IF NOT EXISTS idx_presencas_created_at ON presencas(created_at); -- Para ordenação

-- Índices para tabela POSTS
CREATE INDEX IF NOT EXISTS idx_posts_publicado ON posts(publicado);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_publicado_created ON posts(publicado, created_at DESC); -- Composite para feed

-- Índices para tabela POST_COMENTARIOS
CREATE INDEX IF NOT EXISTS idx_post_comentarios_post_id ON post_comentarios(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comentarios_created_at ON post_comentarios(created_at);

-- Índices para tabela POST_CURTIDAS
CREATE INDEX IF NOT EXISTS idx_post_curtidas_post_id ON post_curtidas(post_id);
CREATE INDEX IF NOT EXISTS idx_post_curtidas_aluno_id ON post_curtidas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_post_curtidas_post_aluno ON post_curtidas(post_id, aluno_id); -- Composite para check se usuário curtiu

-- Índices para tabela PAGAMENTOS
CREATE INDEX IF NOT EXISTS idx_pagamentos_aluno_id ON pagamentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_pagamentos_aluno_status ON pagamentos(aluno_id, status); -- Composite
CREATE INDEX IF NOT EXISTS idx_pagamentos_vencimento ON pagamentos(data_vencimento);

-- Índices para tabela CONTRATOS
CREATE INDEX IF NOT EXISTS idx_contratos_aluno_id ON contratos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_contratos_data_fim ON contratos(data_fim);

-- Índices para tabela NOTIFICACOES
CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno_id ON notificacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON notificacoes(created_at);

-- Índices para tabela STORIES_ATIVOS (view)
-- Se for uma view, os índices devem estar nas tabelas base

ANALYZE aulas, presencas, posts, post_comentarios, post_curtidas, pagamentos, contratos, notificacoes;
