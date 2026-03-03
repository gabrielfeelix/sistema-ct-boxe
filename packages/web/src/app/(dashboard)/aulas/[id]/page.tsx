'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock3, User, Users, ClipboardCheck } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/formatters'
import { useAula, useAulas } from '@/hooks/useAulas'
import { usePresencaAula, type PresencaStatus } from '@/hooks/usePresenca'
import { CancelarAulaModal } from '@/components/aulas/CancelarAulaModal'
import { PresencaStats } from '@/components/presenca/PresencaStats'
import { ListaPresenca } from '@/components/presenca/ListaPresenca'
import { CheckinManual } from '@/components/presenca/CheckinManual'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function AulaDetalhePage() {
    const router = useRouter()
    const params = useParams<{ id: string }>()
    const aulaId = params.id
    const supabase = createClient()

    const { aula, loading, error, refetch } = useAula(aulaId)
    const { atualizarAula, cancelarAula } = useAulas()

    // hooks de presenca
    const { registros, loading: loadingPresenca, error: errorPresenca, marcarPresenca, checkinManual } = usePresencaAula(aulaId)

    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [savingPresenca, setSavingPresenca] = useState(false)

    async function handleMarcar(alunoId: string, status: PresencaStatus) {
        setSavingPresenca(true)
        const resultado = await marcarPresenca(alunoId, status)
        setSavingPresenca(false)

        if (!resultado.ok) {
            toast.error(resultado.error ?? 'Não foi possível atualizar a presenca.')
            return
        }

        toast.success('Presenca atualizada.')
        await refetch()
    }

    async function handleCheckin(alunoId: string) {
        setSavingPresenca(true)
        const resultado = await checkinManual(alunoId)
        setSavingPresenca(false)

        if (!resultado.ok) {
            toast.error(resultado.error ?? 'Não foi possível registrar o check-in.')
            return
        }

        toast.success('Check-in manual registrado.')
        await refetch()
    }

    async function finalizarAula() {
        if (!aula) return
        setUpdating(true)
        const { error: updateError } = await atualizarAula(aula.id, { status: 'realizada' })
        setUpdating(false)

        if (updateError) {
            toast.error(updateError)
            return
        }

        toast.success('Aula marcada como realizada.')
        await refetch()
    }

    async function handleCancelConfirm(payload: {
        motivo: string
        notificarAlunos: boolean
        scope: 'single' | 'future'
    }) {
        if (!aula) return
        setUpdating(true)

        const resultado = await cancelarAula(aula.id, { scope: payload.scope })
        if (!resultado.ok) {
            setUpdating(false)
            toast.error(resultado.error ?? 'Não foi possível cancelar a aula.')
            return
        }

        if (payload.notificarAlunos) {
            const { data: inscritos } = await supabase.from('presencas').select('aluno_id').eq('aula_id', aula.id)
            const notificacoes = (inscritos ?? [])
                .map((item) => item.aluno_id)
                .filter(Boolean)
                .map((alunoId) => ({
                    aluno_id: alunoId,
                    tipo: 'aula',
                    titulo: 'Aula cancelada',
                    mensagem: payload.motivo
                        ? `A aula "${aula.titulo}" foi cancelada. Motivo: ${payload.motivo}`
                        : `A aula "${aula.titulo}" foi cancelada.`,
                    lida: false,
                }))

            if (notificacoes.length > 0) {
                const { error: notifyError } = await supabase.from('notificacoes').insert(notificacoes)
                if (notifyError) {
                    console.error(notifyError)
                    toast.warning('A aula foi cancelada, mas nem todas as notificacoes foram enviadas.')
                }
            }
        }

        toast.success('Aula cancelada com sucesso.')
        setUpdating(false)
        setCancelModalOpen(false)
        await refetch()
    }

    if (loading) {
        return <LoadingSpinner label="Carregando dados da aula..." />
    }

    if (error || !aula) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {error ?? 'Aula nao encontrada.'}
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
            <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
            >
                <span className="rounded-md border border-gray-200 bg-white p-1.5">
                    <ArrowLeft className="h-4 w-4" />
                </span>
                Voltar
            </button>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-gray-900">{aula.titulo}</h2>
                        <div className="mt-3 grid gap-2 text-sm font-medium text-gray-600 sm:grid-cols-2">
                            <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDate(aula.data)}
                            </p>
                            <p className="flex items-center gap-2">
                                <Clock3 className="h-4 w-4 text-gray-400" />
                                {aula.hora_inicio.slice(0, 5)} - {aula.hora_fim.slice(0, 5)}
                            </p>
                            <p className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                {aula.professor}
                            </p>
                            <p className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-gray-400" />
                                Capacidade: {aula.capacidade_maxima}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {aula.status === 'agendada' && (
                            <>
                                <button
                                    type="button"
                                    className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={finalizarAula}
                                    disabled={updating}
                                >
                                    Marcar como realizada
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex h-10 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    onClick={() => setCancelModalOpen(true)}
                                    disabled={updating}
                                >
                                    Cancelar aula
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <PresencaStats
                resumo={{
                    total: aula.total_agendados + aula.total_faltas + aula.total_cancelados,
                    presentes: aula.total_presentes,
                    faltas: aula.total_faltas,
                    agendados: Math.max(0, aula.total_agendados - aula.total_presentes),
                    cancelados: aula.total_cancelados,
                    taxa_presenca:
                        aula.total_presentes + aula.total_faltas === 0
                            ? 0
                            : Math.round((aula.total_presentes / (aula.total_presentes + aula.total_faltas)) * 100),
                }}
            />

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Resumo da chamada</h3>
                <p className="mt-1 text-sm font-medium text-gray-500">
                    Atualize presencas em tempo real pela lista da aula. Os indicadores abaixo refletem o status salvo.
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2 lg:grid-cols-4">
                    <li className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Agendados</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{aula.total_agendados}</p>
                    </li>
                    <li className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Presentes</p>
                        <p className="mt-1 text-xl font-bold text-emerald-700">{aula.total_presentes}</p>
                    </li>
                    <li className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Faltas</p>
                        <p className="mt-1 text-xl font-bold text-red-700">{aula.total_faltas}</p>
                    </li>
                    <li className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vagas livres</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{aula.vagas_disponiveis}</p>
                    </li>
                </ul>
            </section>

            <CancelarAulaModal
                open={cancelModalOpen}
                aulaTitulo={aula.titulo}
                isRecorrente={Boolean(aula.serie_id)}
                loading={updating}
                onOpenChange={setCancelModalOpen}
                onConfirm={handleCancelConfirm}
            />

            {loadingPresenca ? (
                <LoadingSpinner label="Carregando chamada..." />
            ) : errorPresenca ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{errorPresenca}</div>
            ) : (
                <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
                    <ListaPresenca registros={registros} loading={savingPresenca} onMarcar={handleMarcar} />
                    <CheckinManual registros={registros} loading={savingPresenca} onCheckin={handleCheckin} />
                </div>
            )}
        </div>
    )
}
