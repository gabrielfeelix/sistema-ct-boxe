import {
    Bell,
    CalendarClock,
    CreditCard,
    Heart,
    Instagram,
    Megaphone,
    MessageCircle,
    PartyPopper,
    ShieldAlert,
    Smartphone,
    UserCheck,
    Youtube,
    type LucideIcon,
} from 'lucide-react'

type Tone = {
    icon: LucideIcon
    color: string
    bg: string
}

export const DEFAULT_NOTIFICATION_UI: Tone = {
    icon: Bell,
    color: 'text-[#CC0000]',
    bg: 'bg-red-50',
}

const TYPE_UI: Record<string, Tone> = {
    aula: { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50' },
    pagamento: { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ct: DEFAULT_NOTIFICATION_UI,
    sistema: { icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50' },
    video: { icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50' },
    evento: { icon: PartyPopper, color: 'text-violet-500', bg: 'bg-violet-50' },
}

const ICON_UI: Record<string, Tone> = {
    bell: DEFAULT_NOTIFICATION_UI,
    instagram: { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-50' },
    youtube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-50' },
    'credit-card': { icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    'calendar-days': { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50' },
    'calendar-plus': { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50' },
    'message-square': { icon: MessageCircle, color: 'text-sky-500', bg: 'bg-sky-50' },
    heart: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    'user-check': { icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
    'party-popper': { icon: PartyPopper, color: 'text-violet-500', bg: 'bg-violet-50' },
    megaphone: { icon: Megaphone, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
}

function inferIconByKeywords(text: string): keyof typeof ICON_UI | null {
    const target = text.toLowerCase()

    if (target.includes('coment') || target.includes('respondeu')) return 'message-square'
    if (target.includes('curti') || target.includes('like')) return 'heart'
    if (target.includes('instagram') || target.includes('reels')) return 'instagram'
    if (target.includes('youtube') || target.includes('video')) return 'youtube'
    if (target.includes('contrato') || target.includes('pagamento') || target.includes('venc') || target.includes('inadimpl')) return 'credit-card'
    if (target.includes('check-in') || target.includes('presen') || target.includes('confirmou')) return 'user-check'
    if (target.includes('evento') || target.includes('churras') || target.includes('sparring')) return 'party-popper'
    if (target.includes('alerta') || target.includes('comunicado') || target.includes('turma')) return 'megaphone'
    if (target.includes('aula') || target.includes('agenda') || target.includes('treino')) return 'calendar-days'

    return null
}

export function resolveNotificationUi(input: {
    tipo?: string | null
    icone?: string | null
    titulo?: string | null
    subtitulo?: string | null
    mensagem?: string | null
}) {
    if (input.icone && ICON_UI[input.icone]) return ICON_UI[input.icone]

    const inferred = inferIconByKeywords(
        [input.titulo, input.subtitulo, input.mensagem].filter(Boolean).join(' ')
    )
    if (inferred) return ICON_UI[inferred]

    if (input.tipo && TYPE_UI[input.tipo]) return TYPE_UI[input.tipo]

    return DEFAULT_NOTIFICATION_UI
}
