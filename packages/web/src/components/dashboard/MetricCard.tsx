import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'

function cn(...classes: Array<string | boolean | undefined>) {
    return classes.filter(Boolean).join(' ')
}

interface MetricCardProps {
    title: string
    value: string
    subtitle?: string
    icon: LucideIcon
    trend?: {
        value: string
        positive: boolean
    }
    variant?: 'default' | 'danger' | 'warning' | 'success'
}

export function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = 'default',
}: MetricCardProps) {
    const iconColors = {
        default: 'bg-blue-50 text-blue-600',
        danger: 'bg-red-50 text-red-600',
        warning: 'bg-yellow-50 text-yellow-600',
        success: 'bg-green-50 text-green-600',
    }

    return (
        <div className="cursor-default rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
                    {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
                    {trend && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
                                    trend.positive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                )}
                            >
                                {trend.positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                                <span>{trend.value}</span>
                            </span>
                            <span className="text-xs font-medium leading-relaxed text-gray-400">Comparado ao periodo anterior</span>
                        </div>
                    )}
                </div>

                <div className={cn('shrink-0 rounded-xl p-3 shadow-sm', iconColors[variant])}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    )
}
