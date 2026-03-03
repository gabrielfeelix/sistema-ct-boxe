import Link from 'next/link'
import { AlertTriangle, ChevronRight, Clock3, TrendingDown, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface AlertaItem {
    id: string
    mensagem: string
    acao: string
    href: string
    color: string
    icon: typeof AlertTriangle
}

async function getAlertas(): Promise<AlertaItem[]> {
    const supabase = await createClient()
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const seteDiasAtras = new Date(hoje)
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
    const dezDiasAtras = new Date(hoje)
    dezDiasAtras.setDate(dezDiasAtras.getDate() - 10)
    const dezDiasAtrasISO = dezDiasAtras.toISOString().slice(0, 10)

    const [pagamentosAtrasados, contratosVencendo, alunosAtivosCount, avaliacoesPendentes] = await Promise.all([
        supabase
            .from('pagamentos')
            .select('id', { count: 'exact', head: true })
            .lte('data_vencimento', seteDiasAtras.toISOString().slice(0, 10))
            .in('status', ['pendente', 'vencido']),
        supabase
            .from('contratos_com_status')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'vencendo'),
        supabase
            .from('alunos')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'ativo')
            .or(`ultimo_treino.lte.${dezDiasAtrasISO},ultimo_treino.is.null`),
        supabase.from('avaliacoes').select('id', { count: 'exact', head: true }).eq('status', 'agendada'),
    ])

    const alunosEmRisco = alunosAtivosCount.count ?? 0

    const alertas: AlertaItem[] = []

    if ((avaliacoesPendentes.count ?? 0) > 0) {
        alertas.push({
            id: 'avaliacoes',
            mensagem: `${avaliacoesPendentes.count} avaliação(ões) física(s) pendente(s).`,
            acao: 'Ver avaliações',
            href: '/avaliacoes',
            color: 'text-blue-600 bg-blue-50 border-blue-100',
            icon: ClipboardList,
        })
    }

    if ((pagamentosAtrasados.count ?? 0) > 0) {
        alertas.push({
            id: 'financeiro',
            mensagem: `${pagamentosAtrasados.count} pagamento(s) vencido(s) há mais de 7 dias.`,
            acao: 'Ver inadimplência',
            href: '/financeiro/inadimplencia',
            color: 'text-red-600 bg-red-50 border-red-100',
            icon: AlertTriangle,
        })
    }

    if ((contratosVencendo.count ?? 0) > 0) {
        alertas.push({
            id: 'contratos',
            mensagem: `${contratosVencendo.count} contrato(s) vencendo nos próximos dias.`,
            acao: 'Ver contratos',
            href: '/contratos',
            color: 'text-amber-600 bg-amber-50 border-amber-100',
            icon: Clock3,
        })
    }

    if (alunosEmRisco > 0) {
        alertas.push({
            id: 'risco',
            mensagem: `${alunosEmRisco} aluno(s) sem treinar há 10 dias ou mais.`,
            acao: 'Ver alunos',
            href: '/alunos',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
            icon: TrendingDown,
        })
    }

    return alertas
}

export async function AlertasRisco() {
    const alertas = await getAlertas()

    return (
        <div className="flex h-full flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Alertas prioritários</h3>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">{alertas.length}</span>
            </div>

            {alertas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-500">
                    Nenhum alerta crítico no momento.
                </p>
            ) : (
                <div className="flex flex-1 flex-col gap-3">
                    {alertas.map((alerta) => {
                        const Icon = alerta.icon
                        return (
                            <div key={alerta.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                <div className="mb-2 flex items-start gap-2.5">
                                    <div className={`rounded-md border p-1.5 ${alerta.color}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <p className="text-sm font-medium leading-snug text-gray-700">{alerta.mensagem}</p>
                                </div>
                                <div className="flex justify-end">
                                    <Link
                                        href={alerta.href}
                                        className="group inline-flex items-center text-xs font-semibold text-[#CC0000] transition-colors hover:text-[#AA0000]"
                                    >
                                        {alerta.acao}
                                        <ChevronRight className="ml-0.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
