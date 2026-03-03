import { Users, DollarSign, AlertTriangle, CheckSquare } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { ReceitaChart, type ReceitaSerieItem } from '@/components/dashboard/ReceitaChart'
import { AlertasRisco } from '@/components/dashboard/AlertasRisco'
import { ProximasAulas } from '@/components/dashboard/ProximasAulas'
import { UltimosCheckins } from '@/components/dashboard/UltimosCheckins'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'

interface PagamentoResumo {
    aluno_id?: string | null
    valor: number | string | null
    status: string
    data_vencimento?: string | null
}

function toMonthKey(date: Date) {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${date.getFullYear()}-${month}`
}

function toMonthLabel(date: Date) {
    const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    return label.charAt(0).toUpperCase() + label.slice(1)
}

function toNumber(value: number | string | null | undefined) {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
}

async function getDashboardData() {
    const supabase = await createClient()

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const hojeISO = hoje.toISOString().slice(0, 10)

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    const inicioSemana = new Date(hoje)
    inicioSemana.setDate(hoje.getDate() - 6)
    const inicioSerie = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)

    const [
        ativosResult,
        inadimplentesResult,
        novosMesResult,
        pagamentosMesResult,
        pagamentosSerieResult,
        presencasSemanaResult,
        aulasHojeResult,
    ] =
        await Promise.all([
            supabase.from('alunos').select('id', { count: 'exact', head: true }).eq('status', 'ativo'),
            supabase
                .from('pagamentos')
                .select('aluno_id,status,data_vencimento')
                .lt('data_vencimento', hojeISO)
                .in('status', ['pendente', 'vencido']),
            supabase
                .from('alunos')
                .select('id', { count: 'exact', head: true })
                .gte('created_at', inicioMes.toISOString()),
            supabase
                .from('pagamentos')
                .select('valor,status,data_vencimento,data_pagamento')
                .gte('data_vencimento', inicioMes.toISOString().slice(0, 10))
                .lte('data_vencimento', fimMes.toISOString().slice(0, 10)),
            supabase
                .from('pagamentos')
                .select('aluno_id,valor,status,data_vencimento')
                .gte('data_vencimento', inicioSerie.toISOString().slice(0, 10))
                .lte('data_vencimento', fimMes.toISOString().slice(0, 10)),
            supabase
                .from('presencas')
                .select('status')
                .gte('created_at', inicioSemana.toISOString())
                .in('status', ['presente', 'falta']),
            supabase
                .from('aulas')
                .select('id', { count: 'exact', head: true })
                .eq('data', hojeISO)
                .neq('status', 'cancelada'),
        ])

    const pagamentosMes = (pagamentosMesResult.data as PagamentoResumo[]) ?? []
    const receitaMes = pagamentosMes
        .filter((item) => item.status === 'pago')
        .reduce((sum, item) => sum + toNumber(item.valor), 0)

    const receitaPrevista = pagamentosMes
        .filter((item) => item.status === 'pago' || item.status === 'pendente')
        .reduce((sum, item) => sum + toNumber(item.valor), 0)

    const totalInadimplentes = new Set(
        ((inadimplentesResult.data as Array<{ aluno_id?: string | null }> | null) ?? [])
            .map((item) => item.aluno_id)
            .filter((item): item is string => Boolean(item))
    ).size

    const serieMap = new Map<string, ReceitaSerieItem>()
    for (let offset = 5; offset >= 0; offset--) {
        const reference = new Date(hoje.getFullYear(), hoje.getMonth() - offset, 1)
        const key = toMonthKey(reference)
        serieMap.set(key, {
            mes: toMonthLabel(reference),
            receita: 0,
            meta: 0,
        })
    }

    const pagamentosSerie = (pagamentosSerieResult.data as PagamentoResumo[]) ?? []
    pagamentosSerie.forEach((item) => {
        if (!item.data_vencimento) return
        const dueDate = new Date(`${item.data_vencimento}T00:00:00`)
        if (Number.isNaN(dueDate.getTime())) return

        const bucket = serieMap.get(toMonthKey(dueDate))
        if (!bucket) return

        const valor = toNumber(item.valor)
        if (item.status === 'pago') {
            bucket.receita += valor
        }
        if (item.status === 'pago' || item.status === 'pendente') {
            bucket.meta += valor
        }
    })

    const presencasSemana = presencasSemanaResult.data ?? []
    const presentes = presencasSemana.filter((item) => item.status === 'presente').length
    const faltas = presencasSemana.filter((item) => item.status === 'falta').length
    const taxaPresenca = presentes + faltas === 0 ? 0 : Math.round((presentes / (presentes + faltas)) * 100)

    return {
        totalAtivos: ativosResult.count ?? 0,
        totalInadimplentes,
        novosMes: novosMesResult.count ?? 0,
        receitaMes,
        receitaPrevista,
        taxaPresenca,
        aulasHoje: aulasHojeResult.count ?? 0,
        receitaSerie: Array.from(serieMap.values()),
    }
}


async function ResumoMetricas() {
    const {
        totalAtivos,
        totalInadimplentes,
        novosMes,
        receitaMes,
        receitaPrevista,
        taxaPresenca,
        aulasHoje,
    } = await getDashboardData()

    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
                title="Alunos ativos"
                value={totalAtivos.toString()}
                subtitle={`+${novosMes} novos no mês`}
                icon={Users}
                trend={{ value: `${novosMes} neste mês`, positive: true }}
                variant="default"
            />
            <MetricCard
                title="Receita do mes"
                value={`R$ ${receitaMes.toLocaleString('pt-BR')}`}
                subtitle={`Previsto: R$ ${receitaPrevista.toLocaleString('pt-BR')}`}
                icon={DollarSign}
                trend={{
                    value: receitaPrevista > 0 ? `${Math.round((receitaMes / receitaPrevista) * 100)}% da meta` : '0% da meta',
                    positive: receitaMes >= receitaPrevista && receitaPrevista > 0,
                }}
                variant="success"
            />
            <MetricCard
                title="Inadimplentes"
                value={totalInadimplentes.toString()}
                subtitle="Alunos com pagamento em atraso"
                icon={AlertTriangle}
                variant="danger"
            />
            <MetricCard
                title="Presença semanal"
                value={`${taxaPresenca}%`}
                subtitle={`${aulasHoje} aula(s) hoje`}
                icon={CheckSquare}
                trend={{ value: `${presencaTrendLabel(taxaPresenca, aulasHoje)}`, positive: taxaPresenca >= 70 || (taxaPresenca === 0 && aulasHoje === 0) }}
                variant="warning"
            />
        </div>
    )
}

function SkeletonCard() {
    return <div className="h-32 w-full animate-pulse rounded-xl bg-gray-200" />
}

export default async function DashboardPage() {
    // Apenas a série histórica para o gráfico (pode ser carregada separadamente se quisermos mais velocidade)
    // Mas por enquanto vamos permitir que o gráfico bloqueie levemente ou mover tudo para baixo

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
            <div className="mb-2 flex flex-col gap-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Painel de gestão do CT</h2>
                <p className="text-sm font-medium text-gray-500">Indicadores atualizados com dados reais do sistema.</p>
            </div>

            <Suspense fallback={
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
            }>
                <ResumoMetricas />
            </Suspense>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="xl:col-span-2">
                    {/* O gráfico também pode ser movido para um componente async para não bloquear o layout principal */}
                    <Suspense fallback={<div className="h-80 w-full animate-pulse rounded-xl bg-gray-100" />}>
                        <GraficoReceitaSync />
                    </Suspense>
                </div>
                <Suspense fallback={<SkeletonCard />}>
                    <AlertasRisco />
                </Suspense>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Suspense fallback={<SkeletonCard />}>
                    <ProximasAulas />
                </Suspense>
                <Suspense fallback={<SkeletonCard />}>
                    <UltimosCheckins />
                </Suspense>
            </div>
        </div>
    )
}

async function GraficoReceitaSync() {
    const { receitaSerie } = await getDashboardData()
    return <ReceitaChart data={receitaSerie} />
}

function presencaTrendLabel(taxa: number, aulasHoje: number) {
    if (taxa === 0 && aulasHoje === 0) return 'aguardando dados'
    if (taxa >= 85) return 'aderência alta'
    if (taxa >= 70) return 'aderência estável'
    if (taxa >= 50) return 'aderência em alerta'
    return 'aderência baixa'
}
