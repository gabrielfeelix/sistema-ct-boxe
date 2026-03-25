'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type ProfessorRole = 'super_admin' | 'professor'

export interface Professor {
    id: string
    auth_user_id?: string | null
    nome: string
    email: string
    telefone?: string | null
    foto_url?: string | null
    bio?: string | null
    especialidade?: string | null
    role: ProfessorRole
    ativo: boolean
    cor_perfil: string
    created_at: string
    updated_at: string
}

export interface CriarProfessorPayload {
    nome: string
    email: string
    telefone?: string
    bio?: string
    especialidade?: string
    role?: ProfessorRole
    cor_perfil?: string
}

export interface AtualizarProfessorPayload extends Partial<CriarProfessorPayload> {
    ativo?: boolean
    foto_url?: string
}

export function useProfessores() {
    const supabase = createClient()
    const [professores, setProfessores] = useState<Professor[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchProfessores = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const { data, error: err } = await supabase
                .from('professores')
                .select('*')
                .order('role', { ascending: true }) // super_admin primeiro
                .order('nome', { ascending: true })

            if (err) throw err
            setProfessores((data as Professor[]) ?? [])
        } catch (e) {
            console.error(e)
            setError('Não foi possível carregar os professores.')
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        fetchProfessores()
    }, [fetchProfessores])

    const criarprofessor = useCallback(
        async (payload: CriarProfessorPayload): Promise<{ data: Professor | null; error: string | null }> => {
            if (!payload.nome.trim() || !payload.email.trim()) {
                return { data: null, error: 'Nome e e-mail são obrigatórios.' }
            }

            const { data, error: err } = await supabase
                .from('professores')
                .insert({ ...payload, ativo: true })
                .select('*')
                .single()

            if (err) {
                console.error(err)
                if (err.message?.includes('unique') || err.code === '23505') {
                    return { data: null, error: 'Já existe um professor com este e-mail.' }
                }
                return { data: null, error: 'Não foi possível criar o professor.' }
            }

            await fetchProfessores()
            toast.success(`Professor ${payload.nome} cadastrado com sucesso!`)
            return { data: data as Professor, error: null }
        },
        [supabase, fetchProfessores]
    )

    const atualizarProfessor = useCallback(
        async (id: string, payload: AtualizarProfessorPayload): Promise<{ ok: boolean; error: string | null }> => {
            const { error: err } = await supabase
                .from('professores')
                .update(payload)
                .eq('id', id)

            if (err) {
                console.error(err)
                return { ok: false, error: 'Não foi possível atualizar o professor.' }
            }

            await fetchProfessores()
            toast.success('Professor atualizado!')
            return { ok: true, error: null }
        },
        [supabase, fetchProfessores]
    )

    const toggleAtivo = useCallback(
        async (professor: Professor): Promise<void> => {
            const { error: err } = await supabase
                .from('professores')
                .update({ ativo: !professor.ativo })
                .eq('id', professor.id)

            if (err) {
                toast.error('Erro ao atualizar status.')
                return
            }

            await fetchProfessores()
            toast.success(professor.ativo ? `${professor.nome} desativado.` : `${professor.nome} ativado.`)
        },
        [supabase, fetchProfessores]
    )

    const excluirProfessor = useCallback(
        async (id: string): Promise<{ ok: boolean; error: string | null }> => {
            const { error: err } = await supabase
                .from('professores')
                .delete()
                .eq('id', id)

            if (err) {
                console.error(err)
                return { ok: false, error: 'Não foi possível remover o professor.' }
            }

            await fetchProfessores()
            toast.success('Professor removido.')
            return { ok: true, error: null }
        },
        [supabase, fetchProfessores]
    )

    return {
        professores,
        loading,
        error,
        refetch: fetchProfessores,
        criarprofessor,
        atualizarProfessor,
        toggleAtivo,
        excluirProfessor,
    }
}

// Hook mais simples — apenas para pegar a lista para selects
export function useProfessoresSelect() {
    const supabase = createClient()
    const [professores, setProfessores] = useState<Pick<Professor, 'id' | 'nome' | 'cor_perfil' | 'role' | 'ativo' | 'email' | 'foto_url'>[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase
            .from('professores')
            .select('id,nome,cor_perfil,role,ativo,email,foto_url')
            .eq('ativo', true)
            .order('nome')
            .then(({ data }) => {
                setProfessores(data ?? [])
                setLoading(false)
            })
    }, [supabase])

    return { professores, loading }
}
