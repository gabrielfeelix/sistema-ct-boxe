'use client'

import { useState } from 'react'
import { useCandidatos } from '@/hooks/useCandidatos'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Users, ChevronRight, Search, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'
import Link from 'next/link'
import { ModalNovoCandidato } from '@/components/candidatos/ModalNovoCandidato'

const STATUS_OPTIONS = [
    { value: 'todos', label: 'Todos' },
    { value: 'aguardando', label: 'Aguardando' },
    { value: 'aprovado', label: 'Aprovados' },
    { value: 'reprovado', label: 'Reprovados' },
]

const EXPERIENCIA_LABELS: Record<string, string> = {
    nenhuma: 'Sem experiência',
    iniciante: 'Iniciante',
    intermediario: 'Intermediário',
    avancado: 'Avançado',
}

export default function CandidatosPage() {
    const [statusFiltro, setStatusFiltro] = useState('todos')
    const [busca, setBusca] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const { candidatos, loading, total, pendentes, refetch } = useCandidatos({
        status: statusFiltro,
        busca: busca
    })

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-8 animate-in slide-in-from-bottom-2 duration-300">
            {/* Header SaaS Standard */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-[#CC0000]" /> Inscrições e Candidatos
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Gerencie a fila de admissão e novos perfis ({total} total).
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[#CC0000] hover:bg-[#AA0000] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-500/10 transition-all active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Novo Candidato
                </button>
            </div>

            {/* Alerta de pendentes corporativo (sem blur chamativo) */}
            {pendentes > 0 && statusFiltro === 'todos' && !loading && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-md shadow-sm border border-amber-100">
                            <Users className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">
                                {pendentes} candidato{pendentes > 1 ? 's formaram' : ' formou'} uma fila de aprovação.
                            </h4>
                            <p className="text-sm text-amber-700">
                                Revise os perfis antes de liberar o acesso ao sistema.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setStatusFiltro('aguardando')}
                        className="px-4 py-2 bg-white text-sm font-medium text-amber-900 border border-amber-300 hover:bg-amber-100 rounded-md shadow-sm transition-colors whitespace-nowrap"
                    >
                        Filtrar Pendentes
                    </button>
                </div>
            )}

            {/* Barra de Filtros (Tabs Clean) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {STATUS_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFiltro(opt.value)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap
                                ${statusFiltro === opt.value
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50'
                                }
                            `}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar pelo nome..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full sm:w-64 pl-9 pr-4 h-11 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000] bg-white shadow-sm"
                    />
                </div>
            </div>

            {/* Listagem em Formato de Data Table */}
            {loading ? <div className="py-12"><LoadingSpinner label="Buscando fichas..." /></div> :
                candidatos.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title={statusFiltro === 'todos' ? "Nenhuma inscrição." : "Nenhum resultado."}
                        description="Nenhum candidato encontrado nessa lista."
                    />
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidato / Contato</th>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Inscrição</th>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nível</th>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="relative px-6 py-4">
                                            <span className="sr-only">Ações</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {candidatos.map((c) => (
                                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="ml-0">
                                                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#CC0000] transition-colors flex items-center gap-2">
                                                            {c.nome}
                                                            {c.status === 'aguardando' && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Aguardando Avaliação"></span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {c.email} {c.telefone && `• ${c.telefone}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{formatDate(c.created_at).slice(0, 5)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {EXPERIENCIA_LABELS[c.experiencia_previa ?? ''] ?? 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={c.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link
                                                    href={`/candidatos/${c.id}`}
                                                    className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-md px-3 py-1.5 shadow-sm transition-colors"
                                                >
                                                    Visualizar
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Fake Pagination Footer */}
                        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
                            <div>Mostrando 1 a {candidatos.length} de {total} resultados</div>
                            <div className="flex gap-2">
                                <button disabled className="px-3 py-1 bg-white border border-gray-200 rounded text-gray-400">Anterior</button>
                                <button disabled className="px-3 py-1 bg-white border border-gray-200 rounded text-gray-400">Próxima</button>
                            </div>
                        </div>
                    </div>
                )
            }
            <ModalNovoCandidato
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={refetch}
            />
        </div>
    )
}
