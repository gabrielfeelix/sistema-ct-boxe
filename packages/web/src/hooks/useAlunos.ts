'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Aluno } from '@/types'

interface UseAlunosOptions {
    busca?: string
    status?: string
    limit?: number
}

interface UseAlunosReturn {
    alunos: Aluno[]
    loading: boolean
    error: string | null
    total: number
    refetch: () => void
}

export function useAlunos({
    busca = '',
    status = '',
    limit = 50,
}: UseAlunosOptions = {}): UseAlunosReturn {
    const [alunos, setAlunos] = useState<Aluno[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [total, setTotal] = useState(0)
    const supabase = useMemo(() => createClient(), [])

    const loadAlunos = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            let query = supabase
                .from('alunos')
                .select('*', { count: 'exact' })
                .order('nome', { ascending: true })
                .limit(limit)

            if (busca.trim()) {
                query = query.or(`nome.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`)
            }

            if (status && status !== 'todos') {
                query = query.eq('status', status)
            }

            const { data, error: queryError, count } = await query

            if (queryError) throw queryError

            setAlunos((data as Aluno[]) ?? [])
            setTotal(count ?? 0)
        } catch (nextError) {
            setError('Erro ao carregar alunos. Tente novamente.')
            console.error(nextError)
        } finally {
            setLoading(false)
        }
    }, [busca, limit, status, supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadAlunos()
        })
    }, [loadAlunos])

    const refetch = useCallback(() => {
        void loadAlunos()
    }, [loadAlunos])

    return { alunos, loading, error, total, refetch }
}

export function useAluno(id: string) {
    const [aluno, setAluno] = useState<Aluno | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])

    const loadAluno = useCallback(async () => {
        if (!id) return

        setLoading(true)
        setError(null)

        const { data, error: queryError } = await supabase
            .from('alunos')
            .select('*')
            .eq('id', id)
            .single()

        if (queryError) {
            setError('Aluno nÃ£o encontrado.')
        } else {
            setAluno(data as Aluno)
        }

        setLoading(false)
    }, [id, supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadAluno()
        })
    }, [loadAluno])

    const refetch = useCallback(() => {
        void loadAluno()
    }, [loadAluno])

    return { aluno, loading, error, refetch }
}
