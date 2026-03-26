'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, FileCheck, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import { usePlanos } from '@/hooks/useContratos'
import { buildContratoTemplateContext, renderContractTemplate } from '@/lib/contracts/template'
import { addRecurrence, formatRecurrenceLabel, getPlanoRecorrencia } from '@/lib/planos/recorrencia'
import { formatDate } from '@/lib/utils/formatters'
import type { Aluno, ContratoModelo, PlanoCompleto } from '@/types'

type AlunoSelecionavel = Pick<Aluno, 'id' | 'nome' | 'email' | 'cpf' | 'telefone'>

function NovoContratoForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const alunoIdParam = searchParams.get('aluno_id')
    const supabase = createClient()

    const { planos, loading: loadingPlanos } = usePlanos(true)
    const [saving, setSaving] = useState(false)
    const [loadingModeloPlano, setLoadingModeloPlano] = useState(false)

    const [alunoBusca, setAlunoBusca] = useState('')
    const [alunosEncontrados, setAlunosEncontrados] = useState<AlunoSelecionavel[]>([])
    const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoSelecionavel | null>(null)
    const [planoSelecionado, setPlanoSelecionado] = useState<PlanoCompleto | null>(null)
    const [contratoModelo, setContratoModelo] = useState<ContratoModelo | null>(null)
    const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
    const [renovacaoAutomatica, setRenovacaoAutomatica] = useState(false)

    const dataFim = useMemo(() => {
        if (!planoSelecionado) return ''
        const recorrencia = getPlanoRecorrencia(planoSelecionado)
        return addRecurrence(dataInicio, recorrencia.intervalo, recorrencia.unidade)
    }, [dataInicio, planoSelecionado])

    const previewContrato = useMemo(() => {
        if (!contratoModelo || !alunoSelecionado || !planoSelecionado || !dataFim) return null

        return renderContractTemplate(
            contratoModelo.conteudo,
            buildContratoTemplateContext({
                aluno: alunoSelecionado,
                plano: planoSelecionado,
                dataInicio,
                dataFim,
                renovacaoAutomatica,
            })
        )
    }, [alunoSelecionado, contratoModelo, dataFim, dataInicio, planoSelecionado, renovacaoAutomatica])

    useEffect(() => {
        if (!alunoIdParam) return

        async function fetchAlunoSelecionado() {
            const { data } = await supabase
                .from('alunos')
                .select('id,nome,email,cpf,telefone')
                .eq('id', alunoIdParam)
                .single()

            if (data) setAlunoSelecionado(data as AlunoSelecionavel)
        }

        fetchAlunoSelecionado()
    }, [alunoIdParam, supabase])

    useEffect(() => {
        const contratoModeloId = planoSelecionado?.contrato_modelo_id
        if (!contratoModeloId) {
            setContratoModelo(null)
            return
        }

        let cancelled = false
        setLoadingModeloPlano(true)

        async function fetchContratoModelo() {
            const { data, error } = await supabase
                .from('contrato_modelos')
                .select('*')
                .eq('id', contratoModeloId)
                .single()

            if (cancelled) return

            if (error) {
                console.error(error)
                setContratoModelo(null)
                setLoadingModeloPlano(false)
                return
            }

            setContratoModelo(data as ContratoModelo)
            setLoadingModeloPlano(false)
        }

        fetchContratoModelo()

        return () => {
            cancelled = true
        }
    }, [planoSelecionado?.contrato_modelo_id, supabase])

    useEffect(() => {
        if (!alunoBusca.trim() || alunoSelecionado) {
            setAlunosEncontrados([])
            return
        }

        const timer = setTimeout(async () => {
            const { data, error } = await supabase
                .from('alunos')
                .select('id,nome,email,cpf,telefone')
                .eq('status', 'ativo')
                .ilike('nome', `%${alunoBusca.trim()}%`)
                .order('nome', { ascending: true })
                .limit(8)

            if (error) {
                console.error(error)
                setAlunosEncontrados([])
                return
            }

            setAlunosEncontrados((data as AlunoSelecionavel[]) ?? [])
        }, 250)

        return () => clearTimeout(timer)
    }, [alunoBusca, alunoSelecionado, supabase])

    async function handleSalvarContrato() {
        if (!alunoSelecionado || !planoSelecionado) {
            toast.error('Selecione um aluno e um plano.')
            return
        }

        if (!planoSelecionado.contrato_modelo_id) {
            toast.error('Este plano ainda nao tem contrato vinculado. Ajuste em Configuracoes > Planos.')
            return
        }

        if (!contratoModelo || !previewContrato) {
            toast.error('Nao foi possivel carregar o contrato vinculado ao plano.')
            return
        }

        setSaving(true)

        try {
            await Promise.all([
                supabase.from('contratos').update({ status: 'cancelado' }).eq('aluno_id', alunoSelecionado.id).neq('status', 'cancelado'),
                supabase
                    .from('aluno_documentos')
                    .update({ status: 'cancelado' })
                    .eq('aluno_id', alunoSelecionado.id)
                    .eq('status', 'pendente'),
            ])

            const payload = {
                aluno_id: alunoSelecionado.id,
                plano_id: planoSelecionado.id,
                status: 'ativo',
                data_inicio: dataInicio,
                data_fim: dataFim,
                valor: planoSelecionado.valor,
                renovacao_automatica: renovacaoAutomatica,
            }

            const { data: contrato, error: contratoError } = await supabase.from('contratos').insert(payload).select('id').single()
            if (contratoError) throw contratoError

            const documentoTitulo = `${contratoModelo.titulo} v${contratoModelo.versao} - ${planoSelecionado.nome}`
            const { error: documentoError } = await supabase.from('aluno_documentos').insert({
                aluno_id: alunoSelecionado.id,
                titulo: documentoTitulo,
                status: 'pendente',
                texto: previewContrato,
                validade: dataFim,
            })

            if (documentoError) {
                await supabase.from('contratos').delete().eq('id', contrato.id)
                throw documentoError
            }

            toast.success('Contrato registrado com sucesso.')

            try {
                const pgtoResponse = await fetch('/api/pagamentos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        aluno_id: alunoSelecionado.id,
                        contrato_id: contrato.id,
                        valor: planoSelecionado.valor,
                        descricao: `${planoSelecionado.nome} - CT Boxe`,
                        email_pagador: alunoSelecionado.email,
                        nome_pagador: alunoSelecionado.nome,
                    }),
                })

                if (pgtoResponse.ok) {
                    const pgtoData = await pgtoResponse.json()
                    if (pgtoData.pix_copia_cola) {
                        toast.success('Cobranca PIX gerada.')
                    } else {
                        toast.info('Pagamento registrado como pendente.')
                    }
                } else {
                    await supabase.from('pagamentos').insert({
                        aluno_id: alunoSelecionado.id,
                        contrato_id: contrato.id,
                        valor: planoSelecionado.valor,
                        status: 'pendente',
                        metodo: 'pix',
                        data_vencimento: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
                    })
                    toast.info('Cobranca PIX nao disponivel. Pagamento registrado como pendente.')
                }
            } catch {
                await supabase.from('pagamentos').insert({
                    aluno_id: alunoSelecionado.id,
                    contrato_id: contrato.id,
                    valor: planoSelecionado.valor,
                    status: 'pendente',
                    metodo: 'pix',
                    data_vencimento: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
                })
                toast.info('Pagamento registrado como pendente.')
            }

            router.push(`/contratos/${contrato.id}`)
        } catch (submitError) {
            console.error(submitError)
            toast.error('Nao foi possivel registrar o contrato.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 pb-10">
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

            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Registrar contrato</h2>
                <p className="text-sm font-medium text-gray-500">
                    Vincule um aluno ativo a um plano e gere o documento que tambem sera exibido no app.
                </p>
            </header>

            <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-col gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Contrato do plano</p>
                                <h3 className="mt-1 flex items-center gap-2 text-sm font-black text-gray-900">
                                    <FileText className="h-4 w-4 text-[#CC0000]" />
                                    {loadingModeloPlano
                                        ? 'Carregando contrato do plano...'
                                        : contratoModelo
                                          ? `${contratoModelo.titulo} v${contratoModelo.versao}`
                                          : 'Selecione um plano com contrato vinculado'}
                                </h3>
                                <p className="mt-1 text-xs font-medium text-gray-500">
                                    O snapshot salvo em aluno_documentos sai diretamente do contrato associado ao plano escolhido.
                                </p>
                            </div>
                            {!planoSelecionado?.contrato_modelo_id && (
                                <button
                                    type="button"
                                    onClick={() => router.push('/configuracoes/planos')}
                                    className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                                >
                                    Ajustar planos
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Aluno <span className="text-[#CC0000]">*</span>
                        </label>

                        {alunoSelecionado ? (
                            <div className="flex items-start justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{alunoSelecionado.nome}</p>
                                    <p className="text-xs font-medium text-gray-500">{alunoSelecionado.email}</p>
                                </div>
                                {!alunoIdParam && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAlunoSelecionado(null)
                                            setAlunoBusca('')
                                        }}
                                        className="text-xs font-semibold text-gray-600 transition-colors hover:text-gray-900"
                                    >
                                        Trocar
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="text"
                                    value={alunoBusca}
                                    onChange={(event) => setAlunoBusca(event.target.value)}
                                    placeholder="Digite o nome do aluno"
                                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                                />
                                {alunosEncontrados.length > 0 && (
                                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                                        {alunosEncontrados.map((aluno) => (
                                            <button
                                                key={aluno.id}
                                                type="button"
                                                onClick={() => {
                                                    setAlunoSelecionado(aluno)
                                                    setAlunoBusca('')
                                                    setAlunosEncontrados([])
                                                }}
                                                className="w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-gray-50"
                                            >
                                                <p className="text-sm font-semibold text-gray-900">{aluno.nome}</p>
                                                <p className="text-xs text-gray-500">{aluno.email}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                            Plano <span className="text-[#CC0000]">*</span>
                        </label>

                        {loadingPlanos ? (
                            <div className="py-4">
                                <LoadingSpinner size="sm" />
                            </div>
                        ) : planos.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                                Nenhum plano ativo encontrado. Cadastre um plano em Configuracoes para continuar.
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {planos.map((plano) => (
                                    <button
                                        key={plano.id}
                                        type="button"
                                        onClick={() => setPlanoSelecionado(plano)}
                                        className={`rounded-xl border p-4 text-left transition-colors ${
                                            planoSelecionado?.id === plano.id
                                                ? 'border-[#CC0000] bg-red-50/40'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <p className="text-sm font-bold text-gray-900">{plano.nome}</p>
                                        <p className="mt-1 text-lg font-bold text-gray-900">
                                            R$ {plano.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-gray-500">
                                            {formatRecurrenceLabel(
                                                getPlanoRecorrencia(plano).intervalo,
                                                getPlanoRecorrencia(plano).unidade
                                            )}
                                        </p>
                                        <p className="mt-2 text-xs font-semibold text-gray-400">
                                            {plano.contrato_modelo_titulo
                                                ? `Contrato: ${plano.contrato_modelo_titulo} v${plano.contrato_modelo_versao ?? '-'}`
                                                : 'Sem contrato vinculado'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Inicio de vigencia</label>
                            <input
                                type="date"
                                value={dataInicio}
                                onChange={(event) => setDataInicio(event.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Fim previsto</label>
                            <input
                                type="text"
                                value={dataFim ? formatDate(dataFim) : '-'}
                                readOnly
                                className="h-10 w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 text-sm font-medium text-gray-500"
                            />
                        </div>
                        <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={renovacaoAutomatica}
                                onChange={(event) => setRenovacaoAutomatica(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#CC0000] focus:ring-[#CC0000]/30"
                            />
                            Renovacao automatica
                        </label>
                    </div>

                    {alunoSelecionado && planoSelecionado && (
                        <div className="rounded-xl border border-gray-100 bg-gray-900 p-4 text-white">
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">Resumo do contrato</p>
                            <ul className="mt-2 space-y-1 text-sm">
                                <li>Aluno: {alunoSelecionado.nome}</li>
                                <li>Plano: {planoSelecionado.nome}</li>
                                <li>
                                    Recorrencia:{' '}
                                    {formatRecurrenceLabel(
                                        getPlanoRecorrencia(planoSelecionado).intervalo,
                                        getPlanoRecorrencia(planoSelecionado).unidade
                                    )}
                                </li>
                                <li>
                                    Vigencia: {formatDate(dataInicio)} ate {formatDate(dataFim)}
                                </li>
                                <li>
                                    Contrato: {contratoModelo ? `${contratoModelo.titulo} v${contratoModelo.versao}` : 'Nao carregado'}
                                </li>
                                <li className="pt-1 text-base font-bold">
                                    Valor: R$ {planoSelecionado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </li>
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSalvarContrato}
                            disabled={saving || !alunoSelecionado || !planoSelecionado || !contratoModelo}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-[#CC0000] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#AA0000] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-r-white" />
                                    <span className="ml-2">Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <FileCheck className="mr-2 h-4 w-4" />
                                    Salvar contrato
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-gray-900">Preview do documento</h3>
                            <p className="mt-1 text-sm font-medium text-gray-500">
                                Este e o texto que sera salvo para leitura e assinatura no app.
                            </p>
                        </div>
                        {contratoModelo && (
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                                v{contratoModelo.versao}
                            </span>
                        )}
                    </div>

                    <pre className="mt-5 min-h-[640px] rounded-2xl border border-gray-200 bg-gray-950 p-4 text-xs leading-6 text-gray-100 whitespace-pre-wrap">
                        {previewContrato ??
                            'Selecione aluno e um plano que tenha contrato vinculado para visualizar o texto final.'}
                    </pre>
                </div>
            </section>
        </div>
    )
}

export default function NovoContratoPage() {
    return (
        <Suspense
            fallback={
                <div className="mx-auto max-w-3xl py-20">
                    <LoadingSpinner label="Carregando formulario..." />
                </div>
            }
        >
            <NovoContratoForm />
        </Suspense>
    )
}
