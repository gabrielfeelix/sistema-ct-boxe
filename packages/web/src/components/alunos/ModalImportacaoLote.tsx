'use client'

import { useState, useRef } from 'react'
import { X, Upload, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ModalImportacaoLoteProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

type CsvEntry = Record<string, string | undefined>

export function ModalImportacaoLote({ isOpen, onClose, onSuccess }: ModalImportacaoLoteProps) {
    const [loading, setLoading] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    if (!isOpen) return null

    const handleDownloadTemplate = () => {
        const headers = 'nome,whatsapp,email,plano_nome,status_financeiro\n'
        const example = 'Jose Silva,11988887777,jose@email.com,Mensal,pendente\n'
        const blob = new Blob([headers + example], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'template_alunos_lote.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const processCSV = async (file: File) => {
        setLoading(true)
        setLogs(['Lendo arquivo...'])

        try {
            const text = await file.text()
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

            const dataLines = lines.slice(1)
            let sucessos = 0
            let erros = 0

            for (let i = 0; i < dataLines.length; i++) {
                const values = dataLines[i].split(',').map(v => v.trim())
                const entry: CsvEntry = {}
                headers.forEach((h, idx) => entry[h] = values[idx])

                if (!entry.nome || !entry.whatsapp) {
                    setLogs(prev => [...prev, `Linha ${i + 2}: Nome ou WhatsApp ausentes. Pulando.`])
                    erros++
                    continue
                }

                // Normaliza whatsapp para busca (apenas números)
                const zapNumeros = entry.whatsapp.replace(/\D/g, '')

                // 1. Verifica se aluno já existe pelo whatsapp
                const { data: alunoExistente } = await supabase
                    .from('alunos')
                    .select('id')
                    .eq('telefone', zapNumeros)
                    .maybeSingle()

                let alunoId = alunoExistente?.id

                if (!alunoId) {
                    // Criar novo aluno
                    const { data: novoAluno, error: errorAluno } = await supabase
                        .from('alunos')
                        .insert({
                            nome: entry.nome,
                            telefone: zapNumeros,
                            email: entry.email || null,
                            status: 'ativo' // Começa ativo, mas sem contrato vira "pendente de info" se quisermos, mas aqui vamos focar no contrato
                        })
                        .select('id')
                        .single()

                    if (errorAluno) {
                        setLogs(prev => [...prev, `Linha ${i + 2}: Erro ao criar aluno (${entry.nome}).`])
                        erros++
                        continue
                    }
                    alunoId = novoAluno.id
                }

                // 2. Verifica se tem plano/contrato para criar
                if (entry.plano_nome) {
                    // Busca ID do plano pelo nome
                    const { data: plano } = await supabase
                        .from('planos')
                        .select('id, valor, tipo')
                        .ilike('nome', `%${entry.plano_nome}%`)
                        .eq('ativo', true)
                        .maybeSingle()

                    if (plano) {
                        // Verifica se já tem contrato ativo para não duplicar
                        const { data: contratoAtivo } = await supabase
                            .from('contratos')
                            .select('id')
                            .eq('aluno_id', alunoId)
                            .eq('status', 'ativo')
                            .maybeSingle()

                        if (!contratoAtivo) {
                            const dataInicio = new Date().toISOString().split('T')[0]
                            const dataFim = new Date()
                            dataFim.setDate(dataFim.getDate() + 30) // Default 30 dias se for mensal, etc. Simplificado para o lote.

                            await supabase.from('contratos').insert({
                                aluno_id: alunoId,
                                plano_id: plano.id,
                                valor: plano.valor,
                                data_inicio: dataInicio,
                                data_fim: dataFim.toISOString().split('T')[0],
                                status: 'ativo'
                            })

                            if (entry.status_financeiro === 'pago') {
                                await supabase.from('pagamentos').insert({
                                    aluno_id: alunoId,
                                    valor: plano.valor,
                                    status: 'pago',
                                    metodo: 'dinheiro',
                                    data_pagamento: new Date().toISOString()
                                })
                            }
                        }
                    } else {
                        setLogs(prev => [...prev, `Linha ${i + 2}: Plano "${entry.plano_nome}" não encontrado.`])
                    }
                }

                sucessos++
                if (sucessos % 5 === 0) setLogs(prev => [...prev, `${sucessos} processados...`])
            }

            setLogs(prev => [...prev, `✅ Concluído! Sucessos: ${sucessos}, Erros/Alertas: ${erros}`])
            toast.success(`Importação finalizada com ${sucessos} sucessos.`)
            onSuccess()
        } catch (err) {
            console.error(err)
            toast.error('Erro ao processar arquivo.')
            setLogs(prev => [...prev, `❌ ERRO CRÍTICO: ${err instanceof Error ? err.message : 'Falha inesperada.'}`])
        } finally {
            setLoading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processCSV(file)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-6 h-6 text-emerald-500" /> Importação em Lote
                        </h3>
                        <p className="text-sm text-gray-500 font-medium">Suba centenas de alunos de uma vez via CSV.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Template Downloader */}
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-white p-2.5 rounded-xl shadow-sm border border-emerald-100">
                                <Download className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-900">Precisa do modelo?</p>
                                <p className="text-xs font-medium text-emerald-700">Baixe o CSV com as colunas corretas.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadTemplate}
                            className="text-xs font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900 underline underline-offset-4 decoration-emerald-300 hover:decoration-emerald-500 transition-all font-mono"
                        >
                            Baixar Template
                        </button>
                    </div>

                    {/* Upload Zone */}
                    <div
                        onClick={() => !loading && fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
                            ${loading ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-gray-50/50 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30'}
                        `}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            className="hidden"
                        />
                        {loading ? (
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        ) : (
                            <Upload className="w-10 h-10 text-gray-400" />
                        )}
                        <div className="text-center">
                            <p className="text-sm font-bold text-gray-900">Clique para selecionar o arquivo</p>
                            <p className="text-xs font-medium text-gray-500 mt-1">Apenas arquivos .CSV são suportados</p>
                        </div>
                    </div>

                    {/* Logs Area */}
                    {logs.length > 0 && (
                        <div className="bg-gray-900 rounded-2xl p-5 h-48 overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar shadow-inner">
                            {logs.map((log, i) => (
                                <p key={i} className={`${log.startsWith('❌') ? 'text-red-400' : log.startsWith('✅') ? 'text-emerald-400' : 'text-gray-400'}`}>
                                    {`> ${log}`}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    )
}
