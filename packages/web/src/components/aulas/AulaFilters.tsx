'use client'

import { SearchInput } from '@/components/shared/SearchInput'
import type { AulaStatus, CategoriaAula } from '@/hooks/useAulas'

interface AulaFiltersProps {
    busca: string
    onBuscaChange: (value: string) => void
    status: AulaStatus | 'todos'
    onStatusChange: (value: AulaStatus | 'todos') => void
    categoria: CategoriaAula | 'todos'
    onCategoriaChange: (value: CategoriaAula | 'todos') => void
    professor: string
    onProfessorChange: (value: string) => void
    dataInicio: string
    onDataInicioChange: (value: string) => void
    dataFim: string
    onDataFimChange: (value: string) => void
}

const statusOptions: Array<{ value: AulaStatus | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'agendada', label: 'Agendadas' },
    { value: 'realizada', label: 'Realizadas' },
    { value: 'cancelada', label: 'Canceladas' },
]

const categoriaOptions: Array<{ value: CategoriaAula | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todas categorias' },
    { value: 'infantil', label: 'Infantil' },
    { value: 'adulto', label: 'Adulto' },
]

export function AulaFilters({
    busca,
    onBuscaChange,
    status,
    onStatusChange,
    categoria,
    onCategoriaChange,
    professor,
    onProfessorChange,
    dataInicio,
    onDataInicioChange,
    dataFim,
    onDataFimChange,
}: AulaFiltersProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">

                {/* Busca — maior */}
                <div className="min-w-[220px] flex-[2]">
                    <SearchInput
                        value={busca}
                        onChange={onBuscaChange}
                        placeholder="Buscar por titulo da aula..."
                    />
                </div>

                <div className="min-w-[130px] flex-1">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Status
                    </label>
                    <select
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                        value={status}
                        onChange={(event) => onStatusChange(event.target.value as AulaStatus | 'todos')}
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="min-w-[150px] flex-1">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Categoria
                    </label>
                    <select
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                        value={categoria}
                        onChange={(event) => onCategoriaChange(event.target.value as CategoriaAula | 'todos')}
                    >
                        {categoriaOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="min-w-[150px] flex-1">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Professor(a)
                    </label>
                    <SearchInput
                        value={professor}
                        onChange={onProfessorChange}
                        placeholder="Nome do instrutor..."
                    />
                </div>

                <div className="min-w-[140px] flex-1">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        De
                    </label>
                    <input
                        type="date"
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                        value={dataInicio}
                        onChange={(event) => onDataInicioChange(event.target.value)}
                    />
                </div>

                <div className="min-w-[140px] flex-1">
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Até
                    </label>
                    <input
                        type="date"
                        className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-[#CC0000] focus:outline-none focus:ring-2 focus:ring-[#CC0000]/20"
                        value={dataFim}
                        onChange={(event) => onDataFimChange(event.target.value)}
                    />
                </div>

            </div>
        </div>
    )
}
