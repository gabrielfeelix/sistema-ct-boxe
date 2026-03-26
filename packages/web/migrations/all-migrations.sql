-- ============================================
-- MIGRATIONS CONSOLIDADAS - CT BOXE
-- Data: 2026-02-28
-- ============================================

-- ============================================
-- 001: Adicionar categorização às aulas
-- ============================================

ALTER TABLE aulas
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'todos'
  CHECK (categoria IN ('infantil', 'adulto', 'todos'));

ALTER TABLE aulas
ADD COLUMN IF NOT EXISTS tipo_aula TEXT DEFAULT 'grupo'
  CHECK (tipo_aula IN ('grupo', 'individual'));

ALTER TABLE aulas
ADD COLUMN IF NOT EXISTS serie_id UUID DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_aulas_serie ON aulas(serie_id);
CREATE INDEX IF NOT EXISTS idx_aulas_categoria ON aulas(categoria);
CREATE INDEX IF NOT EXISTS idx_aulas_tipo ON aulas(tipo_aula);

-- ============================================
-- 002: Adicionar renovação automática aos planos
-- ============================================

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_automatica BOOLEAN DEFAULT false;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS tipo_acesso TEXT DEFAULT 'grupo'
  CHECK (tipo_acesso IN ('grupo', 'individual'));

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS mercadopago_plan_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_planos_tipo_acesso ON planos(tipo_acesso);
CREATE INDEX IF NOT EXISTS idx_planos_recorrentes ON planos(recorrencia_automatica) WHERE recorrencia_automatica = true;

-- ============================================
-- 003: Criar tabela series_aulas
-- ============================================

CREATE TABLE IF NOT EXISTS series_aulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT 'Aula de Boxe',
  dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('infantil', 'adulto', 'todos')),
  tipo_aula TEXT NOT NULL CHECK (tipo_aula IN ('grupo', 'individual')),
  professor TEXT DEFAULT 'Argel Riboli',
  capacidade_maxima INTEGER DEFAULT 16 CHECK (capacidade_maxima > 0),
  ativo BOOLEAN DEFAULT true,
  data_inicio DATE NOT NULL,
  data_fim DATE DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_series_dia_semana ON series_aulas(dia_semana);
CREATE INDEX IF NOT EXISTS idx_series_ativo ON series_aulas(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_series_categoria ON series_aulas(categoria);
CREATE INDEX IF NOT EXISTS idx_series_tipo ON series_aulas(tipo_aula);

-- ============================================
-- FIM DAS MIGRATIONS
-- ============================================

-- ============================================
-- 007: Modelos versionados de contrato
-- ============================================

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

-- ============================================
-- 008: Vincular planos a contratos e recorrencia customizada
-- ============================================

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS contrato_modelo_id UUID REFERENCES contrato_modelos(id) ON DELETE SET NULL;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_intervalo INTEGER DEFAULT 1;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_unidade TEXT DEFAULT 'meses'
  CHECK (recorrencia_unidade IN ('dias', 'semanas', 'meses', 'anos'));

UPDATE planos
SET recorrencia_intervalo = CASE tipo
    WHEN 'trimestral' THEN 3
    WHEN 'semestral' THEN 6
    WHEN 'anual' THEN 1
    ELSE 1
  END
WHERE recorrencia_intervalo IS NULL;

UPDATE planos
SET recorrencia_unidade = CASE tipo
    WHEN 'anual' THEN 'anos'
    ELSE 'meses'
  END
WHERE recorrencia_unidade IS NULL;

UPDATE planos
SET contrato_modelo_id = ativos.id
FROM (
  SELECT id
  FROM contrato_modelos
  WHERE ativo = true
  ORDER BY updated_at DESC, versao DESC
  LIMIT 1
) AS ativos
WHERE planos.contrato_modelo_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_planos_contrato_modelo_id
  ON planos(contrato_modelo_id);
