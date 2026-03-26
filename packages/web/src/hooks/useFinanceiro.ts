'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PagamentoCompleto } from '@/types'

export function useInadimplentes() {
    const [inadimplentes, setInadimplentes] = useState<PagamentoCompleto[]>([])
    const [loading, setLoading] = useState(true)
    const [totalEmAberto, setTotalEmAberto] = useState(0)
    const supabase = useMemo(() => createClient(), [])

    const loadInadimplentes = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('pagamentos')
            .select('*, aluno:alunos(nome, email, telefone)')
            .eq('status', 'vencido')
            .order('data_vencimento', { ascending: true })

        const lista = (data as PagamentoCompleto[]) ?? []
        setInadimplentes(lista)
        setTotalEmAberto(lista.reduce((acc, pagamento) => acc + pagamento.valor, 0))
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadInadimplentes()
        })
    }, [loadInadimplentes])

    const refetch = useCallback(() => {
        void loadInadimplentes()
    }, [loadInadimplentes])

    return { inadimplentes, loading, totalEmAberto, refetch }
}

export function usePagamentosDoMes() {
    const [pagamentos, setPagamentos] = useState<PagamentoCompleto[]>([])
    const [loading, setLoading] = useState(true)
    const [totalPago, setTotalPago] = useState(0)
    const [totalPendente, setTotalPendente] = useState(0)
    const supabase = useMemo(() => createClient(), [])

    const loadPagamentos = useCallback(async () => {
        setLoading(true)

        const inicioMes = new Date()
        inicioMes.setDate(1)
        inicioMes.setHours(0, 0, 0, 0)

        const { data } = await supabase
            .from('pagamentos')
            .select('*, aluno:alunos(nome, email)')
            .gte('created_at', inicioMes.toISOString())
            .order('created_at', { ascending: false })

        const lista = (data as PagamentoCompleto[]) ?? []
        setPagamentos(lista)
        setTotalPago(lista.filter((pagamento) => pagamento.status === 'pago').reduce((acc, pagamento) => acc + pagamento.valor, 0))
        setTotalPendente(lista.filter((pagamento) => pagamento.status === 'pendente').reduce((acc, pagamento) => acc + pagamento.valor, 0))
        setLoading(false)
    }, [supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void loadPagamentos()
        })
    }, [loadPagamentos])

    const refetch = useCallback(() => {
        void loadPagamentos()
    }, [loadPagamentos])

    return { pagamentos, loading, totalPago, totalPendente, refetch }
}
