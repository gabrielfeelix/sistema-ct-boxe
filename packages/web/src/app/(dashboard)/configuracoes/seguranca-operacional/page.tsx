import Link from 'next/link'
import { ArrowUpRight, Bell, KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ROUTES } from '@/constants/routes'

async function getSecuritySnapshot() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    const { count: unreadCount } = await supabase
        .from('notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('lida', false)

    return {
        email: user?.email ?? 'Nao identificado',
        unreadCount: unreadCount ?? 0,
    }
}

export default async function SegurancaOperacionalPage() {
    const snapshot = await getSecuritySnapshot()

    return (
        <div className="mx-auto max-w-6xl space-y-6 pb-8">
            <section className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <h2 className="flex items-center gap-2 text-2xl font-black tracking-tight text-gray-900">
                            <ShieldCheck className="h-6 w-6 text-[#CC0000]" />
                            Seguranca Operacional
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500">
                            Higiene de acesso, atencao a alertas e rotina minima de protecao para manter o painel sob controle.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Conta autenticada</p>
                        <p className="mt-1 text-sm font-black text-emerald-900">{snapshot.email}</p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <StatusCard
                    title="Senha e credenciais"
                    description="Revise sua senha regularmente e evite reaproveitamento em outros servicos."
                    actionLabel="Ir para perfil"
                    href={ROUTES.CONFIG_PERFIL}
                    icon={KeyRound}
                />
                <StatusCard
                    title="Alertas pendentes"
                    description="Notificacoes nao lidas costumam sinalizar cobranca, agenda ou risco operacional."
                    actionLabel="Abrir notificacoes"
                    href={ROUTES.NOTIFICACOES}
                    value={`${snapshot.unreadCount}`}
                    icon={Bell}
                />
                <StatusCard
                    title="Conta administrativa"
                    description="Confira se nome, cargo e contato principal estao atualizados para evitar ruído operacional."
                    actionLabel="Revisar perfil"
                    href={ROUTES.CONFIG_PERFIL}
                    icon={UserRound}
                />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black tracking-tight text-gray-900">Rotina recomendada</h3>
                    <div className="mt-5 space-y-3">
                        {[
                            'Revisar notificacoes nao lidas no inicio e no fim do dia.',
                            'Atualizar senha sempre que houver troca de equipe ou suspeita de compartilhamento.',
                            'Concentrar alteracoes sensiveis em contas administrativas identificadas.',
                            'Evitar acesso ao painel em dispositivos publicos ou sem bloqueio de tela.',
                        ].map((item) => (
                            <div key={item} className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                                <p className="text-sm font-medium leading-6 text-gray-600">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-black tracking-tight text-gray-900">Atalhos administrativos</h3>
                    <div className="mt-5 space-y-3">
                        <QuickLink
                            href={ROUTES.CONFIG_PERFIL}
                            title="Perfil do administrador"
                            description="Atualize nome publico, telefone e senha."
                        />
                        <QuickLink
                            href={ROUTES.NOTIFICACOES}
                            title="Central de notificacoes"
                            description="Use como fila de alerta para acompanhamento gerencial."
                        />
                        <QuickLink
                            href={ROUTES.CONFIGURACOES}
                            title="Central institucional"
                            description="Volte para o hub enxuto de perfil e leitura de alertas."
                        />
                    </div>
                </div>
            </section>
        </div>
    )
}

function StatusCard({
    title,
    description,
    actionLabel,
    href,
    icon: Icon,
    value,
}: {
    title: string
    description: string
    actionLabel: string
    href: string
    icon: React.ElementType
    value?: string
}) {
    return (
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-[#CC0000]">
                    <Icon className="h-5 w-5" />
                </div>
                {value ? <span className="text-2xl font-black tracking-tight text-gray-900">{value}</span> : null}
            </div>
            <h3 className="mt-4 text-lg font-black tracking-tight text-gray-900">{title}</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-gray-500">{description}</p>
            <Link
                href={href}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#CC0000] transition-colors hover:text-[#AA0000]"
            >
                {actionLabel}
                <ArrowUpRight className="h-4 w-4" />
            </Link>
        </div>
    )
}

function QuickLink({
    href,
    title,
    description,
}: {
    href: string
    title: string
    description: string
}) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4 transition-colors hover:bg-gray-100"
        >
            <div>
                <p className="text-sm font-black text-gray-900">{title}</p>
                <p className="mt-1 text-sm font-medium text-gray-500">{description}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400" />
        </Link>
    )
}
