'use client'

import { CheckCircle2, UserMinus, XCircle } from 'lucide-react'
import type { PresencaRegistro, PresencaStatus } from '@/hooks/usePresenca'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ListaPresencaProps {
    registros: PresencaRegistro[]
    loading?: boolean
    onMarcar: (alunoId: string, status: PresencaStatus) => Promise<void>
}

function statusPill(status: PresencaStatus) {
    if (status === 'presente') {
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    }
    if (status === 'falta') {
        return 'bg-red-50 text-red-700 ring-red-200'
    }
    if (status === 'cancelada') {
        return 'bg-gray-100 text-gray-600 ring-gray-200'
    }
    return 'bg-blue-50 text-blue-700 ring-blue-200'
}

function statusLabel(status: PresencaStatus) {
    if (status === 'presente') return 'Presente'
    if (status === 'falta') return 'Falta'
    if (status === 'cancelada') return 'Cancelada'
    return 'Agendado'
}

export function ListaPresenca({ registros, loading = false, onMarcar }: ListaPresencaProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full border-collapse text-left">
                <thead className="bg-gray-50/80">
                    <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Aluno</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Check-in</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Acoes
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {registros.map((registro) => (
                        <tr key={registro.id} className="hover:bg-gray-50/70">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                                        <AvatarImage src={registro.aluno?.foto_url} alt={registro.aluno?.nome} />
                                        <AvatarFallback className="bg-gray-100 text-[10px] font-bold text-gray-400">
                                            {registro.aluno?.nome?.slice(0, 2).toUpperCase() ?? '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{registro.aluno?.nome ?? 'Aluno removido'}</p>
                                        <p className="text-xs font-medium text-gray-500">{registro.aluno?.email ?? '-'}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusPill(
                                        registro.status
                                    )}`}
                                >
                                    {statusLabel(registro.status)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-600">
                                {registro.data_checkin
                                    ? new Date(registro.data_checkin).toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : '-'}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onMarcar(registro.aluno_id, 'presente')}
                                        disabled={loading}
                                        title="Presente"
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 transition-all hover:bg-emerald-100 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${registro.status === 'presente' ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onMarcar(registro.aluno_id, 'falta')}
                                        disabled={loading}
                                        title="Falta"
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-all hover:bg-red-100 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${registro.status === 'falta' ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}
                                    >
                                        <UserMinus className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onMarcar(registro.aluno_id, 'cancelada')}
                                        disabled={loading}
                                        title="Cancelar"
                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-700 transition-all hover:bg-gray-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${registro.status === 'cancelada' ? 'ring-2 ring-gray-400 ring-offset-1' : ''}`}
                                    >
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
