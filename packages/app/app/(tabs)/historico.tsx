import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchHistoricoData, type HistoricoData } from '@/lib/appData'

const DAY_HEADERS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

function buildMonthOptions() {
    const today = new Date()
    return Array.from({ length: 5 }, (_, index) => {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - (4 - index), 1)
        return monthDate
    })
}

function buildCalendarWeeks(monthDate: Date) {
    const firstDayIndex = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay()
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()

    const days: Array<number | null> = []
    for (let i = 0; i < firstDayIndex; i += 1) days.push(null)
    for (let day = 1; day <= daysInMonth; day += 1) days.push(day)
    while (days.length % 7 !== 0) days.push(null)

    const weeks: Array<Array<number | null>> = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }
    return weeks
}

function emptyHistorico(monthLabel: string): HistoricoData {
    return {
        mesLabel: monthLabel,
        resumo: {
            mes: 0,
            sequencia: 0,
            total: 0,
        },
        diasComPresenca: [],
        presencasLista: [],
    }
}

export default function HistoricoScreen() {
    const { aluno } = useAuth()
    const monthOptions = useMemo(buildMonthOptions, [])
    const [mesAtualIndex, setMesAtualIndex] = useState(monthOptions.length - 1)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [historico, setHistorico] = useState<HistoricoData>(
        emptyHistorico(monthOptions[monthOptions.length - 1].toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }))
    )
    const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null)

    const selectedMonth = monthOptions[mesAtualIndex]
    const weeks = useMemo(() => buildCalendarWeeks(selectedMonth), [selectedMonth])

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoading(false)
            return
        }
        try {
            const yearStr = selectedMonth.getFullYear()
            const monthStr = (selectedMonth.getMonth() + 1).toString().padStart(2, '0')
            const filterStr = `${yearStr}-${monthStr}`

            const data = await fetchHistoricoData(aluno.id, filterStr)
            setHistorico(data)
        } catch (error) {
            console.error('[Historico] Erro ao carregar historico:', error)
        } finally {
            setLoading(false)
        }
    }, [aluno?.id, selectedMonth])

    useEffect(() => {
        loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }, [loadData])

    const handlePrevMonth = () => {
        if (mesAtualIndex > 0) {
            setMesAtualIndex((prev) => prev - 1)
            setDiaSelecionado(null)
        }
    }

    const handleNextMonth = () => {
        if (mesAtualIndex < monthOptions.length - 1) {
            setMesAtualIndex((prev) => prev + 1)
            setDiaSelecionado(null)
        }
    }

    const today = new Date()
    const isCurrentMonth =
        selectedMonth.getMonth() === today.getMonth() && selectedMonth.getFullYear() === today.getFullYear()

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 border-b border-slate-100 bg-white px-6 pb-8 pt-16">
                <Text className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">Estatisticas</Text>
                <Text className="text-4xl font-black tracking-tight text-slate-900">Historico</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="px-6 pt-8">
                    <View className="mb-10 flex-row justify-between gap-x-4">
                        <View className="flex-1 items-center justify-center rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50">
                            <View className="mb-3 h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="calendar" size={14} color="#64748B" />
                            </View>
                            <Text className="text-3xl font-black tracking-tighter text-[#CC0000]">
                                {historico.resumo.mes}
                            </Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Neste mes
                            </Text>
                        </View>

                        <View className="relative flex-[1.2] items-center justify-center overflow-hidden rounded-3xl bg-slate-900 p-5 shadow-lg shadow-slate-900/20">
                            <View className="absolute -right-4 -top-4 opacity-10">
                                <FontAwesome5 name="fire" size={60} color="#FFFFFF" />
                            </View>
                            <View className="mb-3 h-8 w-8 items-center justify-center rounded-full bg-white/10">
                                <FontAwesome5 name="fire" size={14} color="#FFFFFF" />
                            </View>
                            <Text className="text-3xl font-black tracking-tighter text-white">
                                {historico.resumo.sequencia}
                            </Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                                Sequencia
                            </Text>
                        </View>

                        <View className="flex-1 items-center justify-center rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50">
                            <View className="mb-3 h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="activity" size={14} color="#64748B" />
                            </View>
                            <Text className="text-3xl font-black tracking-tighter text-[#CC0000]">
                                {historico.resumo.total}
                            </Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                Total
                            </Text>
                        </View>
                    </View>

                    <View className="rounded-t-2xl border-x border-t border-slate-100 bg-white p-2 shadow-sm shadow-slate-200/30">
                        <View className="flex-row items-center justify-between">
                            <TouchableOpacity
                                activeOpacity={0.6}
                                disabled={mesAtualIndex === 0}
                                onPress={handlePrevMonth}
                                className={`h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${mesAtualIndex === 0 ? 'opacity-40' : ''
                                    }`}
                            >
                                <Feather name="chevron-left" size={20} color="#64748B" />
                            </TouchableOpacity>

                            <Text className="text-lg font-black uppercase tracking-tight text-slate-900">
                                {historico.mesLabel}
                            </Text>

                            <TouchableOpacity
                                activeOpacity={0.6}
                                disabled={mesAtualIndex === monthOptions.length - 1}
                                onPress={handleNextMonth}
                                className={`h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${mesAtualIndex === monthOptions.length - 1 ? 'opacity-40' : ''
                                    }`}
                            >
                                <Feather name="chevron-right" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="mb-10 overflow-hidden rounded-b-2xl border border-slate-100 bg-white shadow-sm shadow-slate-200/50">
                        <View className="flex-row border-b border-slate-100 bg-slate-50">
                            {DAY_HEADERS.map((day) => (
                                <View key={day} className="flex-1 items-center py-3">
                                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {day}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        <View className="p-4 pb-6">
                            {weeks.map((semana, indexSemana) => (
                                <View key={`week-${indexSemana}`} className="flex-row mb-3 last:mb-0">
                                    {semana.map((dia, indexDia) => {
                                        const hasPresenca = dia ? historico.diasComPresenca.includes(dia) : false
                                        const isHoje = Boolean(dia && isCurrentMonth && dia === today.getDate())

                                        const handleDayPress = () => {
                                            if (!dia) return
                                            setDiaSelecionado(dia)
                                        }

                                        return (
                                            <TouchableOpacity
                                                key={dia ?? `empty-${indexSemana}-${indexDia}`}
                                                className="relative flex-1 items-center justify-center px-1"
                                                disabled={!dia}
                                                activeOpacity={0.7}
                                                onPress={handleDayPress}
                                            >
                                                {dia && (
                                                    <View
                                                        className={`items-center justify-center h-10 w-10 ${diaSelecionado === dia
                                                            ? ''
                                                            : isHoje && !hasPresenca
                                                                ? 'border-2 border-slate-900 bg-white'
                                                                : hasPresenca
                                                                    ? 'border border-red-100 bg-red-50'
                                                                    : 'bg-transparent'
                                                            }`}
                                                        style={{
                                                            backgroundColor: diaSelecionado === dia ? '#CC0000' : undefined,
                                                            borderRadius: 9999
                                                        }}
                                                    >
                                                        <Text
                                                            className={`text-base font-bold ${diaSelecionado === dia
                                                                ? ''
                                                                : isHoje && !hasPresenca
                                                                    ? 'text-slate-900'
                                                                    : hasPresenca
                                                                        ? 'text-[#CC0000]'
                                                                        : 'text-slate-600'
                                                                }`}
                                                            style={{
                                                                color: diaSelecionado === dia ? '#FFFFFF' : undefined
                                                            }}
                                                        >
                                                            {dia}
                                                        </Text>
                                                        {hasPresenca && diaSelecionado !== dia && (
                                                            <View className="absolute bottom-2 h-1.5 w-1.5 rounded-full bg-[#CC0000]" />
                                                        )}
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            ))}
                        </View>
                    </View>

                    <View>
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">
                            Aulas Concluidas
                        </Text>

                        {loading ? (
                            <View className="rounded-3xl border border-slate-100 bg-white p-6">
                                <Text className="text-sm text-slate-500">Carregando historico...</Text>
                            </View>
                        ) : historico.presencasLista.length > 0 ? (
                            <View className="rounded-3xl border border-slate-100 bg-white p-2 shadow-sm shadow-slate-200/50">
                                {historico.presencasLista.map((presenca, index) => (
                                    <View
                                        key={presenca.id}
                                        className={`flex-row items-center p-4 ${index !== historico.presencasLista.length - 1
                                            ? 'border-b border-slate-50'
                                            : ''
                                            }`}
                                    >
                                        <View className="mr-5 h-12 w-12 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                                            <Feather name="check" size={18} color="#10B981" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="mb-1 text-lg font-bold tracking-tight text-slate-900">
                                                {presenca.aula}
                                            </Text>
                                            <View className="flex-row items-center">
                                                <Feather name="clock" size={12} color="#94A3B8" />
                                                <Text className="ml-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                                                    {presenca.data}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View className="items-center justify-center rounded-3xl border border-dashed border-slate-100 bg-white px-8 py-16">
                                <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                                    <Feather name="inbox" size={32} color="#CBD5E1" />
                                </View>
                                <Text className="text-center text-lg font-bold leading-relaxed tracking-tight text-slate-400">
                                    Nenhuma presenca neste mes
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

