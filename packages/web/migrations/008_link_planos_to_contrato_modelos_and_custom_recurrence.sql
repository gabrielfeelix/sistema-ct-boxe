ALTER TABLE planos
ADD COLUMN IF NOT EXISTS contrato_modelo_id UUID REFERENCES contrato_modelos(id) ON DELETE SET NULL;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_intervalo INTEGER;

ALTER TABLE planos
ADD COLUMN IF NOT EXISTS recorrencia_unidade TEXT;

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

ALTER TABLE planos
ALTER COLUMN recorrencia_intervalo SET DEFAULT 1;

ALTER TABLE planos
ALTER COLUMN recorrencia_unidade SET DEFAULT 'meses';

UPDATE planos
SET recorrencia_intervalo = 1
WHERE recorrencia_intervalo IS NULL OR recorrencia_intervalo < 1;

UPDATE planos
SET recorrencia_unidade = 'meses'
WHERE recorrencia_unidade IS NULL;

ALTER TABLE planos
ALTER COLUMN recorrencia_intervalo SET NOT NULL;

ALTER TABLE planos
ALTER COLUMN recorrencia_unidade SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'planos_recorrencia_intervalo_check'
    ) THEN
        ALTER TABLE planos
        ADD CONSTRAINT planos_recorrencia_intervalo_check CHECK (recorrencia_intervalo > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'planos_recorrencia_unidade_check'
    ) THEN
        ALTER TABLE planos
        ADD CONSTRAINT planos_recorrencia_unidade_check CHECK (recorrencia_unidade IN ('dias', 'semanas', 'meses', 'anos'));
    END IF;
END
$$;

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

CREATE INDEX IF NOT EXISTS idx_planos_recorrencia_composta
    ON planos(recorrencia_unidade, recorrencia_intervalo);
