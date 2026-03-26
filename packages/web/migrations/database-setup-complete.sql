-- ============================================
-- SETUP COMPLETO DO BANCO DE DADOS - CT BOXE
-- Data: 2026-02-28
-- ============================================
-- Este arquivo contém TODAS as migrations e dados iniciais
-- Execute tudo de uma vez no SQL Editor do Supabase
-- ============================================

-- ============================================
-- PARTE 1: MIGRATIONS
-- ============================================

-- Migration 001: Adicionar categorização às aulas
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

-- Migration 002: Adicionar renovação automática aos planos
ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_automatica BOOLEAN DEFAULT false;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS tipo_acesso TEXT DEFAULT 'grupo'
  CHECK (tipo_acesso IN ('grupo', 'individual'));

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS mercadopago_plan_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_planos_tipo_acesso ON planos(tipo_acesso);
CREATE INDEX IF NOT EXISTS idx_planos_recorrentes ON planos(recorrencia_automatica) WHERE recorrencia_automatica = true;

-- Migration 003: Criar tabela series_aulas
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

-- Migration 007: Modelos versionados de contrato
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
-- PARTE 2: DADOS INICIAIS - PLANOS
-- ============================================

-- 1️⃣ PLANO GRUPO - PIX (sem renovação automática)
INSERT INTO planos (
  nome,
  tipo,
  valor,
  descricao,
  ativo,
  recorrencia_automatica,
  tipo_acesso,
  mercadopago_plan_id
) VALUES (
  'Mensal Grupo - PIX',
  'mensal',
  230.00,
  'Plano mensal com acesso às aulas em grupo. Pagamento via PIX à vista.',
  true,
  false,
  'grupo',
  NULL
) ON CONFLICT DO NOTHING;

-- 2️⃣ PLANO GRUPO - RECORRENTE (com renovação automática)
INSERT INTO planos (
  nome,
  tipo,
  valor,
  descricao,
  ativo,
  recorrencia_automatica,
  tipo_acesso,
  mercadopago_plan_id
) VALUES (
  'Mensal Grupo - Recorrente',
  'mensal',
  195.90,
  'Plano mensal com acesso às aulas em grupo. Renovação automática via Mercado Pago (cartão de crédito).',
  true,
  true,
  'grupo',
  NULL
) ON CONFLICT DO NOTHING;

-- 3️⃣ PLANO INDIVIDUAL - PIX (sem renovação automática)
INSERT INTO planos (
  nome,
  tipo,
  valor,
  descricao,
  ativo,
  recorrencia_automatica,
  tipo_acesso,
  mercadopago_plan_id
) VALUES (
  'Mensal Individual - PIX',
  'mensal',
  330.00,
  'Plano mensal com aulas individuais (personal). Pagamento via PIX à vista.',
  true,
  false,
  'individual',
  NULL
) ON CONFLICT DO NOTHING;

-- 4️⃣ PLANO INDIVIDUAL - RECORRENTE (com renovação automática)
INSERT INTO planos (
  nome,
  tipo,
  valor,
  descricao,
  ativo,
  recorrencia_automatica,
  tipo_acesso,
  mercadopago_plan_id
) VALUES (
  'Mensal Individual - Recorrente',
  'mensal',
  295.90,
  'Plano mensal com aulas individuais (personal). Renovação automática via Mercado Pago (cartão de crédito).',
  true,
  true,
  'individual',
  NULL
) ON CONFLICT DO NOTHING;

-- ============================================
-- PARTE 3: DADOS INICIAIS - SÉRIES DE AULAS RECORRENTES
-- ============================================
-- Horários fixos: Segunda a Sexta, 18h30 e 19h30 (adultos, grupo)
-- Ano: 2026 (todo o ano)

-- Segunda-feira 18h30-19h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  1, -- Segunda
  '18:30:00',
  '19:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Segunda-feira 19h30-20h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  1, -- Segunda
  '19:30:00',
  '20:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Terça-feira 18h30-19h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  2, -- Terça
  '18:30:00',
  '19:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Terça-feira 19h30-20h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  2, -- Terça
  '19:30:00',
  '20:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Quarta-feira 18h30-19h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  3, -- Quarta
  '18:30:00',
  '19:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Quarta-feira 19h30-20h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  3, -- Quarta
  '19:30:00',
  '20:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Quinta-feira 18h30-19h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  4, -- Quinta
  '18:30:00',
  '19:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Quinta-feira 19h30-20h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  4, -- Quinta
  '19:30:00',
  '20:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Sexta-feira 18h30-19h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  5, -- Sexta
  '18:30:00',
  '19:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- Sexta-feira 19h30-20h30
INSERT INTO series_aulas (
  titulo,
  dia_semana,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  professor,
  capacidade_maxima,
  ativo,
  data_inicio,
  data_fim
) VALUES (
  'Boxe Adulto - Grupo',
  5, -- Sexta
  '19:30:00',
  '20:30:00',
  'adulto',
  'grupo',
  'Argel Riboli',
  16,
  true,
  '2026-01-01',
  '2026-12-31'
) ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICAÇÕES FINAIS
-- ============================================

-- Verificar planos inseridos
SELECT
  '=== PLANOS ===' as info,
  nome,
  tipo,
  valor,
  tipo_acesso,
  recorrencia_automatica,
  ativo
FROM planos
ORDER BY tipo_acesso, valor DESC;

-- Verificar séries de aulas inseridas
SELECT
  '=== SÉRIES DE AULAS ===' as info,
  titulo,
  CASE dia_semana
    WHEN 0 THEN 'Domingo'
    WHEN 1 THEN 'Segunda'
    WHEN 2 THEN 'Terça'
    WHEN 3 THEN 'Quarta'
    WHEN 4 THEN 'Quinta'
    WHEN 5 THEN 'Sexta'
    WHEN 6 THEN 'Sábado'
  END as dia,
  hora_inicio,
  hora_fim,
  categoria,
  tipo_aula,
  capacidade_maxima,
  ativo
FROM series_aulas
ORDER BY dia_semana, hora_inicio;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS contrato_modelo_id UUID REFERENCES contrato_modelos(id) ON DELETE SET NULL;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_intervalo INTEGER DEFAULT 1 CHECK (recorrencia_intervalo > 0);

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_unidade TEXT DEFAULT 'meses'
  CHECK (recorrencia_unidade IN ('dias', 'semanas', 'meses', 'anos'));

-- ============================================
-- FIM DO SETUP
-- ============================================
-- ✅ Migrations aplicadas
-- ✅ 4 Planos cadastrados
-- ✅ 10 Séries de aulas recorrentes criadas (Seg-Sex, 18h30 e 19h30)
-- ============================================
