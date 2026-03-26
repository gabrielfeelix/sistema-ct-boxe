'use client'

import { useState } from 'react'
import { X, UserPlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ModalNovoCandidatoProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function ModalNovoCandidato({ isOpen, onClose, onSuccess }: ModalNovoCandidatoProps) {
    const [loading, setLoading] = useState(false)
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [telefone, setTelefone] = useState('')
    const supabase = createClient()

    if (!isOpen) return null

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!nome || !telefone) {
            toast.error('Nome e WhatsApp são obrigatórios.')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.from('candidatos').insert({
                nome,
                email: email || null,
                telefone,
                status: 'aguardando'
            })

            if (error) throw error

            toast.success('Candidato adicionado com sucesso!')
            setNome('')
            setEmail('')
            setTelefone('')
            onSuccess()
            onClose()
        } catch (err) {
            console.error('Erro ao salvar candidato:', err)
            toast.error(`Falha ao salvar candidato: ${err instanceof Error ? err.message : 'erro inesperado'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-[#CC0000]" /> Novo Candidato
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nome Completo <span className="text-[#CC0000]">*</span></label>
                        <input
                            required
                            type="text"
                            disabled={loading}
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Gabriel Felix"
                            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000] transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">E-mail (Opcional)</label>
                        <input
                            type="email"
                            disabled={loading}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="gabriel@exemplo.com"
                            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000] transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">WhatsApp / Celular <span className="text-[#CC0000]">*</span></label>
                        <input
                            required
                            type="tel"
                            disabled={loading}
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value)}
                            placeholder="(11) 99999-9999"
                            className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20 focus:border-[#CC0000] transition-all"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={loading}
                            type="submit"
                            className="flex-1 h-12 bg-[#CC0000] hover:bg-[#AA0000] text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
