'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notificacao } from '@/types'

interface NotificacaoAluno {
    nome?: string | null
    email?: string | null
}

export interface NotificacaoItem extends Notificacao {
    aluno?: NotificacaoAluno | null
}

export function useNotificacoes(professor?: { nome: string; role: string }) {
    const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = useMemo(() => createClient(), [])

    const buscarNotificacoes = useCallback(async (): Promise<{ items: NotificacaoItem[]; error: string | null }> => {
        const { data, error: queryError } = await supabase
            .from('notificacoes')
            .select(
                'id,titulo,subtitulo,mensagem,tipo,lida,aluno_id,acao,link,audiencia,professor_nome,icone,created_at,updated_at,aluno:alunos(nome,email)'
            )
            .order('created_at', { ascending: false })

        if (queryError) {
            return { items: [], error: 'NÃ£o foi possÃ­vel carregar as notificaÃ§Ãµes.' }
        }

        let results = (data as NotificacaoItem[]) ?? []

        if (professor && professor.role === 'professor') {
            const nomeProf = (professor.nome || '').trim().toLowerCase()
            results = results.filter((item) => {
                const audiencia = (item.audiencia ?? 'aluno').toLowerCase()
                const alvoProfessor = (item.professor_nome ?? '').trim().toLowerCase()
                return audiencia === 'professor' && (!alvoProfessor || alvoProfessor === nomeProf)
            })
        }

        return { items: results, error: null }
    }, [professor, supabase])

    useEffect(() => {
        let cancelled = false

        queueMicrotask(() => {
            void (async () => {
                setLoading(true)
                setError(null)

                const { items, error: nextError } = await buscarNotificacoes()

                if (cancelled) return

                setNotificacoes(items)
                setError(nextError)
                setLoading(false)
            })()
        })

        return () => {
            cancelled = true
        }
    }, [buscarNotificacoes])

    const refetch = useCallback(async () => {
        setLoading(true)
        setError(null)

        const { items, error: nextError } = await buscarNotificacoes()

        setNotificacoes(items)
        setError(nextError)
        setLoading(false)
    }, [buscarNotificacoes])

    const naoLidas = useMemo(() => notificacoes.filter((item) => !item.lida).length, [notificacoes])
    const naoLidasInbox = useMemo(
        () => notificacoes.filter((item) => !item.lida && (item.audiencia ?? 'aluno') === 'aluno').length,
        [notificacoes]
    )
    const naoLidasAlertas = useMemo(
        () => notificacoes.filter((item) => !item.lida && (item.audiencia ?? 'aluno') !== 'aluno').length,
        [notificacoes]
    )

    async function marcarComoLida(id: string, lida: boolean) {
        const { error: updateError } = await supabase.from('notificacoes').update({ lida }).eq('id', id)

        if (updateError) return false

        setNotificacoes((prev) => prev.map((item) => (item.id === id ? { ...item, lida } : item)))
        return true
    }

    async function marcarTodasComoLidas() {
        const idsNaoLidos = notificacoes.filter((item) => !item.lida).map((item) => item.id)
        if (idsNaoLidos.length === 0) return true

        const { error: updateError } = await supabase.from('notificacoes').update({ lida: true }).in('id', idsNaoLidos)

        if (updateError) return false

        setNotificacoes((prev) => prev.map((item) => ({ ...item, lida: true })))
        return true
    }

    async function removerNotificacao(id: string) {
        const { error: deleteError } = await supabase.from('notificacoes').delete().eq('id', id)
        if (deleteError) return false

        setNotificacoes((prev) => prev.filter((item) => item.id !== id))
        return true
    }

    return {
        notificacoes,
        loading,
        error,
        naoLidas,
        naoLidasInbox,
        naoLidasAlertas,
        refetch,
        marcarComoLida,
        marcarTodasComoLidas,
        removerNotificacao,
    }
}
