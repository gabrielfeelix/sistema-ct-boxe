import type { Session, User } from '@supabase/supabase-js'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

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

// Timeout helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout após ${timeoutMs}ms`)), timeoutMs)
        ),
    ])
}

async function fetchAlunoProfile(user: User): Promise<AlunoProfile | null> {
    try {
        // Timeout de 10 segundos para evitar travamento
        const byId = await withTimeout(
            supabase.from('alunos').select('*').eq('id', user.id).maybeSingle(),
            10000
        )

        if (byId.error) {
            console.error('[Auth] Falha ao buscar aluno por id:', byId.error.message)
        }
        if (byId.data) return byId.data as AlunoProfile

        if (!user.email) return null

        const byEmail = await withTimeout(
            supabase.from('alunos').select('*').eq('email', user.email.toLowerCase()).maybeSingle(),
            10000
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

        async function resolveSession(nextSession: Session | null) {
            if (!active) return

            setLoading(true)
            setSession(nextSession)

            try {
                if (nextSession?.user) {
                    const profile = await fetchAlunoProfile(nextSession.user)
                    if (!active) return
                    setAluno(profile)
                } else {
                    setAluno(null)
                }
            } catch (error) {
                if (!active) return
                console.error('[Auth] Erro ao resolver sessão:', error)
                setAluno(null)
            } finally {
                if (active) setLoading(false)
            }
        }

        async function bootstrap() {
            try {
                // Timeout de 15s para evitar travamento em rede ruim
                const {
                    data: { session: currentSession },
                } = await withTimeout(supabase.auth.getSession(), 15000)

                if (!active) return
                await resolveSession(currentSession)
            } catch (error) {
                if (!active) return
                console.error('[Auth] Erro no bootstrap da sessão:', error)
                // CRÍTICO: Sempre finalizar loading mesmo em erro
                setSession(null)
                setAluno(null)
                setLoading(false)
            }
        }

        // Timeout de fallback caso tudo falhe
        const fallbackTimeout = setTimeout(() => {
            if (active && loading) {
                console.warn('[Auth] Timeout de fallback - forçando loading=false após 20s')
                setLoading(false)
            }
        }, 20000)

        bootstrap()

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
            await resolveSession(nextSession)
        })

        return () => {
            active = false
            clearTimeout(fallbackTimeout)
            if (subscription?.unsubscribe) {
                subscription.unsubscribe()
            }
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
