'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { Bell, CalendarClock, CreditCard, ShieldAlert, Megaphone, Trash2, CheckCheck, Check, ExternalLink, Settings2, Instagram, Youtube, Video, RefreshCw, Smartphone, Search } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useNotificacoes, type NotificacaoItem } from '@/hooks/useNotificacoes'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { createClient } from '@/lib/supabase/client'

type Filtro = 'todas' | 'nao_lidas'
type Tab = 'inbox' | 'alertas' | 'regras'

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
    const [disparoRecorrente, setDisparoRecorrente] = useState(false)
    const [enviandoPush, setEnviandoPush] = useState(false)

    const listaFiltrada = useMemo(() => {
        const termo = busca.trim().toLowerCase()
        return notificacoes.filter((item) => {
            const ehBroadcast = item.tipo === 'ct'
            if (tab === 'inbox' && !ehBroadcast) return false
            if (tab === 'alertas' && ehBroadcast) return false

            if (filtro === 'nao_lidas' && item.lida) return false
            if (!termo) return true

            const alvo = [item.titulo, item.subtitulo, item.mensagem, item.aluno?.nome].filter(Boolean).join(' ').toLowerCase()
            return alvo.includes(termo)
        })
    }, [notificacoes, filtro, busca, tab])

    const countInboxLidas = notificacoes.filter(n => n.tipo === 'ct' && !n.lida).length
    const countAlertasLidas = notificacoes.filter(n => n.tipo !== 'ct' && !n.lida).length

    async function handleToggleLida(item: NotificacaoItem) {
        setProcessandoId(item.id)
        const ok = await marcarComoLida(item.id, !item.lida)
        setProcessandoId(null)
        if (!ok) toast.error('Falha ao atualizar status.')
    }

    async function handleMarcarTodas() {
        setProcessandoTudo(true)
        const ids = listaFiltrada.filter(n => !n.lida).map(n => n.id)
        if (ids.length === 0) { setProcessandoTudo(false); return }
        const { error } = await supabase.from('notificacoes').update({ lida: true }).in('id', ids)
        setProcessandoTudo(false)
        if (error) toast.error('Erro de I/O.')
        else {
            toast.success('Itens atualizados.')
            window.location.reload()
        }
    }

    async function handleRemover(id: string) {
        setProcessandoId(id)
        const ok = await removerNotificacao(id)
        setProcessandoId(null)
        if (!ok) toast.error('Erro ao remover.')
    }

    async function handleDispararPush() {
        if (!disparoTitulo) { toast.error('Título obrigatório.'); return }
        setEnviandoPush(true)

        const { error: insertError } = await supabase.from('notificacoes').insert({
            titulo: disparoTitulo,
            mensagem: disparoMensagem,
            tipo: 'ct',
            link: disparoURL || null,
            lida: false,
            subtitulo: disparoRecorrente ? 'DISPARO RECORRENTE' : 'DISPARO ÚNICO'
        })

        if (insertError) {
            toast.error('Erro ao disparar: ' + insertError.message)
            setEnviandoPush(false)
            return
        }

        toast.success(`Broadcasting enviado para todos os alunos!`)
        setEnviandoPush(false)
        setModalDisparo(false)
        setDisparoTitulo('')
        setDisparoMensagem('')
        setDisparoURL('')
        setTimeout(() => window.location.reload(), 500)
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-gray-200 pb-0 gap-4">
                <div className="pb-4">
                    <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                        <Smartphone className="h-6 w-6 text-[#CC0000]" /> Notificações & Push
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">Painel de disparos manuais e alertas de sistema.</p>
                </div>

                <div className="flex gap-8 border-b-2 border-transparent">
                    <button onClick={() => setTab('inbox')} className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${tab === 'inbox' ? 'text-[#CC0000]' : 'text-gray-400 hover:text-gray-700'}`}>
                        Caixa de Entrada {countInboxLidas > 0 && <span className="ml-2 bg-red-100 text-[#CC0000] px-2 py-0.5 rounded-full text-[10px]">{countInboxLidas}</span>}
                        {tab === 'inbox' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-[#CC0000]" />}
                    </button>
                    <button onClick={() => setTab('alertas')} className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${tab === 'alertas' ? 'text-[#CC0000]' : 'text-gray-400 hover:text-gray-700'}`}>
                        Alertas do Sistema {countAlertasLidas > 0 && <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{countAlertasLidas}</span>}
                        {tab === 'alertas' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-[#CC0000]" />}
                    </button>
                    <button onClick={() => setTab('regras')} className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${tab === 'regras' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}>
                        Regras de Automação
                        {tab === 'regras' && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-gray-900" />}
                    </button>
                </div>
            </div>

            {tab !== 'regras' ? (
                <>
                    <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 items-center gap-2 relative">
                            <Search className="absolute ml-3 h-4 w-4 text-gray-400" />
                            <input
                                value={busca} onChange={(event) => setBusca(event.target.value)}
                                placeholder={tab === 'inbox' ? "Pesquisar disparos feitos..." : "Pesquisar alertas recebidos..."}
                                className="h-11 w-full rounded-2xl border border-gray-100 bg-gray-50 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none focus:bg-white focus:border-[#CC0000] transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {tab === 'inbox' && (
                                <button onClick={() => setModalDisparo(true)} className="flex-1 lg:flex-none h-11 bg-gray-900 hover:bg-black text-white px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2">
                                    <Megaphone className="w-4 h-4" /> Novo Disparo
                                </button>
                            )}
                            <button onClick={handleMarcarTodas} disabled={loading || processandoTudo} className="h-11 border border-gray-200 text-gray-500 px-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                <CheckCheck className="w-4 h-4" /> Baixa em Bloco
                            </button>
                        </div>
                    </section>

                    {loading ? <LoadingSpinner label="Sincronizando feed..." /> : error ? <div className="p-8 text-center bg-red-50 rounded-3xl border border-red-100 text-red-700 font-bold">{error}</div> : listaFiltrada.length === 0 ? (
                        <EmptyState
                            icon={tab === 'inbox' ? Megaphone : Bell}
                            title={tab === 'inbox' ? "Sem disparos registrados" : "Nenhum alerta pendente"}
                            description={tab === 'inbox' ? "Você ainda não criou notificações para os alunos." : "Tudo em ordem no CT!"}
                            action={tab === 'inbox' ? { label: 'Novo Disparo', onClick: () => setModalDisparo(true) } : undefined}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {listaFiltrada.map((item) => <NotificacaoCard key={item.id} item={item} processando={processandoId === item.id} onToggleLida={handleToggleLida} onRemover={handleRemover} />)}
                        </div>
                    )}
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-500" /> Financeiro</h4>
                            <div className="space-y-3">
                                <ToggleRule icon={CreditCard} label="Aviso de Fatura" description="Push 3 dias antes do vencimento" defaultChecked={true} tag="D-3" />
                                <ToggleRule icon={ShieldAlert} label="Inadimplência" description="Alerta no dia seguinte ao atraso" defaultChecked={true} tag="D+1" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-gray-900 p-8 rounded-3xl text-white">
                            <Settings2 className="w-10 h-10 text-[#CC0000] mb-4" />
                            <h4 className="text-xl font-black mb-2">Motor de Regras CT</h4>
                            <p className="text-sm font-medium text-gray-400">As automações são geradas pela inteligência do KITAMO.</p>
                        </div>
                    </div>
                </div>
            )}

            {modalDisparo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalDisparo(false)} />
                    <div className="w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl relative z-10 border border-gray-100">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-900">
                                <Megaphone className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Novo Disparo Push</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#CC0000]">Broadcast Imediato</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Assunto</label>
                                <select value={disparoTipo} onChange={e => setDisparoTipo(e.target.value as any)} className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 font-bold text-sm outline-none focus:border-[#CC0000]">
                                    <option value="geral">Aviso Geral</option>
                                    <option value="aula">Treino / Aulas</option>
                                    <option value="instagram">Instagram CT</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Título</label>
                                <input type="text" value={disparoTitulo} onChange={e => setDisparoTitulo(e.target.value)} placeholder="Ex: Treino amanhã!" className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 font-bold text-sm outline-none focus:border-[#CC0000]" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Mensagem</label>
                                <textarea value={disparoMensagem} onChange={e => setDisparoMensagem(e.target.value)} placeholder="Detalhes..." rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-medium text-sm outline-none focus:border-[#CC0000] resize-none" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                                <div>
                                    <p className="text-xs font-black text-[#CC0000] uppercase tracking-widest">Recorrente</p>
                                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">Repetir semanalmente</p>
                                </div>
                                <button onClick={() => setDisparoRecorrente(!disparoRecorrente)} className={`h-6 w-11 rounded-full p-1 transition-all ${disparoRecorrente ? 'bg-[#CC0000]' : 'bg-gray-200'}`}>
                                    <div className={`h-full aspect-square bg-white rounded-full transition-transform ${disparoRecorrente ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setModalDisparo(false)} className="flex-1 h-12 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 border border-gray-100 rounded-2xl">Cancelar</button>
                            <button onClick={handleDispararPush} disabled={enviandoPush || !disparoTitulo} className="flex-[2] h-12 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl">
                                {enviandoPush ? '...' : 'Disparar Agora'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
