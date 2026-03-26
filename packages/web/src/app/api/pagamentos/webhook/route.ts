import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import crypto from 'crypto'

const mpClient = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
})

type WebhookBody = {
    type?: string
    data?: {
        id?: string | number
    }
}

function validateWebhookSignature(req: NextRequest, body: WebhookBody): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) return true // Se não tem secret configurado, aceita (modo dev)

    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    if (!xSignature || !xRequestId) return false

    // Parse da assinatura: ts=123456789,v1=hash
    const parts = xSignature.split(',')
    let ts = ''
    let hash = ''

    parts.forEach(part => {
        const [key, value] = part.split('=')
        if (key === 'ts') ts = value
        if (key === 'v1') hash = value
    })

    if (!ts || !hash) return false

    // Cria o manifest
    const dataId = body.data?.id || ''
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    // Calcula HMAC-SHA256
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(manifest)
    const calculatedHash = hmac.digest('hex')

    return calculatedHash === hash
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Valida assinatura do webhook
        if (!validateWebhookSignature(req, body)) {
            console.error('Webhook signature inválida')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        // Mercado Pago envia notificações de tipo "payment"
        if (body.type !== 'payment') {
            return NextResponse.json({ received: true })
        }

        const paymentId = body.data?.id
        if (!paymentId) return NextResponse.json({ received: true })

        // Busca os dados reais do pagamento no MP
        const payment = new Payment(mpClient)
        const mpPayment = await payment.get({ id: paymentId })

        if (mpPayment.status !== 'approved') {
            return NextResponse.json({ received: true })
        }

        const supabase = await createClient()

        // Atualiza pagamento no Supabase
        const { data: pagamento } = await supabase
            .from('pagamentos')
            .update({
                status: 'pago',
                mercadopago_status: 'approved',
                data_pagamento: new Date().toISOString(),
            })
            .eq('mercadopago_id', paymentId.toString())
            .select('aluno_id, contrato_id')
            .single()

        // Se pagamento aprovado, ativa o contrato vinculado (se houver)
        if (pagamento?.contrato_id) {
            await supabase
                .from('contratos')
                .update({ status: 'ativo' })
                .eq('id', pagamento.contrato_id)
        }

        // Se pagamento aprovado, garante que aluno está ativo
        if (pagamento?.aluno_id) {
            await supabase
                .from('alunos')
                .update({ status: 'ativo' })
                .eq('id', pagamento.aluno_id)

            // Notifica o admin
            const { data: aluno } = await supabase.from('alunos').select('nome').eq('id', pagamento.aluno_id).single()
            await supabase.from('notificacoes').insert({
                titulo: 'Pagamento Confirmado',
                subtitulo: `${aluno?.nome || 'Aluno'} pagou a fatura`,
                mensagem: `O Mercado Pago confirmou o recebimento da fatura do aluno ${aluno?.nome || 'UID: ' + pagamento.aluno_id}.`,
                tipo: 'pagamento',
                lida: false,
                acao: 'pagamento',
                link: '/financeiro'
            })
        }

        return NextResponse.json({ received: true })
    } catch (err) {
        console.error('Webhook MP erro:', err)
        return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
    }
}

// MP também envia GET para verificar disponibilidade
export async function GET() {
    return NextResponse.json({ status: 'webhook ativo' })
}
