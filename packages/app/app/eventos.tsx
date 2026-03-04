import { useEffect, useMemo, useState } from 'react'
import { Animated, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

import { useAuth } from '@/contexts/AuthContext'
import { fetchEventos, setConfirmacaoEvento } from '@/lib/appData'
import { toBRDate } from '@/lib/formatters'
import type { EventoApp } from '@/lib/types'

interface MonthOption {
    key: string
    label: string
}

function monthKey(dateIso: string) {
    const date = new Date(dateIso)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(dateIso: string) {
    const date = new Date(dateIso)
    return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()
}

function startOfToday() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export default function EventosScreen() {
    const router = useRouter()
    const { aluno } = useAuth()
    const [eventos, setEventos] = useState<EventoApp[]>([])
    const [mesAtualIndex, setMesAtualIndex] = useState(0)
    const [animValues, setAnimValues] = useState<Record<string, Animated.Value>>({})
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const getAnimValue = (id: string) => {
        if (!animValues[id]) {
            const newVal = new Animated.Value(1)
            setAnimValues((prev) => ({ ...prev, [id]: newVal }))
            return newVal
        }
        return animValues[id]
    }

    const monthOptions = useMemo<MonthOption[]>(() => {
        const map = new Map<string, MonthOption>()
        eventos
            .slice()
            .sort((a, b) => (a.data_evento > b.data_evento ? 1 : -1))
            .forEach((evento) => {
                const key = monthKey(evento.data_evento)
                if (!map.has(key)) {
                    map.set(key, { key, label: monthLabel(evento.data_evento) })
                }
            })
        return [...map.values()]
    }, [eventos])

    const mesAtual = monthOptions[mesAtualIndex]?.key ?? null

    const eventosFiltrados = useMemo(() => {
        if (!mesAtual) return []
        return eventos.filter((evento) => monthKey(evento.data_evento) === mesAtual)
    }, [eventos, mesAtual])

    const loadEventos = async (isRefresh = false) => {
        if (!aluno?.id) {
            setEventos([])
            setLoading(false)
            setRefreshing(false)
            return
        }

        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const data = await fetchEventos(aluno.id)
            setEventos(data)

            const currentKey = monthKey(new Date().toISOString())
            const nextMonths = [...new Set(data.map((evento) => monthKey(evento.data_evento)))].sort()
            const currentIndex = nextMonths.findIndex((key) => key === currentKey)
            setMesAtualIndex(currentIndex >= 0 ? currentIndex : 0)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        loadEventos()
    }, [aluno?.id])

    const handlePrevMonth = () => {
        if (mesAtualIndex > 0) {
            setMesAtualIndex((prev) => prev - 1)
        }
    }

    const handleNextMonth = () => {
        if (mesAtualIndex < monthOptions.length - 1) {
            setMesAtualIndex((prev) => prev + 1)
        }
    }

    const handleConfirmacao = async (evento: EventoApp, confirmar: boolean) => {
        if (!aluno?.id) return

        const anim = getAnimValue(evento.id)
        Animated.sequence([
            Animated.timing(anim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start()

        const delta = confirmar ? 1 : -1
        setEventos((prev) =>
            prev.map((item) =>
                item.id === evento.id
                    ? {
                          ...item,
                          status_usuario: confirmar ? 'confirmado' : 'pendente',
                          confirmados: Math.max(item.confirmados + delta, 0),
                      }
                    : item
            )
        )

        await setConfirmacaoEvento(aluno.id, evento.id, confirmar)
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 flex-row items-center justify-between border-b border-slate-100 bg-white px-6 pb-6 pt-16">
                <View className="flex-row items-center">
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            if (router.canGoBack()) {
                                router.back()
                            } else {
                                router.replace('/(tabs)')
                            }
                        }}
                        className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                    >
                        <Feather name="arrow-left" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <Text className="text-2xl font-black tracking-tight text-slate-900">Eventos</Text>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-full border border-red-100 bg-red-50">
                    <Feather name="calendar" size={18} color="#CC0000" />
                </View>
            </View>

            <View className="z-0 border-b border-slate-100 bg-white px-4 py-3 shadow-sm shadow-slate-200/30">
                <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-2 shadow-sm shadow-slate-200/30">
                    <TouchableOpacity
                        activeOpacity={0.6}
                        disabled={mesAtualIndex === 0}
                        onPress={handlePrevMonth}
                        className={`h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${
                            mesAtualIndex === 0 ? 'opacity-40' : ''
                        }`}
                    >
                        <Feather name="chevron-left" size={20} color="#64748B" />
                    </TouchableOpacity>

                    <Text className="text-lg font-black uppercase tracking-tight text-slate-900">
                        {monthOptions[mesAtualIndex]?.label ?? '-'}
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.6}
                        disabled={mesAtualIndex === monthOptions.length - 1}
                        onPress={handleNextMonth}
                        className={`h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${
                            mesAtualIndex === monthOptions.length - 1 ? 'opacity-40' : ''
                        }`}
                    >
                        <Feather name="chevron-right" size={20} color="#64748B" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => loadEventos(true)} tintColor="#111827" />
                }
            >
                <View className="px-6 pt-6">
                    <Text className="mb-8 font-medium leading-relaxed text-slate-500">
                        Nem so de luva vive o lutador. Confira os proximos eventos de confraternizacao, workshops e
                        treinos especiais do CT do Boxe.
                    </Text>

                    {loading ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Text className="text-sm font-medium text-slate-500">Carregando eventos...</Text>
                        </View>
                    ) : eventosFiltrados.length > 0 ? (
                        eventosFiltrados.map((evento) => {
                            const isConfirmado = evento.status_usuario === 'confirmado'
                            const scale = getAnimValue(evento.id)
                            const isPast = new Date(evento.data_evento) < startOfToday()

                            return (
                                <View
                                    key={evento.id}
                                    className={`mb-5 rounded-3xl border p-5 shadow-sm ${
                                        isPast
                                            ? 'border-slate-200 bg-slate-50 opacity-60'
                                            : evento.destaque
                                              ? 'border-slate-800 bg-[#111111]'
                                              : 'border-slate-100 bg-white'
                                    }`}
                                >
                                    <View className="mb-4 flex-row items-start justify-between">
                                        <View className="flex-row items-center">
                                            <View
                                                className={`mr-4 h-12 w-12 items-center justify-center rounded-2xl border ${
                                                    isPast
                                                        ? 'border-slate-200 bg-white'
                                                        : evento.destaque
                                                          ? 'border-white/20 bg-white/10'
                                                          : 'border-slate-100 bg-slate-50'
                                                }`}
                                            >
                                                <Feather
                                                    name="calendar"
                                                    size={18}
                                                    color={isPast ? '#94A3B8' : evento.destaque ? '#E2E8F0' : '#334155'}
                                                />
                                            </View>
                                            <View className="flex-1">
                                                <Text
                                                    className={`mb-1 text-[10px] font-black uppercase tracking-widest ${
                                                        isPast
                                                            ? 'text-slate-400'
                                                            : evento.destaque
                                                              ? 'text-slate-400'
                                                              : 'text-slate-500'
                                                    }`}
                                                >
                                                    {toBRDate(evento.data_evento)}
                                                </Text>
                                                <Text
                                                    className={`text-lg font-bold tracking-tight ${
                                                        isPast
                                                            ? 'text-slate-600'
                                                            : evento.destaque
                                                              ? 'text-white'
                                                              : 'text-slate-900'
                                                    }`}
                                                    numberOfLines={1}
                                                >
                                                    {evento.titulo}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View
                                        className={`mb-5 rounded-2xl border p-4 ${
                                            isPast
                                                ? 'border-slate-100 bg-white'
                                                : evento.destaque
                                                  ? 'border-white/10 bg-white/5'
                                                  : 'border-slate-100 bg-slate-50'
                                        }`}
                                    >
                                        <View className="mb-2 flex-row items-center">
                                            <Feather name="map-pin" size={14} color="#94A3B8" />
                                            <Text
                                                className={`ml-2 text-sm font-bold ${
                                                    isPast
                                                        ? 'text-slate-400'
                                                        : evento.destaque
                                                          ? 'text-slate-300'
                                                          : 'text-slate-700'
                                                }`}
                                            >
                                                {evento.local}
                                            </Text>
                                        </View>
                                        <Text
                                            className={`mt-1 text-xs leading-relaxed ${
                                                isPast
                                                    ? 'text-slate-400'
                                                    : evento.destaque
                                                      ? 'text-slate-400'
                                                      : 'text-slate-500'
                                            }`}
                                        >
                                            {evento.descricao}
                                        </Text>
                                    </View>

                                    <View className="mt-2 flex-row items-center justify-between border-t border-dashed border-slate-200/20 pt-2">
                                        <View className="flex-row items-center">
                                            <FontAwesome5 name="users" size={12} color="#94A3B8" />
                                            <Text
                                                className={`ml-2 text-xs font-bold ${
                                                    isPast
                                                        ? 'text-slate-400'
                                                        : evento.destaque
                                                          ? 'text-slate-400'
                                                          : 'text-slate-500'
                                                }`}
                                            >
                                                {evento.confirmados} Respostas
                                            </Text>
                                        </View>

                                        {!isPast ? (
                                            <Animated.View style={{ transform: [{ scale }] }}>
                                                {isConfirmado ? (
                                                    <TouchableOpacity
                                                        activeOpacity={0.8}
                                                        onPress={() => handleConfirmacao(evento, false)}
                                                        className={`h-10 flex-row items-center justify-center rounded-xl border px-4 ${
                                                            evento.destaque
                                                                ? 'border-emerald-500/30 bg-emerald-500/20'
                                                                : 'border-emerald-200 bg-emerald-50'
                                                        }`}
                                                    >
                                                        <Feather
                                                            name="check"
                                                            size={14}
                                                            color={evento.destaque ? '#34D399' : '#059669'}
                                                        />
                                                        <Text
                                                            className={`ml-2 text-[10px] font-black uppercase tracking-widest ${
                                                                evento.destaque ? 'text-emerald-400' : 'text-emerald-700'
                                                            }`}
                                                        >
                                                            To dentro!
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity
                                                        activeOpacity={0.8}
                                                        onPress={() => handleConfirmacao(evento, true)}
                                                        className={`h-10 flex-row items-center justify-center rounded-xl px-4 ${
                                                            evento.destaque ? 'bg-white' : 'bg-slate-900'
                                                        }`}
                                                    >
                                                        <Text
                                                            className={`text-[10px] font-black uppercase tracking-widest ${
                                                                evento.destaque ? 'text-slate-900' : 'text-white'
                                                            }`}
                                                        >
                                                            Confirmar Presenca
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </Animated.View>
                                        ) : (
                                            <View className="rounded-md bg-slate-200 px-3 py-1.5">
                                                <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                    Encerrado
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )
                        })
                    ) : (
                        <View className="items-center justify-center rounded-3xl border border-dashed border-slate-100 bg-white py-16">
                            <View className="mb-6 h-20 w-20 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="calendar" size={32} color="#CBD5E1" />
                            </View>
                            <Text className="px-6 text-center text-lg font-bold leading-relaxed tracking-tight text-slate-400">
                                Nenhum evento programado para este mes
                            </Text>
                        </View>
                    )}

                    <View className="mt-8 flex-row items-center justify-center rounded-2xl border border-red-100 bg-red-50 px-6 py-4">
                        <Feather name="info" size={14} color="#CC0000" />
                        <Text className="ml-2 flex-1 pl-2 text-xs font-medium text-red-800">
                            Eventos externos sujeitos a alteracao de data em caso de mau tempo.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}
