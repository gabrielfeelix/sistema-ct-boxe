'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    BarChart2,
    Bell,
    Calendar,
    CheckSquare,
    CreditCard,
    DollarSign,
    FileText,
    GraduationCap,
    LayoutDashboard,
    PartyPopper,
    Play,
    Rss,
    ShieldCheck,
    UserCheck,
    UserRound,
    Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/constants/routes'
import { useCandidatos } from '@/hooks/useCandidatos'
import { useAvaliacoesPendentes } from '@/hooks/useAvaliacoes'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { useNotificacoes } from '@/hooks/useNotificacoes'

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ')
}

type NavItem = {
    label: string
    href: string
    icon: React.ElementType
    adminOnly?: boolean
    badge?: 'candidatos' | 'avaliacoes' | 'notificacoes'
}

type NavSection = {
    label: string
    items: NavItem[]
}

const navSections: NavSection[] = [
    {
        label: 'Visao Executiva',
        items: [
            { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
            { label: 'Central de Notificacoes', href: ROUTES.NOTIFICACOES, icon: Bell, badge: 'notificacoes' },
            { label: 'Relatorios', href: '/relatorios', icon: BarChart2, adminOnly: true },
        ],
    },
    {
        label: 'Operacao Diaria',
        items: [
            { label: 'Alunos', href: ROUTES.ALUNOS, icon: Users },
            { label: 'Candidatos', href: ROUTES.CANDIDATOS, icon: UserCheck, badge: 'candidatos' },
            { label: 'Presenca', href: ROUTES.PRESENCA, icon: CheckSquare },
            { label: 'Aulas', href: ROUTES.AULAS, icon: Calendar },
            { label: 'Eventos', href: ROUTES.EVENTOS, icon: PartyPopper },
        ],
    },
    {
        label: 'Receita e Contratos',
        items: [
            { label: 'Financeiro', href: ROUTES.FINANCEIRO, icon: DollarSign, adminOnly: true },
            { label: 'Contratos', href: ROUTES.CONFIG_CONTRATOS, icon: FileText },
            { label: 'Planos e Precificacao', href: ROUTES.CONFIG_PLANOS, icon: CreditCard },
        ],
    },
    {
        label: 'Conteudo e Comunidade',
        items: [
            { label: 'Feed', href: ROUTES.FEED, icon: Rss },
            { label: 'Stories', href: ROUTES.STORIES, icon: Play },
        ],
    },
    {
        label: 'Equipe e Admin',
        items: [
            { label: 'Professores', href: '/professores', icon: GraduationCap, adminOnly: true },
            { label: 'Perfil do Admin', href: ROUTES.CONFIG_PERFIL, icon: UserRound },
            {
                label: 'Seguranca Operacional',
                href: ROUTES.CONFIG_SEGURANCA_OPERACIONAL,
                icon: ShieldCheck,
                adminOnly: true,
            },
        ],
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const supabase = useMemo(() => createClient(), [])
    const { pendentes: pendentesCandidatos } = useCandidatos()
    const { avaliacoes: pendentesAvaliacoes } = useAvaliacoesPendentes()
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    const profAtual =
        professores.find((p) => p.email?.toLowerCase() === userEmail?.toLowerCase()) ??
        professores.find((p) => p.nome?.toLowerCase().includes('argel')) ??
        (professores.length > 0 ? professores[0] : null)

    const { naoLidasAlertas: totalNotificacoes } = useNotificacoes(profAtual || undefined)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    const isAdmin = profAtual?.role === 'super_admin'

    function getBadgeValue(item: NavItem) {
        if (item.badge === 'candidatos') return pendentesCandidatos
        if (item.badge === 'avaliacoes') return pendentesAvaliacoes.length
        if (item.badge === 'notificacoes') return totalNotificacoes
        return 0
    }

    return (
        <aside className="flex h-screen w-[252px] shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex min-h-[96px] items-center justify-center border-b border-gray-100 px-4 pb-2 pt-4">
                <div className="flex w-full justify-center">
                    <Image
                        src="/logo-ct.png"
                        alt="CT de Boxe Argel Riboli"
                        width={96}
                        height={48}
                        className="h-auto w-[96px] max-w-full object-contain"
                        priority
                    />
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
                <div className="space-y-5">
                    {navSections.map((section) => {
                        const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin)
                        if (visibleItems.length === 0) return null

                        return (
                            <section key={section.label}>
                                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    {section.label}
                                </p>
                                <ul className="space-y-0.5">
                                    {visibleItems.map((item) => {
                                        const Icon = item.icon
                                        const isActive =
                                            item.href === ROUTES.DASHBOARD
                                                ? pathname === ROUTES.DASHBOARD
                                                : pathname.startsWith(item.href)
                                        const badgeValue = getBadgeValue(item)

                                        return (
                                            <li key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                                        isActive
                                                            ? 'bg-[#CC0000] text-white shadow-sm'
                                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                                    )}
                                                >
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    <div className="flex w-full items-center justify-between gap-2">
                                                        <span>{item.label}</span>
                                                        {badgeValue > 0 && (
                                                            <span
                                                                className={cn(
                                                                    'ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold shadow-sm',
                                                                    isActive
                                                                        ? 'bg-white/20 text-white'
                                                                        : item.badge === 'notificacoes'
                                                                          ? 'bg-amber-500 text-white'
                                                                          : item.badge === 'avaliacoes'
                                                                            ? 'bg-blue-500 text-white'
                                                                            : 'bg-[#CC0000] text-white'
                                                                )}
                                                            >
                                                                {badgeValue}
                                                            </span>
                                                        )}
                                                    </div>
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </section>
                        )
                    })}
                </div>
            </nav>
        </aside>
    )
}
