'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, CopyPlus, ExternalLink, FileText, Layers3, RefreshCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
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
        const { error: updateError } = await supabase
            .from('contrato_modelos')
            .update({ ativo: true })
            .eq('id', modeloId)

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

    const metricCards = [
        {
            label: 'Versoes salvas',
            value: String(modelos.length),
            helper: 'historico completo',
        },
        {
            label: 'Versao ativa',
            value: modeloAtivo ? `v${modeloAtivo.versao}` : 'Nenhuma',
            helper: modeloAtivo ? modeloAtivo.titulo : 'publique uma versao',
        },
        {
            label: 'Modelo consumido',
            value: 'App + Web',
            helper: 'snapshot vai para aluno_documentos',
        },
    ]

    const fieldClass =
        'w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-700 outline-none transition-all hover:border-gray-300 focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/15'

    if (loading && modelos.length === 0) {
        return <LoadingSpinner label="Carregando contratos..." />
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-8">
            <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                            <FileText className="h-6 w-6 text-[#CC0000]" />
                            Contratos
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm font-medium text-gray-500">
                            Escreva, versione e publique o contrato oficial. A versao ativa alimenta a emissao do painel e o
                            documento que aparece no app para o aluno assinar.
                        </p>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                        <Layers3 className="h-4 w-4" />
                        Fonte unica do contrato
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                {metricCards.map((item) => (
                    <div key={item.label} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">{item.label}</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-gray-900">{item.value}</p>
                        <p className="mt-1 text-sm font-medium text-gray-500">{item.helper}</p>
                    </div>
                ))}
            </section>

            {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <form onSubmit={handleSubmit} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-gray-900">Nova versao</h3>
                            <p className="mt-1 text-sm font-medium text-gray-500">
                                A nova publicacao vai entrar como <span className="font-bold text-gray-900">v{proximaVersao}</span>.
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
                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-700">Titulo do contrato</label>
                            <input
                                value={form.titulo}
                                onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))}
                                className={fieldClass}
                                placeholder="Contrato de Prestacao de Servicos CT de Boxe"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-700">Resumo interno</label>
                            <input
                                value={form.resumo}
                                onChange={(event) => setForm((current) => ({ ...current, resumo: event.target.value }))}
                                className={fieldClass}
                                placeholder="Ex.: ajuste da clausula de renovacao"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-700">PDF de referencia</label>
                            <input
                                value={form.pdfUrl}
                                onChange={(event) => setForm((current) => ({ ...current, pdfUrl: event.target.value }))}
                                className={fieldClass}
                                placeholder="https://..."
                            />
                            <p className="mt-1 text-xs font-medium text-gray-500">
                                Opcional. O texto continua sendo a fonte oficial para o app e para a assinatura digital.
                            </p>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-bold text-gray-700">Texto do contrato</label>
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

                <div className="space-y-6">
                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-black tracking-tight text-gray-900">Preview com placeholders</h3>
                                <p className="mt-1 text-sm font-medium text-gray-500">
                                    Essa visualizacao mostra como o texto chega no app e no painel no momento da emissao.
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

                    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-black tracking-tight text-gray-900">Campos dinamicos</h3>
                        <div className="mt-4 space-y-3">
                            {CONTRATO_TEMPLATE_FIELDS.map((field) => (
                                <div key={field.token} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <code className="text-xs font-bold text-[#CC0000]">{`{{${field.token}}}`}</code>
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">{field.label}</span>
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-gray-500">{field.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-2 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h3 className="text-lg font-black tracking-tight text-gray-900">Historico de versoes</h3>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Cada contrato emitido carrega um snapshot do texto ativo naquele momento.
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
                    <div className="mt-5 space-y-4">
                        {modelos.map((modelo) => (
                            <article key={modelo.id} className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-base font-black tracking-tight text-gray-900">
                                                {modelo.titulo}
                                            </h4>
                                            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                                                v{modelo.versao}
                                            </span>
                                            {modelo.ativo && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Ativa
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm font-medium text-gray-500">
                                            {modelo.resumo?.trim() || 'Sem resumo interno para esta versao.'}
                                        </p>
                                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                            Atualizada em {formatDateTime(modelo.updated_at)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {modelo.pdf_url && (
                                            <a
                                                href={modelo.pdf_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-100"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                PDF
                                            </a>
                                        )}
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
                )}
            </section>
        </div>
    )
}
