const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

function resolveConnectionString() {
    if (process.env.SUPABASE_DB_URL) return process.env.SUPABASE_DB_URL

    const candidates = ['runSQL.cjs', 'create_tables.cjs', 'reload.cjs']
    for (const file of candidates) {
        const full = path.join(__dirname, file)
        if (!fs.existsSync(full)) continue
        const content = fs.readFileSync(full, 'utf8')
        const byObject = content.match(/connectionString:\s*'([^']+)'/)
        if (byObject?.[1]) return byObject[1]
        const byCtor = content.match(/new Client\('([^']+)'\)/)
        if (byCtor?.[1]) return byCtor[1]
    }

    throw new Error(
        'Nao foi possivel resolver a connection string. Defina SUPABASE_DB_URL no ambiente.'
    )
}

const client = new Client({
    connectionString: resolveConnectionString(),
})

const sql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE IF EXISTS contratos
    ADD COLUMN IF NOT EXISTS renovacao_automatica BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS pagamentos
    ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
    ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT;

ALTER TABLE IF EXISTS planos
    ADD COLUMN IF NOT EXISTS valor NUMERIC(10, 2);

UPDATE planos
SET valor = COALESCE(valor, 0)
WHERE valor IS NULL;

CREATE TABLE IF NOT EXISTS notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES alunos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL DEFAULT 'ct'
        CHECK (tipo IN ('aula', 'pagamento', 'ct', 'sistema', 'video', 'evento')),
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    mensagem TEXT,
    acao TEXT,
    link TEXT,
    lida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_evento DATE NOT NULL,
    local TEXT,
    icone TEXT,
    destaque BOOLEAN NOT NULL DEFAULT false,
    ativo BOOLEAN NOT NULL DEFAULT true,
    confirmados INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evento_confirmacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'confirmado'
        CHECK (status IN ('confirmado', 'pendente', 'cancelado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_evento_confirmacoes UNIQUE (evento_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS post_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    aluno_id UUID REFERENCES alunos(id) ON DELETE SET NULL,
    autor_nome TEXT,
    texto TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_curtidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_curtidas UNIQUE (post_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS aluno_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'assinado', 'expirado', 'cancelado')),
    texto TEXT,
    emitido_em TIMESTAMPTZ DEFAULT NOW(),
    assinado_em TIMESTAMPTZ,
    validade DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_aluno_lida
    ON notificacoes(aluno_id, lida, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_data_ativo
    ON eventos(data_evento, ativo);
CREATE INDEX IF NOT EXISTS idx_evento_confirmacoes_evento
    ON evento_confirmacoes(evento_id);
CREATE INDEX IF NOT EXISTS idx_evento_confirmacoes_aluno
    ON evento_confirmacoes(aluno_id);
CREATE INDEX IF NOT EXISTS idx_post_comentarios_post
    ON post_comentarios(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_curtidas_post
    ON post_curtidas(post_id);
CREATE INDEX IF NOT EXISTS idx_aluno_documentos_aluno_status
    ON aluno_documentos(aluno_id, status, emitido_em DESC);

DROP TRIGGER IF EXISTS notificacoes_updated_at ON notificacoes;
CREATE TRIGGER notificacoes_updated_at
    BEFORE UPDATE ON notificacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS eventos_updated_at ON eventos;
CREATE TRIGGER eventos_updated_at
    BEFORE UPDATE ON eventos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS evento_confirmacoes_updated_at ON evento_confirmacoes;
CREATE TRIGGER evento_confirmacoes_updated_at
    BEFORE UPDATE ON evento_confirmacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS post_comentarios_updated_at ON post_comentarios;
CREATE TRIGGER post_comentarios_updated_at
    BEFORE UPDATE ON post_comentarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS aluno_documentos_updated_at ON aluno_documentos;
CREATE TRIGGER aluno_documentos_updated_at
    BEFORE UPDATE ON aluno_documentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE evento_confirmacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_curtidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE aluno_documentos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notificacoes' AND policyname = 'auth_all_notificacoes'
    ) THEN
        CREATE POLICY auth_all_notificacoes ON notificacoes FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'eventos' AND policyname = 'auth_all_eventos'
    ) THEN
        CREATE POLICY auth_all_eventos ON eventos FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'evento_confirmacoes' AND policyname = 'auth_all_evento_confirmacoes'
    ) THEN
        CREATE POLICY auth_all_evento_confirmacoes ON evento_confirmacoes FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'post_comentarios' AND policyname = 'auth_all_post_comentarios'
    ) THEN
        CREATE POLICY auth_all_post_comentarios ON post_comentarios FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'post_curtidas' AND policyname = 'auth_all_post_curtidas'
    ) THEN
        CREATE POLICY auth_all_post_curtidas ON post_curtidas FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'aluno_documentos' AND policyname = 'auth_all_aluno_documentos'
    ) THEN
        CREATE POLICY auth_all_aluno_documentos ON aluno_documentos FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION update_evento_confirmados_count()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE eventos
        SET confirmados = (
            SELECT COUNT(*)
            FROM evento_confirmacoes
            WHERE evento_id = OLD.evento_id
              AND status = 'confirmado'
        )
        WHERE id = OLD.evento_id;
        RETURN OLD;
    END IF;

    UPDATE eventos
    SET confirmados = (
        SELECT COUNT(*)
        FROM evento_confirmacoes
        WHERE evento_id = NEW.evento_id
          AND status = 'confirmado'
    )
    WHERE id = NEW.evento_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS evento_confirmacoes_update_count ON evento_confirmacoes;
