'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCircle2, Mail, CalendarClock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Exemplo mockado baseado na imagem solicitada
const notificationsMock = [
    {
        id: 1,
        title: 'Contrato Assinado',
        description: 'João Silva assinou o contrato #1234',
        time: '2 min atrás',
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
        bgIcon: 'bg-emerald-50',
    },
    {
        id: 2,
        title: 'Novo Documento',
        description: 'Você recebeu um novo documento',
        time: '1 hora atrás',
        icon: <Mail className="h-5 w-5 text-blue-500" />,
        bgIcon: 'bg-blue-50',
    },
    {
        id: 3,
        title: 'Aviso de Expiração',
        description: 'O contrato #5678 expira amanhã',
        time: '5 horas atrás',
        icon: <CalendarClock className="h-5 w-5 text-amber-500" />,
        bgIcon: 'bg-amber-50',
    },
]

export function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

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
                className="relative p-2.5 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-gray-900 transition-all border border-transparent hover:border-gray-100 shrink-0 cursor-pointer"
            >
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-[#CC0000] border border-white" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] ring-1 ring-gray-200/50 transition-all z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                        <h3 className="text-base font-bold text-gray-900">Notificações</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                            3 Novas
                        </span>
                    </div>

                    {/* Lista */}
                    <div className="max-h-[320px] overflow-y-auto w-full">
                        {notificationsMock.map((notification) => (
                            <div
                                key={notification.id}
                                className="px-5 py-4 hover:bg-gray-50/80 transition-colors cursor-pointer border-b border-gray-50 last:border-0 flex gap-4 w-full"
                            >
                                <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full ${notification.bgIcon} mt-0.5`}>
                                    {notification.icon}
                                </div>
                                <div className="flex-1 w-full min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 mb-0.5">
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-gray-500 leading-snug line-clamp-2">
                                        {notification.description}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1.5 font-medium">
                                        {notification.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-gray-100 bg-gray-50/50">
                        <Link
                            href="/notificacoes"
                            onClick={() => setIsOpen(false)}
                            className="w-full py-2.5 flex items-center justify-center text-sm font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                            Ver todas as regras de automação
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
