import { Feather, FontAwesome5 } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

type IconTone = {
    color: string
    backgroundColor: string
}

export type NotificationIconConfig = {
    icon: string
    tone: IconTone
}

type Props = {
    icon: string
    size?: number
    color: string
}

function renderFeather(name: ComponentProps<typeof Feather>['name'], size: number, color: string) {
    return <Feather name={name} size={size} color={color} />
}

export function resolveNotificationIcon(icon?: string | null, tipo?: string | null): NotificationIconConfig {
    const normalized = String(icon ?? '').toLowerCase()
    const fallbackType = String(tipo ?? '').toLowerCase()

    const toneByIcon: Record<string, IconTone> = {
        bell: { color: '#64748B', backgroundColor: '#E2E8F0' },
        calendar: { color: '#2563EB', backgroundColor: '#DBEAFE' },
        'credit-card': { color: '#DC2626', backgroundColor: '#FEE2E2' },
        'alert-triangle': { color: '#EA580C', backgroundColor: '#FFEDD5' },
        instagram: { color: '#C026D3', backgroundColor: '#FAE8FF' },
        youtube: { color: '#DC2626', backgroundColor: '#FEE2E2' },
        megaphone: { color: '#7C3AED', backgroundColor: '#EDE9FE' },
        user: { color: '#0F766E', backgroundColor: '#CCFBF1' },
        'message-circle': { color: '#0284C7', backgroundColor: '#E0F2FE' },
        heart: { color: '#DC2626', backgroundColor: '#FEE2E2' },
        star: { color: '#CA8A04', backgroundColor: '#FEF3C7' },
    }

    const fallbackByType: Record<string, string> = {
        pagamento: 'credit-card',
        video: 'youtube',
        aula: 'calendar',
        evento: 'star',
        ct: 'bell',
    }

    const mappedIcon =
        normalized === 'calendar-days' || normalized === 'calendar-plus'
            ? 'calendar'
            : normalized === 'shield-alert' || normalized === 'party-popper'
              ? normalized === 'party-popper'
                    ? 'star'
                    : 'alert-triangle'
              : normalized === 'user-check'
                ? 'user'
                : normalized === 'message-square'
                  ? 'message-circle'
                  : normalized === 'play-circle'
                    ? 'youtube'
                    : normalized || fallbackByType[fallbackType] || 'bell'

    return {
        icon: mappedIcon,
        tone: toneByIcon[mappedIcon] ?? toneByIcon.bell,
    }
}

export default function NotificationIcon({ icon, size = 18, color }: Props) {
    switch (icon) {
        case 'star':
            return <FontAwesome5 name="star" size={size - 1} color={color} solid />
        case 'user':
            return <FontAwesome5 name="user-check" size={size - 2} color={color} solid />
        case 'youtube':
            return <FontAwesome5 name="youtube" size={size} color={color} />
        case 'instagram':
            return <Feather name="instagram" size={size} color={color} />
        case 'megaphone':
            return <FontAwesome5 name="bullhorn" size={size - 1} color={color} />
        case 'credit-card':
            return renderFeather('credit-card', size, color)
        case 'calendar':
            return renderFeather('calendar', size, color)
        case 'alert-triangle':
            return renderFeather('alert-triangle', size, color)
        case 'message-circle':
            return renderFeather('message-circle', size, color)
        case 'heart':
            return renderFeather('heart', size, color)
        default:
            return renderFeather('bell', size, color)
    }
}
