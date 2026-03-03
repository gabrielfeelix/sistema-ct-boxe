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

export function useNotificacoes(professor?: { nome: string, role: string }) {
    const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()

    const fetch = useCallback(async () => {
        setLoading(true)
        setError(null)

        let query = supabase
            .from('notificacoes')
            .select('id,titulo,subtitulo,mensagem,tipo,lida,aluno_id,acao,link,created_at,updated_at,aluno:alunos(nome,email)')
            .order('created_at', { ascending: false })

        // Se não for super admin e for professor, filtra os resultados no client
        // (Ou poderíamos filtrar no server se tivéssemos a coluna professor_id)

        const { data, error: queryError } = await query

        if (queryError) {
            setError('Não foi possível carregar as notificacoes.')
            setNotificacoes([])
            setLoading(false)
            return
        }

        let results = (data as NotificacaoItem[]) ?? []

        // Filtro lógico para Professores (não super-admin)
        if (professor && professor.role === 'professor') {
            const nomeProf = (professor.nome || '').toLowerCase()
            results = results.filter(n => {
                const msg = (n.mensagem || '').toLowerCase()
                const sub = (n.subtitulo || '').toLowerCase()
                const titulo = (n.titulo || '').toLowerCase()

                return msg.includes(nomeProf) || sub.includes(nomeProf) || titulo.includes(nomeProf) || n.tipo === 'ct'
            })
        }

        setNotificacoes(results)
        setLoading(false)
    }, [supabase, professor?.nome, professor?.role])

    useEffect(() => {
        fetch()
    }, [fetch])

    const naoLidas = useMemo(() => notificacoes.filter((item) => !item.lida).length, [notificacoes])
    const naoLidasInbox = useMemo(() => notificacoes.filter((item) => !item.lida && item.tipo === 'ct').length, [notificacoes])
    const naoLidasAlertas = useMemo(() => notificacoes.filter((item) => !item.lida && item.tipo !== 'ct').length, [notificacoes])

    async function marcarComoLida(id: string, lida: boolean) {
        const { error: updateError } = await supabase
            .from('notificacoes')
            .update({ lida })
            .eq('id', id)

        if (updateError) return false

        setNotificacoes((prev) =>
            prev.map((item) => (item.id === id ? { ...item, lida } : item))
        )

        return true
    }

    async function marcarTodasComoLidas() {
        const { error: updateError } = await supabase
            .from('notificacoes')
            .update({ lida: true })
            .eq('lida', false)

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
        refetch: fetch,
        marcarComoLida,
        marcarTodasComoLidas,
        removerNotificacao,
    }
}
