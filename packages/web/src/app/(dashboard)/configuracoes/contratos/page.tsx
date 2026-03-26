'use client'

import { useMemo, useState } from 'react'
import {
    CheckCircle2,
    CopyPlus,
    ExternalLink,
    FileText,
    Layers3,
    RefreshCw,
    Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { createClient } from '@/lib/supabase/client'
import {
    buildContratoPreviewContext,
    CONTRATO_PADRAO_CONTEUDO,
    CONTRATO_PADRAO_SLUG,
    CONTRATO_PADRAO_TITULO,
    CONTRATO_TEMPLATE_FIELDS,
    renderContractTemplate,
} from '@/lib/contracts/template'
import { formatDateTime } from '@/lib/utils/formatters'
import { useContratoModelos } from '@/hooks/useContratoModelos'
import type { ContratoModelo } from '@/types'

interface ContratoModeloForm {
    titulo: string
    resumo: string
    conteudo: string
    pdfUrl: string
    ativarAoSalvar: boolean
}

const EMPTY_FORM: ContratoModeloForm = {
    titulo: CONTRATO_PADRAO_TITULO,
    resumo: '',
    conteudo: CONTRATO_PADRAO_CONTEUDO,
    pdfUrl: '',
    ativarAoSalvar: true,
}

export default function ConfiguracoesContratosPage() {
    const supabase = createClient()
    const { modelos, modeloAtivo, loading, error, refetch } = useContratoModelos({ slug: CONTRATO_PADRAO_SLUG })
    const [form, setForm] = useState<ContratoModeloForm>(EMPTY_FORM)
    const [salvando, setSalvando] = useState(false)
    const [ativandoId, setAtivandoId] = useState<string | null>(null)

    const preview = useMemo(() => renderContractTemplate(form.conteudo, buildContratoPreviewContext()), [form.conteudo])
    const proximaVersao = useMemo(() => (modelos[0]?.versao ?? 0) + 1, [modelos])
    const versoesAtivas = modelos.filter((modelo) => modelo.ativo).length

    function carregarModeloComoBase(modelo: ContratoModelo) {
        setForm({
            titulo: modelo.titulo,
            resumo: modelo.resumo ?? '',
            conteudo: modelo.conteudo,
            pdfUrl: modelo.pdf_url ?? '',
            ativarAoSalvar: true,
        })
        toast.success(`Versao ${modelo.versao} carregada como base.`)
    }

    async function ativarVersao(modeloId: string) {
        setAtivandoId(modeloId)
        const { error: updateError } = await supabase.from('contrato_modelos').update({ ativo: true }).eq('id', modeloId)
        setAtivandoId(null)

        if (updateError) {
            console.error(updateError)
            toast.error('Nao foi possivel ativar esta versao.')
            return
        }

        toast.success('Versao ativa atualizada.')
        refetch()
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()

        if (!form.titulo.trim() || !form.conteudo.trim()) {
            toast.error('Preencha o titulo e o texto do contrato.')
            return
        }

        setSalvando(true)

        const payload = {
            slug: CONTRATO_PADRAO_SLUG,
            titulo: form.titulo.trim(),
            versao: proximaVersao,
            resumo: form.resumo.trim() || null,
            conteudo: form.conteudo.trim(),
            pdf_url: form.pdfUrl.trim() || null,
            ativo: form.ativarAoSalvar,
        }

        const { error: insertError } = await supabase.from('contrato_modelos').insert(payload)
        setSalvando(false)

        if (insertError) {
            console.error(insertError)
            toast.error('Nao foi possivel salvar a nova versao do contrato.')
            return
        }

        toast.success(`Versao ${proximaVersao} criada com sucesso.`)
        setForm((current) => ({
            ...current,
            resumo: '',
            ativarAoSalvar: true,
        }))
        refetch()
    }

    const fieldClass =
        'w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-700 outline-none transition-all hover:border-gray-300 focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/15'

    if (loading && modelos.length === 0) {
        return <LoadingSpinner label="Carregando contratos..." />
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-8">
            <header className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="max-w-3xl">
                        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                            <FileText className="h-6 w-6 text-[#CC0000]" />
                            Contratos
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Biblioteca versionada dos contratos usados pelos planos. O web emite o snapshot e o app mostra o
                            mesmo documento ao aluno.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                        <Layers3 className="h-4 w-4" />
                        Fonte versionada
                    </div>
                </div>
            </header>

            <section className="grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr]">
                <CompactMetric
                    label="Versoes salvas"
                    value={String(modelos.length)}
                    helper="historico completo"
                    tooltip="Total de versoes publicadas no acervo. O historico nao substitui snapshots ja emitidos."
                />
                <CompactMetric
                    label="Versao ativa"
                    value={modeloAtivo ? `v${modeloAtivo.versao}` : 'Nenhuma'}
                    helper={modeloAtivo ? modeloAtivo.titulo : 'publique uma versao'}
                    tooltip="A versao ativa funciona como base operacional, mas os planos podem apontar para qualquer versao especifica."
                />
                <CompactMetric
                    label="Consumo"
                    value="Planos, web e app"
                    helper={`${versoesAtivas} ativa(s) no acervo`}
                    tooltip="O plano define qual contrato sera emitido. O texto final vai para aluno_documentos e o app consome esse snapshot."
                />
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <form onSubmit={handleSubmit} className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black tracking-tight text-gray-900">Editor de versao</h3>
                                <InfoTooltip
                                    label="Versao"
                                    description="Cada salvamento cria uma nova versao historica. Isso preserva o texto usado nos contratos ja emitidos."
                                />
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-500">
                                A proxima publicacao sera registrada como <span className="font-bold text-gray-900">v{proximaVersao}</span>.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setForm(EMPTY_FORM)}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Restaurar base
                        </button>
                    </div>

                    <div className="mt-5 grid gap-5">
                        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                            <FieldLabel
                                label="Titulo do contrato"
                                tooltip="Nome operacional da versao. Tambem aparece ao montar o titulo do documento salvo para o aluno."
                            />
                            <input
                                value={form.titulo}
                                onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                                className={fieldClass}
                                placeholder="Contrato de Prestacao de Servicos CT de Boxe"
                            />

                            <FieldLabel
                                label="Resumo interno"
                                tooltip="Resumo curto da mudanca desta versao para facilitar leitura do historico pela equipe."
                            />
                            <input
                                value={form.resumo}
                                onChange={(event) => setForm((current) => ({ ...current, resumo: event.target.value }))}
                                className={fieldClass}
                                placeholder="Ex.: ajuste da clausula de renovacao"
                            />

                            <FieldLabel
                                label="PDF de referencia"
                                tooltip="Opcional. Pode apontar para um PDF diagramado, mas o texto digitado abaixo continua sendo a fonte oficial para emissao."
                            />
                            <input
                                value={form.pdfUrl}
                                onChange={(event) => setForm((current) => ({ ...current, pdfUrl: event.target.value }))}
                                className={fieldClass}
                                placeholder="https://..."
                            />
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center gap-2">
                                <label className="block text-sm font-bold text-gray-700">Texto do contrato</label>
                                <InfoTooltip
                                    label="Placeholders"
                                    description="Tokens como {{aluno_nome}} e {{plano_nome}} sao preenchidos no momento da emissao a partir do aluno e do plano selecionados."
                                />
                            </div>
                            <textarea
                                value={form.conteudo}
                                onChange={(event) => setForm((current) => ({ ...current, conteudo: event.target.value }))}
                                className={`${fieldClass} min-h-[420px] resize-y py-4 font-mono text-[13px] leading-6`}
                                placeholder="Escreva o contrato completo..."
                            />
                        </div>

                        <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">
                            <input
                                type="checkbox"
                                checked={form.ativarAoSalvar}
                                onChange={(event) => setForm((current) => ({ ...current, ativarAoSalvar: event.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-[#CC0000] focus:ring-[#CC0000]/20"
                            />
                            Publicar esta versao como ativa assim que salvar
                        </label>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="submit"
                                disabled={salvando}
                                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#CC0000] px-5 text-sm font-bold text-white transition-colors hover:bg-[#AA0000] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {salvando ? 'Salvando versao...' : `Salvar versao ${proximaVersao}`}
                            </button>
                            <button
                                type="button"
                                onClick={() => setForm((current) => ({ ...current, conteudo: `${current.conteudo}\n\nNova clausula:\n` }))}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
                            >
                                <CopyPlus className="h-4 w-4" />
                                Inserir bloco
                            </button>
                        </div>
                    </div>
                </form>

                <aside className="space-y-5">
                    <div className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black tracking-tight text-gray-900">Preview operacional</h3>
                                    <InfoTooltip
                                        label="Preview"
                                        description="Simula como o texto chega no instante da emissao, ja com os placeholders preenchidos."
                                    />
                                </div>
                                <p className="mt-1 text-sm font-medium text-gray-500">
                                    Referencia visual do texto salvo no web e exibido no app.
                                </p>
                            </div>
                            <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">
                                <Sparkles className="h-3.5 w-3.5" />
                                Preview
                            </div>
                        </div>

                        <pre className="mt-5 max-h-[460px] overflow-auto rounded-2xl border border-gray-200 bg-gray-950 p-4 text-xs leading-6 text-gray-100 whitespace-pre-wrap">
                            {preview}
                        </pre>
                    </div>

                    <div className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black tracking-tight text-gray-900">Guia de placeholders</h3>
                            <InfoTooltip
                                label="Snapshot"
                                description="Quando o contrato e emitido, o sistema salva uma copia final do texto. Alteracoes futuras na biblioteca nao mudam esse snapshot."
                            />
                        </div>
                        <div className="mt-4 space-y-2.5">
                            {CONTRATO_TEMPLATE_FIELDS.map((field) => (
                                <div
                                    key={field.token}
                                    className="rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <code className="text-xs font-bold text-[#CC0000]">{`{{${field.token}}}`}</code>
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
                                            {field.label}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-gray-500">{field.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </section>

            <section className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black tracking-tight text-gray-900">Historico de versoes</h3>
                            <InfoTooltip
                                label="Historico"
                                description="Use o historico para consultar mudancas, ativar outra versao ou reaproveitar uma base textual anterior."
                            />
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Leitura mais densa do acervo, sem perder o contexto de publicacao e ativacao.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Atualizar lista
                    </button>
                </div>

                {modelos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                        <p className="text-sm font-semibold text-gray-600">Nenhuma versao cadastrada ainda.</p>
                    </div>
                ) : (
                    <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
                        <div className="hidden grid-cols-[0.9fr_0.65fr_0.6fr_0.7fr_0.9fr] gap-4 border-b border-gray-100 bg-gray-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-gray-400 md:grid">
                            <span>Versao</span>
                            <span>Status</span>
                            <span>Atualizacao</span>
                            <span>Referencia</span>
                            <span>Acoes</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {modelos.map((modelo) => (
                                <article key={modelo.id} className="px-4 py-4">
                                    <div className="grid gap-4 md:grid-cols-[0.9fr_0.65fr_0.6fr_0.7fr_0.9fr] md:items-center">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-base font-black tracking-tight text-gray-900">{modelo.titulo}</h4>
                                                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                                                    v{modelo.versao}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm font-medium text-gray-500">
                                                {modelo.resumo?.trim() || 'Sem resumo interno para esta versao.'}
                                            </p>
                                        </div>

                                        <div>
                                            {modelo.ativo ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Ativa
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                                                    Arquivada
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm font-medium text-gray-500">{formatDateTime(modelo.updated_at)}</p>

                                        <div>
                                            {modelo.pdf_url ? (
                                                <a
                                                    href={modelo.pdf_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                    PDF
                                                </a>
                                            ) : (
                                                <span className="text-sm font-medium text-gray-400">Sem PDF</span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => carregarModeloComoBase(modelo)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                                            >
                                                <CopyPlus className="h-4 w-4" />
                                                Usar como base
                                            </button>
                                            {!modelo.ativo && (
                                                <button
                                                    type="button"
                                                    disabled={ativandoId === modelo.id}
                                                    onClick={() => ativarVersao(modelo.id)}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    {ativandoId === modelo.id ? 'Ativando...' : 'Ativar versao'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    )
}

function CompactMetric({
    label,
    value,
    helper,
    tooltip,
}: {
    label: string
    value: string
    helper: string
    tooltip: string
}) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-gray-900">{value}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500">{helper}</p>
                </div>
                <InfoTooltip label={label} description={tooltip} />
            </div>
        </div>
    )
}

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
    return (
        <div className="flex items-center gap-2 self-end">
            <label className="block text-sm font-bold text-gray-700">{label}</label>
            <InfoTooltip label={label} description={tooltip} />
        </div>
    )
}
