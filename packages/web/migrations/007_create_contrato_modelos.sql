CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS contrato_modelos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL,
    titulo TEXT NOT NULL,
    versao INTEGER NOT NULL CHECK (versao > 0),
    resumo TEXT,
    conteudo TEXT NOT NULL,
    pdf_url TEXT,
    ativo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contrato_modelos_slug_versao UNIQUE (slug, versao)
);

CREATE INDEX IF NOT EXISTS idx_contrato_modelos_slug_ativo
    ON contrato_modelos(slug, ativo DESC, versao DESC);

CREATE OR REPLACE FUNCTION normalize_contrato_modelos_ativos()
RETURNS trigger AS $$
BEGIN
    IF NEW.ativo THEN
        UPDATE contrato_modelos
        SET ativo = false
        WHERE slug = NEW.slug
          AND id <> COALESCE(NEW.id, gen_random_uuid())
          AND ativo = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contrato_modelos_updated_at ON contrato_modelos;
CREATE TRIGGER contrato_modelos_updated_at
    BEFORE UPDATE ON contrato_modelos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS contrato_modelos_only_one_active ON contrato_modelos;
CREATE TRIGGER contrato_modelos_only_one_active
    BEFORE INSERT OR UPDATE OF ativo, slug ON contrato_modelos
    FOR EACH ROW EXECUTE FUNCTION normalize_contrato_modelos_ativos();

ALTER TABLE contrato_modelos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'contrato_modelos'
          AND policyname = 'auth_all_contrato_modelos'
    ) THEN
        CREATE POLICY auth_all_contrato_modelos
            ON contrato_modelos
            FOR ALL
            USING (auth.role() = 'authenticated');
    END IF;
END
$$;

INSERT INTO contrato_modelos (
    slug,
    titulo,
    versao,
    resumo,
    conteudo,
    pdf_url,
    ativo
)
SELECT
    'contrato-padrao',
    'Contrato de Prestacao de Servicos CT de Boxe',
    1,
    'Modelo inicial sincronizado entre painel e app.',
    $$CONTRATO DE PRESTACAO DE SERVICOS DE TREINAMENTO

CONTRATANTE: {{aluno_nome}}
E-mail: {{aluno_email}}
CPF: {{aluno_cpf}}
Telefone: {{aluno_telefone}}

CONTRATADA: {{ct_nome}}

1. OBJETO
O presente contrato regula a prestacao de servicos de treinamento esportivo vinculados ao plano {{plano_nome}}, modalidade {{plano_tipo}}.

2. VIGENCIA
Este contrato tem vigencia de {{data_inicio}} ate {{data_fim}}.

3. VALOR
O valor contratado e de {{valor}}, conforme o plano selecionado.

4. RENOVACAO
Renovacao automatica: {{renovacao_automatica}}.

5. CONDICOES GERAIS
O contratante declara estar apto para a pratica esportiva e compromete-se a respeitar as orientacoes tecnicas, regras internas e politicas de uso do CT.

6. ASSINATURA DIGITAL
Este documento sera disponibilizado no app do aluno para leitura e assinatura.

Emitido em {{data_emissao}}.
$$,
    NULL,
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM contrato_modelos
    WHERE slug = 'contrato-padrao'
);
