'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
    Bell,
    CalendarClock,
    Check,
    CheckCheck,
    CreditCard,
    ExternalLink,
    Heart,
    Instagram,
    Megaphone,
    MessageSquare,
    Search,
    ShieldAlert,
    Trash2,
    UserCheck,
    Users,
    Youtube,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useNotificacoes, type NotificacaoItem } from '@/hooks/useNotificacoes'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { createClient } from '@/lib/supabase/client'
import { resolveNotificationUi } from '@/lib/notifications/presentation'

type Filtro = 'todas' | 'nao_lidas'
type Tab = 'alunos' | 'gestao' | 'professores' | 'regras'
type Audience = 'aluno' | 'gestao' | 'professor'

interface NotificationRule {
    id: string
    slug: string
    audiencia: Audience
    titulo: string
    descricao: string
    icone: string
    enabled: boolean
}

const ICONS = {
    bell: Bell,
    'calendar-days': CalendarClock,
    'calendar-plus': CalendarClock,
    'credit-card': CreditCard,
    'shield-alert': ShieldAlert,
    'alert-triangle': ShieldAlert,
    instagram: Instagram,
    youtube: Youtube,
    megaphone: Megaphone,
    'user-check': UserCheck,
    'message-square': MessageSquare,
    heart: Heart,
    'party-popper': Users,
} as const