CREATE TRIGGER evento_confirmacoes_update_count
    AFTER INSERT OR UPDATE OR DELETE ON evento_confirmacoes
    FOR EACH ROW EXECUTE FUNCTION update_evento_confirmados_count();

DROP VIEW IF EXISTS contratos_com_status;

CREATE VIEW contratos_com_status AS
SELECT
    c.id,
    c.aluno_id,
    c.plano_id,
    CASE
        WHEN c.status = 'cancelado' THEN 'cancelado'
        WHEN c.status = 'finalizado' THEN 'vencido'
        WHEN c.data_fim IS NULL THEN 'ativo'
        WHEN c.data_fim < CURRENT_DATE THEN 'vencido'
        WHEN c.data_fim <= (CURRENT_DATE + INTERVAL '3 days')::date THEN 'vencendo'
        ELSE 'ativo'
    END AS status,
    c.data_inicio,
    c.data_fim,
    COALESCE(c.valor, p.valor, 0::numeric)::numeric(10,2) AS valor,
    COALESCE(c.renovacao_automatica, false) AS renovacao_automatica,
    c.observacoes,
    CASE
        WHEN c.data_fim IS NULL THEN 9999
        ELSE (c.data_fim - CURRENT_DATE)
    END AS dias_para_vencer,
    a.nome AS aluno_nome,
    a.email AS aluno_email,
    a.telefone AS aluno_telefone,
    a.foto_url AS aluno_foto,
    a.status AS aluno_status,
    p.nome AS plano_nome,
    p.tipo AS plano_tipo,
    c.created_at,
    c.updated_at
FROM contratos c
LEFT JOIN alunos a ON a.id = c.aluno_id
LEFT JOIN planos p ON p.id = c.plano_id;
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Auth Insert'
    ) THEN
        CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Auth Update'
    ) THEN
        CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'avatars' AND auth.uid() = owner );
    END IF;
END
$$;

GRANT ALL ON notificacoes, eventos, evento_confirmacoes, post_comentarios, post_curtidas, aluno_documentos TO anon, authenticated;
GRANT SELECT ON contratos_com_status TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
`

async function main() {
    try {
        await client.connect()
        console.log('Deploying schema complementar do app...')
        await client.query(sql)
        console.log('Schema complementar aplicado com sucesso.')
    } catch (error) {
        console.error('Erro ao aplicar schema complementar:', error)
        process.exitCode = 1
    } finally {
        await client.end()
    }
}

main()
