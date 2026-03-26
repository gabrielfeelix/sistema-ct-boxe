import Link from 'next/link'
import { BellRing, ChevronRight, Settings2, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'

interface ConfigSnapshot {
    naoLidas: number
}

async function getConfigSnapshot(): Promise<ConfigSnapshot> {
    const supabase = await createClient()
    const { count } = await supabase.from('notificacoes').select('id', { count: 'exact', head: true }).eq('lida', false)

    return {
        naoLidas: count ?? 0,
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
    return (
        <Link
            href={href}
            className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
            <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                    <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 ${tone} text-gray-700`}>
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
        <div className="mx-auto max-w-[1100px] space-y-6 pb-8">
            <section className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
                <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                            <Settings2 className="h-6 w-6 text-[#CC0000]" />
                            Central Institucional
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Esta area ficou reservada para identidade da conta administrativa e leitura centralizada de alertas.
                            Contratos, planos, financeiro e seguranca operacional agora ficam direto na sidebar.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nao lidas</p>
                        <p className="mt-1 text-2xl font-black text-gray-900">{snapshot.naoLidas}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gray-400">
                            central de notificacoes
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
                <ConfigCard
                    title="Perfil do Administrador"
                    description="Atualize nome publico, contato principal e os dados usados no painel."
                    href={ROUTES.CONFIG_PERFIL}
                    icon={UserRound}
                    tone="bg-blue-50"
                />
                <ConfigCard
                    title="Central de Notificacoes"
                    description="Revise alertas operacionais, comunicados e regras automaticas do sistema."
                    href={ROUTES.NOTIFICACOES}
                    icon={BellRing}
                    tone="bg-red-50"
                    badge={snapshot.naoLidas > 0 ? `${snapshot.naoLidas} novas` : undefined}
                />
            </section>
        </div>
    )
}
