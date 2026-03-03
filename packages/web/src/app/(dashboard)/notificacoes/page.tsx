'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { Bell, CalendarClock, CreditCard, ShieldAlert, Megaphone, Trash2, CheckCheck, Check, ExternalLink, Settings2, Instagram, Youtube, Video, RefreshCw, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useNotificacoes, type NotificacaoItem } from '@/hooks/useNotificacoes'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { createClient } from '@/lib/supabase/client'

type Filtro = 'todas' | 'nao_lidas'
type Tab = 'inbox' | 'regras'

const TIPO_META: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
    aula: { label: 'Aulas', icon: CalendarClock, tone: 'bg-orange-100 text-orange-700 border-orange-200' },
    pagamento: { label: 'Financeiro', icon: CreditCard, tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    ct: { label: 'CT', icon: Bell, tone: 'bg-red-100 text-red-700 border-red-200' },
    sistema: { label: 'Sistema', icon: ShieldAlert, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
}

function obterMeta(tipo: string) {
    return TIPO_META[tipo] ?? { label: 'Geral', icon: Megaphone, tone: 'bg-gray-100 text-gray-700 border-gray-200' }
}

function formatarMomento(valor: string) {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return '-'
    const diffMs = Date.now() - data.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHora = Math.floor(diffMs / 3600000)
    const diffDia = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin} min`
    if (diffHora < 24) return `${diffHora} h`
    if (diffDia < 7) return `${diffDia} d`
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function NotificacaoCard({ item, processando, onToggleLida, onRemover }: {
    item: NotificacaoItem, processando: boolean, onToggleLida: (item: NotificacaoItem) => Promise<void>, onRemover: (id: string) => Promise<void>
}) {
    const meta = obterMeta(item.tipo)
    const Icon = meta.icon
    return (
        <article className={`rounded-2xl border p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 group ${item.lida ? 'border-gray-100 bg-white hover:border-gray-200' : 'border-[#CC0000]/20 bg-gradient-to-r from-red-50/80 to-orange-50/50 backdrop-blur-sm relative overflow-hidden'}`}>
            {!item.lida && <div className="absolute top-0 left-0 w-1 h-full bg-[#CC0000] shadow-[0_0_10px_rgba(204,0,0,0.5)]" />}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between relative z-10">
                <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${meta.tone}`}>
                            <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                        {!item.lida && <span className="rounded-full bg-[#CC0000] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow-sm animate-pulse">Nova</span>}
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1 flex-1 sm:flex-none justify-end sm:justify-start">
                            <CalendarClock className="w-3 h-3" /> {formatarMomento(item.created_at)}
                        </span>
                    </div>

                    <h3 className={`text-base sm:text-lg font-black tracking-tight ${item.lida ? 'text-gray-900 group-hover:text-[#CC0000] transition-colors' : 'text-gray-900'}`}>{item.titulo}</h3>

                    {item.subtitulo && <p className="mt-1 text-sm font-bold text-gray-500 uppercase tracking-widest">{item.subtitulo}</p>}
                    {item.mensagem && <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100">{item.mensagem}</p>}
                    {item.aluno?.nome && <p className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded-md"><Smartphone className="w-3 h-3" /> Aluno: {item.aluno.nome}</p>}
                </div>

                <div className="flex shrink-0 items-center justify-end sm:justify-start gap-2 pt-2 sm:pt-0 mt-4 sm:mt-0 border-t sm:border-t-0 border-gray-100">
                    {item.link && (
                        <Link href={item.link} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300">
                            Abrir <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    )}
                    <button
                        onClick={() => onToggleLida(item)}
                        disabled={processando}
                        className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-xs font-black uppercase tracking-widest shadow-sm transition-all disabled:opacity-50 ${item.lida ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50' : 'border-gray-900 bg-gray-900 text-white hover:bg-black'}`}
                    >
                        <Check className="h-4 w-4" /> {item.lida ? 'Marcar nova' : 'Dar Baixa'}
                    </button>
                    <button
                        onClick={() => onRemover(item.id)}
                        disabled={processando}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-black uppercase tracking-widest text-red-600 shadow-sm transition-all hover:bg-red-100 hover:border-red-200 disabled:opacity-50 group/trash"
                        title="Remover permanentemente"
                    >
                        <Trash2 className="h-4 w-4 group-hover/trash:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </article>
    )
}

function ToggleRule({ label, description, icon: Icon, defaultChecked = false, tag = '' }: { label: string; description: string; icon: React.ElementType; defaultChecked?: boolean; tag?: string }) {
    const [checked, setChecked] = useState(defaultChecked)

    return (
        <div className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 transition-all shadow-sm group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${checked ? 'bg-red-50 text-[#CC0000]' : 'bg-gray-50 text-gray-400'}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        {label} {tag && <span className="text-[9px] uppercase font-black tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>}
                    </h4>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>

            <button
                onClick={() => { setChecked(!checked); toast.success(`Regra de ${label} ${!checked ? 'ativada' : 'desativada'} com sucesso.`); }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:ring-offset-2 ${checked ? 'bg-[#CC0000]' : 'bg-gray-200'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    )
}


export default function NotificacoesPage() {
    const { professores } = useProfessoresSelect()
    const supabase = createClient()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    const profAtual = professores.find(p => p.email?.toLowerCase() === userEmail?.toLowerCase())
        ?? professores.find(p => p.nome?.toLowerCase().includes('argel'))
        ?? (professores.length > 0 ? professores[0] : null)

    const { notificacoes, loading, error, naoLidas, marcarComoLida, marcarTodasComoLidas, removerNotificacao } = useNotificacoes(profAtual || undefined)
    const [busca, setBusca] = useState('')
    const [filtro, setFiltro] = useState<Filtro>('todas')
    const [tab, setTab] = useState<Tab>('inbox')
    const [processandoId, setProcessandoId] = useState<string | null>(null)
    const [processandoTudo, setProcessandoTudo] = useState(false)

    const [modalDisparo, setModalDisparo] = useState(false)
    const [disparoTipo, setDisparoTipo] = useState<'geral' | 'aula' | 'instagram' | 'youtube'>('geral')
    const [disparoURL, setDisparoURL] = useState('')
    const [disparoTitulo, setDisparoTitulo] = useState('')
    const [disparoMensagem, setDisparoMensagem] = useState('')
    const [enviandoPush, setEnviandoPush] = useState(false)

    const listaFiltrada = useMemo(() => {
        const termo = busca.trim().toLowerCase()
        return notificacoes.filter((item) => {
            // Se guia é Inbox, o Admin quer ver o que ele ENVIOU (Avisos Gerais / CT)
            // Ou o que não é automação sistêmica vinculada a Aluno específico (tipo 'ct')
            const ehAvisoAdmin = item.tipo === 'ct' || !item.aluno_id

            if (!ehAvisoAdmin) return false

            if (filtro === 'nao_lidas' && item.lida) return false
            if (!termo) return true
            const alvo = [item.titulo, item.subtitulo, item.mensagem, item.aluno?.nome].filter(Boolean).join(' ').toLowerCase()
            return alvo.includes(termo)
        })
    }, [notificacoes, filtro, busca])

    async function handleToggleLida(item: NotificacaoItem) {
        setProcessandoId(item.id)
        const ok = await marcarComoLida(item.id, !item.lida)
        setProcessandoId(null)
        if (!ok) { toast.error('Não foi possível atualizar esta notificacao.'); return }
    }

    async function handleMarcarTodas() {
        setProcessandoTudo(true)
        const ok = await marcarTodasComoLidas()
        setProcessandoTudo(false)
        if (!ok) { toast.error('Erro ao marcar notificacoes.'); return; }
        toast.success('Todas as notificacoes foram marcadas como lidas.')
    }

    async function handleRemover(id: string) {
        setProcessandoId(id)
        const ok = await removerNotificacao(id)
        setProcessandoId(null)
        if (!ok) { toast.error('Não foi possível remover a notificacao.'); return }
    }

    async function handleDispararPush() {
        if (!disparoTitulo) { toast.error('Insira o título do push.'); return }

        setEnviandoPush(true)

        // Criar notificação no Banco para que apareça no App e no Painel (Inbox)
        const { error: insertError } = await supabase.from('notificacoes').insert({
            titulo: disparoTitulo,
            mensagem: disparoMensagem,
            tipo: 'ct',
            link: disparoURL || null,
            lida: false
        })

        if (insertError) {
            toast.error('Erro ao registrar disparo: ' + insertError.message)
            setEnviandoPush(false)
            return
        }

        toast.success(`Disparo realizado com sucesso! Os alunos receberão o alerta.`)
        setEnviandoPush(false)
        setModalDisparo(false)
        setDisparoTitulo('')
        setDisparoMensagem('')
        setDisparoURL('')
        // Recarregar lista para mostrar a nova notificação no Inbox
        window.location.reload()
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8 animate-in slide-in-from-bottom-2 duration-500">
            {/* Header com Tabs Estilo Enterprise */}
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-0 gap-4">
                <div className="pb-4">
                    <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                        <Smartphone className="h-6 w-6 text-[#CC0000]" /> Notificações & Automações
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                        Central de mensageria e regras de push automáticas para o app dos alunos.
                    </p>
                </div>

                <div className="flex gap-6 border-b-2 border-transparent">
                    <button
                        onClick={() => setTab('inbox')}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest relative transition-colors ${tab === 'inbox' ? 'text-[#CC0000]' : 'text-gray-400 hover:text-gray-700'}`}
                    >
                        Caixa de Entrada {naoLidas > 0 && <span className="ml-1.5 bg-red-100 text-red-700 py-0.5 px-2 rounded-full text-[10px]">{naoLidas}</span>}
                        {tab === 'inbox' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-[#CC0000]" />}
                    </button>
                    <button
                        onClick={() => setTab('regras')}
                        className={`pb-4 text-sm font-bold uppercase tracking-widest relative transition-colors ${tab === 'regras' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}
                    >
                        Regras do Sistema
                        {tab === 'regras' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-gray-900" />}
                    </button>
                </div>
            </div>

            {tab === 'inbox' ? (
                <>
                    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 items-center gap-2">
                            <input
                                value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título, aluno ou mensagem..."
                                className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 text-sm font-medium text-gray-800 outline-none transition-all focus:border-[#CC0000] focus:bg-white focus:ring-2 focus:ring-[#CC0000]/20"
                            />
                            <div className="hidden items-center gap-2 sm:flex">
                                <button onClick={() => setFiltro('todas')} className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider transition-colors ${filtro === 'todas' ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>Todas</button>
                                <button onClick={() => setFiltro('nao_lidas')} className={`h-10 rounded-xl px-4 text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${filtro === 'nao_lidas' ? 'bg-[#CC0000] text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>Não lidas</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setModalDisparo(true)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-black">+ Disparo Push</button>
                            <button onClick={handleMarcarTodas} disabled={naoLidas === 0 || processandoTudo} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"><CheckCheck className="h-4 w-4" /> Marcar todas</button>
                        </div>
                    </section>
                    {loading ? <LoadingSpinner label="Carregando notificacoes..." /> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : listaFiltrada.length === 0 ? <EmptyState icon={Bell} title="Sem notificacoes por aqui" description="Nenhum item combina com os filtros atuais." /> : (
                        <div className="space-y-4">
                            {listaFiltrada.map((item) => <NotificacaoCard key={item.id} item={item} processando={processandoId === item.id} onToggleLida={handleToggleLida} onRemover={handleRemover} />)}
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">

                    {/* Coluna Específica: Aulas e Financeiro */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Financeiro & Contratos</h3>
                            <div className="space-y-3">
                                <ToggleRule icon={CreditCard} label="Aviso de Fatura a Vencer" description="Envia push ao aluno 3 dias antes do vencimento do PIX" defaultChecked={true} tag="D-3" />
                                <ToggleRule icon={ShieldAlert} label="Aviso de Inadimplência" description="Alerta o aluno no dia seguinte caso a fatura não seja paga" defaultChecked={true} tag="D+1" />
                                <ToggleRule icon={RefreshCw} label="Aviso de Vencimento do Plano" description="Lembra o aluno que o contrato expira em breve" defaultChecked={true} tag="D-7" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-orange-500" /> Agenda de Aulas</h3>
                            <div className="space-y-3">
                                <ToggleRule icon={CalendarClock} label="Lembrete de Aula Marcada" description="Notifica o aluno 2h antes da aula agendada" defaultChecked={true} />
                                <ToggleRule icon={Bell} label="Aviso de Nova Aula Liberada" description="Notifica todos quando uma nova aula é adicionada à grade" defaultChecked={false} />
                            </div>
                        </div>
                    </div>

                    {/* Coluna Específica: Social e Marketing */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2"><Megaphone className="w-4 h-4 text-blue-500" /> Marketing & Social Push</h3>
                            <div className="space-y-3">
                                <ToggleRule icon={Instagram} label="Postagem no Feed" description="Dispara Push Notification sempre que você cria um aviso no Feed do CT" defaultChecked={true} tag="APP FEED" />
                                <ToggleRule icon={Video} label="Novo Reels no Instagram" description="Integração inteligente com sua conta no Instagram via Webhooks" defaultChecked={false} tag="BETA" />
                                <ToggleRule icon={Youtube} label="Novo Vídeo no YouTube" description="Integração via PubSubHubbub do YouTube Channel" defaultChecked={false} tag="BETA" />
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-orange-50/50 border border-red-200 p-6 rounded-3xl shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-400 blur-[80px] opacity-20 pointer-events-none" />
                            <Settings2 className="w-8 h-8 text-red-500 mb-4 relative z-10" />
                            <h4 className="text-lg font-black text-gray-900 mb-2 relative z-10">Motor de Regras Inteligentes</h4>
                            <p className="text-xs font-medium text-gray-600 leading-relaxed mb-4 relative z-10">
                                As notificações via automatizadas exigem vinculação de conta e tokens que não chegam de imediato. Você também pode disparar pushes genéricos ou manuais pela aba da "Caixa de Entrada".
                            </p>
                        </div>
                    </div>

                </div>
            )}

            {/* Modal Submissao Social / Geral / Manual */}
            {modalDisparo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setModalDisparo(false)} />
                    <div className="w-full max-w-md animate-in zoom-in-95 bg-white rounded-3xl p-6 shadow-2xl relative z-10 border border-gray-100 flex flex-col gap-5">
                        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                            <div className="p-3 rounded-2xl bg-gray-100 text-gray-800">
                                <Megaphone className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 leading-tight">Novo Disparo Push</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Notificação Manual</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Tipo de Disparo</label>
                                <select
                                    value={disparoTipo}
                                    onChange={e => setDisparoTipo(e.target.value as any)}
                                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 outline-none focus:bg-white focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] font-medium text-sm transition-colors cursor-pointer"
                                >
                                    <option value="geral">Aviso Geral / Institucional</option>
                                    <option value="aula">Aviso de Aula / Treino</option>
                                    <option value="instagram">Divulgação Instagram</option>
                                    <option value="youtube">Divulgação YouTube</option>
                                </select>
                            </div>

                            {(disparoTipo === 'instagram' || disparoTipo === 'youtube') && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Link da Mídia Social</label>
                                    <input
                                        type="url"
                                        value={disparoURL}
                                        onChange={e => setDisparoURL(e.target.value)}
                                        placeholder={disparoTipo === 'instagram' ? "https://instagram.com/p/..." : "https://youtube.com/watch?v=..."}
                                        className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 outline-none focus:bg-white focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] font-medium text-sm transition-all"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Título Curto</label>
                                <input
                                    type="text"
                                    value={disparoTitulo}
                                    onChange={e => setDisparoTitulo(e.target.value)}
                                    placeholder={disparoTipo === 'instagram' ? "Novo Reels no Ar!" : "Lembrete do CT!"}
                                    className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-3 outline-none focus:bg-white focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] font-medium text-sm transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Mensagem do Push</label>
                                <textarea
                                    value={disparoMensagem}
                                    onChange={e => setDisparoMensagem(e.target.value)}
                                    placeholder="Ex: Não perca! Corre lá no App 🥊"
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:bg-white focus:border-[#CC0000] focus:ring-1 focus:ring-[#CC0000] font-medium text-sm transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button onClick={() => setModalDisparo(false)} className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
                            <button onClick={handleDispararPush} disabled={enviandoPush || !disparoTitulo} className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-white bg-gray-900 hover:bg-black rounded-xl shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center">
                                {enviandoPush ? <LoadingSpinner size="sm" /> : 'Disparar Agora'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
