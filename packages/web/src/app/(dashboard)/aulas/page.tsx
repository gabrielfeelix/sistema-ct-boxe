'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus2, Calendar as CalendarIcon, Clock, Users, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAulas, type AulaResumo } from '@/hooks/useAulas'
import { AulaFilters } from '@/components/aulas/AulaFilters'
import { CancelarAulaModal } from '@/components/aulas/CancelarAulaModal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format, parseISO, startOfWeek, addDays, isSameDay, differenceInDays, startOfDay, subWeeks, addWeeks, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function formatRangeHeader(days: Date[]) {
    if (days.length === 0) return ''
    const first = days[0]
    const last = days[days.length - 1]

    if (isSameDay(first, last)) return format(first, "MMMM 'de' yyyy", { locale: ptBR })

    if (first.getMonth() === last.getMonth()) {
        return format(first, "MMMM 'de' yyyy", { locale: ptBR })
    }

    return `${format(first, 'MMM', { locale: ptBR })} - ${format(last, 'MMM yyyy', { locale: ptBR })}`
}

export default function AulasPage() {
    const supabase = createClient()
    const [busca, setBusca] = useState('')
    const [status, setStatus] = useState<'todos' | 'agendada' | 'realizada' | 'cancelada'>('todos')
    const [categoria, setCategoria] = useState<'todos' | 'infantil' | 'adulto'>('todos')
    const [professor, setProfessor] = useState('')
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [aulaCancelamento, setAulaCancelamento] = useState<AulaResumo | null>(null)
    const [cancelando, setCancelando] = useState(false)

    // Gera os dias para exibição com base no filtro ou semana atual
    const weekDays = useMemo(() => {
        if (dataInicio && dataFim) {
            const start = startOfDay(parseISO(dataInicio))
            const end = startOfDay(parseISO(dataFim))
            const diff = differenceInDays(end, start)

            // Se for um range válido de até 31 dias, mostramos todos
            if (diff >= 0 && diff < 32) {
                return Array.from({ length: diff + 1 }).map((_, i) => addDays(start, i))
            }
        }

        const baseDate = dataInicio ? parseISO(dataInicio) : new Date()
        const weekStart = startOfWeek(baseDate, { weekStartsOn: 0 })
        return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
    }, [dataInicio, dataFim])

    const navegar = (direcao: 'anterior' | 'proxima' | 'hoje') => {
        let novaData: Date;
        if (direcao === 'hoje') {
            novaData = new Date();
        } else {
            const atual = dataInicio ? parseISO(dataInicio) : new Date();
            novaData = direcao === 'anterior' ? subWeeks(atual, 1) : addWeeks(atual, 1);
        }

        const start = startOfWeek(novaData, { weekStartsOn: 0 });
        const end = endOfWeek(start, { weekStartsOn: 0 });

        setDataInicio(format(start, 'yyyy-MM-dd'));
        setDataFim(format(end, 'yyyy-MM-dd'));
    }

    const { aulas, loading, error, total, cancelarAula, refetch } = useAulas({
        busca,
        status,
        categoria,
        professor,
        dataInicio,
        dataFim,
        limit: 100,
    })

    async function handleConfirmarCancelamento({ motivo, notificarAlunos, scope }: { motivo: string, notificarAlunos: boolean, scope: 'single' | 'future' }) {
        if (!aulaCancelamento) return
        setCancelando(true)
        const resultado = await cancelarAula(aulaCancelamento.id, { scope })

        if (!resultado.ok) {
            toast.error(resultado.error ?? 'Não foi possível cancelar a aula.')
            setCancelando(false)
            return
        }

        if (notificarAlunos) {
            const { data: inscritos } = await supabase.from('presencas').select('aluno_id').eq('aula_id', aulaCancelamento.id)
            if (inscritos && inscritos.length > 0) {
                const notificacoes = inscritos.map((inscrito) => inscrito.aluno_id).filter(Boolean).map((alunoId) => ({
                    aluno_id: alunoId,
                    tipo: 'aula',
                    titulo: 'Aula cancelada',
                    mensagem: motivo ? `A aula "${aulaCancelamento.titulo}" foi cancelada. Motivo: ${motivo}` : `A aula "${aulaCancelamento.titulo}" foi cancelada.`,
                    acao: 'checkin',
                    link: '/checkin',
                    audiencia: 'aluno',
                    icone: 'calendar-days',
                    lida: false,
                }))
                if (notificacoes.length > 0) await supabase.from('notificacoes').insert(notificacoes)
            }
        }

        toast.success('Aula cancelada com sucesso.')
        setAulaCancelamento(null)
        setCancelando(false)
        await refetch()
    }

    const getAulasForDay = (date: Date) => {
        return aulas.filter(aula => isSameDay(parseISO(aula.data), date)).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8 animate-in slide-in-from-bottom-2 duration-300">
            <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-[#CC0000]/10 p-2.5 rounded-2xl">
                        <CalendarIcon className="w-7 h-7 text-[#CC0000]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Agenda de Treinos</h2>
                            <div className="flex items-center bg-gray-100 p-1 rounded-xl ml-2">
                                <button onClick={() => navegar('anterior')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={() => navegar('hoje')} className="px-3 py-1 text-xs font-bold uppercase tracking-widest text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                                    Hoje
                                </button>
                                <button onClick={() => navegar('proxima')} className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-600">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <p className="mt-1 text-sm font-bold text-gray-500">
                            {formatRangeHeader(weekDays)}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/aulas/series" className="inline-flex h-11 items-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95">
                        Ciclos Recorrentes
                    </Link>
                    <Link href="/aulas/nova" className="inline-flex h-11 items-center rounded-xl bg-[#CC0000] px-5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-[#AA0000] active:scale-95">
                        <CalendarPlus2 className="mr-2 h-4 w-4" /> Nova Aula
                    </Link>
                </div>
            </header>

            <AulaFilters
                busca={busca} onBuscaChange={setBusca}
                status={status} onStatusChange={setStatus}
                categoria={categoria} onCategoriaChange={setCategoria}
                professor={professor} onProfessorChange={setProfessor}
                dataInicio={dataInicio} onDataInicioChange={setDataInicio}
                dataFim={dataFim} onDataFimChange={setDataFim}
            />

            {loading ? (
                <LoadingSpinner label="Carregando grade..." />
            ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px] w-full hide-scrollbar overflow-x-auto">
                    {weekDays.map((day, ix) => {
                        const dayAulas = getAulasForDay(day)
                        const isToday = isSameDay(day, new Date())

                        return (
                            <div key={ix} className={`flex-1 min-w-[200px] border-r border-gray-100 last:border-r-0 flex flex-col ${isToday ? 'bg-red-50/20' : 'bg-transparent'}`}>
                                <div className={`p-4 text-center border-b border-gray-100 ${isToday ? 'border-b-red-200' : ''}`}>
                                    <p className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-red-500' : 'text-gray-400'}`}>
                                        {format(day, 'EEEE', { locale: ptBR })}
                                    </p>
                                    <p className={`text-2xl font-black mt-1 ${isToday ? 'text-red-600' : 'text-gray-900'}`}>
                                        {format(day, 'dd', { locale: ptBR })}
                                    </p>
                                </div>

                                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                    {dayAulas.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center pt-10 opacity-30">
                                            <CalendarIcon className="w-6 h-6 text-gray-400 mb-2" />
                                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Sem aulas</span>
                                        </div>
                                    ) : (
                                        dayAulas.map(aula => {
                                            const ocupacao = aula.capacidade_maxima > 0 ? (aula.total_agendados / aula.capacidade_maxima) * 100 : 0

                                            return (
                                                <Link href={`/aulas/${aula.id}`} key={aula.id} className="block group">
                                                    <div className={`rounded-xl border p-3 cursor-pointer transition-all hover:-translate-y-0.5 shadow-sm text-left ${aula.status === 'cancelada' ? 'bg-gray-50 border-gray-100 opacity-60 grayscale' : 'bg-white border-gray-200 hover:border-red-200 hover:shadow-md'}`}>

                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex gap-1.5 items-center">
                                                                <Clock className={`w-3.5 h-3.5 ${aula.status === 'cancelada' ? 'text-gray-400' : 'text-red-500'}`} />
                                                                <span className="text-xs font-black text-gray-900 tracking-tighter">{aula.hora_inicio.slice(0, 5)}</span>
                                                            </div>
                                                            {aula.status === 'cancelada' && <span className="text-[9px] uppercase font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Canc</span>}
                                                        </div>

                                                        <h4 className="text-sm font-bold text-gray-900 leading-tight mb-2 group-hover:text-red-700 transition-colors line-clamp-2">{aula.titulo}</h4>

                                                        <div className="flex flex-col gap-2 mt-auto">
                                                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                                <Users className="w-3.5 h-3.5" />
                                                                <span className="truncate max-w-[120px]">{aula.professor}</span>
                                                            </div>
                                                            <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 flex justify-between items-center text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                                                                <span className="flex items-center gap-1.5"><UserCheck className="w-3 h-3 text-emerald-500" /> {aula.total_agendados}/{aula.capacidade_maxima}</span>
                                                                <span className={ocupacao >= 100 ? 'text-red-500' : 'text-emerald-600'}>{aula.vagas_disponiveis} vagas</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Link>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <CancelarAulaModal
                open={Boolean(aulaCancelamento)}
                aulaTitulo={aulaCancelamento?.titulo}
                isRecorrente={Boolean(aulaCancelamento?.serie_id)}
                loading={cancelando}
                onOpenChange={(open) => { if (!open) setAulaCancelamento(null) }}
                onConfirm={handleConfirmarCancelamento}
            />
        </div>
    )
}
