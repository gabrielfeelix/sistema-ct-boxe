'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { EventoForm } from '@/components/eventos/EventoForm'
import { useEventos } from '@/hooks/useEventos'
import type { EventoFormValues } from '@/lib/validations/evento'

export default function NovoEventoPage() {
    const router = useRouter()
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
