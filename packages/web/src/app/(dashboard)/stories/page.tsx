'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Video, FolderOpen, PlaySquare, Trash2, Library, Plus, ChevronDown, ChevronUp, Edit3, ArrowUp, ArrowDown, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
    created_at: string
}

export default function TrilhasPage() {
    const [categorias, setCategorias] = useState<TrilhaCategoria[]>([])
    const [videos, setVideos] = useState<TrilhaVideo[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const [excluindo, setExcluindo] = useState<string | null>(null)
    const [excluindoCat, setExcluindoCat] = useState<string | null>(null)

    // Accordion State
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    // Edit State
    const [editingVideo, setEditingVideo] = useState<TrilhaVideo | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)

    // Story Player State
    const [activeStory, setActiveStory] = useState<{ vids: TrilhaVideo[], index: number } | null>(null)

    async function fetchData() {
        setLoading(true)
        const [resCat, resVid] = await Promise.all([
            supabase.from('trilhas_categorias').select('*').eq('ativo', true).order('ordem', { ascending: true }).order('created_at', { ascending: true }),
            supabase.from('trilhas_videos').select('*').eq('ativo', true).order('ordem', { ascending: true }).order('created_at', { ascending: false })
        ])

        if (!resCat.error) setCategorias(resCat.data as TrilhaCategoria[])
        if (!resVid.error) setVideos(resVid.data as TrilhaVideo[])
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const toggleCollapse = (id: string) => {
        const next = new Set(collapsed)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setCollapsed(next)
    }

    async function handleReorder(video: TrilhaVideo, direction: 'up' | 'down') {
        const catVideos = videos.filter(v => v.categoria_id === video.categoria_id).sort((a, b) => a.ordem - b.ordem)
        const idx = catVideos.findIndex(v => v.id === video.id)

        if (direction === 'up' && idx === 0) return
        if (direction === 'down' && idx === catVideos.length - 1) return

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1
        const targetVideo = catVideos[targetIdx]

        // Swap ordens
        const tempOrder = video.ordem
        const { error: err1 } = await supabase.from('trilhas_videos').update({ ordem: targetVideo.ordem }).eq('id', video.id)
        const { error: err2 } = await supabase.from('trilhas_videos').update({ ordem: tempOrder }).eq('id', targetVideo.id)

        if (err1 || err2) toast.error('Erro ao reordenar.')
        else fetchData()
    }

    async function salvarEdicao() {
        if (!editingVideo) return
        setSavingEdit(true)
        const { error } = await supabase.from('trilhas_videos').update({
            titulo: editingVideo.titulo,
            descricao: editingVideo.descricao,
            video_url: editingVideo.video_url
        }).eq('id', editingVideo.id)

        if (error) toast.error('Erro ao salvar alterações.')
        else {
            toast.success('Vídeo atualizado!')
            setEditingVideo(null)
            fetchData()
        }
        setSavingEdit(false)
    }

    async function excluirCategoria(id: string) {
        if (!confirm('Excluir permanentemente MÓDULO e TODOS os vídeos contidos nele?')) return
        setExcluindoCat(id)
        await supabase.from('trilhas_categorias').update({ ativo: false }).eq('id', id)
        await supabase.from('trilhas_videos').update({ ativo: false }).eq('categoria_id', id)
        toast.success('Módulo arquivado.')
        fetchData()
        setExcluindoCat(null)
    }

    async function excluirVideo(id: string) {
        if (!confirm('Excluir este vídeo?')) return
        setExcluindo(id)
        const { error } = await supabase.from('trilhas_videos').update({ ativo: false }).eq('id', id)
        if (error) toast.error('Falha ao excluir.')
        else {
            toast.success('Vídeo removido.')
            fetchData()
        }
        setExcluindo(null)
    }

    const listCat = categorias.map(cat => ({
        ...cat,
        vids: videos.filter(v => v.categoria_id === cat.id).sort((a, b) => a.ordem - b.ordem)
    }))

    return (
        <div className="space-y-8 max-w-[1440px] mx-auto pb-8 animate-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <Library className="w-6 h-6 text-[#CC0000]" /> Biblioteca de Vídeos
                    </h2>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">
                        {loading ? 'Sincronizando...' : `${videos.length} vídeos compartilhados`}
                    </p>
                </div>
                <Link
                    href="/stories/novo"
                    className="bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                    <Plus className="h-4 w-4" /> Novo Vídeo
                </Link>
            </div>

            {loading ? <LoadingSpinner label="Buscando currículo..." /> :
                categorias.length === 0 ? (
                    <EmptyState
                        icon={Video}
                        title="Acervo Vazio"
                        description="Nenhum vídeo submetido ainda."
                        action={{ label: 'Adicionar Primeiro', onClick: () => window.location.href = '/stories/novo' }}
                    />
                ) : (
                    <div className="space-y-6">
                        {listCat.map((cat) => (
                            <section key={cat.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                                    onClick={() => toggleCollapse(cat.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 overflow-hidden rounded-2xl bg-gray-100 text-gray-500">
                                            {cat.capa_url ? (
                                                <img src={cat.capa_url} alt={cat.nome} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center">
                                                    <FolderOpen className="w-6 h-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 tracking-tight">{cat.nome}</h3>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">{cat.vids.length} aulas • Ordem {cat.ordem}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setActiveStory({ vids: cat.vids, index: 0 })}
                                            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-red-50 text-[#CC0000] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 transition-all"
                                        >
                                            <PlaySquare className="w-4 h-4" /> Preview Stories
                                        </button>
                                        <button
                                            onClick={() => excluirCategoria(cat.id)}
                                            disabled={excluindoCat === cat.id}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                        <div className="p-2 text-gray-400">
                                            {collapsed.has(cat.id) ? <ChevronDown /> : <ChevronUp />}
                                        </div>
                                    </div>
                                </div>

                                {!collapsed.has(cat.id) && (
                                    <div className="px-5 pb-6 border-t border-gray-50 pt-6">
                                        {cat.vids.length === 0 ? (
                                            <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Módulo sem vídeos vinculados.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {cat.vids.map((video, idx) => (
                                                    <div key={video.id} className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                                        <div className="aspect-video bg-black relative">
                                                            <video src={video.video_url} className="w-full h-full object-cover opacity-80" muted />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                            <button
                                                                onClick={() => setActiveStory({ vids: cat.vids, index: idx })}
                                                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white">
                                                                    <PlaySquare className="w-6 h-6" />
                                                                </div>
                                                            </button>
                                                        </div>
                                                        <div className="p-4 flex-1 flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="text-sm font-black text-gray-900 group-hover:text-[#CC0000] transition-colors line-clamp-1">{video.titulo}</h4>
                                                                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2 font-medium leading-relaxed">{video.descricao || 'Sem descrição.'}</p>
                                                            </div>
                                                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => handleReorder(video, 'up')} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900"><ArrowUp className="w-3.5 h-3.5" /></button>
                                                                    <button onClick={() => handleReorder(video, 'down')} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900"><ArrowDown className="w-3.5 h-3.5" /></button>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button onClick={() => setEditingVideo(video)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                                                    <button onClick={() => excluirVideo(video.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        ))}
                    </div>
                )
            }

            {/* Modal de Edição */}
            {editingVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <h3 className="text-xl font-black text-gray-900 mb-6">Editar Publicação</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Título da Aula</label>
                                    <input
                                        type="text"
                                        value={editingVideo.titulo}
                                        onChange={e => setEditingVideo({ ...editingVideo, titulo: e.target.value })}
                                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:border-[#CC0000] transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Descrição Explicativa</label>
                                    <textarea
                                        rows={3}
                                        value={editingVideo.descricao}
                                        onChange={e => setEditingVideo({ ...editingVideo, descricao: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-[#CC0000] transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Link do Vídeo (Embed/Direct)</label>
                                    <input
                                        type="text"
                                        value={editingVideo.video_url}
                                        onChange={e => setEditingVideo({ ...editingVideo, video_url: e.target.value })}
                                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-medium outline-none focus:border-[#CC0000] transition-all text-gray-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setEditingVideo(null)}
                                    className="flex-1 h-12 rounded-2xl border border-gray-200 text-sm font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={salvarEdicao}
                                    disabled={savingEdit}
                                    className="flex-[2] h-12 rounded-2xl bg-gray-900 text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                                >
                                    {savingEdit ? 'Salvando...' : 'Salvar Matriz'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Story Player Engine */}
            {activeStory && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-0 sm:p-4">
                    <div className="relative w-full h-full sm:max-w-[450px] sm:h-[800px] bg-gray-900 sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col">
                        {/* Progress Bars */}
                        <div className="absolute top-4 left-4 right-4 z-50 flex gap-1.5 p-1">
                            {activeStory.vids.map((_, i) => (
                                <div key={i} className="h-1 flex-1 bg-white/20 overflow-hidden rounded-full">
                                    <div
                                        className={`h-full bg-white transition-all duration-300 ${i < activeStory.index ? 'w-full' : i === activeStory.index ? 'w-0 group-active:w-full' : 'w-0'}`}
                                        style={{ width: i < activeStory.index ? '100%' : i === activeStory.index ? '0%' : '0' }}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Top Info */}
                        <div className="absolute top-8 left-6 right-6 z-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full border-2 border-red-500 p-0.5">
                                    <div className="h-full w-full bg-[#CC0000] rounded-full flex items-center justify-center text-white text-[10px] font-black">CT</div>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white">{activeStory.vids[activeStory.index].titulo}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Story {activeStory.index + 1} de {activeStory.vids.length}</p>
                                </div>
                            </div>
                            <button onClick={() => setActiveStory(null)} className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Video Content */}
                        <div className="flex-1 relative flex items-center group">
                            <video
                                src={activeStory.vids[activeStory.index].video_url}
                                className="w-full h-full object-cover"
                                autoPlay
                                onEnded={() => {
                                    if (activeStory.index < activeStory.vids.length - 1) setActiveStory({ ...activeStory, index: activeStory.index + 1 })
                                    else setActiveStory(null)
                                }}
                            />

                            {/* Navigation Areas */}
                            <div className="absolute inset-y-0 left-0 w-1/3 cursor-pointer" onClick={() => activeStory.index > 0 && setActiveStory({ ...activeStory, index: activeStory.index - 1 })} />
                            <div className="absolute inset-y-0 right-0 w-1/3 cursor-pointer" onClick={() => {
                                if (activeStory.index < activeStory.vids.length - 1) setActiveStory({ ...activeStory, index: activeStory.index + 1 })
                                else setActiveStory(null)
                            }} />

                            {/* Center Desc (Overlay) */}
                            <div className="absolute bottom-12 left-6 right-6 p-6 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10">
                                <p className="text-sm text-white font-medium leading-relaxed">{activeStory.vids[activeStory.index].descricao}</p>
                            </div>
                        </div>

                        {/* Desktop Side Controls */}
                        <button
                            onClick={() => activeStory.index > 0 && setActiveStory({ ...activeStory, index: activeStory.index - 1 })}
                            className="hidden lg:flex absolute top-1/2 -left-20 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all disabled:opacity-30"
                            disabled={activeStory.index === 0}
                        >
                            <ChevronLeft />
                        </button>
                        <button
                            onClick={() => activeStory.index < activeStory.vids.length - 1 && setActiveStory({ ...activeStory, index: activeStory.index + 1 })}
                            className="hidden lg:flex absolute top-1/2 -right-20 -translate-y-1/2 bg-white/10 hover:bg-white/20 p-4 rounded-full text-white transition-all disabled:opacity-30"
                            disabled={activeStory.index === activeStory.vids.length - 1}
                        >
                            <ChevronRight />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
