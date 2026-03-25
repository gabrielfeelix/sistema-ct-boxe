'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Users,
    UserCheck,
    FileText,
    DollarSign,
    Calendar,
    CheckSquare,
    Rss,
    Play,
    Bell,
    BarChart2,
    GraduationCap,
    PartyPopper,
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

const navItems = [
    { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Presença', href: ROUTES.PRESENCA, icon: CheckSquare },
    { label: 'Aulas', href: ROUTES.AULAS, icon: Calendar },
    { label: 'Alunos', href: ROUTES.ALUNOS, icon: Users },
    { label: 'Candidatos', href: ROUTES.CANDIDATOS, icon: UserCheck },
    { label: 'Contratos', href: ROUTES.CONTRATOS, icon: FileText },
    { label: 'Financeiro', href: ROUTES.FINANCEIRO, icon: DollarSign, adminOnly: true },
    { label: 'Professores', href: '/professores', icon: GraduationCap, adminOnly: true },
    { label: 'Feed', href: ROUTES.FEED, icon: Rss },
    { label: 'Stories', href: ROUTES.STORIES, icon: Play },
    { label: 'Eventos', href: ROUTES.EVENTOS, icon: PartyPopper },
    { label: 'Notificações', href: ROUTES.NOTIFICACOES, icon: Bell },
    { label: 'Relatórios', href: '/relatorios', icon: BarChart2, adminOnly: true },
]

export function Sidebar() {
    const pathname = usePathname()
    const supabase = createClient()
    const { pendentes: pendentesCandidatos } = useCandidatos()
    const { avaliacoes: pendentesAvaliacoes } = useAvaliacoesPendentes()
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    const profAtual = professores.find((p) => p.email?.toLowerCase() === userEmail?.toLowerCase())
        ?? professores.find((p) => p.nome?.toLowerCase().includes('argel'))
        ?? (professores.length > 0 ? professores[0] : null)

    const { naoLidasAlertas: totalNotificacoes } = useNotificacoes(profAtual || undefined)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    const isAdmin = profAtual?.role === 'super_admin'

    return (
        <aside className="flex h-screen w-[240px] shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
                <Image
                    src="/logo-ct.png"
                    alt="CT de Boxe Argel Riboli"
                    width={88}
                    height={36}
                    className="h-9 w-auto object-contain"
                    priority
                />
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500 whitespace-nowrap">
                    Admin
                </span>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
                <ul className="space-y-0.5">
                    {navItems.map((item) => {
                        if (item.adminOnly && !isAdmin) return null

                        const Icon = item.icon
                        const isActive =
                            item.href === '/dashboard'
                                ? pathname === '/dashboard'
                                : pathname.startsWith(item.href)

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-[#CC0000] text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <div className="flex w-full items-center justify-between">
                                        <span>{item.label}</span>
                                        {item.label === 'Candidatos' && pendentesCandidatos > 0 && (
                                            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#CC0000] px-1.5 text-xs font-bold text-white shadow-sm">
                                                {pendentesCandidatos}
                                            </span>
                                        )}
                                        {item.label === 'Avaliações' && pendentesAvaliacoes.length > 0 && (
                                            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-bold text-white shadow-sm">
                                                {pendentesAvaliacoes.length}
                                            </span>
                                        )}
                                        {item.label === 'Notificações' && totalNotificacoes > 0 && (
                                            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white shadow-sm animate-pulse">
                                                {totalNotificacoes}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}
