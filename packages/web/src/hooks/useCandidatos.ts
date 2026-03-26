'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Candidato } from '@/types'

interface UseCandidatosOptions {
    status?: string
    busca?: string
}

export function useCandidatos({ status = '', busca = '' }: UseCandidatosOptions = {}) {
    const [candidatos, setCandidatos] = useState<Candidato[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [pendentes, setPendentes] = useState(0)
    const supabase = useMemo(() => createClient(), [])

    const loadCandidatos = useCallback(async () => {
        setLoading(true)

        let query = supabase
            .from('candidatos')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (status && status !== 'todos') {
            query = query.eq('status', status)
        }

        if (busca.trim()) {
            query = query.ilike('nome', `%${busca}%`)
        }

        const { data, count } = await query
        setCandidatos((data as Candidato[]) ?? [])
        setTotal(count ?? 0)

        const { count: countPendentes } = await supabase
            .from('candidatos')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'aguardando')

        setPendentes(countPendentes ?? 0)
        setLoading(false)
    }, [busca, status, supabase])

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            void loadCandidatos()
        }, busca ? 300 : 0)

        return () => clearTimeout(delaySearch)
    }, [busca, loadCandidatos])

    const refetch = useCallback(() => {
        void loadCandidatos()
    }, [loadCandidatos])

    return { candidatos, loading, total, pendentes, refetch }
}

export function useCandidato(id: string) {
    const [candidato, setCandidato] = useState<Candidato | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    const loadCandidato = useCallback(async () => {
        if (!id) return

        setLoading(true)
        const { data } = await supabase.from('candidatos').select('*').eq('id', id).single()
        setCandidato(data as Candidato)
        setLoading(false)
    }, [id, supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadCandidato()
        })
    }, [loadCandidato])

    const refetch = useCallback(() => {
        void loadCandidato()
    }, [loadCandidato])

    return { candidato, loading, refetch }
}
