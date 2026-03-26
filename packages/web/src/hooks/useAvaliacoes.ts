'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Avaliacao } from '@/types'

type AvaliacaoComAluno = Avaliacao & {
    aluno?: {
        nome?: string
        email?: string
        foto_url?: string
    }
}

export function useAvaliacoesAluno(alunoId: string) {
    const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    const loadAvaliacoes = useCallback(async () => {
        if (!alunoId) return

        setLoading(true)
        const { data } = await supabase
            .from('avaliacoes')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('data_avaliacao', { ascending: false })

        setAvaliacoes((data as Avaliacao[]) ?? [])
        setLoading(false)
    }, [alunoId, supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadAvaliacoes()
        })
    }, [loadAvaliacoes])

    const refetch = useCallback(() => {
        void loadAvaliacoes()
    }, [loadAvaliacoes])

    return { avaliacoes, loading, refetch }
}

export function useAvaliacao(id: string) {
    const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    const loadAvaliacao = useCallback(async () => {
        if (!id) return

        setLoading(true)
        const { data } = await supabase.from('avaliacoes').select('*').eq('id', id).single()
        setAvaliacao(data as Avaliacao)
        setLoading(false)
    }, [id, supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadAvaliacao()
        })
    }, [loadAvaliacao])

    const refetch = useCallback(() => {
        void loadAvaliacao()
    }, [loadAvaliacao])

    return { avaliacao, loading, refetch }
}

export function useAvaliacoesPendentes() {
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoComAluno[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    const loadPendentes = useCallback(async () => {
        const { data } = await supabase
            .from('avaliacoes')
            .select('*, aluno:alunos(nome, email, foto_url)')
            .eq('status', 'agendada')
            .order('data_avaliacao', { ascending: true })
            .limit(10)

        setAvaliacoes((data as AvaliacaoComAluno[]) ?? [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadPendentes()
        })
    }, [loadPendentes])

    return { avaliacoes, loading }
}

export function useAvaliacoesConcluidas() {
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoComAluno[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    const loadConcluidas = useCallback(async () => {
        const { data } = await supabase
            .from('avaliacoes')
            .select('*, aluno:alunos(nome, email, foto_url)')
            .eq('status', 'concluida')
            .order('data_avaliacao', { ascending: false })
            .limit(10)

        setAvaliacoes((data as AvaliacaoComAluno[]) ?? [])
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadConcluidas()
        })
    }, [loadConcluidas])

    return { avaliacoes, loading }
}
