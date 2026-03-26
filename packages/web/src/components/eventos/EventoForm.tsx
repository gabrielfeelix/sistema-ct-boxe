'use client'

import { useMemo, useState } from 'react'
import { ImagePlus, Upload, Wallet } from 'lucide-react'
import { eventoFormSchema, type EventoFormValues } from '@/lib/validations/evento'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface EventoFormProps {
    initialValues?: Partial<EventoFormValues>
    submitting?: boolean
    submitLabel?: string
    onSubmit: (values: EventoFormValues) => Promise<void>
    onCancel?: () => void
}

type Erros = Partial<Record<keyof EventoFormValues, string>>

const DEFAULT_EVENT_IMAGES: Record<string, string> = {
    churras: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&q=80',
    boxe: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1200&q=80',
    social: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&q=80',
    treino: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80',
}

const DEFAULT_VALUES: EventoFormValues = {
    titulo: '',
    descricao: '',
    data_evento: new Date().toISOString().slice(0, 10),
    local: 'CT Argel Riboli',
    icone: 'social',
    valor: null,
    imagem_url: '',
    destaque: false,
}

const ICONE_OPTIONS = [
    { value: 'churras', label: 'Churrasco / Comida' },
    { value: 'boxe', label: 'Boxe / Sparring' },
    { value: 'social', label: 'Social / Comunidade' },
    { value: 'treino', label: 'Treino especial' },
] as const

export function EventoForm({
    initialValues,
    submitting = false,
    submitLabel = 'Salvar evento',
    onSubmit,
    onCancel,
}: EventoFormProps) {
    const supabase = createClient()
    const [values, setValues] = useState<EventoFormValues>({ ...DEFAULT_VALUES, ...initialValues })
    const [errors, setErrors] = useState<Erros>({})
    const [uploadingImage, setUploadingImage] = useState(false)

    const previewImage = useMemo(
        () => values.imagem_url || DEFAULT_EVENT_IMAGES[values.icone] || DEFAULT_EVENT_IMAGES.social,
        [values.icone, values.imagem_url]
    )

    async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem válida para o evento.')
            return
        }

        setUploadingImage(true)
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `eventos/${Date.now()}.${ext}`

        const { error } = await supabase.storage.from('ct-boxe-media').upload(path, file, {
            cacheControl: '3600',
            upsert: true,
        })

        setUploadingImage(false)

        if (error) {
            toast.error(`Erro ao enviar imagem: ${error.message}`)
            return
        }

        const { data } = supabase.storage.from('ct-boxe-media').getPublicUrl(path)
        setValues((prev) => ({ ...prev, imagem_url: data.publicUrl }))
        toast.success('Imagem do evento enviada.')
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const payload: EventoFormValues = {
            ...values,
            imagem_url: values.imagem_url || DEFAULT_EVENT_IMAGES[values.icone] || DEFAULT_EVENT_IMAGES.social,
            valor: values.valor === null || Number.isNaN(Number(values.valor)) ? null : Number(values.valor),
        }

        const parsed = eventoFormSchema.safeParse(payload)
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
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5">
                        <h3 className="text-lg font-bold text-gray-900">Dados do evento</h3>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Cadastre o evento que vai aparecer para os alunos na comunidade.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Título do evento</label>
                            <input
                                type="text"
                                value={values.titulo}
                                onChange={(event) => setValues((prev) => ({ ...prev, titulo: event.target.value }))}
                                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                                placeholder="Ex.: Churrasco de confraternização"
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
                            {errors.data_evento && <p className="mt-1 text-xs font-semibold text-red-600">{errors.data_evento}</p>}
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
                                        imagem_url: prev.imagem_url || '',
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
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Valor opcional</label>
                            <div className="relative">
                                <Wallet className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={values.valor ?? ''}
                                    onChange={(event) =>
                                        setValues((prev) => ({
                                            ...prev,
                                            valor: event.target.value ? Number(event.target.value) : null,
                                        }))
                                    }
                                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                                    placeholder="0,00"
                                />
                            </div>
                            {errors.valor && <p className="mt-1 text-xs font-semibold text-red-600">{errors.valor}</p>}
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
                                Eventos em destaque aparecem primeiro para os alunos.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Descrição</label>
                            <textarea
                                value={values.descricao}
                                onChange={(event) => setValues((prev) => ({ ...prev, descricao: event.target.value }))}
                                rows={5}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                                placeholder="Descreva os detalhes do evento..."
                            />
                            {errors.descricao && <p className="mt-1 text-xs font-semibold text-red-600">{errors.descricao}</p>}
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-5">
                        <h3 className="text-lg font-bold text-gray-900">Imagem do evento</h3>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Se não enviar uma imagem, o sistema usa a capa padrão da categoria.
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gray-50">
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImage} alt="Preview do evento" className="h-72 w-full object-cover" />
                        </>
                    </div>

                    <div className="mt-4 space-y-3">
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-bold text-gray-700 transition-colors hover:border-[#CC0000] hover:bg-red-50/40">
                            <Upload className="h-4 w-4" />
                            {uploadingImage ? 'Enviando imagem...' : 'Enviar imagem personalizada'}
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                        </label>

                        <button
                            type="button"
                            onClick={() => setValues((prev) => ({ ...prev, imagem_url: '' }))}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                        >
                            <ImagePlus className="h-4 w-4" />
                            Usar imagem padrão da categoria
                        </button>
                    </div>

                    <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">Resumo</p>
                        <p className="mt-2 text-lg font-black text-gray-900">{values.titulo || 'Novo evento'}</p>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            {ICONE_OPTIONS.find((item) => item.value === values.icone)?.label}
                            {values.valor ? ` · R$ ${values.valor.toFixed(2)}` : ' · Gratuito'}
                        </p>
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
                    disabled={submitting || uploadingImage}
                    className="inline-flex h-11 items-center justify-center rounded-lg bg-[#CC0000] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#AA0000] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {submitting ? 'Salvando...' : submitLabel}
                </button>
            </div>
        </form>
    )
}
