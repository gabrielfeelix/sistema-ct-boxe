import { useCallback, useEffect, useState } from 'react'

import { daysUntil } from '@/lib/formatters'
import { supabase } from '@/lib/supabase'
import type { ContractBannerStatus } from '@/lib/types'

const DEFAULT_STATUS: ContractBannerStatus = {
    status: 'em_dia',
    dias_para_vencer: 999,
    plano: 'Plano CT Boxe',
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
        const n = Number.parseFloat(value.replace(',', '.'))
        return Number.isFinite(n) ? n : null
    }
    return null
}

export function useContratoStatus(alunoId?: string | null) {
    const [status, setStatus] = useState<ContractBannerStatus>(DEFAULT_STATUS)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        if (!alunoId) {
            setStatus(DEFAULT_STATUS)
            setLoading(false)
            return
        }

        setLoading(true)

        const paymentQuery = await supabase
            .from('pagamentos')
            .select('id, valor, status, data_vencimento, contrato_id')
            .eq('aluno_id', alunoId)
            .in('status', ['pendente', 'vencido'])
            .order('data_vencimento', { ascending: true })
            .limit(1)
            .maybeSingle()

        const payment = paymentQuery.data

        let planName: string | null = null
        let contractDueDate: string | null = null
        let contractValue: number | null = null

        const contractView = await supabase
            .from('contratos_com_status')
            .select('plano_nome, data_fim, valor')
            .eq('aluno_id', alunoId)
            .order('data_fim', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (contractView.data) {
            planName = (contractView.data.plano_nome as string) ?? null
            contractDueDate = (contractView.data.data_fim as string) ?? null
            contractValue = toNumber(contractView.data.valor)
        } else {
            const contractFallback = await supabase
                .from('contratos')
                .select('data_fim, valor, planos(nome)')
                .eq('aluno_id', alunoId)
                .order('data_fim', { ascending: true })
                .limit(1)
                .maybeSingle()

            if (contractFallback.data) {
                const planRaw = contractFallback.data.planos as { nome?: string } | null
                planName = planRaw?.nome ?? null
                contractDueDate = (contractFallback.data.data_fim as string) ?? null
                contractValue = toNumber(contractFallback.data.valor)
            }
        }

        const dueDate = (payment?.data_vencimento as string | null) ?? contractDueDate
        const days = daysUntil(dueDate)
        const paymentValue = toNumber(payment?.valor)

        const nextStatus: ContractBannerStatus = {
            status: 'em_dia',
            data_vencimento: dueDate,
            dias_para_vencer: days,
            valor: paymentValue ?? contractValue,
            plano: planName ?? 'Plano CT Boxe',
        }

        if (payment && (payment.status === 'vencido' || days < 0)) {
            nextStatus.status = 'vencido'
        } else if (days <= 3) {
            nextStatus.status = 'vencendo'
        }

        setStatus(nextStatus)
        setLoading(false)
    }, [alunoId])

    useEffect(() => {
        refresh()
    }, [refresh])

    useEffect(() => {
        if (!alunoId) return
        // Poll every 5 minutes instead of 30s to reduce battery/network usage
        const interval = setInterval(refresh, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [alunoId, refresh])

    return {
        status,
        loading,
        refresh,
    }
}