const AUDIENCE_META: Record<Audience, { label: string; icon: React.ElementType; tone: string }> = {
    aluno: { label: 'Alunos', icon: Bell, tone: 'bg-red-100 text-red-700 border-red-200' },
    gestao: { label: 'Gestão', icon: ShieldAlert, tone: 'bg-slate-100 text-slate-700 border-slate-200' },
    professor: { label: 'Professores', icon: UserCheck, tone: 'bg-blue-100 text-blue-700 border-blue-200' },
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

function NotificationCard({
    item,
    processando,
    onToggleLida,
    onRemover,
}: {
    item: NotificacaoItem
    processando: boolean
    onToggleLida: (item: NotificacaoItem) => Promise<void>
    onRemover: (id: string) => Promise<void>
}) {
    const audience = (item.audiencia ?? 'aluno') as Audience
    const meta = AUDIENCE_META[audience] ?? AUDIENCE_META.aluno
    const AudienceIcon = meta.icon
    const ui = resolveNotificationUi(item)
    const MainIcon = ui.icon || AudienceIcon

    return (
        <article
            className={`rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md ${
                item.lida ? 'border-gray-100 bg-white' : 'border-[#CC0000]/20 bg-gradient-to-r from-red-50/70 to-white'
            }`}
        >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${meta.tone}`}>
                            <AudienceIcon className="h-3.5 w-3.5" />
                            {meta.label}
                        </span>
                        {!item.lida ? (
                            <span className="rounded-full bg-[#CC0000] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white">
                                Nova
                            </span>
                        ) : null}
                        <span className="text-xs font-bold text-gray-400">{formatarMomento(item.created_at)}</span>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${ui.bg} ${ui.color}`}>
                            <MainIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-black tracking-tight text-gray-900">{item.titulo}</h3>
                            {item.subtitulo ? (
                                <p className="mt-1 text-xs font-black uppercase tracking-widest text-gray-400">{item.subtitulo}</p>
                            ) : null}
                            {item.mensagem ? (
                                <p className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium leading-relaxed text-gray-600">
                                    {item.mensagem}
                                </p>
                            ) : null}
                            {item.aluno?.nome ? (
                                <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    Aluno: {item.aluno.nome}
                                </p>
                            ) : null}
                            {item.professor_nome ? (
                                <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    Professor alvo: {item.professor_nome}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                    {item.link ? (
                        <Link
                            href={item.link}
                            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-gray-700 shadow-sm transition-all hover:bg-gray-50"
                        >
                            Abrir
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    ) : null}
                    <button
                        onClick={() => onToggleLida(item)}
                        disabled={processando}
                        className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-xs font-black uppercase tracking-widest shadow-sm transition-all disabled:opacity-50 ${
                            item.lida ? 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50' : 'border-gray-900 bg-gray-900 text-white hover:bg-black'
                        }`}
                    >
                        <Check className="h-4 w-4" />
                        {item.lida ? 'Marcar nova' : 'Dar baixa'}
                    </button>
                    <button
                        onClick={() => onRemover(item.id)}
                        disabled={processando}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </article>
    )
}

function RuleCard({
    rule,
    onToggle,
}: {
    rule: NotificationRule
    onToggle: (rule: NotificationRule) => Promise<void>
}) {
    const meta = AUDIENCE_META[rule.audiencia]
    const Icon = rule.icone in ICONS ? ICONS[rule.icone as keyof typeof ICONS] : Bell

    return (
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`rounded-2xl border p-3 ${meta.tone}`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm font-black text-gray-900">{rule.titulo}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500">{rule.descricao}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400">{meta.label}</p>
                </div>
            </div>

            <button
                onClick={() => onToggle(rule)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rule.enabled ? 'bg-[#CC0000]' : 'bg-gray-200'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    )
}

export default function NotificacoesPage() {
    const supabase = createClient()
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [tab, setTab] = useState<Tab>('alunos')
    const [filtro, setFiltro] = useState<Filtro>('todas')
    const [busca, setBusca] = useState('')
    const [processandoId, setProcessandoId] = useState<string | null>(null)
    const [modalDisparo, setModalDisparo] = useState(false)
    const [rules, setRules] = useState<NotificationRule[]>([])
    const [loadingRules, setLoadingRules] = useState(true)

    const [audienciaDisparo, setAudienciaDisparo] = useState<Audience>('aluno')
    const [professorAlvo, setProfessorAlvo] = useState('')
    const [tipoDisparo, setTipoDisparo] = useState<'geral' | 'aula' | 'instagram' | 'youtube' | 'pagamento' | 'evento'>('geral')
    const [disparoTitulo, setDisparoTitulo] = useState('')
    const [disparoMensagem, setDisparoMensagem] = useState('')
    const [disparoURL, setDisparoURL] = useState('')
    const [enviandoPush, setEnviandoPush] = useState(false)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null))
    }, [supabase])

    useEffect(() => {
        async function loadRules() {
            setLoadingRules(true)
            const { data, error } = await supabase.from('notification_rules').select('*').order('audiencia').order('titulo')
            if (error) {
                toast.error('Não foi possível carregar as regras de notificação.')
                setRules([])
            } else {
                setRules((data as NotificationRule[]) ?? [])
            }
            setLoadingRules(false)
        }

        void loadRules()
    }, [supabase])

    const profAtual =
        professores.find((p) => p.email?.toLowerCase() === userEmail?.toLowerCase()) ??
        professores.find((p) => p.nome?.toLowerCase().includes('argel')) ??
        (professores.length > 0 ? professores[0] : null)

    const { notificacoes, loading, error, marcarComoLida, removerNotificacao, refetch } = useNotificacoes(profAtual || undefined)

    const filteredNotifications = useMemo(() => {
        const termo = busca.trim().toLowerCase()

        return notificacoes.filter((item) => {
            const audience = (item.audiencia ?? 'aluno') as Audience
            if (tab !== 'regras' && audience !== tab) return false
            if (filtro === 'nao_lidas' && item.lida) return false

            if (!termo) return true

            const target = [item.titulo, item.subtitulo, item.mensagem, item.aluno?.nome, item.professor_nome]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            return target.includes(termo)
        })
    }, [busca, filtro, notificacoes, tab])

    const tabCounts = useMemo(
        () => ({
            alunos: notificacoes.filter((item) => !item.lida && (item.audiencia ?? 'aluno') === 'aluno').length,
            gestao: notificacoes.filter((item) => !item.lida && (item.audiencia ?? 'aluno') === 'gestao').length,
            professores: notificacoes.filter((item) => !item.lida && (item.audiencia ?? 'aluno') === 'professor').length,
        }),
        [notificacoes]
    )

    async function handleToggleLida(item: NotificacaoItem) {
        setProcessandoId(item.id)
        const ok = await marcarComoLida(item.id, !item.lida)
        setProcessandoId(null)
        if (!ok) toast.error('Falha ao atualizar a notificação.')
    }

    async function handleRemover(id: string) {
        setProcessandoId(id)
        const ok = await removerNotificacao(id)
        setProcessandoId(null)
        if (!ok) toast.error('Falha ao remover a notificação.')
    }

    async function handleMarcarTodas() {
        const ids = filteredNotifications.filter((item) => !item.lida).map((item) => item.id)
        if (ids.length === 0) return

        const { error: updateError } = await supabase.from('notificacoes').update({ lida: true }).in('id', ids)
        if (updateError) {
            toast.error('Falha ao dar baixa em lote.')
            return
        }

        toast.success('Notificações atualizadas.')
        await refetch()
    }

    async function handleToggleRule(rule: NotificationRule) {
        const { error: updateError } = await supabase
            .from('notification_rules')
            .update({ enabled: !rule.enabled })
            .eq('id', rule.id)

        if (updateError) {
            toast.error('Falha ao atualizar a regra.')
            return
        }

        setRules((prev) => prev.map((item) => (item.id === rule.id ? { ...item, enabled: !item.enabled } : item)))
        toast.success(`Regra ${!rule.enabled ? 'ativada' : 'desativada'}.`)
    }

    async function handleDispararPush() {
        if (!disparoTitulo.trim()) {
            toast.error('Informe um título para a notificação.')
            return
        }

        setEnviandoPush(true)

        const iconByType: Record<typeof tipoDisparo, string> = {
            geral: 'bell',
            aula: 'calendar-days',
            instagram: 'instagram',
            youtube: 'youtube',
            pagamento: 'credit-card',
            evento: 'party-popper',
        }

        const { error: insertError } = await supabase.from('notificacoes').insert({
            titulo: disparoTitulo,
            subtitulo: `Disparo manual · ${AUDIENCE_META[audienciaDisparo].label}`,
            mensagem: disparoMensagem || null,
            tipo: tipoDisparo === 'pagamento' ? 'pagamento' : tipoDisparo === 'evento' ? 'evento' : tipoDisparo === 'aula' ? 'aula' : tipoDisparo === 'youtube' ? 'video' : 'ct',
            link: disparoURL || null,
            lida: false,
            audiencia: audienciaDisparo,
            professor_nome: audienciaDisparo === 'professor' ? professorAlvo || null : null,
            icone: iconByType[tipoDisparo],
        })

        setEnviandoPush(false)

        if (insertError) {
            toast.error(`Erro ao disparar: ${insertError.message}`)
            return
        }

        toast.success('Notificação criada com sucesso.')
        setModalDisparo(false)
        setAudienciaDisparo('aluno')
        setProfessorAlvo('')
        setTipoDisparo('geral')
        setDisparoTitulo('')
        setDisparoMensagem('')
        setDisparoURL('')
        await refetch()
    }

    const groupedRules = useMemo(
        () => ({
            aluno: rules.filter((rule) => rule.audiencia === 'aluno'),
            gestao: rules.filter((rule) => rule.audiencia === 'gestao'),
            professor: rules.filter((rule) => rule.audiencia === 'professor'),
        }),
        [rules]
    )

    return (
        <div className="mx-auto max-w-[1440px] space-y-6 pb-8">
            <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                        <Bell className="h-6 w-6 text-[#CC0000]" />
                        Central de Notificações
                    </h2>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                        Separe alertas por audiência e configure automações do app.
                    </p>
                </div>

                <div className="flex flex-wrap gap-6">
                    {(['alunos', 'gestao', 'professores', 'regras'] as Tab[]).map((item) => (
                        <button
                            key={item}
                            onClick={() => setTab(item)}
                            className={`relative pb-2 text-xs font-black uppercase tracking-widest ${
                                tab === item ? 'text-[#CC0000]' : 'text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            {item === 'alunos' ? 'Alunos' : item === 'gestao' ? 'Gestão' : item === 'professores' ? 'Professores' : 'Regras'}
                            {item === 'alunos' && tabCounts.alunos > 0 ? <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-[#CC0000]">{tabCounts.alunos}</span> : null}
                            {item === 'gestao' && tabCounts.gestao > 0 ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">{tabCounts.gestao}</span> : null}
                            {item === 'professores' && tabCounts.professores > 0 ? <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">{tabCounts.professores}</span> : null}
                            {tab === item ? <div className="absolute bottom-0 left-0 h-[2px] w-full bg-[#CC0000]" /> : null}
                        </button>
                    ))}
                </div>
            </div>

            {tab !== 'regras' ? (
                <>
                    <section className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                value={busca}
                                onChange={(event) => setBusca(event.target.value)}
                                placeholder="Pesquisar notificações..."
                                className="h-11 w-full rounded-2xl border border-gray-100 bg-gray-50 pl-10 pr-4 text-sm font-medium text-gray-800 outline-none transition-all focus:border-[#CC0000] focus:bg-white"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setFiltro((prev) => (prev === 'todas' ? 'nao_lidas' : 'todas'))}
                                className="h-11 rounded-2xl border border-gray-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                {filtro === 'todas' ? 'Só não lidas' : 'Mostrar todas'}
                            </button>
                            <button
                                onClick={handleMarcarTodas}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors hover:bg-gray-50"
                            >
                                <CheckCheck className="h-4 w-4" />
                                Dar baixa em lote
                            </button>
                            <button
                                onClick={() => setModalDisparo(true)}
                                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gray-900 px-5 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-black"
                            >
                                <Megaphone className="h-4 w-4" />
                                Novo disparo
                            </button>
                        </div>
                    </section>

                    {loading ? (
                        <LoadingSpinner label="Sincronizando notificações..." />
                    ) : error ? (
                        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>
                    ) : filteredNotifications.length === 0 ? (
                        <EmptyState
                            icon={Bell}
                            title="Nenhuma notificação nessa faixa"
                            description="A audiência selecionada ainda não tem itens nesse filtro."
                            action={{ label: 'Novo disparo', onClick: () => setModalDisparo(true) }}
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredNotifications.map((item) => (
                                <NotificationCard
                                    key={item.id}
                                    item={item}
                                    processando={processandoId === item.id}
                                    onToggleLida={handleToggleLida}
                                    onRemover={handleRemover}
                                />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="grid gap-6 xl:grid-cols-3">
                    {loadingRules ? (
                        <div className="xl:col-span-3">
                            <LoadingSpinner label="Carregando regras..." />
                        </div>
                    ) : (
                        (['aluno', 'gestao', 'professor'] as Audience[]).map((audience) => (
                            <section key={audience} className="space-y-4 rounded-3xl border border-gray-100 bg-gray-50/40 p-5">
                                <div className="flex items-center gap-2">
                                    {(() => {
                                        const Icon = AUDIENCE_META[audience].icon
                                        return <Icon className="h-5 w-5 text-[#CC0000]" />
                                    })()}
                                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{AUDIENCE_META[audience].label}</h3>
                                </div>
                                <div className="space-y-3">
                                    {groupedRules[audience].map((rule) => (
                                        <RuleCard key={rule.id} rule={rule} onToggle={handleToggleRule} />
                                    ))}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            )}

            {modalDisparo ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalDisparo(false)} />
                    <div className="relative z-10 w-full max-w-xl rounded-[2rem] border border-gray-100 bg-white p-8 shadow-2xl">
                        <div className="mb-6 flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                <Megaphone className="h-7 w-7 text-gray-900" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-gray-900">Novo disparo</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-[#CC0000]">Manual</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Audiência</label>
                                    <select
                                        value={audienciaDisparo}
                                        onChange={(event) => setAudienciaDisparo(event.target.value as Audience)}
                                        className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold text-gray-800 outline-none focus:border-[#CC0000]"
                                    >
                                        <option value="aluno">Alunos</option>
                                        <option value="gestao">Gestão</option>
                                        <option value="professor">Professor</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo</label>
                                    <select
                                        value={tipoDisparo}
                                        onChange={(event) => setTipoDisparo(event.target.value as typeof tipoDisparo)}
                                        className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold text-gray-800 outline-none focus:border-[#CC0000]"
                                    >
                                        <option value="geral">Geral</option>
                                        <option value="aula">Aula</option>
                                        <option value="pagamento">Pagamento</option>
                                        <option value="evento">Evento</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="youtube">YouTube</option>
                                    </select>
                                </div>
                            </div>

                            {audienciaDisparo === 'professor' ? (
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Professor alvo</label>
                                    <input
                                        value={professorAlvo}
                                        onChange={(event) => setProfessorAlvo(event.target.value)}
                                        placeholder="Nome do professor"
                                        className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold text-gray-800 outline-none focus:border-[#CC0000]"
                                    />
                                </div>
                            ) : null}

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Título</label>
                                <input
                                    value={disparoTitulo}
                                    onChange={(event) => setDisparoTitulo(event.target.value)}
                                    placeholder="Ex.: Novo evento liberado"
                                    className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold text-gray-800 outline-none focus:border-[#CC0000]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Mensagem</label>
                                <textarea
                                    value={disparoMensagem}
                                    onChange={(event) => setDisparoMensagem(event.target.value)}
                                    rows={4}
                                    placeholder="Detalhes do alerta..."
                                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium text-gray-700 outline-none focus:border-[#CC0000]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Link opcional</label>
                                <input
                                    value={disparoURL}
                                    onChange={(event) => setDisparoURL(event.target.value)}
                                    placeholder="/eventos ou https://..."
                                    className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-medium text-gray-700 outline-none focus:border-[#CC0000]"
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setModalDisparo(false)}
                                className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-500 transition-colors hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDispararPush}
                                disabled={enviandoPush || !disparoTitulo.trim() || (audienciaDisparo === 'professor' && !professorAlvo.trim())}
                                className="flex-[1.5] rounded-2xl bg-gray-900 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-50"
                            >
                                {enviandoPush ? 'Enviando...' : 'Criar notificação'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
