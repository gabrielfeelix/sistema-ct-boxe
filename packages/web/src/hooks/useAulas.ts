'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
    aulaFormSchema,
    atualizarAulaSchema,
    type AulaFormValues,
    type AtualizarAulaValues,
} from '@/lib/validations/aula'

export type AulaStatus = 'agendada' | 'realizada' | 'cancelada'
export type PresencaStatus = 'agendado' | 'presente' | 'falta' | 'cancelada'
export type CategoriaAula = 'infantil' | 'adulto' | 'todos'
export type TipoAula = 'grupo' | 'individual'

interface PresencaResumoRow {
    status: PresencaStatus
}

interface AlunoBasico {
    id: string
    nome: string
    email?: string
    telefone?: string
    foto_url?: string
    status?: string
    ultimo_treino?: string | null
    total_treinos?: number
}

interface PresencaDetalheRow {
    id: string
    aula_id: string
    aluno_id: string
    status: PresencaStatus
    data_checkin: string | null
    created_at: string
    updated_at: string
    aluno: AlunoBasico | AlunoBasico[] | null
}

interface AulaRow {
    id: string
    titulo: string
    data: string
    hora_inicio: string
    hora_fim: string
    professor: string
    capacidade_maxima: number
    status: AulaStatus
    categoria: CategoriaAula
    tipo_aula: TipoAula
    serie_id: string | null
    created_at: string
    updated_at: string
    presencas?: PresencaResumoRow[] | null
}

interface AulaDetalheRow extends Omit<AulaRow, 'presencas'> {
    presencas?: PresencaDetalheRow[] | null
}

export interface AulaResumo {
    id: string
    titulo: string
    data: string
    hora_inicio: string
    hora_fim: string
    professor: string
    capacidade_maxima: number
    status: AulaStatus
    categoria: CategoriaAula
    tipo_aula: TipoAula
    serie_id: string | null
    created_at: string
    updated_at: string
    total_agendados: number
    total_presentes: number
    total_faltas: number
    total_cancelados: number
    vagas_disponiveis: number
}

export interface PresencaDetalhe {
    id: string
    aula_id: string
    aluno_id: string
    status: PresencaStatus
    data_checkin: string | null
    created_at: string
    updated_at: string
    aluno: AlunoBasico | null
}

function pickAluno(aluno: AlunoBasico | AlunoBasico[] | null): AlunoBasico | null {
    if (!aluno) return null
    return Array.isArray(aluno) ? aluno[0] ?? null : aluno
}

export interface AulaDetalhe extends AulaResumo {
    presencas: PresencaDetalhe[]
}

interface UseAulasOptions {
    busca?: string
    status?: AulaStatus | 'todos'
    categoria?: CategoriaAula | 'todos'
    professor?: string
    dataInicio?: string
    dataFim?: string
    limit?: number
}

interface UseAulasReturn {
    aulas: AulaResumo[]
    loading: boolean
    error: string | null
    total: number
    refetch: () => Promise<void>
    criarAula: (payload: AulaFormValues) => Promise<{ data: AulaResumo | null; error: string | null }>
    atualizarAula: (
        aulaId: string,
        payload: AtualizarAulaValues
    ) => Promise<{ data: AulaResumo | null; error: string | null }>
    cancelarAula: (
        aulaId: string,
        options?: { scope?: 'single' | 'future' }
    ) => Promise<{ ok: boolean; error: string | null }>
}

function normalizeAulaRow(row: AulaRow): AulaResumo {
    const totalAgendados = (row.presencas ?? []).filter((item) =>
        item.status === 'agendado' || item.status === 'presente'
    ).length
    const totalPresentes = (row.presencas ?? []).filter((item) => item.status === 'presente').length
    const totalFaltas = (row.presencas ?? []).filter((item) => item.status === 'falta').length
    const totalCancelados = (row.presencas ?? []).filter((item) => item.status === 'cancelada').length

    return {
        id: row.id,
        titulo: row.titulo,
        data: row.data,
        hora_inicio: row.hora_inicio,
        hora_fim: row.hora_fim,
        professor: row.professor,
        capacidade_maxima: row.capacidade_maxima,
        status: row.status,
        categoria: row.categoria,
        tipo_aula: row.tipo_aula,
        serie_id: row.serie_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        total_agendados: totalAgendados,
        total_presentes: totalPresentes,
        total_faltas: totalFaltas,
        total_cancelados: totalCancelados,
        vagas_disponiveis: Math.max(0, row.capacidade_maxima - totalAgendados),
    }
}

