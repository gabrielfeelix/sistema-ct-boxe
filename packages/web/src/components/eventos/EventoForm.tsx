'use client'

import { useState } from 'react'
import { eventoFormSchema, type EventoFormValues } from '@/lib/validations/evento'

interface EventoFormProps {
    initialValues?: Partial<EventoFormValues>
    submitting?: boolean
    submitLabel?: string
    onSubmit: (values: EventoFormValues) => Promise<void>
    onCancel?: () => void
}

type Erros = Partial<Record<keyof EventoFormValues, string>>

const DEFAULT_VALUES: EventoFormValues = {
    titulo: '',
    descricao: '',
    data_evento: new Date().toISOString().slice(0, 10),
    local: 'CT Argel Riboli',
    icone: 'social',
    destaque: false,
}

const ICONE_OPTIONS = [
    { value: 'churras', label: 'Churrasco' },
    { value: 'boxe', label: 'Boxe' },
    { value: 'social', label: 'Social' },
    { value: 'treino', label: 'Treino' },
] as const

export function EventoForm({
    initialValues,
    submitting = false,
    submitLabel = 'Salvar evento',
    onSubmit,
    onCancel,
}: EventoFormProps) {
    const [values, setValues] = useState<EventoFormValues>({ ...DEFAULT_VALUES, ...initialValues })
    const [errors, setErrors] = useState<Erros>({})

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const parsed = eventoFormSchema.safeParse(values)
        if (!parsed.success) {
            const formErrors: Erros = {}
            for (const issue of parsed.error.issues) {
                const field = issue.path[0] as keyof EventoFormValues
                if (!formErrors[field]) {
                    formErrors[field] = issue.message
                }
            }
            setErrors(formErrors)
            return
        }

        setErrors({})
        await onSubmit(parsed.data)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5">
                    <h3 className="text-lg font-bold text-gray-900">Dados do evento</h3>
                    <p className="mt-1 text-sm font-medium text-gray-500">
                        Defina titulo, data, local e categoria para criar o evento.
                    </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Titulo do evento</label>
                        <input
                            type="text"
                            value={values.titulo}
                            onChange={(event) => setValues((prev) => ({ ...prev, titulo: event.target.value }))}
                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                            placeholder="Ex.: Churrasco de confraternizacao"
                        />
                        {errors.titulo && <p className="mt-1 text-xs font-semibold text-red-600">{errors.titulo}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Data do evento</label>
                        <input
                            type="date"
                            value={values.data_evento}
                            onChange={(event) => setValues((prev) => ({ ...prev, data_evento: event.target.value }))}
                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                        />
                        {errors.data_evento && (
                            <p className="mt-1 text-xs font-semibold text-red-600">{errors.data_evento}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Local</label>
                        <input
                            type="text"
                            value={values.local}
                            onChange={(event) => setValues((prev) => ({ ...prev, local: event.target.value }))}
                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                            placeholder="Ex.: CT Argel Riboli"
                        />
                        {errors.local && <p className="mt-1 text-xs font-semibold text-red-600">{errors.local}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Categoria</label>
                        <select
                            value={values.icone}
                            onChange={(event) =>
                                setValues((prev) => ({
                                    ...prev,
                                    icone: event.target.value as EventoFormValues['icone'],
                                }))
                            }
                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 cursor-pointer"
                        >
                            {ICONE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {errors.icone && <p className="mt-1 text-xs font-semibold text-red-600">{errors.icone}</p>}
                    </div>

                    <div>
                        <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <input
                                type="checkbox"
                                checked={values.destaque}
                                onChange={(event) => setValues((prev) => ({ ...prev, destaque: event.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/20 cursor-pointer"
                            />
                            Destacar evento
                        </label>
                        <p className="mt-1 text-xs font-medium text-gray-500">
                            Eventos em destaque aparecem no topo do feed.
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Descricao</label>
                        <textarea
                            value={values.descricao}
                            onChange={(event) => setValues((prev) => ({ ...prev, descricao: event.target.value }))}
                            rows={4}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                            placeholder="Descreva os detalhes do evento..."
                        />
                        {errors.descricao && (
                            <p className="mt-1 text-xs font-semibold text-red-600">{errors.descricao}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#CC0000] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#AA0000] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? 'Salvando...' : submitLabel}
                </button>
            </div>
        </form>
    )
}
