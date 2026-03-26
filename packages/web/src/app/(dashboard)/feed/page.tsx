'use client'

import { useEffect, useMemo, useState } from 'react'
import { PenSquare, Heart, MessageCircle, Trash2, LayoutTemplate, Search, Edit3, X as XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { FeedComposer } from '@/components/feed/FeedComposer'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useFeed } from '@/hooks/useFeed'
import { useProfessoresSelect } from '@/hooks/useProfessores'
import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/types'

function tempoRelativo(data: string): string {
    const diff = Date.now() - new Date(data).getTime()
    const min = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)

    if (min < 60) return `${min}min atrás`
    if (h < 24) return `${h} h atrás`
    return `${d}d atrás`
}

type EditablePost = Pick<Post, 'id' | 'conteudo' | 'imagem_url'>

type PostComentario = {
    id: string
    autor_nome: string
    texto: string
    created_at: string
}

export default function FeedPage() {
    const { posts, loading, refetch } = useFeed()
    const supabase = useMemo(() => createClient(), [])
    const [excluindo, setExcluindo] = useState<string | null>(null)
    const [postParaExcluir, setPostParaExcluir] = useState<{ id: string; conteudo: string } | null>(null)
    const [busca, setBusca] = useState('')
    const [filtroProfessor, setFiltroProfessor] = useState('todos')
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [editingPost, setEditingPost] = useState<EditablePost | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [comentarios, setComentarios] = useState<Record<string, PostComentario[]>>({})
    const [comentandoEm, setComentandoEm] = useState<string | null>(null)
    const [novoComentario, setNovoComentario] = useState('')
    const [enviandoComentario, setEnviandoComentario] = useState(false)
    const [carregandoComentarios, setCarregandoComentarios] = useState<Record<string, boolean>>({})

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    const profAtual = professores.find((p) => p.email?.toLowerCase() === userEmail?.toLowerCase())
        ?? professores.find((p) => p.nome?.toLowerCase().includes('argel'))
        ?? (professores.length > 0 ? professores[0] : null)

    async function handleExcluirPost() {
        if (!postParaExcluir) return

        setExcluindo(postParaExcluir.id)
        const { error } = await supabase.from('posts').delete().eq('id', postParaExcluir.id)

        if (error) {
            toast.error('Falha de sincronia ao excluir.')
        } else {
            toast.success('Publicação excluída.')
            refetch()
        }

        setExcluindo(null)
        setPostParaExcluir(null)
    }

    async function handleSalvarEdicao() {
        if (!editingPost) return

        setSavingEdit(true)
        const { error } = await supabase
            .from('posts')
            .update({
                conteudo: editingPost.conteudo,
                imagem_url: editingPost.imagem_url,
            })
            .eq('id', editingPost.id)

        if (error) {
            toast.error('Erro ao salvar.')
        } else {
            toast.success('Post atualizado!')
            setEditingPost(null)
            refetch()
        }

        setSavingEdit(false)
    }

    async function togglePublicado(id: string, publicadoAtual: boolean) {
        const { error } = await supabase.from('posts').update({ publicado: !publicadoAtual }).eq('id', id)

        if (error) {
            toast.error('Erro de I/O na Engine Supabase.')
        } else {
            toast.success(publicadoAtual ? 'Privado' : 'Visível')
            refetch()
        }
    }

    const postsFiltrados = posts.filter((post) => {
        const matchesBusca =
            post.conteudo.toLowerCase().includes(busca.toLowerCase()) ||
            post.autor.toLowerCase().includes(busca.toLowerCase())
        const matchesProfessor = filtroProfessor === 'todos' || post.autor === filtroProfessor
        return matchesBusca && matchesProfessor
    })

    async function carregarComentarios(postId: string) {
        if (comentandoEm === postId) {
            setComentandoEm(null)
            return
        }

        setComentandoEm(postId)
        if (comentarios[postId]) return

        setCarregandoComentarios((prev) => ({ ...prev, [postId]: true }))

        const { data, error } = await supabase
            .from('post_comentarios')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true })

        if (error) {
            toast.error('Erro ao carregar interações.')
        } else {
            setComentarios((prev) => ({ ...prev, [postId]: (data as PostComentario[]) || [] }))
        }

        setCarregandoComentarios((prev) => ({ ...prev, [postId]: false }))
    }

    async function handleEnviarComentario(postId: string) {
        if (!novoComentario.trim()) return

        setEnviandoComentario(true)
        const { data: { user } } = await supabase.auth.getUser()
        const { data, error } = await supabase
            .from('post_comentarios')
            .insert({
                post_id: postId,
                aluno_id: user?.id,
                autor_nome: profAtual?.nome || 'Admin',
                texto: novoComentario.trim(),
            })
            .select()
            .single()

        if (error) {
            toast.error('Não foi possível enviar.')
        } else {
            setComentarios((prev) => ({
                ...prev,
                [postId]: [...(prev[postId] || []), data as PostComentario],
            }))
            setNovoComentario('')
            toast.success('Enviado!')
            refetch()
        }

        setEnviandoComentario(false)
    }

    function isVideo(url: string) {
        return Boolean(
            url.match(/\.(mp4|webm|ogg|mov)$|^.*youtube\.com.*|^.*vimeo\.com.*/i) ||
            (url.includes('/ct-boxe-media/feed/') && url.endsWith('.mp4'))
        )
    }

    return (
        <div className="mx-auto max-w-3xl animate-in slide-in-from-bottom-2 space-y-6 pb-12 duration-500">
            <div className="flex flex-col gap-6 border-b border-gray-100 pb-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                            <LayoutTemplate className="h-6 w-6 text-[#CC0000]" /> Feed Social do CT
                        </h2>
                        <p className="mt-1 text-sm font-bold uppercase tracking-widest text-gray-400">
                            {loading ? 'Sincronizando timeline...' : `${posts.length} publicações disponíveis`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar no feed..."
                            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 text-sm font-medium text-gray-900 shadow-sm outline-none transition-all focus:border-[#CC0000]"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-11 cursor-pointer rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm outline-none focus:border-[#CC0000]"
                        value={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                    >
                        <option value="todos">Filtro: Autores</option>
                        {professores.map((p) => (
                            <option key={p.id} value={p.nome}>{p.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            <FeedComposer professorAtual={profAtual} onSuccess={refetch} />

            {loading ? (
                <LoadingSpinner label="Buscando comunicados..." />
            ) : postsFiltrados.length === 0 ? (
                <EmptyState
                    icon={PenSquare}
                    title="Nenhum Post"
                    description="Navegue ou altere o filtro para ver outras postagens."
                    action={{ label: 'Ver tudo', onClick: () => { setBusca(''); setFiltroProfessor('todos') } }}
                />
            ) : (
                <div className="space-y-6">
                    {postsFiltrados.map((post) => (
                        <div
                            key={post.id}
                            className={`relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm transition-all duration-300 ${!post.publicado ? 'bg-gray-50 opacity-70' : 'hover:shadow-md'}`}
                        >
                            <div className="p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    {(() => {
                                        const profInfo = professores.find((p) => p.nome === post.autor)
                                        const cor = profInfo?.cor_perfil ?? '#CC0000'
                                        const iniciais = (post.autor ?? 'CT').slice(0, 2).toUpperCase()

                                        return (
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black text-white"
                                                    style={{ background: cor }}
                                                >
                                                    {iniciais}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black tracking-tight text-gray-900">{post.autor}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{tempoRelativo(post.created_at)}</p>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditingPost(post)}
                                            className="rounded-lg p-2 text-gray-300 transition-all hover:bg-blue-50 hover:text-blue-500"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setPostParaExcluir(post)}
                                            className="rounded-lg p-2 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <p className="mb-4 whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-gray-800">{post.conteudo}</p>
                            </div>

                            {post.imagem_url && (
                                <div className="w-full overflow-hidden bg-gray-900">
                                    {isVideo(post.imagem_url) ? (
                                        <video src={post.imagem_url} controls className="max-h-[500px] w-full object-contain" />
                                    ) : (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={post.imagem_url} alt="Feed media" className="mx-auto h-auto max-h-[600px] w-full object-contain" />
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="p-6">
                                <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                                    <div className="flex items-center gap-6">
                                        <div className="group flex cursor-default items-center gap-2">
                                            <Heart className={`h-5 w-5 ${post.total_curtidas > 0 ? 'fill-[#CC0000] text-[#CC0000]' : 'text-gray-300'}`} />
                                            <span className="text-xs font-black text-gray-600">{post.total_curtidas}</span>
                                        </div>
                                        <button onClick={() => carregarComentarios(post.id)} className="group flex items-center gap-2">
                                            <MessageCircle className="h-5 w-5 text-gray-300 transition-colors group-hover:text-blue-500" />
                                            <span className="text-xs font-black text-gray-600">{post.total_comentarios}</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => togglePublicado(post.id, post.publicado)}
                                        className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${post.publicado ? 'border-gray-200 bg-white text-gray-500' : 'border-green-100 bg-green-50 text-green-700'}`}
                                    >
                                        {post.publicado ? 'Ocultar' : 'Publicar'}
                                    </button>
                                </div>

                                {comentandoEm === post.id && (
                                    <div className="mt-6 animate-in slide-in-from-top-2 space-y-4">
                                        {carregandoComentarios[post.id] ? (
                                            <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
                                        ) : (
                                            (comentarios[post.id] || []).map((coment) => (
                                                <div key={coment.id} className="flex gap-3">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-black text-gray-400">
                                                        {coment.autor_nome?.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                                        <div className="mb-1 flex items-center justify-between">
                                                            <span className="text-xs font-black text-gray-900">{coment.autor_nome}</span>
                                                            <span className="text-[9px] font-bold uppercase text-gray-400">{tempoRelativo(coment.created_at)}</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-700">{coment.texto}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={novoComentario}
                                                onChange={(e) => setNovoComentario(e.target.value)}
                                                placeholder="Contribuir na conversa..."
                                                className="h-10 flex-1 rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:bg-white"
                                                onKeyDown={(e) => e.key === 'Enter' && handleEnviarComentario(post.id)}
                                            />
                                            <button
                                                onClick={() => handleEnviarComentario(post.id)}
                                                disabled={enviandoComentario || !novoComentario.trim()}
                                                className="h-10 rounded-xl bg-gray-900 px-4 text-xs font-black uppercase tracking-widest text-white"
                                            >
                                                Enviar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingPost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] bg-white shadow-2xl animate-in zoom-in-95">
                        <div className="p-8">
                            <h3 className="mb-6 flex items-center justify-between text-xl font-black text-gray-900">
                                Editar Publicação
                                <button onClick={() => setEditingPost(null)}><XIcon className="h-5 w-5 text-gray-400" /></button>
                            </h3>
                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Conteúdo do Post</label>
                                    <textarea
                                        rows={5}
                                        value={editingPost.conteudo}
                                        onChange={(e) => setEditingPost({ ...editingPost, conteudo: e.target.value })}
                                        className="w-full resize-none rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm font-medium outline-none transition-all focus:border-[#CC0000]"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-400">Link da Mídia (URL)</label>
                                    <input
                                        type="text"
                                        value={editingPost.imagem_url}
                                        onChange={(e) => setEditingPost({ ...editingPost, imagem_url: e.target.value })}
                                        className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-sm font-medium outline-none transition-all focus:border-[#CC0000]"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setEditingPost(null)}
                                    className="h-12 flex-1 rounded-2xl border border-gray-200 text-sm font-black uppercase tracking-widest text-gray-500"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSalvarEdicao}
                                    disabled={savingEdit}
                                    className="h-12 flex-[2] rounded-2xl bg-[#CC0000] text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-black"
                                >
                                    {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={Boolean(postParaExcluir)}
                onClose={() => setPostParaExcluir(null)}
                onConfirm={handleExcluirPost}
                title="Excluir Post"
                description="Apagar permanentemente este comunicado do feed?"
                confirmText="Excluir"
                cancelText="Manter"
                variant="danger"
                isLoading={excluindo !== null}
            />
        </div>
    )
}
