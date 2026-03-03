'use client'

import { CheckCircle2, Clock3, UserMinus, XCircle } from 'lucide-react'
import type { PresencaRegistro, PresencaStatus } from '@/hooks/usePresenca'

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
                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#CC0000] to-[#AA0000]">
                                        {registro.aluno?.foto_url ? (
                                            <img
                                                src={registro.aluno.foto_url}
                                                alt={registro.aluno.nome}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                                                {registro.aluno?.nome
                                                    ?.split(' ')
                                                    .slice(0, 2)
                                                    .map((n) => n[0])
                                                    .join('')
                                                    .toUpperCase() ?? 'AL'}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {registro.aluno?.nome ?? 'Aluno removido'}
                                        </p>
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
                                        title="Marcar como presente"
                                        className={`group flex h-8 w-8 items-center justify-center rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                            registro.status === 'presente'
                                                ? 'border-emerald-300 bg-emerald-100 ring-2 ring-emerald-200'
                                                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                                        }`}
                                    >
                                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onMarcar(registro.aluno_id, 'falta')}
                                        disabled={loading}
                                        title="Marcar falta"
                                        className={`group flex h-8 w-8 items-center justify-center rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                            registro.status === 'falta'
                                                ? 'border-red-300 bg-red-100 ring-2 ring-red-200'
                                                : 'border-red-200 bg-red-50 hover:bg-red-100'
                                        }`}
                                    >
                                        <UserMinus className="h-4 w-4 text-red-700" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onMarcar(registro.aluno_id, 'cancelada')}
                                        disabled={loading}
                                        title="Cancelar presença"
                                        className={`group flex h-8 w-8 items-center justify-center rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                                            registro.status === 'cancelada'
                                                ? 'border-gray-300 bg-gray-200 ring-2 ring-gray-300'
                                                : 'border-gray-200 bg-gray-100 hover:bg-gray-200'
                                        }`}
                                    >
                                        <XCircle className="h-4 w-4 text-gray-700" />
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
