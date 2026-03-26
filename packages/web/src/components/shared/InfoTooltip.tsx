'use client'

import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface InfoTooltipProps {
    label: string
    description: string
}

export function InfoTooltip({ label, description }: InfoTooltipProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition-colors hover:border-gray-300 hover:text-gray-600"
                >
                    <Info className="h-3.5 w-3.5" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 rounded-2xl border-gray-200 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">{label}</p>
                <p className="mt-1 text-sm font-medium leading-6 text-gray-600">{description}</p>
            </PopoverContent>
        </Popover>
    )
}
