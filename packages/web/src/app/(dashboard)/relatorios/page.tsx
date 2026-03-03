'use client'

import { useState, useEffect } from 'react'
import { Download, Printer, Users, DollarSign, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCurrency } from '@/lib/utils/formatters'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function RelatoriosPage() {
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    // Dados do Relatório
    const [financeiro, setFinanceiro] = useState<{ totalRecebido: number, inadimplentes: number }>({ totalRecebido: 0, inadimplentes: 0 })
    const [alunos, setAlunos] = useState<{ ativos: number, novosEstemes: number }>({ ativos: 0, novosEstemes: 0 })
    const [aulas, setAulas] = useState<{ totais: number, presencas: number }>({ totais: 0, presencas: 0 })
    const [ultimosPagamentos, setUltimosPagamentos] = useState<Array<{ id: string; valor: number; metodo?: string; data_pagamento: string; aluno?: { nome?: string } }>>([])

    useEffect(() => {
        async function fetchDados() {
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)
            const dateStr = startOfMonth.toISOString()

            // 1. Financeiro do mês
            const { data: pags } = await supabase.from('pagamentos')
                .select('*')
                .gte('data_pagamento', dateStr)
                .eq('status', 'pago')
            const totalMes = (pags || []).reduce((acc, p) => acc + Number(p.valor), 0)

            const { count: inadimplentes } = await supabase.from('pagamentos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'atrasado')

            // 2. Alunos
            const { count: ativos } = await supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ativo')
            const { count: novos } = await supabase.from('alunos').select('*', { count: 'exact', head: true }).gte('created_at', dateStr)

            // 3. Aulas
            const { count: totaisAulas } = await supabase.from('aulas').select('*', { count: 'exact', head: true }).gte('data', dateStr)
            const { count: presencas } = await supabase.from('presencas').select('*', { count: 'exact', head: true }).gte('created_at', dateStr).eq('status', 'presente')

            // Ultimos pagamentos (para a tabela do relatório)
            const { data: ultimos } = await supabase.from('pagamentos')
                .select('*, aluno:alunos(nome)')
                .eq('status', 'pago')
                .order('data_pagamento', { ascending: false })
                .limit(20)

            setFinanceiro({ totalRecebido: totalMes, inadimplentes: inadimplentes || 0 })
            setAlunos({ ativos: ativos || 0, novosEstemes: novos || 0 })
            setAulas({ totais: totaisAulas || 0, presencas: presencas || 0 })
            setUltimosPagamentos(ultimos || [])

            setLoading(false)
        }
        fetchDados()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    function handlePrint() {
        window.print()
    }

    function handleExportCSV() {
        const s = ';'
        const header = `Data${s}Aluno${s}Metodo${s}Valor`
        const rows = ultimosPagamentos.map(p => {
            const d = formatDate(p.data_pagamento)
            const a = p.aluno?.nome || 'Desconhecido'
            const m = p.metodo || 'PIX'
            const v = p.valor
            return `${d}${s}${a}${s}${m}${s}${v}`
        })

        const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join('\n')
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `relatorio_pgtos_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    function handleExportXLS() {
        const s = '\t'
        const header = `Data${s}Aluno${s}Metodo${s}Valor`
        const rows = ultimosPagamentos.map(p => {
            const d = formatDate(p.data_pagamento)
            const a = p.aluno?.nome || 'Desconhecido'
            const m = p.metodo || 'PIX'
            const v = p.valor.toString().replace('.', ',')
            return `${d}${s}${a}${s}${m}${s}${v}`
        })

        const content = [header, ...rows].join('\n')
        const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `relatorio_pgtos_${new Date().toISOString().split('T')[0]}.xls`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading) return <LoadingSpinner label="Gerando relatórios..." />

    return (
        <div className="space-y-6 max-w-6xl mx-auto print-container">
            {/* Esconde os botões na impressão via print-specific classes definidas no global.css se precisar,
          mas aqui vamos usar JS media queries ou CSS inline */}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h2>
                    <p className="text-sm text-gray-500 mt-1">Visão geral do CT referente ao mês atual.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group/export">
                        <button
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Exportar Planilha
                        </button>
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 invisible group-hover/export:visible z-50 transition-all opacity-0 group-hover/export:opacity-100">
                            <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900">.CSV (Universal)</button>
                            <button onClick={handleExportXLS} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900">.XLS (Excel Antigo)</button>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#CC0000] hover:bg-[#AA0000] rounded-xl transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> Imprimir Relatório
                    </button>
                </div>
            </div>

            <div className="print-only hidden mb-8 pb-4 border-b border-gray-200">
                <h1 className="text-3xl font-black">CT Boxe - Relatório Gerencial</h1>
                <p className="text-gray-500">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card Financeiro */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-700">Financeiro Mês</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-900 my-2">{formatCurrency(financeiro.totalRecebido)}</p>
                    <p className="text-sm text-red-500 font-medium">⚠️ {financeiro.inadimplentes} pagamentos atrasados gerais</p>
                </div>

                {/* Card Alunos */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-700">Demografia</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-900 my-2">{alunos.ativos} <span className="text-sm text-gray-500 font-medium">ativos</span></p>
                    <p className="text-sm text-green-600 font-medium">↑ {alunos.novosEstemes} novos este mês</p>
                </div>

                {/* Card Aulas */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-gray-700">Engajamento</h3>
                    </div>
                    <p className="text-3xl font-black text-gray-900 my-2">{aulas.presencas} <span className="text-sm text-gray-500 font-medium">check-ins</span></p>
                    <p className="text-sm text-gray-500 font-medium">em {aulas.totais} aulas ministradas</p>
                </div>
            </div>

            {/* Tabela de Entradas Recentes */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">Últimos Pagamentos Recebidos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b border-gray-100 text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Data</th>
                                <th className="px-6 py-4 font-semibold">Aluno</th>
                                <th className="px-6 py-4 font-semibold">Método</th>
                                <th className="px-6 py-4 font-semibold text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {ultimosPagamentos.map(p => (
                                <tr key={p.id} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(p.data_pagamento)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{p.aluno?.nome || '—'}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600 uppercase">
                                            {p.metodo || 'PIX'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-gray-900">{formatCurrency(p.valor)}</td>
                                </tr>
                            ))}
                            {ultimosPagamentos.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Nenhum pagamento registrado no momento.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .shadow-sm { box-shadow: none !important; border: 1px solid #eee; }
        }
        .print-only { display: none; }
      `}} />
        </div>
    )
}
