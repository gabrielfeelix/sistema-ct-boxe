'use client'

import { useState } from 'react'
import { MessageCircle, RefreshCw, AlertOctagon, TrendingDown, ArrowLeft, User } from 'lucide-react'
import { useInadimplentes } from '@/hooks/useFinanceiro'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ConfirmModal } from '@/components/shared/ConfirmModal'

export default function InadimplenciaPage() {
    const router = useRouter()
    const { inadimplentes, loading, totalEmAberto, refetch } = useInadimplentes()
    const [gerando, setGerando] = useState<string | null>(null)
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, pId: string, alunoId: string, valor: number, email: string, nome: string }>({
        isOpen: false, pId: '', alunoId: '', valor: 0, email: '', nome: ''
    })

    function abrirWhatsApp(telefone: string, nome: string, valor: number, vencimento: string) {
        const numero = telefone.replace(/\D/g, '')
        const msg = encodeURIComponent(
            `Olá ${nome.split(' ')[0]}! Tudo certo?\n\nSou do financeiro do CT Boxe, passando para avisar que consta um valor em aberto de ${formatCurrency(valor)} com vencimento em ${formatDate(vencimento).slice(0, 5)}.\n\nPrecisa de ajuda para gerar uma nova cobrança ou enviar a chave PIX?`
        )
        window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank')
    }

    async function handleGerarCobranca() {
        const { pId, alunoId, valor, email, nome } = confirmModal
        setGerando(pId)

        try {
            const response = await fetch('/api/pagamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aluno_id: alunoId, valor, descricao: 'Recuperação Mensalidade', email_pagador: email, nome_pagador: nome }),
            })

            if (response.ok) {
                toast.success('Lembrete e nova cobrança enviada via Mercado Pago!')
                refetch()
            } else {
                toast.error('Erro ao integrar com gateway de pagamento.')
            }
        } catch {
            toast.error('Falha de conexão.')
        } finally {
            setGerando(null)
            setConfirmModal({ ...confirmModal, isOpen: false })
        }
    }

    const diasAtraso = (vencimento: string) => {
        return Math.floor((Date.now() - new Date(vencimento).getTime()) / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in slide-in-from-bottom-2 duration-300">
            <button onClick={() => router.back()} className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors w-fit">
                <div className="bg-white border border-gray-200 p-1.5 rounded-md group-hover:border-gray-300 transition-colors shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </div>
                Voltar
            </button>

            {/* Header Clean */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <AlertOctagon className="w-6 h-6 text-red-600" /> Relatório de Inadimplência
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Visão geral de mensalidades e valores em atraso.</p>
                </div>

                <div className="text-left sm:text-right bg-red-50 px-4 py-3 rounded-lg border border-red-100 flex items-center gap-3">
                    <div className="bg-red-100 p-2 rounded-md">
                        <TrendingDown className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-red-800 uppercase tracking-widest leading-none mb-1">Total em Aberto</p>
                        <p className="text-xl font-bold text-red-700 tracking-tight leading-none">
                            {formatCurrency(totalEmAberto)}
                        </p>
                    </div>
                </div>
            </div>

            {loading ? <LoadingSpinner label="Buscando registros inadimplentes..." /> :
                inadimplentes.length === 0 ? (
                    <EmptyState
                        icon={AlertOctagon}
                        title="Fluxo de Caixa Saudável"
                        description="Nenhuma pendência financeira ou atraso nas mensalidades."
                    />
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aluno / Contato</th>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Devido</th>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vencimento</th>
                                        <th scope="col" className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th scope="col" className="relative px-6 py-4">
                                            <span className="sr-only">Ações</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {inadimplentes.map(p => {
                                        const aluno = p.aluno as { nome?: string; telefone?: string; email?: string } | null
                                        const dias = diasAtraso(p.data_vencimento)
                                        return (
                                            <tr key={p.id} className="hover:bg-red-50/30 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                                                            <User className="h-4 w-4 text-gray-500" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">{aluno?.nome || 'Desconhecido'}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{aluno?.telefone || aluno?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{formatCurrency(p.valor)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{formatDate(p.data_vencimento).slice(0, 5)}</div>
                                                    <div className="text-xs font-medium text-red-600 mt-0.5">{dias} dias atrás</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Atrasado
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {aluno?.telefone && (
                                                            <button
                                                                onClick={() => abrirWhatsApp(aluno.telefone!, aluno.nome || 'Aluno', p.valor, p.data_vencimento)}
                                                                className="inline-flex items-center justify-center p-2 bg-white hover:bg-green-50 text-green-600 border border-gray-200 hover:border-green-200 rounded-md shadow-sm transition-colors"
                                                                title="Cobrar via WhatsApp"
                                                            >
                                                                <MessageCircle className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setConfirmModal({
                                                                isOpen: true, pId: p.id, alunoId: p.aluno_id, valor: p.valor, email: aluno?.email || '', nome: aluno?.nome || 'Aluno'
                                                            })}
                                                            className="inline-flex items-center justify-center p-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-md shadow-sm transition-colors"
                                                            title="Nova Cobrança Automática"
                                                        >
                                                            <RefreshCw className={`h-4 w-4 ${gerando === p.id ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => !gerando && setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleGerarCobranca}
                title="Gerar Nova Cobrança"
                description={`Deseja rodar uma nova requisição de pagamento via Mercado Pago para essa pendência de ${formatCurrency(confirmModal.valor)}?`}
                confirmText="Confirmar Geração"
                variant="primary"
                isLoading={!!gerando}
            />
        </div>
    )
}
