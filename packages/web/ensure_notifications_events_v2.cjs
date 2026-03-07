const { Client } = require('pg');

const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Gafe362215.@db.reqhddvgquiomxvqvcdn.supabase.co:5432/postgres',
});

const sql = `
ALTER TABLE IF EXISTS notificacoes
ADD COLUMN IF NOT EXISTS audiencia TEXT NOT NULL DEFAULT 'aluno';

ALTER TABLE IF EXISTS notificacoes
ADD COLUMN IF NOT EXISTS professor_nome TEXT;

ALTER TABLE IF EXISTS notificacoes
ADD COLUMN IF NOT EXISTS icone TEXT;

ALTER TABLE IF EXISTS eventos
ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2);

ALTER TABLE IF EXISTS eventos
ADD COLUMN IF NOT EXISTS imagem_url TEXT;

CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    audiencia TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    icone TEXT NOT NULL DEFAULT 'bell',
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_audiencia_created_at
    ON notificacoes(audiencia, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'notification_rules' AND policyname = 'auth_all_notification_rules'
    ) THEN
        ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
        CREATE POLICY auth_all_notification_rules ON notification_rules
        FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

GRANT ALL ON notification_rules TO anon, authenticated;

INSERT INTO notification_rules (slug, audiencia, titulo, descricao, icone, enabled) VALUES
    ('aluno_contrato_vencendo', 'aluno', 'Contrato vencendo', 'Avisa o aluno quando o contrato estiver perto do vencimento.', 'credit-card', true),
    ('aluno_contrato_vencido', 'aluno', 'Contrato vencido', 'Avisa o aluno quando o contrato vencer.', 'shield-alert', true),
    ('aluno_pagamento_atrasado', 'aluno', 'Pagamento atrasado', 'Avisa o aluno sobre pendência financeira.', 'alert-triangle', true),
    ('aluno_novo_youtube', 'aluno', 'Novo vídeo no YouTube', 'Envia alerta quando houver novo conteúdo no YouTube.', 'youtube', true),
    ('aluno_novo_instagram', 'aluno', 'Novo post no Instagram', 'Envia alerta quando houver novo conteúdo no Instagram.', 'instagram', true),
    ('aluno_novo_post', 'aluno', 'Nova postagem', 'Avisa sobre novos posts ou comunicados publicados.', 'megaphone', true),
    ('aluno_novo_evento', 'aluno', 'Novo evento', 'Avisa quando um novo evento for publicado.', 'calendar-days', true),
    ('aluno_nova_turma', 'aluno', 'Nova turma disponível', 'Avisa quando novas aulas ou turmas forem abertas.', 'calendar-plus', true),
    ('gestao_pagamento_recebido', 'gestao', 'Pagamento recebido', 'Notifica a gestão quando um aluno paga.', 'credit-card', true),
    ('gestao_checkin_realizado', 'gestao', 'Check-in realizado', 'Notifica a gestão sobre check-ins confirmados.', 'user-check', true),
    ('gestao_engajamento_feed', 'gestao', 'Engajamento no feed', 'Notifica a gestão sobre curtidas e comentários.', 'message-square', true),
    ('gestao_confirmacao_evento', 'gestao', 'Confirmação de evento', 'Notifica a gestão quando um aluno confirma presença em evento.', 'party-popper', true),
    ('professor_checkin_aluno', 'professor', 'Aluno confirmado na aula', 'Notifica o professor quando um aluno confirmar a própria aula.', 'user-check', true),
    ('professor_engajamento_post', 'professor', 'Engajamento em postagem', 'Notifica o professor sobre comentários e curtidas em conteúdos dele.', 'heart', true)
ON CONFLICT (slug) DO UPDATE
SET
    audiencia = EXCLUDED.audiencia,
    titulo = EXCLUDED.titulo,
    descricao = EXCLUDED.descricao,
    icone = EXCLUDED.icone;
`;

async function main() {
    try {
        await client.connect();
        console.log('Aplicando schema v2 de notificacoes e eventos...');
        await client.query(sql);
        console.log('OK.');
    } catch (error) {
        console.error('Erro ao aplicar schema v2:', error);
        process.exitCode = 1;
    } finally {
        await client.end();
    }
}

main();
