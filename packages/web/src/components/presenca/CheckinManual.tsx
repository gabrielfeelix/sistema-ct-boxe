'use client'

import { useMemo, useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import type { PresencaRegistro } from '@/hooks/usePresenca'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface CheckinManualProps {
    registros: PresencaRegistro[]
    loading?: boolean
    onCheckin: (alunoId: string) => Promise<void>
}

export function CheckinManual({ registros, loading = false, onCheckin }: CheckinManualProps) {
    const [busca, setBusca] = useState('')

    const candidatos = useMemo(() => {
        const termo = busca.trim().toLowerCase()
        return registros
            .filter((registro) => registro.status !== 'presente')
            .filter((registro) => {
                if (!termo) return true
                const nome = (registro.aluno?.nome ?? '').toLowerCase()
                const email = (registro.aluno?.email ?? '').toLowerCase()
                return nome.includes(termo) || email.includes(termo)
            })
            .slice(0, 8)
    }, [registros, busca])

    return (
        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Check-in manual</h3>
            <p className="mt-1 text-xs font-medium text-gray-500">
                Use quando o aluno chegou sem estar previamente marcado na chamada.
            </p>

            <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar aluno por nome ou email"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                />
            </div>

            <div className="mt-3 space-y-2">
                {candidatos.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-xs font-medium text-gray-500">
                        Nenhum aluno encontrado para check-in manual.
                    </p>
                ) : (
                    candidatos.map((registro) => (
                        <div
                            key={registro.id}
                            className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/70 p-2.5"
                        >
                            <div className="flex items-center gap-2.5">
                                <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                                    <AvatarImage src={registro.aluno?.foto_url} alt={registro.aluno?.nome} />
                                    <AvatarFallback className="bg-gray-100 text-[10px] font-bold text-gray-400">
                                        {registro.aluno?.nome?.slice(0, 2).toUpperCase() ?? '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{registro.aluno?.nome}</p>
                                    <p className="text-xs font-medium text-gray-500">{registro.aluno?.email ?? '-'}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="inline-flex h-8 items-center rounded-lg bg-[#CC0000] px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#AA0000] disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={loading}
                                onClick={() => onCheckin(registro.aluno_id)}
                            >
                                <UserPlus className="mr-1 h-3.5 w-3.5" />
                                Registrar
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
