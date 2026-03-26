'use client'

import { useMemo, useState } from 'react'
import {
    BadgeDollarSign,
    CalendarRange,
    CheckCircle2,
    FileText,
    Pencil,
    Plus,
    Settings2,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { usePlanos } from '@/hooks/useContratos'
import { useContratoModelos } from '@/hooks/useContratoModelos'
import { formatRecurrenceLabel, getPlanoRecorrencia, normalizeInterval } from '@/lib/planos/recorrencia'
import type { ContratoModelo, PlanoCompleto } from '@/types'

const RECORRENCIA_UNIDADES = [
    { value: 'dias', label: 'dias' },
    { value: 'semanas', label: 'semanas' },
    { value: 'meses', label: 'meses' },
    { value: 'anos', label: 'anos' },
] as const

type UnidadeRecorrencia = (typeof RECORRENCIA_UNIDADES)[number]['value']

interface PlanoFormState {
    nome: string
    recorrencia_intervalo: string
    recorrencia_unidade: UnidadeRecorrencia
    valor: string
    contrato_modelo_id: string
    descricao: string
}

const EMPTY_FORM: PlanoFormState = {
    nome: '',
    recorrencia_intervalo: '1',
    recorrencia_unidade: 'meses',
    valor: '',
    contrato_modelo_id: '',
    descricao: '',
}

function formatCurrency(value: number) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseBeneficios(descricao?: string) {
    if (!descricao) return []
    return descricao
        .split(/[\nâ€¢;|]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4)
}

function approximateMonthlyValue(plano: PlanoCompleto) {
    const recorrencia = getPlanoRecorrencia(plano)
    const factor =
        recorrencia.unidade === 'anos'
            ? recorrencia.intervalo * 12
            : recorrencia.unidade === 'meses'
              ? recorrencia.intervalo
              : recorrencia.unidade === 'semanas'
                ? (recorrencia.intervalo * 7) / 30
                : recorrencia.intervalo / 30

    return factor > 0 ? plano.valor / factor : plano.valor
}

function getContratoLabel(plano: PlanoCompleto) {
    if (!plano.contrato_modelo_titulo) return 'Sem contrato vinculado'
    const version = plano.contrato_modelo_versao ? ` v${plano.contrato_modelo_versao}` : ''
    return `${plano.contrato_modelo_titulo}${version}`
}

function buildFormState(plano: PlanoCompleto | null): PlanoFormState {
    if (!plano) return EMPTY_FORM

    const recorrencia = getPlanoRecorrencia(plano)
    return {
        nome: plano.nome,
        recorrencia_intervalo: String(recorrencia.intervalo),
        recorrencia_unidade: recorrencia.unidade,
        valor: plano.valor.toString(),
        contrato_modelo_id: plano.contrato_modelo_id ?? '',
        descricao: plano.descricao ?? '',
    }
}

export default function PlanosPage() {
    const supabase = createClient()
    const { planos, loading, refetch } = usePlanos()
    const { modelos, loading: loadingModelos } = useContratoModelos()
    const [showForm, setShowForm] = useState(false)
    const [editando, setEditando] = useState<PlanoCompleto | null>(null)
    const [form, setForm] = useState<PlanoFormState>(EMPTY_FORM)
    const [salvando, setSalvando] = useState(false)

    const modelosDisponiveis = useMemo(() => {
        const byId = new Map<string, ContratoModelo>()
        for (const modelo of modelos) {
            if (!byId.has(modelo.id)) {
                byId.set(modelo.id, modelo)
            }
        }

        return Array.from(byId.values())
    }, [modelos])

    const resumo = useMemo(() => {
        const ativos = planos.filter((plano) => plano.ativo)
        const ticketMedio =
            ativos.length > 0 ? ativos.reduce((sum, item) => sum + approximateMonthlyValue(item), 0) / ativos.length : 0
        const comContrato = planos.filter((plano) => plano.contrato_modelo_id).length
        const menorEntrada = ativos.reduce<PlanoCompleto | null>((best, current) => {
            if (!best) return current
            return current.valor < best.valor ? current : best
        }, null)

        return {
            total: planos.length,
            ativos: ativos.length,
            ticketMedio,
            comContrato,
            menorEntrada,
        }
    }, [planos])

    function abrirNovo() {
        setEditando(null)
        setForm(EMPTY_FORM)
        setShowForm(true)
    }

    function abrirEditar(plano: PlanoCompleto) {
        setEditando(plano)
        setForm(buildFormState(plano))
        setShowForm(true)
    }

    async function handleSalvar(event: React.FormEvent) {
        event.preventDefault()

        if (!form.nome.trim() || !form.valor.trim()) {
            toast.error('Preencha nome e valor do plano.')
            return
        }

        if (!form.contrato_modelo_id) {
            toast.error('Selecione o contrato que sera usado por este plano.')
            return
        }

        setSalvando(true)

        const recorrencia_intervalo = normalizeInterval(form.recorrencia_intervalo)
        const valor = Number.parseFloat(form.valor.replace(',', '.'))

        const payload = {
            nome: form.nome.trim(),
            valor: Number.isFinite(valor) ? valor : 0,
            descricao: form.descricao.trim() || null,
            contrato_modelo_id: form.contrato_modelo_id,
            recorrencia_intervalo,
            recorrencia_unidade: form.recorrencia_unidade,
            tipo:
                form.recorrencia_unidade === 'anos' && recorrencia_intervalo === 1
                    ? 'anual'
                    : form.recorrencia_unidade === 'meses' && recorrencia_intervalo === 6
                      ? 'semestral'
                      : form.recorrencia_unidade === 'meses' && recorrencia_intervalo === 3
                        ? 'trimestral'
                        : 'mensal',
        }

        const { error } = editando
            ? await supabase.from('planos').update(payload).eq('id', editando.id)
            : await supabase.from('planos').insert(payload)

        setSalvando(false)

        if (error) {
            console.error(error)
            toast.error('Erro ao salvar plano.')
            return
        }

        toast.success(editando ? 'Plano atualizado.' : 'Plano criado.')
        setShowForm(false)
        setEditando(null)
        setForm(EMPTY_FORM)
        refetch()
    }

    async function toggleAtivo(plano: PlanoCompleto) {
        const { error } = await supabase.from('planos').update({ ativo: !plano.ativo }).eq('id', plano.id)
        if (error) {
            console.error(error)
            toast.error('Erro ao atualizar o status do plano.')
            return
        }

        toast.success(plano.ativo ? 'Plano desativado.' : 'Plano ativado.')
        refetch()
    }

    const fieldClass =
        'w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-700 outline-none transition-all hover:border-gray-300 focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/15'

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-8">
            <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-3xl">
                    <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                        <Settings2 className="h-6 w-6 text-gray-400" />
                        Planos e contratos
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                        Cada plano agora carrega sua propria recorrencia e o contrato que sera emitido para o aluno.
                    </p>
                </div>

                <button
                    onClick={abrirNovo}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#CC0000] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#AA0000]"
                >
                    <Plus className="h-4 w-4" />
                    Novo plano
                </button>
            </header>

            <section className="grid gap-4 md:grid-cols-4">
                <ResumoCard label="Planos cadastrados" value={String(resumo.total)} helper="base completa" icon={Settings2} />
                <ResumoCard label="Planos ativos" value={String(resumo.ativos)} helper="liberados para venda" icon={CheckCircle2} />
                <ResumoCard
                    label="Com contrato"
                    value={String(resumo.comContrato)}
                    helper="prontos para emissao"
                    icon={FileText}
                />
                <ResumoCard
                    label="Ticket mensal medio"
                    value={resumo.ticketMedio ? formatCurrency(resumo.ticketMedio) : 'R$ 0,00'}
                    helper={resumo.menorEntrada ? `entrada minima ${formatCurrency(resumo.menorEntrada.valor)}` : 'sem plano'}
                    icon={BadgeDollarSign}
                />
            </section>

            {showForm ? (
                <form onSubmit={handleSalvar} className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">
                                    {editando ? 'Editar plano' : 'Criar novo plano'}
                                </h3>
                                <p className="mt-1 text-sm font-medium text-gray-500">
                                    Defina a oferta comercial, a cadencia de cobranca e o contrato correspondente.
                                </p>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700">Nome do plano</label>
                                <input
                                    className={fieldClass}
                                    value={form.nome}
                                    onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                                    placeholder="Ex.: Plano Black Belt"
                                    required
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-[0.52fr_0.48fr]">
                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Recorrencia</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            min={1}
                                            className={`${fieldClass} max-w-[120px]`}
                                            value={form.recorrencia_intervalo}
                                            onChange={(event) =>
                                                setForm((prev) => ({ ...prev, recorrencia_intervalo: event.target.value }))
                                            }
                                        />
                                        <select
                                            className={fieldClass}
                                            value={form.recorrencia_unidade}
                                            onChange={(event) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    recorrencia_unidade: event.target.value as UnidadeRecorrencia,
                                                }))
                                            }
                                        >
                                            {RECORRENCIA_UNIDADES.map((item) => (
                                                <option key={item.value} value={item.value}>
                                                    {item.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-sm font-bold text-gray-700">Valor total</label>
                                    <input
                                        className={fieldClass}
                                        value={form.valor}
                                        onChange={(event) => setForm((prev) => ({ ...prev, valor: event.target.value }))}
                                        placeholder="195,90"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700">Contrato associado</label>
                                <select
                                    className={fieldClass}
                                    value={form.contrato_modelo_id}
                                    onChange={(event) =>
                                        setForm((prev) => ({ ...prev, contrato_modelo_id: event.target.value }))
                                    }
                                    disabled={loadingModelos}
                                >
                                    <option value="">Selecione um contrato</option>
                                    {modelosDisponiveis.map((modelo) => (
                                        <option key={modelo.id} value={modelo.id}>
                                            {modelo.titulo} v{modelo.versao}
                                            {modelo.ativo ? ' - ativo' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-bold text-gray-700">Beneficios / descricao</label>
                                <textarea
                                    className={`${fieldClass} min-h-28 py-3`}
                                    value={form.descricao}
                                    onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                                    placeholder="Aulas livres; acesso ao sparring; evento mensal incluso"
                                />
                            </div>
                        </div>

                        <div className="rounded-[28px] border border-gray-100 bg-gray-50/80 p-5">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">Resumo operacional</p>
                            <div className="mt-4 space-y-4">
                                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Cobranca</p>
                                    <p className="mt-2 text-lg font-black text-gray-900">
                                        {formatRecurrenceLabel(normalizeInterval(form.recorrencia_intervalo), form.recorrencia_unidade)}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-gray-500">
                                        Valor de entrada {form.valor ? form.valor : '0,00'}.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Contrato emitido</p>
                                    <p className="mt-2 text-sm font-bold text-gray-900">
                                        {modelosDisponiveis.find((modelo) => modelo.id === form.contrato_modelo_id)?.titulo ??
                                            'Nenhum contrato selecionado'}
                                    </p>
                                    <p className="mt-1 text-sm font-medium text-gray-500">
                                        O app exibira o snapshot desta versao no momento da emissao.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">Leitura comercial</p>
                                    <p className="mt-2 text-sm font-medium leading-6 text-gray-600">
                                        Use o campo de descricao para quebrar os principais beneficios em linhas curtas. Isso
                                        melhora comparacao e evita ambiguidades na venda.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando}
                            className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                        >
                            {salvando ? 'Salvando...' : 'Salvar plano'}
                        </button>
                    </div>
                </form>
            ) : null}

            {loading ? (
                <LoadingSpinner label="Buscando planos..." />
            ) : planos.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-white px-6 py-20 text-center">
                    <p className="text-sm font-bold text-gray-700">Voce ainda nao tem planos cadastrados.</p>
                    <p className="mt-2 text-sm font-medium text-gray-500">
                        Comece criando o primeiro plano e vinculando o contrato que sera emitido.
                    </p>
                </div>
            ) : (
                <section className="space-y-4">
                    {planos.map((plano) => {
                        const beneficios = parseBeneficios(plano.descricao)
                        const mensal = approximateMonthlyValue(plano)
                        const recorrencia = getPlanoRecorrencia(plano)

                        return (
                            <article
                                key={plano.id}
                                className={`rounded-[28px] border p-6 shadow-sm transition-all hover:shadow-md ${
                                    plano.ativo ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50/80 opacity-75'
                                }`}
                            >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#CC0000]">
                                                {formatRecurrenceLabel(recorrencia.intervalo, recorrencia.unidade)}
                                            </span>
                                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                {plano.ativo ? 'Ativo' : 'Desativado'}
                                            </span>
                                        </div>

                                        <h3 className="mt-3 text-2xl font-black tracking-tight text-gray-900">{plano.nome}</h3>
                                        <p className="mt-2 text-sm font-medium text-gray-500">
                                            {plano.descricao || 'Sem descricao cadastrada.'}
                                        </p>

                                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                                            <MetaBlock
                                                icon={CalendarRange}
                                                label="Recorrencia"
                                                value={formatRecurrenceLabel(recorrencia.intervalo, recorrencia.unidade)}
                                            />
                                            <MetaBlock
                                                icon={FileText}
                                                label="Contrato"
                                                value={getContratoLabel(plano)}
                                            />
                                            <MetaBlock
                                                icon={BadgeDollarSign}
                                                label="Equivalencia mensal"
                                                value={`${formatCurrency(mensal)}/mes`}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2 lg:flex-col">
                                        <button
                                            onClick={() => abrirEditar(plano)}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                                        >
                                            <Pencil className="h-4 w-4" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggleAtivo(plano)}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                                        >
                                            {plano.ativo ? (
                                                <ToggleRight className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <ToggleLeft className="h-5 w-5 text-gray-400" />
                                            )}
                                            {plano.ativo ? 'Ativo' : 'Inativo'}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
                                        <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Beneficios destacados
                                        </p>
                                        {beneficios.length > 0 ? (
                                            <div className="grid gap-2">
                                                {beneficios.map((beneficio, index) => (
                                                    <div key={`${plano.id}-${index}`} className="flex items-start gap-2">
                                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#CC0000]" />
                                                        <p className="text-sm font-medium text-gray-700">{beneficio}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-gray-500">
                                                Sem beneficios quebrados em topicos. Vale listar 3 ou 4 pontos para facilitar a
                                                comparacao comercial.
                                            </p>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 text-left shadow-sm lg:min-w-[180px] lg:text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Valor total
                                        </p>
                                        <p className="mt-1 text-3xl font-black tracking-tight text-gray-900">
                                            {formatCurrency(plano.valor)}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-gray-500">
                                            equivale a {formatCurrency(mensal)}/mes
                                        </p>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </section>
            )}
        </div>
    )
}

function ResumoCard({
    label,
    value,
    helper,
    icon: Icon,
}: {
    label: string
    value: string
    helper: string
    icon: typeof Settings2
}) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-[#CC0000]">
                <Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
            <p className="mt-2 text-2xl font-black tracking-tight text-gray-900">{value}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">{helper}</p>
        </div>
    )
}

function MetaBlock({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof CalendarRange
    label: string
    value: string
}) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-center gap-2 text-gray-400">
                <Icon className="h-4 w-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</p>
            </div>
            <p className="mt-2 text-sm font-bold text-gray-900">{value}</p>
        </div>
    )
}
