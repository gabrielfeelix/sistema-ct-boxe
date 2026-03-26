import type { PlanoCompleto, TipoPlano } from '@/types'

export type UnidadeRecorrencia = 'dias' | 'semanas' | 'meses' | 'anos'

const LEGACY_MAP: Record<TipoPlano, { intervalo: number; unidade: UnidadeRecorrencia }> = {
    mensal: { intervalo: 1, unidade: 'meses' },
    trimestral: { intervalo: 3, unidade: 'meses' },
    semestral: { intervalo: 6, unidade: 'meses' },
    anual: { intervalo: 1, unidade: 'anos' },
}

const UNIT_LABELS: Record<UnidadeRecorrencia, { singular: string; plural: string }> = {
    dias: { singular: 'dia', plural: 'dias' },
    semanas: { singular: 'semana', plural: 'semanas' },
    meses: { singular: 'mes', plural: 'meses' },
    anos: { singular: 'ano', plural: 'anos' },
}

export function deriveLegacyTipo(intervalo?: number | null, unidade?: UnidadeRecorrencia | null): TipoPlano {
    if (intervalo === 3 && unidade === 'meses') return 'trimestral'
    if (intervalo === 6 && unidade === 'meses') return 'semestral'
    if (intervalo === 1 && unidade === 'anos') return 'anual'
    return 'mensal'
}

export function getPlanoRecorrencia(plano: Pick<PlanoCompleto, 'tipo' | 'recorrencia_intervalo' | 'recorrencia_unidade'>) {
    if (plano.recorrencia_intervalo && plano.recorrencia_unidade) {
        return {
            intervalo: plano.recorrencia_intervalo,
            unidade: plano.recorrencia_unidade,
        }
    }

    return LEGACY_MAP[plano.tipo ?? 'mensal']
}

export function formatRecurrenceLabel(intervalo?: number | null, unidade?: UnidadeRecorrencia | null) {
    const safeInterval = Number(intervalo ?? 1)
    const safeUnit = unidade ?? 'meses'
    const unitLabel = safeInterval === 1 ? UNIT_LABELS[safeUnit].singular : UNIT_LABELS[safeUnit].plural
    return `A cada ${safeInterval} ${unitLabel}`
}

export function normalizeInterval(value: string | number) {
    const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 1
    }

    return parsed
}

export function addRecurrence(dataInicio: string, intervalo?: number | null, unidade?: UnidadeRecorrencia | null) {
    const base = new Date(`${dataInicio}T00:00:00`)
    const safeInterval = Number(intervalo ?? 1)
    const safeUnit = unidade ?? 'meses'

    if (safeUnit === 'dias') {
        base.setDate(base.getDate() + safeInterval)
    } else if (safeUnit === 'semanas') {
        base.setDate(base.getDate() + safeInterval * 7)
    } else if (safeUnit === 'anos') {
        base.setFullYear(base.getFullYear() + safeInterval)
    } else {
        base.setMonth(base.getMonth() + safeInterval)
    }

    return base.toISOString().slice(0, 10)
}
