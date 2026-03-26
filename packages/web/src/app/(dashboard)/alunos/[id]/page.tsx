'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, CheckCircle2, ClipboardList, CreditCard, Edit2, FileText, Lock, MessageCircle, Save, ShieldCheck, UserX, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAluno } from '@/hooks/useAlunos'
import { useContratos } from '@/hooks/useContratos'
import { useAvaliacoesAluno } from '@/hooks/useAvaliacoes'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AvatarInitials } from '@/components/shared/AvatarInitials'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { HistoricoFrequencia } from '@/components/alunos/HistoricoFrequencia'
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils/formatters'
import type { Aluno, AlunoStatus } from '@/types'

type Aba = 'geral' | 'contratos' | 'frequencia' | 'financeiro' | 'avaliacoes'
type EditForm = {
    nome: string
    email: string
    telefone: string
    cpf: string
    data_nascimento: string
    observacoes: string
    status: AlunoStatus
    password: string
}

const fieldClass =
    'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm font-medium text-gray-700 outline-none transition-all hover:border-gray-300 focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/15'

function toForm(aluno: Aluno): EditForm {
    return {
        nome: aluno.nome ?? '',
        email: aluno.email ?? '',
        telefone: aluno.telefone ?? '',
        cpf: aluno.cpf ?? '',
        data_nascimento: aluno.data_nascimento ?? '',
        observacoes: aluno.observacoes ?? '',
        status: aluno.status,
        password: '',
    }
}

