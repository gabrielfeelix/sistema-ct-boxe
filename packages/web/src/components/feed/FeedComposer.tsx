'use client'

import { useState, useRef } from 'react'
import { Image as ImageIcon, Send, X, Loader2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FeedComposerProps {
    onSuccess: () => void
    professorAtual: {
        nome: string
        cor_perfil: string
    } | null
}

export function FeedComposer({ onSuccess, professorAtual }: FeedComposerProps) {
    const [conteudo, setConteudo] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [externalUrl, setExternalUrl] = useState('')
    const [showExternal, setShowExternal] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [fileType, setFileType] = useState<'image' | 'video' | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    const iniciais = professorAtual?.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() ?? 'CT'

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0]
        if (selected) {
            const isVideo = selected.type.startsWith('video/')
            const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024 // 50MB video, 10MB image

            if (selected.size > maxSize) {
                toast.error(`${isVideo ? 'Vídeo' : 'Imagem'} muito grande.`)
                return
            }

            setFile(selected)
            setFileType(isVideo ? 'video' : 'image')
            setPreviewUrl(URL.createObjectURL(selected))
            setExternalUrl('') // Clear external if file is selected
        }
    }

    async function handleEnviar() {
        if (!conteudo.trim() && !file && !externalUrl) return
        if (!professorAtual) {
            toast.error('Perfil não identificado.')
            return
        }

        setEnviando(true)
        try {
            let final_url = externalUrl

            if (file) {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
                const filePath = `feed/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('ct-boxe-media')
                    .upload(filePath, file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('ct-boxe-media')
                    .getPublicUrl(filePath)

                final_url = publicUrl
            }

            const { error } = await supabase.from('posts').insert({
                conteudo,
                imagem_url: final_url, // We'll keep the column name but it can be video
                autor: professorAtual.nome,
                publicado: true,
                total_curtidas: 0,
                total_comentarios: 0
            })

            if (error) throw error

            toast.success('Publicado no feed!')
            setConteudo('')
            setFile(null)
            setPreviewUrl(null)
            setFileType(null)
            setExternalUrl('')
            setShowExternal(false)
            onSuccess()
        } catch (err: any) {
            console.error(err)
            toast.error('Falha ao publicar.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-8">
            <div className="flex gap-4">
                <div
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-md shrink-0"
                    style={{ background: professorAtual?.cor_perfil ?? '#CC0000' }}
                >
                    {iniciais}
                </div>
                <div className="flex-1">
                    <textarea
                        value={conteudo}
                        onChange={(e) => setConteudo(e.target.value)}
                        placeholder={`O que há de novo, ${professorAtual?.nome.split(' ')[0]}?`}
                        className="w-full min-h-[100px] bg-gray-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#CC0000]/10 transition-all resize-none text-gray-900 placeholder:text-gray-400"
                    />

                    {previewUrl && (
                        <div className="mt-4 relative inline-block group">
                            {fileType === 'video' ? (
                                <video src={previewUrl} className="max-h-60 rounded-2xl border border-gray-100 shadow-sm" controls />
                            ) : (
                                <img src={previewUrl} alt="Preview" className="max-h-60 rounded-2xl border border-gray-100 shadow-sm" />
                            )}
                            <button
                                onClick={() => { setFile(null); setPreviewUrl(null); setFileType(null); }}
                                className="absolute -top-2 -right-2 p-1.5 bg-gray-900 text-white rounded-full hover:bg-black transition-colors shadow-lg"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {showExternal && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Link Externo (CDN/URL)</label>
                                <button onClick={() => { setShowExternal(false); setExternalUrl('') }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                            </div>
                            <input
                                type="text"
                                placeholder="https://exemplo.com/video.mp4"
                                value={externalUrl}
                                onChange={e => setExternalUrl(e.target.value)}
                                className="w-full h-10 bg-white border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#CC0000]"
                            />
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-1">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,video/*"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-all text-xs font-bold"
                            >
                                <ImageIcon className="h-4 w-4 text-emerald-500" />
                                <span className="hidden sm:inline">Anexar Mídia</span>
                            </button>
                            <button
                                onClick={() => setShowExternal(!showExternal)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-500 hover:text-gray-900 transition-all text-xs font-bold"
                            >
                                <Plus className="h-4 w-4 text-blue-500" />
                                <span className="hidden sm:inline">Link Externo</span>
                            </button>
                        </div>

                        <button
                            disabled={enviando || (!conteudo.trim() && !file && !externalUrl)}
                            onClick={handleEnviar}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-sm ${enviando || (!conteudo.trim() && !file && !externalUrl)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-[#CC0000] text-white hover:bg-[#AA0000] shadow-[#CC0000]/20 hover:shadow-lg'
                                }`}
                        >
                            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Publicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
