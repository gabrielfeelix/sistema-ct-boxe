import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Payment, MercadoPagoConfig } from 'mercadopago'

function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
        return error.message
    }

    return 'Erro interno.'
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const body = await req.json()
        const { aluno_id, contrato_id, valor, descricao, email_pagador, nome_pagador, cpf_pagador } = body

        if (!aluno_id || !valor || !email_pagador) {
            return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
        }

        const payment = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' })

        // ----------------------------------------------------
        // MOCK DE DEVESA: Se não tem Token MP na env local
        // ----------------------------------------------------
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            console.warn('🔔 [API PIX] MERCADOPAGO_ACCESS_TOKEN ausente. Gerando PIX MOCKADO para preview de interface.')
            return NextResponse.json({
                pagamento_id: 'mock-' + Date.now(),
                qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', // pixel branco mock
                pix_copia_cola: '00020101021126580014br.gov.bcb.pix0136mock-pix-key-para-visualizacao-apenas5204000053039865802BR5915CT BOXE TESTE6009SAO PAULO62070503***6304A1B2',
                mercadopago_id: 'mock-12345',
                status: 'pending'
            })
        }


        const p = new Payment(payment)
        const mpResponse = await p.create({
            body: {
                transaction_amount: parseFloat(valor),
                description: descricao || 'Mensalidade CT Boxe',
                payment_method_id: 'pix',
                payer: {
                    email: email_pagador,
                    first_name: nome_pagador?.split(' ')[0] || '',
                    last_name: nome_pagador?.split(' ').slice(1).join(' ') || '',
                    identification: cpf_pagador ? { type: 'CPF', number: cpf_pagador.replace(/\D/g, '') } : undefined,
                },
                notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/pagamentos/webhook`,
            },
        })

        const pixData = mpResponse.point_of_interaction?.transaction_data

        // Salva pagamento no Supabase
        const dataVencimento = new Date()
        dataVencimento.setDate(dataVencimento.getDate() + 3) // vence em 3 dias

        const { data: pagamento, error } = await supabase
            .from('pagamentos')
            .insert({
                aluno_id,
                contrato_id: contrato_id || null,
                valor: parseFloat(valor),
                status: 'pendente',
                metodo: 'pix',
                data_vencimento: dataVencimento.toISOString().split('T')[0],
                mercadopago_id: mpResponse.id?.toString(),
                mercadopago_status: mpResponse.status,
                qr_code: pixData?.qr_code_base64 || null,
                pix_copia_cola: pixData?.qr_code || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({
            pagamento_id: pagamento.id,
            qr_code_base64: pixData?.qr_code_base64,
            pix_copia_cola: pixData?.qr_code,
            mercadopago_id: mpResponse.id,
            status: mpResponse.status,
        })
    } catch (err) {
        console.error('❌ [API PIX] Erro ao gerar cobrança MP:', err)
        // Se for erro do MP, detalha no log
        if (err instanceof Error && err.cause) console.error('🔍 Causa detalhada:', err.cause)

        return NextResponse.json({
            error: 'Erro ao gerar cobrança.',
            details: getErrorMessage(err)
        }, { status: 500 })
    }
}
