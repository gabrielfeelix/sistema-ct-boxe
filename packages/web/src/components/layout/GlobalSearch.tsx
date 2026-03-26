'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, FileText, UserCheck, Users, Loader2, FileSignature } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SearchResult = {
    id: string
    title: string
    subtitle: string
    type: 'aluno' | 'candidato' | 'contrato' | 'plano'
    href: string
    icon: React.ElementType
}

type ContratoSearchRow = {
    id: string
    status: string
    aluno: { nome?: string | null } | Array<{ nome?: string | null }> | null
}

function getAlunoContratoNome(aluno: ContratoSearchRow['aluno']) {
    if (Array.isArray(aluno)) {
        return aluno[0]?.nome ?? null
    }

    return aluno?.nome ?? null
}

export function GlobalSearch() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!query || query.length < 2) {
            return
        }

        const timer = setTimeout(async () => {
            setLoading(true)
            const q = `%${query}%`

            const [
                { data: alunos },
                { data: candidatos },
                { data: contratos },
                { data: planos },
            ] = await Promise.all([
                supabase.from('alunos').select('id, nome, email, status').ilike('nome', q).limit(3),
                supabase.from('candidatos').select('id, nome, email, status').ilike('nome', q).limit(3),
                supabase.from('contratos').select('id, status, aluno:aluno_id(nome)').ilike('aluno.nome', q).limit(3),
                supabase.from('planos').select('id, nome, tipo').ilike('nome', q).limit(2),
            ])

            const formatted: SearchResult[] = []

            if (alunos) {
                formatted.push(...alunos.map((a) => ({
                    id: a.id,
                    title: a.nome,
                    subtitle: a.status === 'ativo' ? 'Aluno Ativo' : 'Aluno Inativo',
                    type: 'aluno' as const,
                    href: `/alunos/${a.id}`,
                    icon: Users,
                })))
            }

            if (candidatos) {
                formatted.push(...candidatos.map((c) => ({
                    id: c.id,
                    title: c.nome,
                    subtitle: c.status === 'aguardando' ? 'Processo Seletivo' : c.status,
                    type: 'candidato' as const,
                    href: `/candidatos/${c.id}`,
                    icon: UserCheck,
                })))
            }

            if (contratos) {
                formatted.push(...contratos.map((c) => ({
                    id: c.id,
                    title: getAlunoContratoNome((c as ContratoSearchRow).aluno) || 'Contrato Sem Nome',
                    subtitle: `Status: ${c.status}`,
                    type: 'contrato' as const,
                    href: `/contratos/${c.id}`,
                    icon: FileSignature,
                })))
            }

            if (planos) {
                formatted.push(...planos.map((p) => ({
                    id: p.id,
                    title: p.nome,
                    subtitle: `Plano ${p.tipo.toUpperCase()}`,
                    type: 'plano' as const,
                    href: `/configuracoes/planos`,
                    icon: FileText,
                })))
            }

            setResults(formatted)
            setLoading(false)
        }, 300)

        return () => clearTimeout(timer)
    }, [query, supabase])

    const visibleResults = query.length >= 2 ? results : []

    const groups = visibleResults.reduce((acc, result) => {
        if (!acc[result.type]) acc[result.type] = []
        acc[result.type]!.push(result)
        return acc
    }, {} as Partial<Record<SearchResult['type'], SearchResult[]>>)

    const labels: Record<SearchResult['type'], string> = {
        aluno: 'Alunos',
        candidato: 'Candidatos',
        contrato: 'Contratos',
        plano: 'Planos',
    }

    return (
        <div ref={wrapperRef} className="relative z-50 ml-auto w-full max-w-[320px]">
            <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        const nextQuery = e.target.value
                        setQuery(nextQuery)
                        if (nextQuery.length < 2) {
                            setResults([])
                            setLoading(false)
                        }
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder="Busque por ID, nome, etc."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/80 pl-9 pr-10 text-sm font-medium text-gray-800 shadow-sm transition-all placeholder:text-gray-400 focus:border-[#CC0000] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                />
                {loading && (
                    <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-gray-400" />
                )}
            </div>

            {open && (query.length > 0 || visibleResults.length > 0) && (
                <div className="absolute left-0 right-0 top-full mt-2 w-[400px] max-w-[calc(100vw-48px)] origin-top overflow-hidden rounded-xl border border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:left-auto sm:right-auto">
                    <div className="custom-scrollbar max-h-[60vh] overflow-y-auto overscroll-contain px-2 py-3">
                        {query.length > 0 && query.length < 2 && (
                            <p className="py-6 text-center text-xs font-medium text-gray-400">Digite mais caracteres...</p>
                        )}

                        {query.length >= 2 && !loading && visibleResults.length === 0 && (
                            <div className="py-8 text-center">
                                <Search className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                                <p className="text-sm font-bold text-gray-900">Sem resultados</p>
                                <p className="mt-0.5 text-xs text-gray-500">Nenhum dado encontrado para &quot;{query}&quot;.</p>
                            </div>
                        )}

                        {Object.entries(groups).map(([type, items]) => (
                            <div key={type} className="mb-3 last:mb-0">
                                <h4 className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {labels[type as SearchResult['type']] || type}
                                </h4>
                                <div className="space-y-1">
                                    {items?.map((item) => {
                                        const Icon = item.icon
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => {
                                                    setOpen(false)
                                                    setQuery('')
                                                    router.push(item.href)
                                                }}
                                                className="group flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-gray-50"
                                            >
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[#CC0000] transition-colors group-hover:bg-[#CC0000] group-hover:text-white">
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-[#CC0000]">
                                                        {item.title}
                                                    </p>
                                                    <p className="truncate text-xs font-medium text-gray-400">
                                                        {item.subtitle}
                                                    </p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 bg-gray-50 p-2.5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Pesquisa Global KITAMO</p>
                    </div>
                </div>
            )}
        </div>
    )
}
