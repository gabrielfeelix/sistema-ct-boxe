'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CONTRATO_PADRAO_SLUG } from '@/lib/contracts/template'
import type { ContratoModelo } from '@/types'

interface UseContratoModelosOptions {
    slug?: string
    apenasAtivo?: boolean
}

export function useContratoModelos({ slug = CONTRATO_PADRAO_SLUG, apenasAtivo = false }: UseContratoModelosOptions = {}) {
    const supabase = createClient()
    const [modelos, setModelos] = useState<ContratoModelo[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        setError(null)

        let query = supabase
            .from('contrato_modelos')
            .select('*')
            .eq('slug', slug)
            .order('versao', { ascending: false })

        if (apenasAtivo) {
            query = query.eq('ativo', true).limit(1)
        }

        const { data, error: queryError } = await query

        if (queryError) {
            console.error(queryError)
            setError('Nao foi possivel carregar os modelos de contrato.')
            setModelos([])
            setLoading(false)
            return
        }

        setModelos((data as ContratoModelo[]) ?? [])
        setLoading(false)
    }, [apenasAtivo, slug, supabase])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetch()
        }, 0)

        return () => clearTimeout(timer)
    }, [fetch])

    return {
        modelos,
        modeloAtivo: modelos.find((modelo) => modelo.ativo) ?? null,
        loading,
        error,
        refetch: fetch,
    }
}
