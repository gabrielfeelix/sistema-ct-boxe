import type { Session, User } from '@supabase/supabase-js'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { AlunoProfile } from '@/lib/types'

type SignInResult = { error: string | null }

interface AuthContextValue {
    session: Session | null
    user: User | null
    aluno: AlunoProfile | null
    loading: boolean
    refreshAluno: () => Promise<void>
    signIn: (email: string, password: string) => Promise<SignInResult>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function withTimeout<T>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(`[Auth] Timeout em ${label} apos ${ms}ms`))
        }, ms)

        Promise.resolve(promiseLike)
            .then((value) => {
                clearTimeout(timeoutId)
                resolve(value)
            })
            .catch((error) => {
                clearTimeout(timeoutId)
                reject(error)
            })
    })
}

async function fetchAlunoProfile(user: User): Promise<AlunoProfile | null> {
    try {
        const byId = await withTimeout(
            supabase.from('alunos').select('*').eq('id', user.id).maybeSingle(),
            5000,
            'busca de aluno por id'
        )
        if (byId.error) {
            console.error('[Auth] Falha ao buscar aluno por id:', byId.error.message)
        }
        if (byId.data) return byId.data as AlunoProfile

        if (!user.email) return null

        const byEmail = await withTimeout(
            supabase.from('alunos').select('*').eq('email', user.email.toLowerCase()).maybeSingle(),
            5000,
            'busca de aluno por email'
        )

        if (byEmail.error) {
            console.error('[Auth] Falha ao buscar aluno por email:', byEmail.error.message)
        }

        return (byEmail.data as AlunoProfile | null) ?? null
    } catch (error) {
        console.error('[Auth] Erro inesperado ao buscar perfil do aluno:', error)
        return null
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [aluno, setAluno] = useState<AlunoProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const refreshAluno = useCallback(async () => {
        const currentUser = session?.user
        if (!currentUser) {
            setAluno(null)
            return
        }

        const profile = await fetchAlunoProfile(currentUser)
        setAluno(profile)
    }, [session?.user])

    useEffect(() => {
        let active = true
        let resolved = false
        let bootstrapTimeoutId: ReturnType<typeof setTimeout> | null = null

        async function hydrateAluno(nextSession: Session | null) {
            if (!active) return

            if (!nextSession?.user) {
                setAluno(null)
                return
            }

            const profile = await fetchAlunoProfile(nextSession.user)
            if (!active) return
            setAluno(profile)
        }

        function resolveSession(nextSession: Session | null) {
            if (!active) return
            resolved = true

            setSession(nextSession)
            setLoading(false)

            if (nextSession?.user) {
                setTimeout(() => {
                    if (!active) return
                    void hydrateAluno(nextSession)
                }, 0)
            } else {
                setAluno(null)
            }
        }

        bootstrapTimeoutId = setTimeout(() => {
            if (!active) return
            console.warn('[Auth] Bootstrap da sessao demorou demais; liberando UI sem sessao persistida.')
            setSession(null)
            setAluno(null)
            setLoading(false)
        }, 5000)

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (bootstrapTimeoutId) {
                clearTimeout(bootstrapTimeoutId)
                bootstrapTimeoutId = null
            }
            resolveSession(nextSession)
        })

        setTimeout(() => {
            if (!active || resolved) return
            void withTimeout(supabase.auth.getSession(), 2000, 'bootstrap de apoio da sessao')
                .then(({ data: { session: currentSession } }) => {
                    if (!active) return
                    resolveSession(currentSession)
                })
                .catch((error) => {
                    if (!active) return
                    console.warn('[Auth] Bootstrap auxiliar da sessao falhou:', error)
                })
        }, 0)

        return () => {
            active = false
            if (bootstrapTimeoutId) {
                clearTimeout(bootstrapTimeoutId)
            }
            subscription?.unsubscribe?.()
        }
    }, [])

    const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
        const normalizedEmail = email.trim().toLowerCase()
        const { error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
        })
        return { error: error?.message ?? null }
    }, [])

    const signOut = useCallback(async () => {
        await supabase.auth.signOut()
        setSession(null)
        setAluno(null)
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            session,
            user: session?.user ?? null,
            aluno,
            loading,
            refreshAluno,
            signIn,
            signOut,
        }),
        [aluno, loading, refreshAluno, session, signIn, signOut]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider')
    }
    return context
}
