'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenSquare, Heart, MessageCircle, Trash2, EyeOff, LayoutTemplate, ShieldCheck, GraduationCap, Search, Edit3, X as XIcon } from 'lucide-react'
import { useFeed } from '@/hooks/useFeed'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useProfessoresSelect } from '@/hooks/useProfessores'

import { FeedComposer } from '@/components/feed/FeedComposer'
import { ConfirmModal } from '@/components/shared/ConfirmModal'



function tempoRelativo(data: string): string {
    const diff = Date.now() - new Date(data).getTime()
    const min = Math.floor(diff / 60000)
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (min < 60) return `${min}min atrás`
    if (h < 24) return `${h} h atrás`
    return `${d}d atrás`
}

export default function FeedPage() {
    const { posts, loading, refetch } = useFeed()
    const router = useRouter()
    const supabase = createClient()
    const [excluindo, setExcluindo] = useState<string | null>(null)
    const [postParaExcluir, setPostParaExcluir] = useState<{ id: string, conteudo: string } | null>(null)
    const [busca, setBusca] = useState('')
    const [filtroProfessor, setFiltroProfessor] = useState('todos')
    const { professores } = useProfessoresSelect()
    const [userEmail, setUserEmail] = useState<string | null>(null)

    // Edit State
    const [editingPost, setEditingPost] = useState<any | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)

    const [comentarios, setComentarios] = useState<Record<string, any[]>>({})
    const [comentandoEm, setComentandoEm] = useState<string | null>(null)
    const [novoComentario, setNovoComentario] = useState('')
    const [enviandoComentario, setEnviandoComentario] = useState(false)
    const [carregandoComentarios, setCarregandoComentarios] = useState<Record<string, boolean>>({})

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setUserEmail(data.user?.email ?? null)
        })
    }, [supabase])

    const profAtual = professores.find(p => p.email?.toLowerCase() === userEmail?.toLowerCase())
        ?? professores.find(p => p.nome?.toLowerCase().includes('argel'))
        ?? (professores.length > 0 ? professores[0] : null)

    async function handleExcluirPost() {
        if (!postParaExcluir) return
        setExcluindo(postParaExcluir.id)
        const { error } = await supabase.from('posts').delete().eq('id', postParaExcluir.id)
        if (error) toast.error('Falha de sincronia ao excluir.')
        else {
            toast.success('Publicação excluída.')
            refetch()
        }
        setExcluindo(null)
        setPostParaExcluir(null)
    }

    async function handleSalvarEdicao() {
        if (!editingPost) return
        setSavingEdit(true)
        const { error } = await supabase.from('posts').update({
            conteudo: editingPost.conteudo,
            imagem_url: editingPost.imagem_url
        }).eq('id', editingPost.id)

        if (error) toast.error('Erro ao salvar.')
        else {
            toast.success('Post atualizado!')
            setEditingPost(null)
            refetch()
        }
        setSavingEdit(false)
    }

    async function togglePublicado(id: string, publicadoAtual: boolean) {
        const { error } = await supabase.from('posts').update({ publicado: !publicadoAtual }).eq('id', id)
        if (error) toast.error('Erro de I/O na Engine Supabase.')
        else {
            toast.success(publicadoAtual ? 'Privado' : 'Visível')
            refetch()
        }
    }

    const postsFiltrados = posts.filter(post => {
        const matchesBusca =
            post.conteudo.toLowerCase().includes(busca.toLowerCase()) ||
            post.autor.toLowerCase().includes(busca.toLowerCase());
        const matchesProfessor = filtroProfessor === 'todos' || post.autor === filtroProfessor;
        return matchesBusca && matchesProfessor;
    })

    async function carregarComentarios(postId: string) {
        if (comentandoEm === postId) {
            setComentandoEm(null)
            return
        }
        setComentandoEm(postId)
        if (comentarios[postId]) return
        setCarregandoComentarios(prev => ({ ...prev, [postId]: true }))
        const { data, error } = await supabase
            .from('post_comentarios')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true })
        if (error) toast.error('Erro ao carregar interações.')
        else setComentarios(prev => ({ ...prev, [postId]: data || [] }))
        setCarregandoComentarios(prev => ({ ...prev, [postId]: false }))
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
                texto: novoComentario.trim()
            })
            .select().single()

        if (error) toast.error('Não foi possível enviar.')
        else {
            setComentarios(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), data]
            }))
            setNovoComentario('')
            toast.success('Enviado!')
            refetch()
        }
        setEnviandoComentario(false)
    }

    function isVideo(url: string) {
        return url.match(/\.(mp4|webm|ogg|mov)$|^.*youtube\.com.*|^.*vimeo\.com.*/i) || url.includes('/ct-boxe-media/feed/') && url.endsWith('.mp4');
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-6 border-b border-gray-100 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <LayoutTemplate className="w-6 h-6 text-[#CC0000]" /> Feed Social do CT
                        </h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {loading ? 'Sincronizando timeline...' : `${posts.length} publicações disponíveis`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar no feed..."
                            className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-sm font-medium outline-none focus:border-[#CC0000] transition-all text-gray-900 shadow-sm"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold text-gray-700 outline-none focus:border-[#CC0000] cursor-pointer shadow-sm"
                        value={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                    >
                        <option value="todos">Filtro: Autores</option>
                        {professores.map(p => (
                            <option key={p.id} value={p.nome}>{p.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            <FeedComposer professorAtual={profAtual} onSuccess={refetch} />

            {loading ? <LoadingSpinner label="Buscando comunicados..." /> :
                postsFiltrados.length === 0 ? (
                    <EmptyState
                        icon={PenSquare}
                        title="Nenhum Post"
                        description="Navegue ou altere o filtro para ver outras postagens."
                        action={{ label: 'Ver tudo', onClick: () => { setBusca(''); setFiltroProfessor('todos'); } }}
                    />
                ) : (
                    <div className="space-y-6">
                        {postsFiltrados.map(post => (
                            <div
                                key={post.id}
                                className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 relative ${!post.publicado ? 'bg-gray-50 opacity-70' : 'hover:shadow-md'}`}
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        {(() => {
                                            const profInfo = professores.find(p => p.nome === post.autor)
                                            const cor = profInfo?.cor_perfil ?? '#CC0000'
                                            const iniciais = (post.autor ?? 'CT').slice(0, 2).toUpperCase()
                                            return (
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: cor }}>
                                                        {iniciais}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 tracking-tight">{post.autor}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tempoRelativo(post.created_at)}</p>
                                                    </div>
                                                </div>
                                            )
                                        })()}
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setEditingPost(post)} className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"><Edit3 className="w-4 h-4" /></button>
                                            <button onClick={() => setPostParaExcluir(post)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    <p className="text-[15px] text-gray-800 font-medium leading-relaxed whitespace-pre-wrap mb-4">{post.conteudo}</p>
                                </div>

                                {post.imagem_url && (
                                    <div className="w-full bg-gray-900 overflow-hidden">
                                        {isVideo(post.imagem_url) ? (
                                            <video src={post.imagem_url} controls className="w-full max-h-[500px] object-contain" />
                                        ) : (
                                            <img src={post.imagem_url} alt="Feed media" className="w-full h-auto max-h-[600px] object-contain mx-auto" />
                                        )}
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 group cursor-default">
                                                <Heart className={`h-5 w-5 ${post.total_curtidas > 0 ? 'text-[#CC0000] fill-[#CC0000]' : 'text-gray-300'}`} />
                                                <span className="text-xs font-black text-gray-600">{post.total_curtidas}</span>
                                            </div>
                                            <button onClick={() => carregarComentarios(post.id)} className="flex items-center gap-2 group">
                                                <MessageCircle className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                <span className="text-xs font-black text-gray-600">{post.total_comentarios}</span>
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => togglePublicado(post.id, post.publicado)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border transition-all ${post.publicado ? 'bg-white border-gray-200 text-gray-500' : 'bg-green-50 border-green-100 text-green-700'}`}
                                        >
                                            {post.publicado ? 'Ocultar' : 'Publicar'}
                                        </button>
                                    </div>

                                    {comentandoEm === post.id && (
                                        <div className="mt-6 space-y-4 animate-in slide-in-from-top-2">
                                            {carregandoComentarios[post.id] ? <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div> :
                                                (comentarios[post.id] || []).map((coment: any) => (
                                                    <div key={coment.id} className="flex gap-3">
                                                        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">{coment.autor_nome?.slice(0, 2).toUpperCase()}</div>
                                                        <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs font-black text-gray-900">{coment.autor_nome}</span>
                                                                <span className="text-[9px] font-bold text-gray-400 uppercase">{tempoRelativo(coment.created_at)}</span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 font-medium">{coment.texto}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={novoComentario}
                                                    onChange={e => setNovoComentario(e.target.value)}
                                                    placeholder="Contribuir na conversa..."
                                                    className="flex-1 h-10 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all"
                                                    onKeyDown={e => e.key === 'Enter' && handleEnviarComentario(post.id)}
                                                />
                                                <button onClick={() => handleEnviarComentario(post.id)} disabled={enviandoComentario || !novoComentario.trim()} className="h-10 px-4 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Enviar</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            {/* Modal Edição Feed */}
            {editingPost && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-8">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center justify-between">
                                Editar Publicação
                                <button onClick={() => setEditingPost(null)}><XIcon className="w-5 h-5 text-gray-400" /></button>
                            </h3>
                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Conteúdo do Post</label>
                                    <textarea
                                        rows={5}
                                        value={editingPost.conteudo}
                                        onChange={e => setEditingPost({ ...editingPost, conteudo: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-[#CC0000] transition-all resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Link da Mídia (URL)</label>
                                    <input
                                        type="text"
                                        value={editingPost.imagem_url}
                                        onChange={e => setEditingPost({ ...editingPost, imagem_url: e.target.value })}
                                        className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-medium transition-all outline-none focus:border-[#CC0000]"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex gap-3">
                                <button onClick={() => setEditingPost(null)} className="flex-1 h-12 rounded-2xl border border-gray-200 text-sm font-black uppercase tracking-widest text-gray-500">Cancelar</button>
                                <button onClick={handleSalvarEdicao} disabled={savingEdit} className="flex-[2] h-12 rounded-2xl bg-[#CC0000] text-white text-sm font-black uppercase tracking-widest hover:bg-black transition-all">
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
                description={`Apagar permanentemente este comunicado do feed?`}
                confirmText="Excluir"
                cancelText="Manter"
                variant="danger"
                isLoading={excluindo !== null}
            />
        </div>
    )
}
