'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock3, User, Users, ClipboardCheck, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/formatters'
import { useAula, useAulas } from '@/hooks/useAulas'
import { usePresencaAula, type PresencaStatus } from '@/hooks/usePresenca'
import { CancelarAulaModal } from '@/components/aulas/CancelarAulaModal'
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
                    acao: 'checkin',
                    link: '/checkin',
                    audiencia: 'aluno',
                    icone: 'calendar-days',
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

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Resumo da chamada</h3>
                <p className="mt-1 text-sm font-medium text-gray-500">
                    Acompanhamento em tempo real dos status dos alunos para esta aula.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-center justify-between rounded-xl border border-gray-50 bg-gray-50 p-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inscritos</p>
                            <p className="mt-1 text-2xl font-black text-gray-900">{aula.total_agendados}</p>
                        </div>
                        <Users className="h-5 w-5 text-gray-300" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Presentes</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700">{aula.total_presentes}</p>
                        </div>
                        <ClipboardCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Faltas</p>
                            <p className="mt-1 text-2xl font-black text-red-700">{aula.total_faltas}</p>
                        </div>
                        <UserMinus className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm border-dashed">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vagas Livres</p>
                            <p className="mt-1 text-2xl font-black text-gray-900">{aula.vagas_disponiveis}</p>
                        </div>
                        <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                    </div>
                </div>
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
