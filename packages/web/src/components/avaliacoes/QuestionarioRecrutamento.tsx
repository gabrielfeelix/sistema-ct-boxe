'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Loader2, ClipboardList } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Questao {
    id: string
    pergunta: string
    resposta: string
}

interface QuestionarioRecrutamentoProps {
    candidatoId?: string
    alunoId?: string
    avaliacaoInicial?: {
        id?: string
        questoes_json?: Questao[]
    } | null
    onSave?: () => void
}

const PERGUNTAS_PADRAO: Questao[] = [
    { id: '1', pergunta: 'Como você avalia seu condicionamento físico atual?', resposta: '' },
    { id: '2', pergunta: 'Possui alguma experiência prévia com Boxe ou outras artes marciais?', resposta: '' },
    { id: '3', pergunta: 'Qual o seu principal objetivo ao entrar no CT Boxe?', resposta: '' },
    { id: '4', pergunta: 'Quantos dias por semana você pretende se dedicar aos treinos?', resposta: '' },
    { id: '5', pergunta: 'Sobre pontualidade e disciplina: como você se avalia em outros compromissos?', resposta: '' },
]

export function QuestionarioRecrutamento({ candidatoId, alunoId, avaliacaoInicial, onSave }: QuestionarioRecrutamentoProps) {
    const questoesIniciais = avaliacaoInicial?.questoes_json ?? []
    const [questoes, setQuestoes] = useState<Questao[]>(
        questoesIniciais.length > 0
            ? questoesIniciais
            : PERGUNTAS_PADRAO
    )
    const [salvando, setSalvando] = useState(false)
    const supabase = createClient()

    const adicionarQuestao = () => {
        const nova = { id: crypto.randomUUID(), pergunta: 'Nova pergunta...', resposta: '' }
        setQuestoes([...questoes, nova])
    }

    const removerQuestao = (id: string) => {
        if (questoes.length === 1) return
        setQuestoes(questoes.filter(q => q.id !== id))
    }

    const atualizarQuestao = (id: string, campo: 'pergunta' | 'resposta', valor: string) => {
        setQuestoes(questoes.map(q => q.id === id ? { ...q, [campo]: valor } : q))
    }

    const handleSubmit = async () => {
        setSalvando(true)
        try {
            const payload = {
                candidato_id: candidatoId,
                aluno_id: alunoId,
                tipo: 'entrada',
                status: 'concluida',
                questoes_json: questoes,
                data_avaliacao: new Date().toISOString()
            }

            let error;
            if (avaliacaoInicial?.id) {
                const { error: err } = await supabase
                    .from('avaliacoes')
                    .update(payload)
                    .eq('id', avaliacaoInicial.id)
                error = err
            } else {
                const { error: err } = await supabase
                    .from('avaliacoes')
                    .insert(payload)
                error = err
            }

            if (error) throw error
            toast.success('Avaliação salva com sucesso!')
            onSave?.()
        } catch (err) {
            console.error(err)
            toast.error('Erro ao salvar avaliação física.')
        } finally {
            setSalvando(false)
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-[#CC0000]" /> Avaliação de Recrutamento
                    </h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Análise comportamental e técnica inicial
                    </p>
                </div>
                <button
                    onClick={adicionarQuestao}
                    className="p-2 text-gray-400 hover:text-[#CC0000] hover:bg-red-50 rounded-xl transition-all border border-dashed border-gray-200"
                    title="Adicionar Pergunta"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                {questoes.map((q, index) => (
                    <div key={q.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-red-100 transition-all group relative">
                        <div className="flex gap-4 items-start">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-[10px] font-black text-gray-400 border border-gray-100 group-hover:bg-[#CC0000] group-hover:text-white group-hover:border-[#CC0000] transition-colors">
                                0{index + 1}
                            </span>
                            <div className="flex-1 space-y-3">
                                <input
                                    value={q.pergunta}
                                    onChange={(e) => atualizarQuestao(q.id, 'pergunta', e.target.value)}
                                    placeholder="Pergunta..."
                                    className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-900 focus:ring-0 placeholder:text-gray-300"
                                />
                                <textarea
                                    value={q.resposta}
                                    onChange={(e) => atualizarQuestao(q.id, 'resposta', e.target.value)}
                                    placeholder="Descreva a resposta do candidato aqui..."
                                    rows={2}
                                    className="w-full bg-gray-50/50 border border-gray-100 rounded-xl p-3 text-sm font-medium focus:bg-white focus:border-red-200 outline-none transition-all resize-none placeholder:text-gray-400"
                                />
                            </div>
                            <button
                                onClick={() => removerQuestao(q.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-6 flex justify-end gap-3">
                <button
                    disabled={salvando}
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5"
                >
                    {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar Avaliação
                </button>
            </div>
        </div>
    )
}
