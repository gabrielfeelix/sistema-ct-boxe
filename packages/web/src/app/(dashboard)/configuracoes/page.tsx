import Link from 'next/link'
import { BellRing, ChevronRight, CreditCard, Settings2, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

interface ConfigSnapshot {
    planosAtivos: number
    totalPlanos: number
    naoLidas: number
}

async function getConfigSnapshot(): Promise<ConfigSnapshot> {
    const supabase = await createClient()

    const [planosAtivosResult, totalPlanosResult, naoLidasResult] = await Promise.all([
        supabase.from('planos').select('id', { count: 'exact', head: true }).eq('ativo', true),
        supabase.from('planos').select('id', { count: 'exact', head: true }),
        supabase.from('notificacoes').select('id', { count: 'exact', head: true }).eq('lida', false),
    ])

    return {
        planosAtivos: planosAtivosResult.count ?? 0,
        totalPlanos: totalPlanosResult.count ?? 0,
        naoLidas: naoLidasResult.count ?? 0,
    }
}

function ConfigCard({
    title,
    description,
    href,
    icon: Icon,
    tone,
    badge,
}: {
    title: string
    description: string
    href: string
    icon: React.ElementType
    tone: string
    badge?: string
}) {
    const toneClass = tone.replace('/20', '/10')

    return (
        <Link
            href={href}
            className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                    <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 ${toneClass} text-gray-700`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-gray-900">{title}</h3>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-gray-500">{description}</p>
                </div>

                <div className="flex items-center gap-2">
                    {badge && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                            {badge}
                        </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5" />
                </div>
            </div>
        </Link>
    )
}

export default async function ConfiguracoesPage() {
    const snapshot = await getConfigSnapshot()

    return (
        <div className="mx-auto max-w-[1200px] space-y-6 pb-8">
            <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                            <Settings2 className="h-6 w-6 text-[#CC0000]" />
                            Centro de Configuracoes
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Ajuste identidade do admin, planos e regras operacionais do painel.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Planos ativos</p>
                            <p className="mt-1 text-xl font-black text-gray-900">{snapshot.planosAtivos}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Catalogo</p>
                            <p className="mt-1 text-xl font-black text-gray-900">{snapshot.totalPlanos}</p>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Nao lidas</p>
                            <p className="mt-1 text-xl font-black text-red-700">{snapshot.naoLidas}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
                <ConfigCard
                    title="Perfil do Administrador"
                    description="Atualize nome publico, contato principal e credenciais de acesso."
                    href="/configuracoes/perfil"
                    icon={UserRound}
                    tone="bg-blue-400/20"
                />
                <ConfigCard
                    title="Planos e Precificacao"
                    description="Gerencie pacotes mensais, recorrencia e regras de assinatura."
                    href="/configuracoes/planos"
                    icon={CreditCard}
                    tone="bg-orange-400/20"
                />
                <ConfigCard
                    title="Central de Notificacoes"
                    description="Revise alertas do sistema e limpe pendencias de comunicacao."
                    href="/notificacoes"
                    icon={BellRing}
                    tone="bg-red-400/20"
                    badge={snapshot.naoLidas > 0 ? `${snapshot.naoLidas} novas` : undefined}
                />
                <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                    <div className="relative z-10">
                        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight text-gray-900">Seguranca operacional</h3>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-gray-500">
                            Controle de permissoes e auditoria de acessos sera disponibilizado nas proximas iteracoes.
                        </p>
                        <span className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                            Em breve
                        </span>
                    </div>
                </div>
            </section>
        </div>
    )
}
