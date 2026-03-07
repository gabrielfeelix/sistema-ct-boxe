'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { EventoForm } from '@/components/eventos/EventoForm'
import { useEventos } from '@/hooks/useEventos'
import type { EventoFormValues } from '@/lib/validations/evento'
import { createClient } from '@/lib/supabase/client'

export default function NovoEventoPage() {
    const router = useRouter()
    const supabase = createClient()
    const { criarEvento } = useEventos()
    const [saving, setSaving] = useState(false)

    async function handleSubmit(values: EventoFormValues) {
        setSaving(true)
        const { data, error } = await criarEvento(values)
        setSaving(false)

        if (error) {
            toast.error(error)
            return
        }

        const dateLabel = new Date(values.data_evento).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        })

        const { error: notifyError } = await supabase.from('notificacoes').insert({
            titulo: 'Novo evento disponivel',
            subtitulo: `${values.titulo} foi publicado para os alunos`,
            mensagem: `${dateLabel}${values.local ? ` • ${values.local}` : ''}`,
            tipo: 'evento',
            acao: 'evento',
            link: '/eventos',
            audiencia: 'aluno',
            icone: 'party-popper',
            lida: false,
        })

        if (notifyError) {
            toast.warning('Evento criado, mas a notificacao para os alunos nao foi enviada.')
        }

        toast.success('Evento criado com sucesso.')
        router.push('/eventos')
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 pb-8">
            <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-gray-900"
            >
                <span className="rounded-md border border-gray-200 bg-white p-1.5">
                    <ArrowLeft className="h-4 w-4" />
                </span>
                Voltar para eventos
            </button>

            <header className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Novo evento</h2>
                <p className="text-sm font-medium text-gray-500">
                    Cadastre um evento para aparecer no feed dos alunos.
                </p>
            </header>

            <EventoForm
                submitting={saving}
                submitLabel="Criar evento"
                onSubmit={handleSubmit}
                onCancel={() => router.push('/eventos')}
            />
        </div>
    )
}
