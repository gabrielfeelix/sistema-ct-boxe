'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, XCircle, MessageCircle, User, ShieldCheck, CalendarDays, KeyRound, Save, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { QuestionarioRecrutamento } from '@/components/avaliacoes/QuestionarioRecrutamento'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { useCandidato } from '@/hooks/useCandidatos'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/formatters'

const EXPERIENCIA_LABELS: Record<string, string> = {
    nenhuma: 'Nenhuma — zerado',
    iniciante: 'Iniciante (< 6 meses)',
    intermediario: 'Intermediário (6m – 2 anos)',
    avancado: 'Avançado (2+ anos)',
}

type Aba = 'geral' | 'avaliacao'

type AvaliacaoRecrutamento = {
    id: string
    questoes_json?: Array<{ id: string; pergunta: string; resposta: string }>
}

function gerarSenhaTemporaria(nome: string): string {
    const primeiro = nome.split(' ')[0].toLowerCase()
    const numeros = Math.floor(1000 + Math.random() * 9000)
    return `${primeiro}@${numeros}`
}

export default function CandidatoDetalhePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { candidato, loading, refetch } = useCandidato(id)
    const supabase = useMemo(() => createClient(), [])
    const [aba, setAba] = useState<Aba>('geral')
    const [processando, setProcessando] = useState(false)
    const [showAprovar, setShowAprovar] = useState(false)
    const [showReprovar, setShowReprovar] = useState(false)
    const [senhaTemp, setSenhaTemp] = useState('')
    const [motivoReprovacao, setMotivoReprovacao] = useState('')
    const [obsInternas, setObsInternas] = useState('')
    const [salvandoObs, setSalvandoObs] = useState(false)
    const [avaliacaoExistente, setAvaliacaoExistente] = useState<AvaliacaoRecrutamento | null>(null)
    const [loadingAvaliacao, setLoadingAvaliacao] = useState(false)

    const fetchAvaliacao = useCallback(async () => {
        if (!id) return

        setLoadingAvaliacao(true)
        const { data } = await supabase.from('avaliacoes').select('*').eq('candidato_id', id).maybeSingle()
        setAvaliacaoExistente((data as AvaliacaoRecrutamento | null) ?? null)
        setLoadingAvaliacao(false)
    }, [id, supabase])

    useEffect(() => {
        let cancelled = false

        queueMicrotask(() => {
            void (async () => {
                await fetchAvaliacao()
                if (cancelled) return
                setObsInternas(candidato?.observacoes_internas ?? '')
            })()
        })

        return () => {
            cancelled = true
        }
    }, [candidato?.observacoes_internas, fetchAvaliacao])

    async function handleAprovar() {
        if (!senhaTemp.trim() || senhaTemp.length < 6) {
            toast.error('Token/Senha deve ter pelo menos 6 caracteres.')
            return
        }

        setProcessando(true)

        const response = await fetch('/api/candidatos/aprovar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidato_id: id, senha_temporaria: senhaTemp }),
        })

        const data = await response.json()

        if (!response.ok) {
            toast.error(data.error || 'Erro processando liberação de acesso.')
            setProcessando(false)
            return
        }

        toast.success('Candidato aprovado! Conta criada com sucesso.')
        setShowAprovar(false)
        refetch()
        setProcessando(false)
    }

    async function handleReprovar() {
        setProcessando(true)
        const response = await fetch('/api/candidatos/reprovar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidato_id: id, motivo: motivoReprovacao }),
        })

        if (!response.ok) {
            toast.error('Erro ao reprovar candidato.')
            setProcessando(false)
            return
        }

        toast.success('Candidato reprovado.')
        setShowReprovar(false)
        refetch()
        setProcessando(false)
    }

    async function salvarObservacoes() {
        if (!candidato) return

        setSalvandoObs(true)
        const { error } = await supabase
            .from('candidatos')
            .update({ observacoes_internas: obsInternas })
            .eq('id', candidato.id)

        if (error) {
            toast.error('Erro ao salvar observações.')
        } else {
            toast.success('Observações salvas!')
        }

        setSalvandoObs(false)
    }

    function abrirWhatsApp() {
        if (!candidato?.telefone) return
        const numero = candidato.telefone.replace(/\D/g, '')
        const msg = encodeURIComponent(`Olá ${candidato.nome.split(' ')[0]}! Aqui é o professor Argel do CT Boxe.`)
        window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank')
    }

    if (loading) return <div className="pt-20"><LoadingSpinner label="Carregando dados do candidato..." /></div>
    if (!candidato) return <div className="py-20 text-center text-sm font-bold uppercase tracking-widest text-gray-500">Registro Inexistente.</div>

    const isPendente = candidato.status === 'aguardando'
    const isAprovado = candidato.status === 'aprovado'

    const abas: Array<{ id: Aba; label: string; icon: typeof User }> = [
        { id: 'geral', label: 'Dados Iniciais', icon: User },
        { id: 'avaliacao', label: 'Avaliação de Recrutamento', icon: ClipboardList },
    ]

    return (
        <div className="mx-auto max-w-4xl animate-in slide-in-from-bottom-3 space-y-6 pb-12 duration-500">
            <button onClick={() => router.back()} className="group flex w-fit items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900">
                <div className="rounded-md border border-gray-200 bg-white p-1.5 shadow-sm transition-colors group-hover:border-gray-300">
                    <ArrowLeft className="h-4 w-4" />
                </div>
                Candidatos
            </button>

            <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-6 border-b border-gray-50 p-6 sm:flex-row sm:items-start sm:p-8">
                    <div className="flex gap-5">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 shadow-inner sm:h-20 sm:w-20">
                            <User className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="pt-1">
                            <h2 className="mb-2 text-2xl font-black leading-none tracking-tight text-gray-900 sm:text-3xl">{candidato.nome}</h2>
                            <StatusBadge status={candidato.status} />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {candidato.telefone && (
                            <button
                                onClick={abrirWhatsApp}
                                className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-green-600 shadow-sm transition-all hover:bg-green-100"
                            >
                                <MessageCircle className="h-4 w-4" /> WhatsApp
                            </button>
                        )}
                        <div className="text-left sm:text-right">
                            <p className="mb-1 flex items-center gap-1.5 justify-start text-[10px] font-black uppercase tracking-widest text-gray-400 sm:justify-end">
                                <CalendarDays className="h-3 w-3" /> Inscrito em
                            </p>
                            <p className="text-sm font-bold text-gray-800">{formatDate(candidato.created_at)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-8 border-b border-gray-50 bg-gray-50/10 px-8">
                    {abas.map((item) => {
                        const Icon = item.icon
                        return (
                            <button
                                key={item.id}
                                onClick={() => setAba(item.id)}
                                className={`flex items-center gap-2 border-b-2 py-4 text-xs font-black uppercase tracking-widest transition-all ${aba === item.id ? 'border-[#CC0000] text-[#CC0000]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-wrap gap-3 bg-gray-50/50 p-4 sm:px-8 sm:py-5">
                    {isPendente && (
                        <>
                            <button
                                onClick={() => {
                                    setShowAprovar(true)
                                    setShowReprovar(false)
                                    setSenhaTemp(gerarSenhaTemporaria(candidato.nome))
                                }}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-700 sm:flex-none"
                            >
                                <CheckCircle className="h-4 w-4" /> Aprovar e Matricular
                            </button>
                            <button
                                onClick={() => {
                                    setShowReprovar(true)
                                    setShowAprovar(false)
                                }}
                                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-700 shadow-sm transition-colors hover:bg-red-100 sm:flex-none"
                            >
                                <XCircle className="h-4 w-4" /> Recusar
                            </button>
                        </>
                    )}
                    {isAprovado && candidato.aluno_id && (
                        <Link
                            href={`/alunos/${candidato.aluno_id}`}
                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-black sm:flex-none"
                        >
                            Ver ficha do aluno
                        </Link>
                    )}
                </div>
            </div>

            {showAprovar && (
                <div className="animate-in slide-in-from-top-4 space-y-5 rounded-3xl border border-green-200 bg-green-50 p-6 shadow-sm sm:p-8">
                    <h3 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight text-green-900"><ShieldCheck className="h-5 w-5" /> Liberar Acesso</h3>
                    <div className="max-w-xl rounded-2xl border border-green-100 bg-white p-5">
                        <label className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-800"><KeyRound className="h-3 w-3" /> Token Inicial</label>
                        <input
                            value={senhaTemp}
                            onChange={(e) => setSenhaTemp(e.target.value)}
                            className="w-full rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-mono font-bold"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowAprovar(false)} className="rounded-xl border border-green-200 bg-white px-5 py-3 text-sm font-bold text-green-800">Cancelar</button>
                        <button onClick={handleAprovar} disabled={processando} className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700">
                            {processando ? <LoadingSpinner size="sm" /> : 'Confirmar Aprovação'}
                        </button>
                    </div>
                </div>
            )}

            {showReprovar && (
                <div className="animate-in slide-in-from-top-4 space-y-5 rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm sm:p-8">
                    <h3 className="mb-1 flex items-center gap-2 text-xl font-black tracking-tight text-red-900"><XCircle className="h-5 w-5" /> Recusar Inscrição</h3>
                    <textarea
                        value={motivoReprovacao}
                        onChange={(e) => setMotivoReprovacao(e.target.value)}
                        placeholder="Motivo (opcional)..."
                        rows={3}
                        className="w-full max-w-xl resize-none rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium"
                    />
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowReprovar(false)} className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-800">Voltar</button>
                        <button onClick={handleReprovar} disabled={processando} className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700">Confirmar</button>
                    </div>
                </div>
            )}

            {aba === 'geral' && (
                <div className="grid animate-in gap-6 fade-in duration-500 md:grid-cols-5">
                    <div className="space-y-6 md:col-span-3">
                        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                            <h3 className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-3 text-sm font-black uppercase tracking-widest text-gray-400"><User className="h-4 w-4" /> Dados do Candidato</h3>
                            <div className="space-y-6">
                                {[
                                    { label: 'E-mail', value: candidato.email },
                                    { label: 'Telefone', value: candidato.telefone || '—' },
                                    { label: 'Level', value: EXPERIENCIA_LABELS[candidato.experiencia_previa ?? ''] ?? '—' },
                                    { label: 'Vindo de', value: candidato.como_conheceu || '—' },
                                ].map((campo) => (
                                    <div key={campo.label} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{campo.label}</p>
                                        <p className="text-sm font-black text-gray-900">{campo.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="h-full rounded-3xl border border-gray-800 bg-[#111827] p-6 shadow-md sm:p-8">
                            <h3 className="mb-1 flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-gray-400"><Save className="h-4 w-4" /> Notas Internas</h3>
                            <p className="mb-4 text-[10px] font-black uppercase text-gray-500">Histórico e observações</p>
                            <textarea
                                value={obsInternas}
                                onChange={(e) => setObsInternas(e.target.value)}
                                rows={8}
                                className="w-full resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white outline-none focus:ring-1 focus:ring-gray-400"
                            />
                            <button onClick={salvarObservacoes} disabled={salvandoObs} className="mt-6 h-12 w-full rounded-xl bg-gray-700 py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-gray-600">
                                {salvandoObs ? <LoadingSpinner size="sm" /> : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {aba === 'avaliacao' && (
                <div className="animate-in rounded-3xl border border-gray-100 bg-white p-6 shadow-sm fade-in duration-500 sm:p-10">
                    {loadingAvaliacao ? (
                        <LoadingSpinner label="Buscando avaliação..." />
                    ) : (
                        <QuestionarioRecrutamento
                            candidatoId={id}
                            avaliacaoInicial={avaliacaoExistente}
                            onSave={fetchAvaliacao}
                        />
                    )}
                </div>
            )}
        </div>
    )
}
