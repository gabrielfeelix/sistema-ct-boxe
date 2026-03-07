/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post, Story } from '@/types'

export function useFeed() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetch = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
        setPosts((data as Post[]) ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    return { posts, loading, refetch: fetch }
}

export function useStories() {
    const [stories, setStories] = useState<Story[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    const fetch = useCallback(async () => {
        setLoading(true)
        const [categoriasRes, videosRes] = await Promise.all([
            supabase
                .from('trilhas_categorias')
                .select('id, nome, capa_url, ativo, created_at')
                .eq('ativo', true)
                .order('ordem', { ascending: true })
                .order('created_at', { ascending: true }),
            supabase
                .from('trilhas_videos')
                .select('id, categoria_id')
                .eq('ativo', true),
        ])

        const categorias = (categoriasRes.data as Array<{ id: string; nome: string; capa_url?: string | null; ativo: boolean; created_at: string }>) ?? []
        const videos = (videosRes.data as Array<{ id: string; categoria_id: string }>) ?? []
        const countByCategoria = videos.reduce<Record<string, number>>((acc, video) => {
            acc[video.categoria_id] = (acc[video.categoria_id] ?? 0) + 1
            return acc
        }, {})

        setStories(
            categorias
                .filter((categoria) => (countByCategoria[categoria.id] ?? 0) > 0)
                .map((categoria) => ({
                    id: categoria.id,
                    nome: categoria.nome,
                    capa_url: categoria.capa_url ?? null,
                    total_videos: countByCategoria[categoria.id] ?? 0,
                    ativo: categoria.ativo,
                    created_at: categoria.created_at,
                }))
        )
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    return { stories, loading, refetch: fetch }
}
