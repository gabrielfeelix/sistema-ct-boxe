'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Plus, Trash2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useEventos, type Evento } from '@/hooks/useEventos'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ICONE_LABELS: Record<string, string> = {
    churras: 'Churrasco',
    boxe: 'Boxe',
    social: 'Social',
    treino: 'Treino',
}

const ICONE_COLORS: Record<string, string> = {
    churras: 'bg-orange-100 text-orange-700 border-orange-200',
    boxe: 'bg-red-100 text-red-700 border-red-200',
    social: 'bg-blue-100 text-blue-700 border-blue-200',
    treino: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default function EventosPage() {
    const { listarEventos, deletarEvento } = useEventos()
    const [eventos, setEventos] = useState<Evento[]>([])
    const [loading, setLoading] = useState(true)
    const [deletando, setDeletando] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        const { data, error } = await listarEventos()
        if (error) {
            toast.error(error)
        } else {
            setEventos(data)
        }
        setLoading(false)
    }, [listarEventos])

    useEffect(() => {
        loadData()
    }, [loadData])

    async function handleDeletar(id: string, titulo: string) {
        if (!confirm(`Tem certeza que deseja deletar o evento "${titulo}"?`)) return

        setDeletando(id)
        const { error } = await deletarEvento(id)
        setDeletando(null)

        if (error) {
            toast.error(error)
            return
        }

        toast.success('Evento deletado com sucesso.')
        await loadData()
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-8 animate-in slide-in-from-bottom-2 duration-300">
            <header className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-[#CC0000]/10 p-2.5">
                        <Calendar className="h-7 w-7 text-[#CC0000]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Eventos</h2>
                        <p className="mt-1 text-sm font-bold text-gray-500">
                            Gerencie eventos que aparecem no feed do app
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/eventos/novo"
                        className="active:scale-95 inline-flex h-11 items-center rounded-xl bg-[#CC0000] px-5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-[#AA0000]"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Novo Evento
                    </Link>
                </div>
            </header>

            {loading ? (
                <LoadingSpinner label="Carregando eventos..." />
            ) : eventos.length === 0 ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                    <h3 className="mb-2 text-lg font-bold text-gray-900">Nenhum evento cadastrado</h3>
                    <p className="mb-6 text-sm font-medium text-gray-500">
                        Crie seu primeiro evento para aparecer no feed dos alunos.
                    </p>
                    <Link
                        href="/eventos/novo"
                        className="inline-flex h-11 items-center rounded-xl bg-[#CC0000] px-5 text-sm font-bold text-white transition-colors hover:bg-[#AA0000]"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Criar Evento
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {eventos.map((evento) => {
                        const dataFormatada = format(parseISO(evento.data_evento), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                        })
                        const corCategoria = ICONE_COLORS[evento.icone] || ICONE_COLORS.social

                        return (
                            <div
                                key={evento.id}
                                className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md"
                            >
                                {evento.destaque && (
                                    <div className="absolute right-4 top-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                                            <Star className="h-4 w-4 fill-current" />
                                        </div>
                                    </div>
                                )}

                                <div className="mb-4">
                                    <div className={`mb-3 inline-flex rounded-lg border px-3 py-1 text-xs font-bold uppercase tracking-widest ${corCategoria}`}>
                                        {ICONE_LABELS[evento.icone] || evento.icone}
                                    </div>
                                    <h3 className="mb-2 text-xl font-bold tracking-tight text-gray-900">
                                        {evento.titulo}
                                    </h3>
                                    <p className="line-clamp-2 text-sm font-medium text-gray-600">{evento.descricao}</p>
                                </div>

                                <div className="mb-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        {dataFormatada}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <MapPin className="h-4 w-4 text-gray-400" />
                                        {evento.local}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                                    <div className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                        {evento.confirmados} confirmados
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletar(evento.id, evento.titulo)}
                                        disabled={deletando === evento.id}
                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        {deletando === evento.id ? 'Deletando...' : 'Deletar'}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
