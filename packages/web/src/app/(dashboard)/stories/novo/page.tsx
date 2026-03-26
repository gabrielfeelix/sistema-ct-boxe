'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Video as VideoIcon, Layers, FileText, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function NovoVideoTrilhaPage() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    const [titulo, setTitulo] = useState('')
    const [descricao, setDescricao] = useState('')
    const [categoria, setCategoria] = useState('')
    const [novaCategoria, setNovaCategoria] = useState('')
    const [capaUrl, setCapaUrl] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [ordem] = useState(0)
    const [salvando, setSalvando] = useState(false)
    const [dbCategorias, setDbCategorias] = useState<{ id: string, nome: string }[]>([])

    // Upload Supabase Storage
    const [uploadando, setUploadando] = useState(false)
    const [uploadandoCapa, setUploadandoCapa] = useState(false)
    const [criandoCat, setCriandoCat] = useState(false)



    const fetchCats = useCallback(async () => {
        const { data } = await supabase.from('trilhas_categorias').select('id, nome').eq('ativo', true).order('ordem', { ascending: true })
        if (data) setDbCategorias(data)
    }, [supabase])

    useEffect(() => {
        queueMicrotask(() => {
            void fetchCats()
        })
    }, [fetchCats])

    async function handleCriarCategoria() {
        if (!novaCategoria.trim()) return
        setCriandoCat(true)

        const { data, error } = await supabase.from('trilhas_categorias').insert({
            nome: novaCategoria.trim(),
            capa_url: capaUrl || null,
            ativo: true
        }).select('id').single()

        if (error || !data) {
            toast.error('Erro ao criar módulo.')
        } else {
            toast.success('Módulo criado com sucesso!')
            await fetchCats()
            setCategoria(data.id)
            setNovaCategoria('')
            setCapaUrl('')
        }
        setCriandoCat(false)
    }

    async function handleUploadCapa(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem valida para a capa.')
            return
        }

        setUploadandoCapa(true)

        const ext = file.name.split('.').pop()
        const path = `trilhas/capas/${Date.now()}.${ext}`

        const { error } = await supabase.storage
            .from('ct-boxe-media')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (error) {
            console.error('Storage Cover Upload Error:', error)
            toast.error('Erro ao enviar capa.')
            setUploadandoCapa(false)
            return
        }

        const { data } = supabase.storage.from('ct-boxe-media').getPublicUrl(path)
        setCapaUrl(data.publicUrl)
        setUploadandoCapa(false)
        toast.success('Capa enviada com sucesso!')
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 200 * 1024 * 1024) {
            toast.error('Limite excedido: Vídeo deve ser menor que 200MB.')
            return
        }
        if (!file.type.startsWith('video/')) {
            toast.error('Falha de Tipo: O arquivo deve ser primariamente um vídeo (.mp4, .mov).')
            return
        }

        setUploadando(true)

        const ext = file.name.split('.').pop()
        const path = `trilhas/${Date.now()}.${ext}`

        // Verificando se o bucket existe e as permissões
        const { error: uploadError } = await supabase.storage
            .from('ct-boxe-media')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            })

        if (uploadError) {
            console.error('Storage Upload Error:', uploadError)
            toast.error(`Erro de I/O no Storage: ${uploadError.message || 'Tente reduzir o tamanho do vídeo.'}`)
            setUploadando(false)
            return
        }

        const { data: urlData } = supabase.storage.from('ct-boxe-media').getPublicUrl(path)
        setVideoUrl(urlData.publicUrl)
        setUploadando(false)
        console.log('Video URL pareada:', urlData.publicUrl)
        toast.success('Vídeo pareado no servidor!')
    }

    async function handleSalvar() {
        if (!videoUrl || !titulo.trim() || !categoria || categoria === 'nova') {
            toast.error('Preencha os dados obrigatórios: Título, Selecione um Módulo e o Vídeo.')
            return
        }

        setSalvando(true)
        const finalCatId = categoria

        const { data: insertData, error: insertError } = await supabase.from('trilhas_videos').insert({
            titulo: titulo.trim(),
            descricao: descricao.trim() || null,
            categoria_id: finalCatId,
            video_url: videoUrl,
            ordem: Number(ordem) || 0,
            ativo: true,
        }).select()

        console.log('Insert Result:', { data: insertData, error: insertError })

        if (insertError) {
            console.error('Database Insert Error:', insertError)
            toast.error(`Erro ao arquivar vídeo: ${insertError.message} (${insertError.code})`)
            setSalvando(false)
            return
        }

        toast.success('Vídeo arquivado na biblioteca para acesso dos alunos!')
        router.push('/stories')
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in slide-in-from-bottom-2 duration-500">

            <button onClick={() => router.back()} className="group flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors w-fit">
                <div className="bg-white border border-gray-200 p-1.5 rounded-md group-hover:border-gray-300 transition-colors shadow-sm">
                    <ArrowLeft className="h-4 w-4" />
                </div>
                Voltar à Trilha
            </button>

            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 mb-1">
                    <VideoIcon className="w-6 h-6 text-[#CC0000]" /> Novo Vídeo Explicativo
                </h2>
                <p className="text-sm font-bold text-gray-400 tracking-wide uppercase mt-1">
                    Adicione material permanente para a biblioteca técnica dos alunos.
                </p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">

                {/* Left Panel */}
                <div className="p-6 sm:p-8 flex-1 space-y-6 bg-gray-50/30">
                    <div>
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4 text-gray-400" /> Título e Descrição
                        </label>
                        <div className="space-y-4">
                            <input
                                value={titulo}
                                onChange={e => setTitulo(e.target.value)}
                                placeholder="Dê um título forte (ex: Como enrolar a bandagem 3m)"
                                className="w-full p-4 text-sm font-bold text-gray-900 border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000] transition-all shadow-sm"
                            />
                            <textarea
                                value={descricao}
                                onChange={e => setDescricao(e.target.value)}
                                placeholder="Detalhes ou passos do vídeo (opcional)"
                                rows={4}
                                className="w-full p-4 text-sm font-medium text-gray-600 border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000] transition-all shadow-sm resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <Layers className="w-4 h-4 text-gray-400" /> Categoria / Módulo
                        </label>
                        <select
                            value={categoria}
                            onChange={e => setCategoria(e.target.value)}
                            className="w-full p-4 text-sm font-bold text-gray-900 border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000] transition-all shadow-sm appearance-none mb-3"
                        >
                            <option value="">Selecione um Módulo</option>
                            {dbCategorias.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nome}</option>
                            ))}
                            <option value="nova">+ Criar Novo Módulo</option>
                        </select>

                        {categoria === 'nova' && (
                            <div className="flex animate-in fade-in zoom-in-95 duration-200">
                                <input
                                    value={novaCategoria}
                                    onChange={e => setNovaCategoria(e.target.value)}
                                    placeholder="Nome do novo Módulo"
                                    className="flex-1 p-4 text-sm font-bold text-gray-900 border border-[#CC0000] bg-red-50/30 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] transition-all shadow-sm"
                                    onKeyDown={e => e.key === 'Enter' && handleCriarCategoria()}
                                />
                                <button
                                    onClick={handleCriarCategoria}
                                    disabled={criandoCat || !novaCategoria.trim()}
                                    className="bg-[#CC0000] hover:bg-[#AA0000] text-white px-6 font-black uppercase tracking-widest text-xs rounded-r-xl transition-colors disabled:opacity-50"
                                >
                                    {criandoCat ? '...' : 'Confirmar'}
                                </button>
                            </div>
                        )}
                        {categoria === 'nova' && (
                            <div className="mt-4">
                                <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                                    <ImageIcon className="w-4 h-4 text-gray-400" /> Capa do MÃ³dulo
                                </label>
                                {!capaUrl ? (
                                    <label className="flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white p-6 text-center hover:border-[#CC0000] hover:bg-red-50/40">
                                        <div>
                                            <p className="text-sm font-black text-gray-900">
                                                {uploadandoCapa ? 'Enviando capa...' : 'Selecionar imagem da capa'}
                                            </p>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                JPG ou PNG
                                            </p>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadCapa} />
                                    </label>
                                ) : (
                                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={capaUrl} alt="Capa do mÃ³dulo" className="h-40 w-full object-cover" />
                                        </>
                                        <button
                                            type="button"
                                            onClick={() => setCapaUrl('')}
                                            className="absolute right-3 top-3 rounded-lg bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-900"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="p-6 sm:p-8 flex-1 space-y-6 relative flex flex-col justify-between">
                    <div>
                        <label className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                            <Upload className="w-4 h-4 text-gray-400" /> Motor de Upload de Vídeo
                        </label>

                        {!videoUrl ? (
                            <label className="flex flex-col items-center justify-center aspect-[4/3] border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#CC0000] hover:bg-red-50/50 transition-all bg-gray-50 group">
                                {uploadando ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#CC0000]" />
                                        <span className="text-xs font-black text-[#CC0000] uppercase tracking-widest">Compilando Vídeo...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-center p-6">
                                        <div className="p-4 bg-white rounded-full border border-gray-100 shadow-sm group-hover:bg-[#CC0000] group-hover:text-white group-hover:border-[#CC0000] transition-colors text-gray-400">
                                            <Upload className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-black text-gray-900">Selecionar arquivo de vídeo</span>
                                            <span className="block text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">MP4 ou MOV • Landscape(Deitado) Preferível</span>
                                        </div>
                                    </div>
                                )}
                                <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleUpload} disabled={uploadando} />
                            </label>
                        ) : (
                            <div className="aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-lg relative border border-gray-200 group">
                                <video src={videoUrl} controls className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                                <button
                                    onClick={() => setVideoUrl('')}
                                    className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded shadow-sm hover:bg-red-500 transition-colors z-20"
                                >
                                    Remover
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleSalvar}
                            disabled={salvando || uploadando || !videoUrl || !titulo}
                            className="w-full py-4 text-sm font-black text-white uppercase tracking-widest bg-gray-900 hover:bg-black disabled:opacity-50 disabled:bg-gray-800 rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {salvando ? <LoadingSpinner size="sm" /> : 'Arquivar Publicamente'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}
