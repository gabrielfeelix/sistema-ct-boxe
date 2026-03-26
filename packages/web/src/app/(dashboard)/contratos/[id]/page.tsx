'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, QrCode, Copy, Check, RefreshCw, XCircle, MessageCircle, AlertTriangle, CalendarDays } from 'lucide-react'
import { useContrato } from '@/hooks/useContratos'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { AvatarInitials } from '@/components/shared/AvatarInitials'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { formatDate } from '@/lib/utils/formatters'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

export default function ContratoDetalhePage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const { contrato, loading, refetch } = useContrato(id)
    const [gerando, setGerando] = useState(false)
    const [copiado, setCopiado] = useState(false)
    const [modalCancelamentoAberta, setModalCancelamentoAberta] = useState(false)
    const [cancelando, setCancelando] = useState(false)
    const [qrData, setQrData] = useState<{ qr_code_base64?: string; pix_copia_cola?: string } | null>(null)
    const supabase = createClient()

    async function gerarCobranca() {
        if (!contrato) return
        setGerando(true)

        const response = await fetch('/api/pagamentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                aluno_id: contrato.aluno_id,
                contrato_id: contrato.id,
                valor: contrato.valor,
                descricao: `${contrato.plano_nome} — CT Boxe`,
                email_pagador: contrato.aluno_email,
                nome_pagador: contrato.aluno_nome,
            }),
        })

        const data = await response.json()
        if (!response.ok) { toast.error('Erro ao gerar cobrança mercado pago.'); setGerando(false); return }

        setQrData({ qr_code_base64: data.qr_code_base64, pix_copia_cola: data.pix_copia_cola })
        toast.success('Cobrança PIX Integrada gerada com sucesso!')
        setGerando(false)
    }

    async function copiarPix() {
        if (!qrData?.pix_copia_cola) return
        await navigator.clipboard.writeText(qrData.pix_copia_cola)
        setCopiado(true)
        setTimeout(() => setCopiado(false), 3000)
    }

    async function handleWhatsApp() {
        if (!contrato?.aluno_telefone) { toast.error('Aluno sem telefone cadastrado.'); return }
        const numero = contrato.aluno_telefone.replace(/\D/g, '')
        const msg = encodeURIComponent(
            `Olá, ${contrato.aluno_nome.split(' ')[0]}! 👋\n\nAqui é do CT Boxe! Passando pra avisar que seu plano de acesso ${contrato.dias_para_vencer < 0 ? 'venceu' : `vence em ${contrato.dias_para_vencer} dia(s)`}.\n\nPara não perder o embalo dos treinos, o valor base de renovação é R$ ${contrato.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.\n\nQualquer dúvida sobre a renovação automática ou pagamento, só me responder aqui!`
        )
        window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank')
    }

    async function handleCancelar() {
        if (!contrato) return
        setCancelando(true)
        const { error } = await supabase.from('contratos').update({ status: 'cancelado' }).eq('id', contrato.id)
        if (error) toast.error('Falha no banco ao cancelar vínculo.')
        else { toast.success('Vínculo comercial rompido com sucesso.'); refetch() }
        setCancelando(false)
        setModalCancelamentoAberta(false)
    }

    if (loading) return <div className="pt-20"><LoadingSpinner label="Puxando termos do contrato..." /></div>
    if (!contrato) return <div className="text-center py-20 text-gray-500 font-bold">Contrato inexiste.</div>

    const isVencido = contrato.dias_para_vencer < 0 && contrato.status !== 'cancelado';
    const isVencendo = contrato.dias_para_vencer >= 0 && contrato.dias_para_vencer <= 7 && contrato.status === 'ativo';

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in slide-in-from-bottom-3 duration-500 pb-10">

            <button onClick={() => router.back()} className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors w-fit">
                <div className="bg-white border border-gray-200 p-1.5 rounded-md group-hover:border-gray-300 transition-colors shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </div>
                Voltar para a listagem
            </button>

            {/* Hero Card do Contrato */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
                {(isVencido || isVencendo) && (
                    <div className={`absolute top-0 left-0 w-full h-1 ${isVencido ? 'bg-red-500' : 'bg-amber-500'}`} />
                )}

                <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:items-start justify-between border-b border-gray-50">
                    <div className="flex gap-5">
                        <Link href={`/alunos/${contrato.aluno_id}`} className="shrink-0 hover:scale-105 transition-transform duration-200">
                            <AvatarInitials nome={contrato.aluno_nome} fotoUrl={contrato.aluno_foto} size="xl" />
                        </Link>

                        <div className="pt-1">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                                <Link href={`/alunos/${contrato.aluno_id}`} className="text-2xl font-black text-gray-900 hover:text-[#CC0000] transition-colors leading-none tracking-tight">
                                    {contrato.aluno_nome}
                                </Link>
                                <StatusBadge status={contrato.status} />
                            </div>
                            <p className="text-sm font-medium text-gray-500 mt-1">{contrato.aluno_email}</p>

                            <div className="flex items-center gap-2 mt-4 inline-flex bg-gray-50/80 border border-gray-200/60 rounded-xl p-1.5 pr-4">
                                <div className="bg-white p-1.5 rounded-lg shadow-sm border border-gray-100 font-bold text-[#CC0000] text-xs uppercase tracking-widest">{contrato.plano_tipo}</div>
                                <p className="text-base font-black text-gray-800 tracking-tight">{contrato.plano_nome}</p>
                            </div>
                        </div>
                    </div>

                    <div className="text-left sm:text-right bg-gray-50/50 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Valor Vigente</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter shadow-sm w-fit sm:ml-auto">
                            <span className="text-lg text-gray-400 mr-1">R$</span>
                            {contrato.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Timeline do Contrato e Warnings */}
                <div className="p-6 sm:p-8 bg-gray-50/30">

                    {(isVencido || isVencendo) && (
                        <div className={`mb-6 p-4 rounded-xl border flex gap-3 items-start animate-pulse shadow-sm ${isVencido ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm">
                                    {isVencido ? 'Assinatura Expirada!' : 'Vencimento Próximo!'}
                                </p>
                                <p className="text-xs font-medium opacity-80 mt-1">
                                    {isVencido
                                        ? `Esta assinatura expirou há ${Math.abs(contrato.dias_para_vencer)} dias. Previna a evasão de receita e emita uma nova cobrança.`
                                        : `Este plano tem apenas mais ${contrato.dias_para_vencer} dias na ativa. Entre em contato antecipadamente.`}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative">

                        <div className="space-y-6 relative z-10">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                                    <CalendarDays className="w-5 h-5" />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Data de Assinatura</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDate(contrato.data_inicio)}</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200 shrink-0">
                                    <Check className="w-5 h-5" />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Término do Ciclo</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{formatDate(contrato.data_fim)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="absolute left-[19px] top-10 bottom-10 w-0.5 bg-gray-200 -z-0 hidden sm:block" />

                        <div className="bg-white border border-gray-100 shadow-sm p-5 rounded-2xl h-fit space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                <span className="text-xs font-bold text-gray-500 uppercase">Renovação Auto</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${contrato.renovacao_automatica ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {contrato.renovacao_automatica ? 'HABILITADA' : 'DESLIGADA'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Abertura de Ref.</span>
                                <span className="text-xs font-bold text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">{contrato.id.split('-')[0].toUpperCase()}</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Caixa de Ferramentas e Actions */}
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-2">Zona de Controle</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                <button
                    onClick={gerarCobranca}
                    disabled={gerando || contrato.status === 'cancelado'}
                    className="flex flex-col items-center justify-center gap-3 p-5 h-28 bg-[#CC0000] text-white hover:bg-[#AA0000] disabled:opacity-50 disabled:grayscale rounded-2xl transition-all duration-300 shadow hover:shadow-lg hover:-translate-y-1"
                >
                    {gerando ? <RefreshCw className="h-6 w-6 animate-spin" /> : <QrCode className="h-6 w-6" />}
                    <span className="text-sm font-bold">Emitir QrCode PIX</span>
                </button>

                <button
                    onClick={handleWhatsApp}
                    disabled={!contrato.aluno_telefone}
                    className="flex flex-col items-center justify-center gap-3 p-5 h-28 bg-white border border-gray-200 text-green-600 hover:bg-green-50 hover:border-green-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all duration-300 shadow-sm hover:shadow"
                >
                    <MessageCircle className="h-6 w-6" />
                    <span className="text-sm font-bold">Enviar Lembrete</span>
                </button>

                <button
                    onClick={() => setModalCancelamentoAberta(true)}
                    disabled={contrato.status === 'cancelado'}
                    className="flex flex-col items-center justify-center gap-3 p-5 h-28 bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-40 rounded-2xl transition-all duration-300 shadow-sm hover:shadow"
                >
                    <XCircle className="h-6 w-6" />
                    <span className="text-sm font-bold">Rescindir Plano</span>
                </button>

            </div>

            {/* QR Code gerado */}
            {qrData && (
                <div className="bg-green-50 rounded-2xl border border-green-200 shadow-sm p-8 text-center space-y-6 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 blur-[80px] opacity-30 -mr-10 -mt-10" />
                    <h3 className="text-lg font-black text-green-900 uppercase tracking-widest relative z-10">Interface de Pagamento Mercado Pago</h3>
                    {qrData.qr_code_base64 ? (
                        <div className="flex justify-center relative z-10">
                            <div className="p-3 bg-white rounded-2xl shadow-sm">
                                <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`data:image/png;base64,${qrData.qr_code_base64}`} alt="QR Code PIX" className="h-56 w-56 rounded-xl border border-gray-100" />
                                </>
                            </div>
                        </div>
                    ) : null}
                    {qrData.pix_copia_cola && (
                        <div className="max-w-md mx-auto relative z-10">
                            <p className="text-xs font-bold text-green-800 uppercase tracking-widest mb-2">Pix Copia e Cola / Chave Direta</p>
                            <div className="bg-white rounded-xl p-2 pl-4 flex items-center gap-3 shadow-sm border border-green-100">
                                <p className="text-xs font-mono text-gray-500 truncate flex-1 leading-relaxed">{qrData.pix_copia_cola}</p>
                                <button onClick={copiarPix} className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-colors ${copiado ? 'bg-green-100 text-green-800' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'}`}>
                                    {copiado ? <><Check className="h-4 w-4" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-xs font-bold mt-2 relative z-10">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Aguardando Confirmação Externa
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={modalCancelamentoAberta}
                onClose={() => !cancelando && setModalCancelamentoAberta(false)}
                onConfirm={handleCancelar}
                title="Rescindir Contrato"
                description={`Atenção: Cancelar a assinatura de ${contrato.aluno_nome} vai cortar imediatamente as permissões no App e as cobranças futuras. Tem certeza?`}
                confirmText="Cancelar Assinatura"
                variant="danger"
                isLoading={cancelando}
            />
        </div>
    )
}