function AbaContratos({ alunoId }: { alunoId: string }) {
    const { contratos, loading } = useContratos({ aluno_id: alunoId })
    const router = useRouter()
    if (loading) return <div className="pt-20"><LoadingSpinner label="Localizando contratos ativos..." /></div>
    return (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 flex items-center justify-between border-b border-gray-50 pb-5">
                <h3 className="flex items-center gap-2 text-xl font-black text-gray-900"><CheckCircle2 className="h-6 w-6 text-emerald-500" />Planos adquiridos</h3>
                <button onClick={() => router.push(`/contratos/novo?aluno_id=${alunoId}`)} className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white">Nova assinatura +</button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {contratos.map((contrato) => (
                    <div key={contrato.id} onClick={() => router.push(`/contratos/${contrato.id}`)} className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{contrato.plano_tipo}</p>
                        <p className="text-base font-black text-gray-900">{contrato.plano_nome}</p>
                        <p className="mt-2 text-xs font-bold text-gray-500">{formatDate(contrato.data_inicio).slice(0, 5)} a {formatDate(contrato.data_fim)}</p>
                        <div className="mt-3 flex items-center justify-between">
                            <StatusBadge status={contrato.status} size="sm" />
                            <p className="text-xl font-black tracking-tighter text-gray-900">{formatCurrency(contrato.valor)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AbaPagamentos({ alunoId }: { alunoId: string }) {
    const [pagamentos, setPagamentos] = useState<Array<{ id: string; metodo?: string; data_vencimento: string; valor: number; status: string }>>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    useEffect(() => {
        supabase.from('pagamentos').select('*').eq('aluno_id', alunoId).order('created_at', { ascending: false }).limit(20).then(({ data }) => {
            setPagamentos(data ?? [])
            setLoading(false)
        })
    }, [alunoId, supabase])
    if (loading) return <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"><LoadingSpinner label="Carregando histórico..." /></div>
    return (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 border-b border-gray-50 pb-5">
                <h3 className="flex items-center gap-2 text-xl font-black text-gray-900"><CreditCard className="h-6 w-6 text-[#CC0000]" />Extrato financeiro</h3>
            </div>
            <div className="space-y-3">
                {pagamentos.map((pagamento) => (
                    <div key={pagamento.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/30 p-4">
                        <div>
                            <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-gray-400">{pagamento.metodo ?? 'PIX'}</p>
                            <p className="text-sm font-bold text-gray-800">Venc. {formatDate(pagamento.data_vencimento)}</p>
                        </div>
                        <div className="text-right">
                            <p className="mb-1 text-lg font-black tracking-tighter text-gray-900">{formatCurrency(pagamento.valor)}</p>
                            <StatusBadge status={pagamento.status} size="sm" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function AbaAvaliacoes({ alunoId }: { alunoId: string }) {
    const { avaliacoes, loading } = useAvaliacoesAluno(alunoId)
    const router = useRouter()
    if (loading) return <div className="pt-20"><LoadingSpinner label="Buscando histórico de avaliações..." /></div>
    return (
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8 flex items-center justify-between border-b border-gray-50 pb-5">
                <h3 className="flex items-center gap-2 text-xl font-black text-gray-900"><ClipboardList className="h-6 w-6 text-blue-500" />Histórico de avaliações</h3>
                <button onClick={() => router.push(`/avaliacoes/${alunoId}/nova`)} className="rounded-xl bg-[#CC0000] px-5 py-2.5 text-sm font-bold text-white">Nova avaliação +</button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {avaliacoes.map((avaliacao) => (
                    <div key={avaliacao.id} onClick={() => router.push(`/avaliacoes/${alunoId}/nova?avaliacao_id=${avaliacao.id}`)} className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-[#CC0000] hover:shadow-md">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{avaliacao.tipo}</p>
                        <p className="text-base font-black text-gray-900">{avaliacao.resultado === 'pendente' ? 'Agendada' : `Teste concluído: ${avaliacao.resultado}`}</p>
                        <p className="mt-2 text-xs font-bold text-gray-500">{avaliacao.data_avaliacao ? formatDate(avaliacao.data_avaliacao) : 'Data não definida'}</p>
                        <div className="mt-3 flex items-center justify-between">
                            <StatusBadge status={avaliacao.status} size="sm" />
                            {avaliacao.nota_tecnica_geral ? <p className="text-xl font-black tracking-tighter text-gray-900">{avaliacao.nota_tecnica_geral}/5</p> : null}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default function AlunoDetalhePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { aluno, loading, error, refetch } = useAluno(id)
    const [aba, setAba] = useState<Aba>('geral')
    const [salvando, setSalvando] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState<EditForm | null>(null)
    const supabase = createClient()

    async function handleBloquear() {
        if (!aluno) return
        const novoStatus = aluno.status === 'bloqueado' ? 'ativo' : 'bloqueado'
        if (!confirm(`Tem certeza que deseja ${novoStatus === 'bloqueado' ? 'bloquear' : 'desbloquear'} o acesso de ${aluno.nome}?`)) return
        setSalvando(true)
        const { error: updateError } = await supabase.from('alunos').update({ status: novoStatus }).eq('id', aluno.id)
        setSalvando(false)
        if (updateError) return toast.error('Erro ao atualizar status.')
        toast.success(`Acesso ${novoStatus === 'bloqueado' ? 'bloqueado' : 'restabelecido'} com sucesso.`)
        refetch()
    }

    async function handleCancelar() {
        if (!aluno) return
        if (!confirm(`Atenção: Tem certeza que deseja cancelar o registro de ${aluno.nome}?`)) return
        setSalvando(true)
        const { error: updateError } = await supabase.from('alunos').update({ status: 'cancelado' }).eq('id', aluno.id)
        setSalvando(false)
        if (updateError) return toast.error('Erro ao cancelar cadastro.')
        toast.success('Vínculo cancelado de forma definitiva.')
        refetch()
    }

    async function handleSalvarFicha() {
        if (!aluno || !editForm) return
        setSalvando(true)
        const response = await fetch(`/api/alunos/${aluno.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm),
        })
        const result = await response.json().catch(() => ({}))
        setSalvando(false)
        if (!response.ok) return toast.error(result.error || 'Erro ao salvar ficha do aluno.')
        toast.success('Ficha do aluno atualizada.')
        setShowEditModal(false)
        refetch()
    }

    function handleWhatsApp() {
        if (!aluno?.telefone) return
        const numero = aluno.telefone.replace(/\D/g, '')
        const mensagem = encodeURIComponent(`Olá, ${aluno.nome.split(' ')[0]}! Tudo bem? Aqui é do CT Boxe.`)
        window.open(`https://wa.me/55${numero}?text=${mensagem}`, '_blank')
    }

    if (loading) return <div className="pt-20"><LoadingSpinner label="Buscando detalhes do aluno..." /></div>
    if (error || !aluno) return <div className="py-20 text-center text-gray-500">Aluno não encontrado.</div>

    const abas: { id: Aba; label: string; icon: LucideIcon }[] = [
        { id: 'geral', label: 'Visão geral', icon: FileText },
        { id: 'contratos', label: 'Planos', icon: CheckCircle2 },
        { id: 'frequencia', label: 'Check-ins', icon: Calendar },
        { id: 'avaliacoes', label: 'Avaliações', icon: ClipboardList },
        { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
    ]

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
            <button onClick={() => router.back()} className="group flex w-fit items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900">
                <div className="rounded-md border border-gray-200 bg-white p-1.5"><ArrowLeft className="h-4 w-4" /></div>
                Voltar
            </button>

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="px-6 py-8 sm:px-10">
                    <div className="flex flex-col gap-6 md:flex-row md:items-start">
                        <AvatarInitials nome={aluno.nome} fotoUrl={aluno.foto_url} size="xl" />
                        <div className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row md:justify-between">
                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap items-center gap-3">
                                    <h2 className="text-3xl font-black tracking-tight text-gray-900">{aluno.nome}</h2>
                                    <StatusBadge status={aluno.status} />
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>Membro desde</span>
                                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-bold text-gray-700">{formatDate(aluno.data_cadastro || aluno.created_at)}</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-start gap-2">
                                {aluno.telefone ? <button onClick={handleWhatsApp} className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />WhatsApp</button> : null}
                                <button onClick={handleBloquear} disabled={salvando || aluno.status === 'cancelado'} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 disabled:opacity-40">
                                    {aluno.status === 'bloqueado' ? <><ShieldCheck className="h-4 w-4 text-green-600" />Liberar</> : <><Lock className="h-4 w-4 text-amber-600" />Bloquear</>}
                                </button>
                                {aluno.status !== 'cancelado' ? <button onClick={handleCancelar} disabled={salvando} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><UserX className="h-4 w-4" />Encerrar</button> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="inline-flex max-w-full overflow-x-auto rounded-xl bg-gray-100 p-1.5">
                {abas.map((item) => {
                    const Icon = item.icon
                    const isActive = aba === item.id
                    return <button key={item.id} onClick={() => setAba(item.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-bold ${isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'}`}><Icon className={`h-4 w-4 ${isActive ? 'text-[#CC0000]' : 'text-gray-400'}`} />{item.label}</button>
                })}
            </div>

            {aba === 'geral' ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
                        <div className="mb-8 flex items-center justify-between border-b border-gray-50 pb-4">
                            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900"><span className="inline-block h-6 w-1.5 rounded-full bg-[#CC0000]" />Ficha do aluno</h3>
                            <button onClick={() => { setEditForm(toForm(aluno)); setShowEditModal(true) }} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-gray-500 transition-colors hover:bg-red-50 hover:text-[#CC0000]"><Edit2 className="h-4 w-4" />Editar ficha</button>
                        </div>
                        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                            <InfoField label="E-mail pessoal" value={aluno.email} />
                            <InfoField label="Telefone" value={aluno.telefone ? formatPhone(aluno.telefone) : 'Não informado'} />
                            <InfoField label="Documento (CPF)" value={aluno.cpf || 'Não preenchido'} />
                            <InfoField label="Data de nascimento" value={aluno.data_nascimento ? formatDate(aluno.data_nascimento) : 'Não informado'} />
                        </div>
                        {aluno.observacoes ? <div className="mt-8 rounded-xl border border-yellow-100 bg-yellow-50/50 p-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-800">Anotações internas</p><p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-gray-700">{aluno.observacoes}</p></div> : null}
                    </div>
                    <div className="grid gap-6">
                        <ResumoLateral titulo="Acesso do aluno" valor={aluno.status} texto="Use a edição da ficha para trocar o e-mail de login e definir nova senha." />
                        <ResumoLateral titulo="Cadastro" valor={formatDate(aluno.data_cadastro || aluno.created_at)} texto="Confirme os dados pessoais antes de mexer em contratos e pagamentos." />
                    </div>
                </div>
            ) : null}
            {aba === 'contratos' ? <AbaContratos alunoId={aluno.id} /> : null}
            {aba === 'frequencia' ? <HistoricoFrequencia alunoId={aluno.id} /> : null}
            {aba === 'financeiro' ? <AbaPagamentos alunoId={aluno.id} /> : null}
            {aba === 'avaliacoes' ? <AbaAvaliacoes alunoId={aluno.id} /> : null}

            {showEditModal && editForm ? (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                    <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl">
                        <div className="mb-6">
                            <h3 className="text-xl font-black tracking-tight text-gray-900">Editar ficha do aluno</h3>
                            <p className="mt-1 text-sm font-medium text-gray-500">Aqui o professor pode corrigir dados cadastrais, trocar o e-mail de login e definir nova senha.</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="Nome completo"><input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} className={fieldClass} /></Field>
                            <Field label="E-mail de login"><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={fieldClass} type="email" /></Field>
                            <Field label="Telefone"><input value={editForm.telefone} onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })} className={fieldClass} /></Field>
                            <Field label="CPF"><input value={editForm.cpf} onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })} className={fieldClass} /></Field>
                            <Field label="Data de nascimento"><input value={editForm.data_nascimento} onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })} className={fieldClass} type="date" /></Field>
                            <Field label="Status"><select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AlunoStatus })} className={fieldClass}><option value="ativo">Ativo</option><option value="inativo">Inativo</option><option value="bloqueado">Bloqueado</option><option value="cancelado">Cancelado</option></select></Field>
                            <div className="md:col-span-2"><Field label="Nova senha"><input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className={fieldClass} type="password" placeholder="Deixe em branco para manter a senha atual" /></Field></div>
                            <div className="md:col-span-2"><Field label="Observações"><textarea value={editForm.observacoes} onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })} className={`${fieldClass} min-h-32 py-3`} /></Field></div>
                        </div>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button onClick={() => setShowEditModal(false)} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
                            <button onClick={handleSalvarFicha} disabled={salvando} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save className="h-4 w-4" />{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

function InfoField({ label, value }: { label: string; value: string }) {
    return <div className="space-y-1"><p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p><p className="break-all text-sm font-medium text-gray-900">{value}</p></div>
}

function ResumoLateral({ titulo, valor, texto }: { titulo: string; valor: string; texto: string }) {
    return <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{titulo}</p><p className="mt-2 text-2xl font-black tracking-tight text-gray-900">{valor}</p><p className="mt-2 text-sm font-medium text-gray-500">{texto}</p></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <label className="block"><span className="mb-1.5 block text-sm font-bold text-gray-700">{label}</span>{children}</label>
}
