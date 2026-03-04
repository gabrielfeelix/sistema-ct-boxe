export function toBRDate(value?: string | Date | null): string {
    if (!value) return '-'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('pt-BR')
}

export function toBRDateTime(value?: string | Date | null): string {
    if (!value) return '-'
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function toBRTime(value?: string | null): string {
    if (!value) return '--:--'
    if (/^\d{2}:\d{2}$/.test(value)) return value
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 5)
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '--:--'
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function toCurrencyBRL(value?: number | string | null): string {
    const parsed =
        typeof value === 'number'
            ? value
            : value
                ? Number.parseFloat(String(value).replace(',', '.'))
                : 0
    const safe = Number.isFinite(parsed) ? parsed : 0
    return safe.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function getInitials(name?: string | null): string {
    if (!name) return 'AL'
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
    if (parts.length === 0) return 'AL'
    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function daysUntil(dateLike?: string | null): number {
    if (!dateLike) return 999
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return 999
    const now = new Date()
    const onlyDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffMs = onlyDate.getTime() - today.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

export function monthLabel(date: Date): string {
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '').toUpperCase()
}

