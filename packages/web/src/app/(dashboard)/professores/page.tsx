'use client'

import { useState } from 'react'
import { GraduationCap, Search, Trash2, Mail, Phone, ShieldCheck, UserPlus, Edit2, CheckCircle2 } from 'lucide-react'
import { useProfessores } from '@/hooks/useProfessores'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { toast } from 'sonner'
import type { Professor, ProfessorRole } from '@/hooks/useProfessores'

export default function ProfessoresPage() {
    const { professores, loading, criarprofessor, atualizarProfessor, excluirProfessor, toggleAtivo } = useProfessores()
    const [busca, setBusca] = useState('')
    const [modalAberto, setModalAberto] = useState(false)
    const [editando, setEditando] = useState<string | null>(null)
    const [submetendo, setSubmetendo] = useState(false)

    // Form states
    const [nome, setNome] = useState('')
    const [email, setEmail] = useState('')
    const [telefone, setTelefone] = useState('')
    const [especialidade, setEspecialidade] = useState('')
    const [role, setRole] = useState<'super_admin' | 'professor'>('professor')
    const [corPerfil, setCorPerfil] = useState('#CC0000')

    const professoresFiltrados = professores.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.email.toLowerCase().includes(busca.toLowerCase()) ||
        p.especialidade?.toLowerCase().includes(busca.toLowerCase())
    )

    function limparForm() {
        setNome('')
        setEmail('')
        setTelefone('')
        setEspecialidade('')
        setRole('professor')
        setCorPerfil('#CC0000')
        setEditando(null)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmetendo(true)

        try {
            if (editando) {
                const { ok, error } = await atualizarProfessor(editando, { nome, email, telefone, especialidade, role, cor_perfil: corPerfil })
                if (!ok) throw new Error(error ?? 'Erro ao atualizar')
            } else {
                const { error } = await criarprofessor({ nome, email, telefone, especialidade, role, cor_perfil: corPerfil })
                if (error) throw new Error(error)
            }
            setModalAberto(false)
            limparForm()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Erro ao salvar professor.')
        } finally {
            setSubmetendo(false)
        }
    }

    function prepararEdicao(p: Professor) {
        setEditando(p.id)
        setNome(p.nome)
        setEmail(p.email)
        setTelefone(p.telefone || '')
        setEspecialidade(p.especialidade || '')
        setRole(p.role)
        setCorPerfil(p.cor_perfil || '#CC0000')
        setModalAberto(true)
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <GraduationCap className="w-6 h-6 text-[#CC0000]" /> Gestão de Professores
                    </h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {loading ? 'Carregando equipe...' : `${professores.length} Professores cadastrados`}
                    </p>
                </div>
                <button
                    onClick={() => { limparForm(); setModalAberto(true); }}
                    className="bg-gray-900 hover:bg-black text-white text-sm font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 max-w-fit"
                >
                    <UserPlus className="h-4 w-4" /> Cadastrar Professor
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou modalidade..."
                        className="w-full h-11 bg-white border border-gray-200 rounded-xl pl-10 pr-4 text-sm font-medium outline-none focus:border-[#CC0000] focus:ring-2 focus:ring-[#CC0000]/10 transition-all text-gray-900 shadow-sm"
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <LoadingSpinner size="lg" label="Puxando informações da equipe..." />
                </div>
            ) : professores.length === 0 ? (
                <EmptyState
                    icon={GraduationCap}
                    title="Nenhum Professor cadastrado"
                    description="Sua equipe ainda está vazia. Comece adicionando o Argel ou outros professores."
                    action={{ label: 'Cadastrar Primeiro Professor', onClick: () => setModalAberto(true) }}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {professoresFiltrados.map(p => (
                        <div
                            key={p.id}
                            className={`bg-white rounded-3xl border border-gray-100 shadow-sm p-6 transition-all duration-300 relative group overflow-hidden ${!p.ativo ? 'opacity-60 grayscale' : 'hover:shadow-md hover:border-red-100'}`}
                        >
                            {/* Role Badge */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                {p.role === 'super_admin' ? (
                                    <span className="bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-amber-100 flex items-center gap-1 shadow-sm">
                                        <ShieldCheck className="h-2.5 w-2.5" /> Admin Master
                                    </span>
                                ) : (
                                    <span className="bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-blue-100 flex items-center gap-1 shadow-sm">
                                        <GraduationCap className="h-2.5 w-2.5" /> Professor
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div
                                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-lg relative transition-transform group-hover:scale-110 duration-500"
                                    style={{ background: p.cor_perfil || '#CC0000' }}
                                >
                                    {p.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    {p.ativo && <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-4 border-white" />}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 leading-tight group-hover:text-[#CC0000] transition-colors">{p.nome}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{p.especialidade || 'Sem Modalidade'}</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 mb-7">
                                <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                                    <Mail className="h-3.5 w-3.5 text-gray-400" /> {p.email}
                                </div>
                                {p.telefone && (
                                    <div className="flex items-center gap-2.5 text-xs font-bold text-gray-500 bg-gray-50 p-2 rounded-xl border border-gray-100/50">
                                        <Phone className="h-3.5 w-3.5 text-gray-400" /> {p.telefone}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-5 border-t border-gray-100">
                                <button
                                    onClick={() => toggleAtivo(p)}
                                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all border ${p.ativo ? 'bg-white text-gray-500 hover:text-[#CC0000] border-gray-200' : 'bg-green-50 text-green-700 border-green-100'}`}
                                >
                                    {p.ativo ? 'Desativar' : 'Re-ativar'}
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => prepararEdicao(p)}
                                        className="p-2 bg-gray-50 text-gray-400 border border-gray-100 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 rounded-xl transition-all shadow-sm"
                                        title="Editar Perfil"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm('Remover professor permanentemente?')) excluirProfessor(p.id) }}
                                        className="p-2 bg-gray-50 text-gray-400 border border-gray-100 hover:text-red-600 hover:bg-red-50 hover:border-red-100 rounded-xl transition-all shadow-sm"
                                        title="Excluir"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {modalAberto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setModalAberto(false)} />
                    <div className="w-full max-w-lg bg-white rounded-[32px] p-8 shadow-2xl relative z-10 border border-gray-100 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <div className="p-2.5 bg-red-50 rounded-2xl">
                                    <GraduationCap className="h-6 w-6 text-[#CC0000]" />
                                </div>
                                {editando ? 'Editar Professor' : 'Novo Professor'}
                            </h3>
                            <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-900 font-bold p-2 text-2xl leading-none">&times;</button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nome Completo</label>
                                    <input
                                        required
                                        className="w-full h-12 bg-gray-50 border border-gray-200 focus:bg-white rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#CC0000]/10 focus:border-[#CC0000] transition-all text-sm"
                                        value={nome}
                                        onChange={e => setNome(e.target.value)}
                                        placeholder="Ex: Argel Alcantara"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">E-mail de Login</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full h-12 bg-gray-50 border border-gray-200 focus:bg-white rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#CC0000]/10 focus:border-[#CC0000] transition-all text-sm"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="exemplo@ctdoboxe.com.br"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Telefone</label>
                                    <input
                                        className="w-full h-12 bg-gray-50 border border-gray-200 focus:bg-white rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#CC0000]/10 focus:border-[#CC0000] transition-all text-sm"
                                        value={telefone}
                                        onChange={e => setTelefone(e.target.value)}
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Modalidade</label>
                                    <input
                                        className="w-full h-12 bg-gray-50 border border-gray-200 focus:bg-white rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#CC0000]/10 focus:border-[#CC0000] transition-all text-sm"
                                        value={especialidade}
                                        onChange={e => setEspecialidade(e.target.value)}
                                        placeholder="Ex: Boxe / Muay Thai"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nível de Acesso</label>
                                    <select
                                        className="w-full h-12 bg-gray-50 border border-gray-200 focus:bg-white rounded-2xl px-4 font-bold outline-none focus:ring-2 focus:ring-[#CC0000]/10 focus:border-[#CC0000] transition-all text-sm cursor-pointer"
                                        value={role}
                                        onChange={e => setRole(e.target.value as ProfessorRole)}
                                    >
                                        <option value="professor">Professor</option>
                                        <option value="super_admin">Administrador Master</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cor do Card</label>
                                    <div className="flex items-center gap-2 h-12">
                                        <input
                                            type="color"
                                            className="w-12 h-12 p-1 bg-white border border-gray-200 rounded-2xl cursor-pointer"
                                            value={corPerfil}
                                            onChange={e => setCorPerfil(e.target.value)}
                                        />
                                        <span className="text-[10px] font-black text-gray-400">{corPerfil.toUpperCase()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalAberto(false)}
                                    className="flex-1 h-14 rounded-2xl border border-gray-200 text-gray-500 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submetendo}
                                    className="flex-[2] h-14 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs hover:bg-black shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {submetendo ? <LoadingSpinner size="sm" /> : <><CheckCircle2 className="h-4 w-4" /> {editando ? 'Salvar Alterações' : 'Cadastrar Professor'}</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
