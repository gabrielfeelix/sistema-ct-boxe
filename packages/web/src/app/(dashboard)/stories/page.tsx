'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    ArrowDown,
    ArrowUp,
    Edit3,
    FolderOpen,
    Image as ImageIcon,
    Library,
    Plus,
    PlaySquare,
    Trash2,
    Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

type TrilhaCategoria = {
    id: string
    nome: string
    ordem: number
    capa_url?: string | null
}

type TrilhaVideo = {
    id: string
    titulo: string
    descricao: string
    categoria_id: string
    video_url: string
    ordem: number
}

export default function TrilhasPage() {
    const supabase = useMemo(() => createClient(), [])
    const [categorias, setCategorias] = useState<TrilhaCategoria[]>([])
    const [videos, setVideos] = useState<TrilhaVideo[]>([])
    const [loading, setLoading] = useState(true)
    const [editingVideo, setEditingVideo] = useState<TrilhaVideo | null>(null)
    const [editingCategoria, setEditingCategoria] = useState<TrilhaCategoria | null>(null)
    const [saving, setSaving] = useState(false)
    const [uploadandoCapa, setUploadandoCapa] = useState(false)

    const fetchData = useCallback(async () => {
        const [categoriasRes, videosRes] = await Promise.all([
            supabase
                .from('trilhas_categorias')
                .select('*')
                .eq('ativo', true)
                .order('ordem', { ascending: true })
                .order('created_at', { ascending: true }),
            supabase
                .from('trilhas_videos')
                .select('*')
                .eq('ativo', true)
                .order('ordem', { ascending: true })
                .order('created_at', { ascending: false }),
        ])

        return {
            categorias: (categoriasRes.data as TrilhaCategoria[]) ?? [],
            videos: (videosRes.data as TrilhaVideo[]) ?? [],
        }
    }, [supabase])

    useEffect(() => {
        let cancelled = false

        queueMicrotask(() => {
            void (async () => {
                setLoading(true)
                const data = await fetchData()
                if (cancelled) return
                setCategorias(data.categorias)
                setVideos(data.videos)
                setLoading(false)
            })()
        })

        return () => {
            cancelled = true
        }
    }, [fetchData])

    const grupos = useMemo(
        () =>
            categorias.map((categoria) => ({
                ...categoria,
                videos: videos
                    .filter((video) => video.categoria_id === categoria.id)
                    .sort((a, b) => a.ordem - b.ordem),
            })),
        [categorias, videos]
    )

    async function swapCategoria(categoria: TrilhaCategoria, direction: 'up' | 'down') {
        const idx = categorias.findIndex((item) => item.id === categoria.id)
        if (direction === 'up' && idx === 0) return
        if (direction === 'down' && idx === categorias.length - 1) return
        const alvo = categorias[direction === 'up' ? idx - 1 : idx + 1]

        await supabase.from('trilhas_categorias').update({ ordem: alvo.ordem }).eq('id', categoria.id)
        await supabase.from('trilhas_categorias').update({ ordem: categoria.ordem }).eq('id', alvo.id)
        const data = await fetchData()
        setCategorias(data.categorias)
        setVideos(data.videos)
    }

    async function swapVideo(video: TrilhaVideo, direction: 'up' | 'down') {
        const itens = videos
            .filter((item) => item.categoria_id === video.categoria_id)
            .sort((a, b) => a.ordem - b.ordem)
        const idx = itens.findIndex((item) => item.id === video.id)

        if (direction === 'up' && idx === 0) return
        if (direction === 'down' && idx === itens.length - 1) return

        const alvo = itens[direction === 'up' ? idx - 1 : idx + 1]
        await supabase.from('trilhas_videos').update({ ordem: alvo.ordem }).eq('id', video.id)
        await supabase.from('trilhas_videos').update({ ordem: video.ordem }).eq('id', alvo.id)
        const data = await fetchData()
        setCategorias(data.categorias)
        setVideos(data.videos)
    }

    async function salvarVideo() {
        if (!editingVideo) return
        setSaving(true)

        const { error } = await supabase
            .from('trilhas_videos')
            .update({
                titulo: editingVideo.titulo,
                descricao: editingVideo.descricao,
                video_url: editingVideo.video_url,
            })
            .eq('id', editingVideo.id)

        setSaving(false)
        if (error) return toast.error('Erro ao salvar video.')

        setEditingVideo(null)
        toast.success('Video atualizado.')
        const data = await fetchData()
        setCategorias(data.categorias)
        setVideos(data.videos)
    }

    async function salvarCategoria() {
        if (!editingCategoria) return
        setSaving(true)

        const { error } = await supabase
            .from('trilhas_categorias')
            .update({
                nome: editingCategoria.nome.trim(),
                ordem: Number(editingCategoria.ordem) || 0,
                capa_url: editingCategoria.capa_url || null,
            })
            .eq('id', editingCategoria.id)

        setSaving(false)
        if (error) return toast.error('Erro ao salvar pasta.')

        setEditingCategoria(null)
        toast.success('Pasta atualizada.')
        const data = await fetchData()
        setCategorias(data.categorias)
        setVideos(data.videos)
    }

    async function arquivarCategoria(categoriaId: string) {
        const { error } = await supabase
            .from('trilhas_categorias')
            .update({ ativo: false })
            .eq('id', categoriaId)

        if (error) return toast.error('Erro ao arquivar pasta.')
        toast.success('Pasta arquivada.')
        const data = await fetchData()
        setCategorias(data.categorias)
        setVideos(data.videos)
    }

    async function arquivarVideo(videoId: string) {
        const { error } = await supabase
            .from('trilhas_videos')
            .update({ ativo: false })
            .eq('id', videoId)

        if (error) return toast.error('Erro ao arquivar video.')
        toast.success('Video arquivado.')
        const data = await fetchData()
        setCategorias(data.categorias)
        setVideos(data.videos)
    }

    async function uploadCapa(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !editingCategoria) return

        setUploadandoCapa(true)
        const ext = file.name.split('.').pop()
        const path = `trilhas/capas/${Date.now()}-${editingCategoria.id}.${ext}`

        const { error } = await supabase.storage
            .from('ct-boxe-media')
            .upload(path, file, { cacheControl: '3600', upsert: true })

        if (error) {
            setUploadandoCapa(false)
            return toast.error('Erro ao enviar capa.')
        }

        const { data } = supabase.storage.from('ct-boxe-media').getPublicUrl(path)
        setEditingCategoria({ ...editingCategoria, capa_url: data.publicUrl })
        setUploadandoCapa(false)
    }

    if (loading) {
        return <LoadingSpinner label="Buscando trilhas..." />
    }

    return (
        <div className="mx-auto max-w-[1440px] space-y-8 pb-8">
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                        <Library className="h-6 w-6 text-[#CC0000]" />
                        Biblioteca de videos
                    </h2>
                    <p className="mt-1 text-sm font-bold uppercase tracking-widest text-gray-400">
                        {videos.length} videos ativos
                    </p>
                </div>
                <Link
                    href="/stories/novo"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-black"
                >
                    <Plus className="h-4 w-4" />
                    Novo video
                </Link>
            </div>

            {grupos.length === 0 ? (
                <EmptyState
                    icon={Video}
                    title="Biblioteca vazia"
                    description="Nenhum video foi arquivado ainda."
                    action={{
                        label: 'Adicionar primeiro video',
                        onClick: () => (window.location.href = '/stories/novo'),
                    }}
                />
            ) : (
                <div className="space-y-6">
                    {grupos.map((categoria) => (
                        <section
                            key={categoria.id}
                            className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm"
                        >
                            <div className="flex items-center justify-between p-5">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 overflow-hidden rounded-2xl bg-gray-100">
                                        {categoria.capa_url ? (
                                            <>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={categoria.capa_url}
                                                    alt={categoria.nome}
                                                    className="h-full w-full object-cover"
                                                />
                                            </>
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                <FolderOpen className="h-6 w-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black tracking-tight text-gray-900">
                                            {categoria.nome}
                                        </h3>
                                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                            {categoria.videos.length} videos · ordem {categoria.ordem}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => swapCategoria(categoria, 'up')}
                                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => swapCategoria(categoria, 'down')}
                                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setEditingCategoria(categoria)}
                                        className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => arquivarCategoria(categoria.id)}
                                        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-gray-50 px-5 pb-6 pt-6">
                                {categoria.videos.length === 0 ? (
                                    <div className="rounded-3xl border-2 border-dashed border-gray-100 bg-gray-50/30 p-12 text-center text-xs font-bold uppercase tracking-widest text-gray-400">
                                        Pasta sem videos vinculados
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                                        {categoria.videos.map((video) => (
                                            <div
                                                key={video.id}
                                                className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                                            >
                                                <div className="relative aspect-video bg-black">
                                                    <video
                                                        src={video.video_url}
                                                        className="h-full w-full object-cover opacity-80"
                                                        muted
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    <a
                                                        href={video.video_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100"
                                                    >
                                                        <div className="rounded-full border border-white/30 bg-white/20 p-3 text-white backdrop-blur-md">
                                                            <PlaySquare className="h-6 w-6" />
                                                        </div>
                                                    </a>
                                                </div>

                                                <div className="flex flex-1 flex-col justify-between p-4">
                                                    <div>
                                                        <h4 className="line-clamp-1 text-sm font-black text-gray-900">
                                                            {video.titulo}
                                                        </h4>
                                                        <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-relaxed text-gray-500">
                                                            {video.descricao || 'Sem descricao.'}
                                                        </p>
                                                    </div>

                                                    <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => swapVideo(video, 'up')}
                                                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                                                            >
                                                                <ArrowUp className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => swapVideo(video, 'down')}
                                                                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                                                            >
                                                                <ArrowDown className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setEditingVideo(video)}
                                                                className="rounded p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                                                            >
                                                                <Edit3 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => arquivarVideo(video.id)}
                                                                className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {editingVideo ? (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl">
                        <h3 className="mb-6 text-xl font-black text-gray-900">Editar video da trilha</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={editingVideo.titulo}
                                onChange={(e) => setEditingVideo({ ...editingVideo, titulo: e.target.value })}
                                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-[#CC0000]"
                            />
                            <textarea
                                rows={3}
                                value={editingVideo.descricao}
                                onChange={(e) => setEditingVideo({ ...editingVideo, descricao: e.target.value })}
                                className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium outline-none focus:border-[#CC0000]"
                            />
                            <input
                                type="text"
                                value={editingVideo.video_url}
                                onChange={(e) => setEditingVideo({ ...editingVideo, video_url: e.target.value })}
                                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-medium outline-none focus:border-[#CC0000]"
                            />
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setEditingVideo(null)}
                                className="h-12 flex-1 rounded-2xl border border-gray-200 text-sm font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvarVideo}
                                disabled={saving}
                                className="h-12 flex-[2] rounded-2xl bg-gray-900 text-sm font-black uppercase tracking-widest text-white hover:bg-black"
                            >
                                {saving ? 'Salvando...' : 'Salvar video'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {editingCategoria ? (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-2xl">
                        <h3 className="mb-6 text-xl font-black text-gray-900">Editar pasta de stories</h3>
                        <div className="space-y-5">
                            <input
                                type="text"
                                value={editingCategoria.nome}
                                onChange={(e) => setEditingCategoria({ ...editingCategoria, nome: e.target.value })}
                                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-[#CC0000]"
                            />
                            <input
                                type="number"
                                value={editingCategoria.ordem}
                                onChange={(e) =>
                                    setEditingCategoria({
                                        ...editingCategoria,
                                        ordem: Number(e.target.value),
                                    })
                                }
                                className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-bold outline-none focus:border-[#CC0000]"
                            />

                            <div>
                                {editingCategoria.capa_url ? (
                                    <>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={editingCategoria.capa_url}
                                            alt={editingCategoria.nome}
                                            className="h-44 w-full rounded-2xl border border-gray-100 object-cover"
                                        />
                                    </>
                                ) : (
                                    <div className="flex h-44 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-400">
                                        <ImageIcon className="h-8 w-8" />
                                    </div>
                                )}
                                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center hover:border-[#CC0000] hover:bg-red-50/20">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                                        {uploadandoCapa ? 'Enviando capa...' : 'Trocar capa'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={uploadCapa}
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="mt-8 flex gap-3">
                            <button
                                onClick={() => setEditingCategoria(null)}
                                className="h-12 flex-1 rounded-2xl border border-gray-200 text-sm font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={salvarCategoria}
                                disabled={saving}
                                className="h-12 flex-[2] rounded-2xl bg-gray-900 text-sm font-black uppercase tracking-widest text-white hover:bg-black"
                            >
                                {saving ? 'Salvando...' : 'Salvar pasta'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
