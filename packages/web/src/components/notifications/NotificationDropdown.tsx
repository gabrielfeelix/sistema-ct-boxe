import { useState, useRef, useEffect } from 'react'
import { Bell, CalendarClock, ArrowRight, Smartphone, AlertCircle, ShoppingCart, PartyPopper, Instagram, Youtube, Heart, MessageCircle, UserCheck, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { useNotificacoes, type NotificacaoItem } from '@/hooks/useNotificacoes'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '../shared/LoadingSpinner'

const TIPO_UI: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    aula: { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50' },
    pagamento: { icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ct: { icon: Bell, color: 'text-[#CC0000]', bg: 'bg-red-50' },
    sistema: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
    video: { icon: Smartphone, color: 'text-blue-500', bg: 'bg-blue-50' },
    evento: { icon: PartyPopper, color: 'text-violet-500', bg: 'bg-violet-50' },
}

const ICONE_UI: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    instagram: { icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-50' },
    youtube: { icon: Youtube, color: 'text-red-500', bg: 'bg-red-50' },
    'credit-card': { icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    'calendar-days': { icon: CalendarClock, color: 'text-orange-500', bg: 'bg-orange-50' },
    'message-square': { icon: MessageCircle, color: 'text-sky-500', bg: 'bg-sky-50' },
    heart: { icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
    'user-check': { icon: UserCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
    'party-popper': { icon: PartyPopper, color: 'text-violet-500', bg: 'bg-violet-50' },
    megaphone: { icon: Megaphone, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
}

function tempoRelativo(valor: string) {
    const data = new Date(valor)
    if (Number.isNaN(data.getTime())) return '-'
    const diffMs = Date.now() - data.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHora = Math.floor(diffMs / 3600000)
    const diffDia = Math.floor(diffMs / 86400000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin} min`
    if (diffHora < 24) return `${diffHora} h`
    return `${diffDia} d`
}

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    const profAtual = professores.find(p => p.email?.toLowerCase() === userEmail?.toLowerCase())
        ?? professores.find(p => p.nome?.toLowerCase().includes('argel'))
        ?? (professores.length > 0 ? professores[0] : null)

    const { notificacoes, loading, naoLidas, marcarComoLida } = useNotificacoes(profAtual || undefined)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 rounded-2xl transition-all border shrink-0 cursor-pointer ${isOpen ? 'bg-red-50 text-[#CC0000] border-red-100 shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 border-transparent hover:border-gray-100'}`}
            >
                <Bell className={`h-5 w-5 ${isOpen ? 'animate-none' : ''}`} />
                {naoLidas > 0 && (
                    <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-[#CC0000] border-2 border-white animate-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] ring-1 ring-gray-200/50 transition-all z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Header Premium */}
                    <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-white">
                        <div>
                            <h3 className="text-base font-black text-gray-900 tracking-tight">Notificações</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Alertas em tempo real</p>
                        </div>
                        {naoLidas > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-red-50 text-[#CC0000] text-[10px] font-black uppercase tracking-widest border border-red-100">
                                {naoLidas} Pendentes
                            </span>
                        )}
                    </div>

                    {/* Lista real vinda do Supabase */}
                    <div className="max-h-[380px] overflow-y-auto w-full custom-scrollbar">
                        {loading ? (
                            <div className="py-12 flex flex-col items-center justify-center">
                                <LoadingSpinner size="sm" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Sincronizando...</p>
                            </div>
                        ) : notificacoes.length === 0 ? (
                            <div className="py-12 px-8 text-center bg-gray-50/30">
                                <div className="h-12 w-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <Bell className="h-5 w-5 text-gray-300" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Tudo limpo por aqui!</p>
                                <p className="text-xs font-medium text-gray-500 mt-1">Você não tem novas notificações no momento.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notificacoes.slice(0, 8).map((notification) => {
                                    const ui =
                                        (notification.icone ? ICONE_UI[notification.icone] : null) ||
                                        TIPO_UI[notification.tipo] ||
                                        TIPO_UI.ct
                                    const Icon = ui.icon
                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => {
                                                if (!notification.lida) marcarComoLida(notification.id, true)
                                                if (notification.link) window.location.href = notification.link
                                            }}
                                            className={`px-6 py-5 hover:bg-gray-50/80 transition-all cursor-pointer flex gap-4 w-full relative group ${!notification.lida ? 'bg-red-50/20' : ''}`}
                                        >
                                            {!notification.lida && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#CC0000]" />
                                            )}
                                            <div className={`flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-2xl ${ui.bg} border border-white shadow-sm mt-0.5 group-hover:scale-95 transition-transform`}>
                                                <Icon className={`h-5 w-5 ${ui.color}`} />
                                            </div>
                                            <div className="flex-1 w-full min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className={`text-sm font-black tracking-tight leading-tight ${!notification.lida ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {notification.titulo}
                                                    </p>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap ml-2">
                                                        {tempoRelativo(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[13px] text-gray-500 leading-snug font-medium line-clamp-2">
                                                    {notification.mensagem || notification.subtitulo}
                                                </p>
                                                {notification.aluno?.nome && (
                                                    <p className="text-[9px] font-black text-[#CC0000] uppercase tracking-widest mt-2 flex items-center gap-1">
                                                        <Smartphone className="h-2.5 w-2.5" /> {notification.aluno.nome}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer com Identidade do CT */}
                    <Link
                        href="/notificacoes"
                        onClick={() => setIsOpen(false)}
                        className="px-6 py-4 flex items-center justify-center bg-gray-50 hover:bg-red-50 border-t border-gray-100 group transition-all"
                    >
                        <span className="text-xs font-black text-gray-900 uppercase tracking-widest group-hover:text-[#CC0000] flex items-center gap-2">
                            Ver Central de Automações
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                        </span>
                    </Link>
                </div>
            )}
        </div>
    )
}