export function useAulas({
    busca = '',
    status = 'todos',
    categoria = 'todos',
    professor = '',
    dataInicio = '',
    dataFim = '',
    limit = 100,
}: UseAulasOptions = {}): UseAulasReturn {
    const supabase = createClient()
    const [aulas, setAulas] = useState<AulaResumo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [total, setTotal] = useState(0)

    const fetchAulas = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('aulas')
                .select(
                    'id,titulo,data,hora_inicio,hora_fim,professor,capacidade_maxima,status,categoria,tipo_aula,serie_id,created_at,updated_at,presencas(status)',
                    { count: 'exact' }
                )
                .order('data', { ascending: true })
                .order('hora_inicio', { ascending: true })
                .limit(limit)

            if (status !== 'todos') {
                query = query.eq('status', status)
            }

            if (categoria !== 'todos') {
                query = query.eq('categoria', categoria)
            }

            if (professor.trim()) {
                query = query.ilike('professor', `%${professor.trim()}%`)
            }

            if (busca.trim()) {
                query = query.ilike('titulo', `%${busca.trim()}%`)
            }

            if (dataInicio) {
                query = query.gte('data', dataInicio)
            }

            if (dataFim) {
                query = query.lte('data', dataFim)
            }

            const { data, error: queryError, count } = await query

            if (queryError) throw queryError

            setAulas(((data as AulaRow[]) ?? []).map(normalizeAulaRow))
            setTotal(count ?? 0)
        } catch (fetchError) {
            console.error(fetchError)
            setError('Não foi possível carregar as aulas.')
            setAulas([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [supabase, status, categoria, professor, busca, dataInicio, dataFim, limit])

    useEffect(() => {
        fetchAulas()
    }, [fetchAulas])

    const criarAula = useCallback(
        async (payload: AulaFormValues) => {
            const parsed = aulaFormSchema.safeParse(payload)

            if (!parsed.success) {
                return { data: null, error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }
            }

            const { data, error: insertError } = await supabase
                .from('aulas')
                .insert(parsed.data)
                .select(
                    'id,titulo,data,hora_inicio,hora_fim,professor,capacidade_maxima,status,categoria,tipo_aula,serie_id,created_at,updated_at,presencas(status)'
                )
                .single()

            if (insertError) {
                console.error(insertError)
                return { data: null, error: 'Não foi possível criar a aula.' }
            }

            queueMicrotask(() => {
                void fetchAulas()
            })
            return { data: normalizeAulaRow(data as AulaRow), error: null }
        },
        [supabase, fetchAulas]
    )

    const atualizarAula = useCallback(
        async (aulaId: string, payload: AtualizarAulaValues) => {
            const parsed = atualizarAulaSchema.safeParse(payload)

            if (!parsed.success) {
                return { data: null, error: parsed.error.issues[0]?.message ?? 'Dados invalidos.' }
            }

            const { data, error: updateError } = await supabase
                .from('aulas')
                .update(parsed.data)
                .eq('id', aulaId)
                .select(
                    'id,titulo,data,hora_inicio,hora_fim,professor,capacidade_maxima,status,categoria,tipo_aula,serie_id,created_at,updated_at,presencas(status)'
                )
                .single()

            if (updateError) {
                console.error(updateError)
                return { data: null, error: 'Não foi possível atualizar a aula.' }
            }

            await fetchAulas()
            return { data: normalizeAulaRow(data as AulaRow), error: null }
        },
        [supabase, fetchAulas]
    )

    const cancelarAula = useCallback(
        async (aulaId: string, options?: { scope?: 'single' | 'future' }) => {
            try {
                const response = await fetch(`/api/aulas/${aulaId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        scope: options?.scope ?? 'single',
                    }),
                })

                const payload = await response.json().catch(() => ({}))
                if (!response.ok) {
                    return { ok: false, error: payload.error ?? 'Não foi possível cancelar a aula.' }
                }

                await fetchAulas()
                return { ok: true, error: null }
            } catch (cancelError) {
                console.error(cancelError)
                return { ok: false, error: 'Não foi possível cancelar a aula.' }
            }
        },
        [fetchAulas]
    )

    return {
        aulas,
        loading,
        error,
        total,
        refetch: fetchAulas,
        criarAula,
        atualizarAula,
        cancelarAula,
    }
}

export function useAula(aulaId: string) {
    const supabase = createClient()
    const [aula, setAula] = useState<AulaDetalhe | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAula = useCallback(async () => {
        if (!aulaId) {
            setAula(null)
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const { data, error: queryError } = await supabase
                .from('aulas')
                .select(
                    'id,titulo,data,hora_inicio,hora_fim,professor,capacidade_maxima,status,categoria,tipo_aula,serie_id,created_at,updated_at,presencas(id,aula_id,aluno_id,status,data_checkin,created_at,updated_at,aluno:alunos(id,nome,email,telefone,foto_url,status,ultimo_treino,total_treinos))'
                )
                .eq('id', aulaId)
                .single()

            if (queryError) throw queryError

            const row = data as unknown as AulaDetalheRow
            const resumo = normalizeAulaRow(row)
            const presencasOrdenadas = ((row.presencas as unknown as PresencaDetalheRow[]) ?? [])
                .map((item) => ({
                    id: item.id,
                    aula_id: item.aula_id,
                    aluno_id: item.aluno_id,
                    status: item.status,
                    data_checkin: item.data_checkin,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    aluno: pickAluno(item.aluno),
                }))
                .sort((a, b) => (a.aluno?.nome ?? '').localeCompare(b.aluno?.nome ?? ''))

            setAula({ ...resumo, presencas: presencasOrdenadas })
        } catch (fetchError) {
            console.error(fetchError)
            setError('Não foi possível carregar os dados da aula.')
            setAula(null)
        } finally {
            setLoading(false)
        }
    }, [supabase, aulaId])

    useEffect(() => {
        fetchAula()
    }, [fetchAula])

    const capacidadeUtilizada = useMemo(() => {
        if (!aula) return 0
        if (aula.capacidade_maxima <= 0) return 0
        return Math.round((aula.total_agendados / aula.capacidade_maxima) * 100)
    }, [aula])

    return {
        aula,
        loading,
        error,
        capacidadeUtilizada,
        refetch: fetchAula,
    }
}
