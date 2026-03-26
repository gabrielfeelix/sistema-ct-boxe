'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, CalendarPlus2, RefreshCcw, Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'
import { SerieAulaForm } from '@/components/aulas/SerieAulaForm'
import { SeriesAulasGradeSemanal } from '@/components/aulas/SeriesAulasGradeSemanal'
import { useSeriesAulas, type SerieAulaResumo } from '@/hooks/useSeriesAulas'
import type { SerieAulaValues } from '@/lib/validations/serie-aula'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function adicionarDias(dataISO: string, dias: number) {
    const base = new Date(`${dataISO}T00:00:00`)
    base.setDate(base.getDate() + dias)
    return base.toISOString().slice(0, 10)
}

export default function SeriesAulasPage() {
    const hoje = new Date().toISOString().slice(0, 10)
    const [dataInicioGeracao, setDataInicioGeracao] = useState(hoje)
    const [dataFimGeracao, setDataFimGeracao] = useState(adicionarDias(hoje, 35))
    const [formOpen, setFormOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [gerando, setGerando] = useState(false)
    const [serieEdicao, setSerieEdicao] = useState<SerieAulaResumo | null>(null)

    const { series, seriesAtivas, loading, error, criarSerie, atualizarSerie, desativarSerie, gerarAulas, refetch } =
        useSeriesAulas({ ativo: 'todos' })

    const seriesInativas = useMemo(() => series.filter((serie) => !serie.ativo), [series])

    async function handleSubmit(values: SerieAulaValues) {
        setSubmitting(true)

        if (serieEdicao) {
            const result = await atualizarSerie(serieEdicao.id, values)
            setSubmitting(false)
            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success('Serie atualizada com sucesso.')
            setSerieEdicao(null)
            setFormOpen(false)
            return
        }

        const result = await criarSerie(values)
        setSubmitting(false)
        if (result.error) {
            toast.error(result.error)
            return
        }

        toast.success('Serie criada com sucesso! Gerando aulas iniciais...')

        // Gera automaticamente as aulas para os próximos 35 dias para esta nova série
        if (result.data?.id) {
            await gerarAulas({
                dataInicio: hoje,
                dataFim: adicionarDias(hoje, 35),
                serieId: result.data.id
            })
        }

        setFormOpen(false)
        refetch()
    }

    async function handleGerarAulas() {
        setGerando(true)
        const result = await gerarAulas({
            dataInicio: dataInicioGeracao,
            dataFim: dataFimGeracao,
        })
        setGerando(false)

        if (!result.ok) {
            toast.error(result.error ?? 'Não foi possível gerar aulas recorrentes.')
            return
        }

        if ((result.criadas ?? 0) === 0) {
            toast.message('Nenhuma aula nova foi criada para este periodo.')
        } else {
            toast.success(`${result.criadas} aula(s) recorrente(s) criada(s) com sucesso.`)
        }
    }

    async function handleDesativar(serie: SerieAulaResumo) {
        const confirmado = window.confirm(
            `Desativar a série "${serie.titulo}" e cancelar aulas futuras a partir de hoje?`
        )
        if (!confirmado) return

        const result = await desativarSerie(serie.id, true)
        if (!result.ok) {
            toast.error(result.error ?? 'Não foi possível desativar a série.')
            return
        }

        toast.success('Serie desativada e aulas futuras canceladas.')
    }

    if (loading) {
        return <LoadingSpinner label="Carregando séries de aulas..." />
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
            <header className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <Link
                        href="/aulas"
                        className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para aulas
                    </Link>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Series de aulas recorrentes</h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                        {seriesAtivas.length} serie(s) ativa(s) e {seriesInativas.length} inativa(s).
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setSerieEdicao(null)
                            setFormOpen((prev) => !prev)
                        }}
                        className="inline-flex h-10 items-center rounded-lg bg-[#CC0000] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#AA0000]"
                    >
                        <CalendarPlus2 className="mr-2 h-4 w-4" />
                        {formOpen ? 'Fechar formulario' : 'Nova serie'}
                    </button>
                    <button
                        type="button"
                        onClick={refetch}
                        className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Atualizar
                    </button>
                </div>
            </header>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-1">
                    <div className="bg-gray-100 p-2 rounded-lg">
                        <RefreshCcw className="w-5 h-5 text-gray-600" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Manutenção da Agenda</h3>
                </div>
                <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-2xl">
                    As séries são como &quot;moldes&quot;. Para que as aulas apareçam no calendário de todos os alunos, você precisa gerar as instâncias reais para um período. Use esta ferramenta para estender a agenda de todo o CT por mais algumas semanas.
                </p>
                <div className="mt-6 flex flex-wrap items-end gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Gerar de:</label>
                        <input
                            type="date"
                            value={dataInicioGeracao}
                            onChange={(event) => setDataInicioGeracao(event.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 shadow-sm transition-all hover:border-gray-300 focus:border-[#CC0000] focus:ring-0"
                        />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Até:</label>
                        <input
                            type="date"
                            value={dataFimGeracao}
                            onChange={(event) => setDataFimGeracao(event.target.value)}
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-900 shadow-sm transition-all hover:border-gray-300 focus:border-[#CC0000] focus:ring-0"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleGerarAulas}
                        disabled={gerando}
                        className="h-11 px-8 rounded-xl bg-gray-900 hover:bg-black text-white text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-gray-200 disabled:opacity-50 active:scale-95 flex items-center gap-2"
                    >
                        {gerando ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                        {gerando ? 'Sincronizando...' : 'Gerar Aulas de Todos'}
                    </button>
                </div>
            </section>

            <SeriesAulasGradeSemanal series={seriesAtivas} />

            {formOpen && (
                <SerieAulaForm
                    submitting={submitting}
                    submitLabel={serieEdicao ? 'Salvar alteracoes' : 'Criar serie'}
                    initialValues={
                        serieEdicao
                            ? {
                                ...serieEdicao,
                                hora_inicio: serieEdicao.hora_inicio.slice(0, 5),
                                hora_fim: serieEdicao.hora_fim.slice(0, 5),
                            }
                            : undefined
                    }
                    onSubmit={handleSubmit}
                    onCancel={() => {
                        setSerieEdicao(null)
                        setFormOpen(false)
                    }}
                />
            )}

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Series cadastradas</h3>
                <p className="mt-1 text-sm font-medium text-gray-500">
                    Edite parametros da serie ou desative o horario quando nao quiser novas aulas.
                </p>

                <div className="mt-4 space-y-3">
                    {series.length === 0 ? (
                        <p className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm font-medium text-gray-500">
                            Nenhuma serie cadastrada.
                        </p>
                    ) : (
                        series.map((serie) => (
                            <article
                                key={serie.id}
                                className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition-colors hover:border-gray-200"
                            >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900">{serie.titulo}</p>
                                            <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${serie.ativo
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                        : 'bg-gray-100 text-gray-600 ring-gray-200'
                                                    }`}
                                            >
                                                {serie.ativo ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs font-medium text-gray-600">
                                            {diasSemana[serie.dia_semana]} | {serie.hora_inicio.slice(0, 5)} -{' '}
                                            {serie.hora_fim.slice(0, 5)} | {serie.professor}
                                        </p>
                                        <p className="mt-0.5 text-xs font-medium text-gray-500">
                                            {serie.tipo_aula} | {serie.categoria} | capacidade {serie.capacidade_maxima}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                                            onClick={() => {
                                                setSerieEdicao(serie)
                                                setFormOpen(true)
                                            }}
                                        >
                                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                            Editar
                                        </button>
                                        {serie.ativo && (
                                            <button
                                                type="button"
                                                className="inline-flex h-9 items-center rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
                                                onClick={() => handleDesativar(serie)}
                                            >
                                                <Power className="mr-1.5 h-3.5 w-3.5" />
                                                Desativar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </section>
        </div>
    )
}
