'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deriveLegacyTipo } from '@/lib/planos/recorrencia'
import type { ContratoCompleto, PlanoCompleto } from '@/types'

interface PlanoRaw {
    id: string
    nome: string
    tipo: PlanoCompleto['tipo'] | null
    valor?: number | null
    valor_mensal?: number | null
    descricao?: string | null
    ativo?: boolean | null
    created_at: string
    recorrencia_automatica?: boolean | null
    tipo_acesso?: PlanoCompleto['tipo_acesso'] | null
    mercadopago_plan_id?: string | null
    recorrencia_intervalo?: number | null
    recorrencia_unidade?: PlanoCompleto['recorrencia_unidade'] | null
    contrato_modelo_id?: string | null
}

interface ContratoModeloLookup {
    id: string
    titulo: string
    versao: number
    slug: string
}

interface UseContratosOptions {
    status?: string
    aluno_id?: string
    limit?: number
}

export function usePlanos(apenasAtivos = false) {
    const supabase = createClient()
    const [planos, setPlanos] = useState<PlanoCompleto[]>([])
    const [loading, setLoading] = useState(true)

    const fetch = useCallback(async () => {
        setLoading(true)

        let query = supabase.from('planos').select('*').order('nome', { ascending: true })
        if (apenasAtivos) query = query.eq('ativo', true)

        const { data, error } = await query
        if (error) {
            console.error(error)
            setPlanos([])
            setLoading(false)
            return
        }

        const planosRaw = (data as PlanoRaw[]) ?? []
        const contratoIds = [...new Set(planosRaw.map((item) => item.contrato_modelo_id).filter(Boolean))] as string[]
        let contratoLookup = new Map<string, ContratoModeloLookup>()

        if (contratoIds.length > 0) {
            const { data: contratosData, error: contratosError } = await supabase
                .from('contrato_modelos')
                .select('id,titulo,versao,slug')
                .in('id', contratoIds)

            if (contratosError) {
                console.error(contratosError)
            } else {
                contratoLookup = new Map(
                    ((contratosData as ContratoModeloLookup[]) ?? []).map((modelo) => [modelo.id, modelo])
                )
            }
        }

        const normalizados: PlanoCompleto[] = planosRaw.map((item) => {
            const valorBase = Number(item.valor ?? 0)
            const valorMensal = Number(item.valor_mensal ?? 0)
            const valor = valorBase > 0 ? valorBase : valorMensal
            const recorrencia_intervalo = Number(item.recorrencia_intervalo ?? 1)
            const recorrencia_unidade = item.recorrencia_unidade ?? 'meses'
            const contrato = item.contrato_modelo_id ? contratoLookup.get(item.contrato_modelo_id) : null

            return {
                id: item.id,
                nome: item.nome,
                tipo: (item.tipo ?? deriveLegacyTipo(recorrencia_intervalo, recorrencia_unidade)) as PlanoCompleto['tipo'],
                valor: Number.isFinite(valor) ? valor : 0,
                descricao: item.descricao ?? '',
                ativo: Boolean(item.ativo),
                created_at: item.created_at,
                recorrencia_automatica: item.recorrencia_automatica ?? false,
                tipo_acesso: item.tipo_acesso ?? 'grupo',
                mercadopago_plan_id: item.mercadopago_plan_id ?? null,
                recorrencia_intervalo,
                recorrencia_unidade,
                contrato_modelo_id: item.contrato_modelo_id ?? null,
                contrato_modelo_titulo: contrato?.titulo ?? null,
                contrato_modelo_versao: contrato?.versao ?? null,
                contrato_modelo_slug: contrato?.slug ?? null,
            }
        })

        setPlanos(normalizados)
        setLoading(false)
    }, [supabase, apenasAtivos])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetch()
        }, 0)

        return () => clearTimeout(timer)
    }, [fetch])

    return { planos, loading, refetch: fetch }
}

export function useContratos({ status = '', aluno_id = '', limit = 50 }: UseContratosOptions = {}) {
    const supabase = createClient()
    const [contratos, setContratos] = useState<ContratoCompleto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [total, setTotal] = useState(0)

    const fetch = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('contratos_com_status')
                .select('*', { count: 'exact' })
                .order('data_fim', { ascending: true })
                .limit(limit)

            if (status && status !== 'todos') query = query.eq('status', status)
            if (aluno_id) query = query.eq('aluno_id', aluno_id)

            const { data, error: queryError, count } = await query
            if (queryError) throw queryError

            setContratos((data as ContratoCompleto[]) ?? [])
            setTotal(count ?? 0)
        } catch (fetchError) {
            console.error(fetchError)
            setError('Erro ao carregar contratos.')
            setContratos([])
            setTotal(0)
        } finally {
            setLoading(false)
        }
    }, [supabase, status, aluno_id, limit])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetch()
        }, 0)

        return () => clearTimeout(timer)
    }, [fetch])

    return { contratos, loading, error, total, refetch: fetch }
}

export function useContrato(id: string) {
    const supabase = createClient()
    const [contrato, setContrato] = useState<ContratoCompleto | null>(null)
    const [loading, setLoading] = useState(true)

    const fetch = useCallback(async () => {
        if (!id) {
            setContrato(null)
            setLoading(false)
            return
        }

        setLoading(true)
        const { data, error } = await supabase.from('contratos_com_status').select('*').eq('id', id).single()

        if (error) {
            console.error(error)
            setContrato(null)
            setLoading(false)
            return
        }

        setContrato(data as ContratoCompleto)
        setLoading(false)
    }, [supabase, id])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetch()
        }, 0)

        return () => clearTimeout(timer)
    }, [fetch])

    return { contrato, loading, refetch: fetch }
}
