'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Evento {
    id: string
    titulo: string
    descricao: string
    data_evento: string
    local: string
    icone: string // 'churras' | 'boxe' | 'social' | 'treino'
    destaque: boolean
    ativo: boolean
    confirmados: number
    created_at: string
    updated_at: string
}

export interface EventoFormValues {
    titulo: string
    descricao: string
    data_evento: string
    local: string
    icone: string
    destaque: boolean
}

export function useEventos() {
    const [loading, setLoading] = useState(false)

    const listarEventos = useCallback(async () => {
        const supabase = createClient()
        setLoading(true)
        const { data, error } = await supabase
            .from('eventos')
            .select('*')
            .order('data_evento', { ascending: false })

        setLoading(false)

        if (error) {
            console.error('Erro ao listar eventos:', error)
            return { data: [], error: error.message }
        }

        return { data: data as Evento[], error: null }
    }, [])

    const criarEvento = useCallback(async (values: EventoFormValues) => {
        const supabase = createClient()
        setLoading(true)
        const { data, error } = await supabase
            .from('eventos')
            .insert({
                titulo: values.titulo,
                descricao: values.descricao,
                data_evento: values.data_evento,
                local: values.local,
                icone: values.icone,
                destaque: values.destaque,
                ativo: true,
                confirmados: 0,
            })
            .select()
            .single()

        setLoading(false)

        if (error) {
            console.error('Erro ao criar evento:', error)
            return { data: null, error: error.message }
        }

        return { data: data as Evento, error: null }
    }, [])

    const atualizarEvento = useCallback(async (id: string, values: Partial<EventoFormValues>) => {
        const supabase = createClient()
        setLoading(true)
        const { data, error } = await supabase
            .from('eventos')
            .update({
                ...values,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        setLoading(false)

        if (error) {
            console.error('Erro ao atualizar evento:', error)
            return { data: null, error: error.message }
        }

        return { data: data as Evento, error: null }
    }, [])

    const deletarEvento = useCallback(async (id: string) => {
        const supabase = createClient()
        setLoading(true)
        const { error } = await supabase
            .from('eventos')
            .delete()
            .eq('id', id)

        setLoading(false)

        if (error) {
            console.error('Erro ao deletar evento:', error)
            return { error: error.message }
        }

        return { error: null }
    }, [])

    return {
        loading,
        listarEventos,
        criarEvento,
        atualizarEvento,
        deletarEvento,
    }
}
