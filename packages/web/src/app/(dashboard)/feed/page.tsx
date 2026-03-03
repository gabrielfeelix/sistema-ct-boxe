'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenSquare, Heart, MessageCircle, Trash2, EyeOff, LayoutTemplate, ShieldCheck, GraduationCap, Search } from 'lucide-react'
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

        if (error) {
            toast.error('Falha de sincronia ao excluir.')
        } else {
            toast.success('Publicação excluída com sucesso.')
            refetch()
        }

        setExcluindo(null)
        setPostParaExcluir(null)
    }

    async function togglePublicado(id: string, publicadoAtual: boolean) {
        const { error } = await supabase.from('posts').update({ publicado: !publicadoAtual }).eq('id', id)
        if (error) toast.error('Erro de I/O na Engine Supabase.')
        else {
            toast.success(publicadoAtual ? 'Publicação removida do app' : 'Publicação disponibilizada no app')
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

        if (error) {
            toast.error('Erro ao carregar interações.')
        } else {
            setComentarios(prev => ({ ...prev, [postId]: data || [] }))
        }
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
            .select()
            .single()

        if (error) {
            toast.error('Não foi possível enviar o comentário.')
        } else {
            setComentarios(prev => ({
                ...prev,
                [postId]: [...(prev[postId] || []), data]
            }))
            setNovoComentario('')
            toast.success('Comentário enviado!')
            refetch()
        }
        setEnviandoComentario(false)
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-12 animate-in slide-in-from-bottom-2 duration-500">

            {/* Premium Header */}
            <div className="flex flex-col gap-6 border-b border-gray-100 pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            <LayoutTemplate className="w-6 h-6 text-[#CC0000]" /> Feed do CT
                        </h2>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {loading ? 'Carregando publicações...' : `Comunicados compartilhados com a nossa equipe`}
                        </p>
                    </div>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar no feed..."
                            className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-sm font-medium outline-none focus:bg-white focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/10 transition-all text-gray-900 shadow-sm"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                    <select
                        className="h-11 bg-white border border-gray-200 rounded-xl px-4 text-sm font-bold text-gray-700 outline-none focus:bg-white focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/10 transition-all cursor-pointer shadow-sm"
                        value={filtroProfessor}
                        onChange={(e) => setFiltroProfessor(e.target.value)}
                    >
                        <option value="todos">Todos os Autores</option>
                        {professores.map(p => (
                            <option key={p.id} value={p.nome}>{p.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Composer estilo Social */}
            <FeedComposer professorAtual={profAtual} onSuccess={refetch} />

            {loading ? <LoadingSpinner label="Puxando fios da linha do tempo..." /> :
                posts.length === 0 ? (
                    <EmptyState
                        icon={PenSquare}
                        title="Sua Linha do Tempo está Vazia"
                        description="Compartilhe com seus alunos! Lance o primeiro comunicado e traga vida ao app."
                        action={{ label: 'Entendido!', onClick: () => { } }}
                    />
                ) : postsFiltrados.length === 0 ? (
                    <EmptyState
                        icon={LayoutTemplate}
                        title="Nenhum resultado"
                        description="Não encontramos publicações para os filtros selecionados."
                        action={{ label: 'Limpar Filtros', onClick: () => { setBusca(''); setFiltroProfessor('todos'); } }}
                    />
                ) : (
                    <div className="space-y-6">
                        {postsFiltrados.map(post => (
                            <div
                                key={post.id}
                                className={`bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 relative ${!post.publicado ? 'bg-gray-50/50 border-dashed opacity-80' : 'hover:shadow'}`}
                            >
                                <div className="p-5 sm:p-6">
                                    {/* Header do post - Professor info */}
                                    {(() => {
                                        const iniciais = (post.autor ?? '').split(' ').slice(0, 2).map((n: string) => n[0] ?? '').join('').toUpperCase()
                                        const profInfo = professores.find(p => p.nome === post.autor)
                                        const cor = profInfo?.cor_perfil ?? '#CC0000'
                                        const isAdmin = profInfo?.role === 'super_admin'
                                        return (
                                            <div className="flex items-center gap-3 mb-4">
                                                <div
                                                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0 relative"
                                                    style={{ background: cor }}
                                                >
                                                    {iniciais}
                                                    {post.publicado && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-sm font-black text-gray-900 tracking-tight leading-none">{post.autor}</p>
                                                        {isAdmin
                                                            ? <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-700">Admin</span>
                                                            : profInfo && <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-700">Professor</span>
                                                        }
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{tempoRelativo(post.created_at)}</p>
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Conteúdo do Texto */}
                                    <p className="text-sm sm:text-[15px] text-gray-800 font-medium leading-relaxed whitespace-pre-wrap mb-4">{post.conteudo}</p>
                                </div>

                                {/* Imagem do Post (Agora abaixo do texto) */}
                                {post.imagem_url && (
                                    <div className="w-full relative bg-gray-50 border-y border-gray-50">
                                        <img
                                            src={post.imagem_url}
                                            alt="Feed media"
                                            className="w-full h-auto max-h-[600px] object-contain mx-auto"
                                        />
                                    </div>
                                )}

                                <div className="px-5 sm:px-6 pb-5">
                                    {/* Stats + Ações Reais */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 pt-5 border-t border-gray-100 gap-4">

                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 group cursor-default">
                                                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-red-50 transition-colors border border-gray-100">
                                                    <Heart className={`h-4 w-4 ${post.total_curtidas > 0 ? 'text-[#CC0000] fill-[#CC0000]' : 'text-gray-400'}`} />
                                                </div>
                                                <span className="text-xs font-black text-gray-600">{post.total_curtidas} <span className="hidden sm:inline-block text-gray-400 font-bold ml-1">Curtidas</span></span>
                                            </div>
                                            <button
                                                onClick={() => carregarComentarios(post.id)}
                                                className="flex items-center gap-2 group cursor-pointer"
                                            >
                                                <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors border border-gray-100">
                                                    <MessageCircle className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                                <span className="text-xs font-black text-gray-600">{post.total_comentarios} <span className="hidden sm:inline-block text-gray-400 font-bold ml-1">Interações</span></span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 justify-between sm:justify-end">
                                            <button
                                                onClick={() => togglePublicado(post.id, post.publicado)}
                                                className={`text-xs font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border transition-all flex-1 sm:flex-none text-center ${post.publicado ? 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-sm'}`}
                                            >
                                                {post.publicado ? 'Arquivar' : 'Re-publicar'}
                                            </button>
                                            <button
                                                onClick={() => setPostParaExcluir({ id: post.id, conteudo: post.conteudo })}
                                                disabled={excluindo === post.id}
                                                className="p-2.5 bg-gray-50 text-gray-400 border border-gray-100 hover:text-[#CC0000] hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm flex-shrink-0"
                                                title="Apagar Matriz"
                                            >
                                                {excluindo === post.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                                            </button>
                                        </div>

                                    </div>

                                    {/* Area de Comentarios Expandida */}
                                    {comentandoEm === post.id && (
                                        <div className="mt-6 pt-6 border-t border-gray-50 animate-in slide-in-from-top-2 duration-300">
                                            {carregandoComentarios[post.id] ? (
                                                <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>
                                            ) : (
                                                <div className="space-y-4 mb-6">
                                                    {(comentarios[post.id] || []).map((coment: any) => (
                                                        <div key={coment.id} className="flex gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 shrink-0">
                                                                {coment.autor_nome?.slice(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-xs font-black text-gray-900">{coment.autor_nome}</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{tempoRelativo(coment.created_at)}</span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 font-medium">{coment.texto}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(comentarios[post.id] || []).length === 0 && (
                                                        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-4">Nenhuma interação ainda por aqui.</p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={novoComentario}
                                                    onChange={e => setNovoComentario(e.target.value)}
                                                    placeholder="Escreva um comentário..."
                                                    className="flex-1 h-10 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-medium outline-none focus:bg-white focus:border-blue-500 transition-all"
                                                    onKeyDown={e => e.key === 'Enter' && handleEnviarComentario(post.id)}
                                                />
                                                <button
                                                    onClick={() => handleEnviarComentario(post.id)}
                                                    disabled={enviandoComentario || !novoComentario.trim()}
                                                    className="h-10 px-4 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {enviandoComentario ? '...' : 'Enviar'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }

            <ConfirmModal
                isOpen={Boolean(postParaExcluir)}
                onClose={() => setPostParaExcluir(null)}
                onConfirm={handleExcluirPost}
                title="Excluir Publicação"
                description={`Tem certeza que deseja apagar permanentemente esta publicação? Esta ação não pode ser desfeita.\n\n"${postParaExcluir?.conteudo.slice(0, 60)}${(postParaExcluir?.conteudo.length ?? 0) > 60 ? '...' : ''}"`}
                confirmText="Excluir Agora"
                cancelText="Manter Post"
                variant="danger"
                isLoading={excluindo !== null}
            />
        </div>
    )
}
