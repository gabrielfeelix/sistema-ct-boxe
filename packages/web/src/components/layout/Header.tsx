'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Search, Timer as TimerIcon, ShieldCheck, GraduationCap, Settings, LogOut, ChevronDown } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { GlobalSearch } from './GlobalSearch'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { toast } from 'sonner'
import { useNotificacoes } from '@/hooks/useNotificacoes'
import { NotificationDropdown } from '../notifications/NotificationDropdown'

const pageTitles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/alunos': 'Alunos',
    '/candidatos': 'Candidatos',
    '/contratos': 'Contratos',
    '/financeiro': 'Financeiro',
    '/financeiro/fluxo-de-caixa': 'Fluxo de Caixa',
    '/financeiro/inadimplencia': 'Inadimplência',
    '/financeiro/relatorios': 'Relatórios',
    '/aulas': 'Aulas',
    '/aulas/series': 'Series de Aulas',
    '/presenca': 'Presença',
    '/feed': 'Feed',
    '/stories': 'Trilhas & Vídeos',
    '/avaliacoes': 'Avaliações',
    '/timer': 'Timer de Rounds',
    '/relatorios': 'Relatórios',
    '/notificacoes': 'Notificações',
    '/configuracoes': 'Configurações',
    '/configuracoes/planos': 'Planos',
    '/configuracoes/perfil': 'Perfil',
}

export function Header() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [openDropdown, setOpenDropdown] = useState(false)

    const profAtual = professores.find(p => p.email?.toLowerCase() === userEmail?.toLowerCase())
        ?? professores.find(p => p.nome?.toLowerCase().includes('argel'))
        ?? (professores.length > 0 ? professores[0] : null)

    const { naoLidas } = useNotificacoes(profAtual || undefined)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    // Click outside dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const isAdmin = profAtual?.role === 'super_admin'
    const nomeExibido = profAtual?.nome ?? (userEmail?.split('@')[0] ?? 'Admin')
    const roleExibido = isAdmin ? 'ADMIN MASTER' : 'PROFESSOR'
    const corPerfil = profAtual?.cor_perfil ?? '#CC0000'
    const iniciais = nomeExibido.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

    async function handleLogout() {
        await supabase.auth.signOut()
        toast.success('Sessão encerrada.')
        router.push('/login')
    }

    const title =
        pageTitles[pathname] ??
        Object.entries(pageTitles)
            .filter(([route]) => pathname.startsWith(route) && route !== '/dashboard')
            .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
        'Painel'

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 sticky top-0 z-30 shadow-sm/50">
            {/* Título (Esquerda) */}
            <h1 className="text-sm font-black text-gray-400 uppercase tracking-widest hidden lg:block min-w-[150px]">
                {title}
            </h1>

            {/* Ações (Direita/Centro) */}
            <div className="flex-1 flex items-center justify-end gap-3 max-w-[1200px] ml-auto">

                {/* Timer (Esquerda da busca) */}
                <Link
                    href="/timer"
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-[#CC0000] hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-[#CC0000]/10 hover:shadow-[#CC0000]/20 shrink-0"
                >
                    <TimerIcon className="h-4 w-4" />
                    <span className="hidden xl:inline">Timer de Rounds</span>
                </Link>

                {/* Busca Global (Centro) */}
                <div className="flex-1 max-w-[320px] mx-2">
                    <GlobalSearch />
                </div>

                {/* Notificações */}
                <NotificationDropdown />

                {/* Separador */}
                <div className="h-8 w-px bg-gray-100 mx-1 hidden sm:block" />

                {/* Perfil com Dropdown (Direita) */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setOpenDropdown(!openDropdown)}
                        className="flex items-center gap-3 p-1.5 pl-2 sm:pr-3 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group"
                    >
                        <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md shrink-0 transition-transform group-hover:scale-95"
                            style={{ background: corPerfil }}
                        >
                            {iniciais}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-black text-gray-900 leading-none flex items-center gap-1.5">
                                {nomeExibido.split(' ')[0]} {nomeExibido.split(' ')[1] || ''}
                                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${openDropdown ? 'rotate-180' : ''}`} />
                            </p>
                            <p className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                {isAdmin
                                    ? <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"><ShieldCheck className="h-2.5 w-2.5" /> {roleExibido}</span>
                                    : <span className="flex items-center gap-1 text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100"><GraduationCap className="h-2.5 w-2.5" /> {roleExibido}</span>
                                }
                            </p>
                        </div>
                    </button>

                    {/* Menu Dropdown */}
                    {openDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] py-3 overflow-hidden animate-in slide-in-from-top-2">
                            <div className="px-4 py-2 border-b border-gray-50 mb-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Logado como</p>
                                <p className="text-xs font-bold text-gray-900 truncate">{userEmail}</p>
                            </div>

                            <Link
                                href="/configuracoes"
                                onClick={() => setOpenDropdown(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-[#CC0000] transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Configurações
                            </Link>

                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sair do Sistema
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
