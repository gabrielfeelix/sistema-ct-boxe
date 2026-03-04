import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Alert, FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { AulaSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchCheckinData, type CheckinData, setPresencaStatus } from '@/lib/appData'

function emptyCheckinData(): CheckinData {
    return {
        hoje: [],
        amanha: [],
        proximaAula: null,
    }
}

// Função para gerar os próximos 7 dias
function getNext7Days() {
    const days = []
    const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

    for (let i = 0; i < 7; i++) {
        const date = new Date()
        date.setDate(date.getDate() + i)
        days.push({
            day: date.getDate(),
            weekDay: weekDays[date.getDay()],
            isToday: i === 0,
            date: date,
        })
    }

    return days
}

export default function CheckinScreen() {
    const { aluno } = useAuth()
    const [selectedDayIndex, setSelectedDayIndex] = useState(0)
    const [loadingAction, setLoadingAction] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [data, setData] = useState<CheckinData>(emptyCheckinData)
    const days = getNext7Days()

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoadingData(false)
            return
        }
        try {
            const next = await fetchCheckinData(aluno.id)
            setData(next)
        } catch (error) {
            console.error('[Checkin] Erro ao carregar dados:', error)
        } finally {
            setLoadingData(false)
        }
    }, [aluno?.id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }, [loadData])

    const handleConfirmarPresenca = useCallback(async (aulaId: string) => {
        if (!aluno?.id || loadingAction) return
        setLoadingAction(true)
        await setPresencaStatus(aluno.id, aulaId, 'agendado')
        await loadData()
        setLoadingAction(false)
        Alert.alert('Presença confirmada', 'Você está confirmado para esta aula!')
    }, [aluno?.id, loadingAction, loadData])

    const handleListaEspera = useCallback(async (aulaId: string) => {
        if (!aluno?.id || loadingAction) return
        setLoadingAction(true)
        await setPresencaStatus(aluno.id, aulaId, 'agendado')
        await loadData()
        setLoadingAction(false)
        Alert.alert('Lista de espera', 'Você foi adicionado à lista de espera.')
    }, [aluno?.id, loadingAction, loadData])

    const handleCancelar = useCallback((aulaId: string) => {
        if (!aluno?.id || loadingAction) return
        Alert.alert('Cancelar presença?', 'Tem certeza que deseja cancelar?', [
            { text: 'Não', style: 'cancel' },
            {
                text: 'Sim, cancelar',
                style: 'destructive',
                onPress: async () => {
                    setLoadingAction(true)
                    try {
                        await setPresencaStatus(aluno.id, aulaId, 'cancelada')
                        await loadData()
                        Alert.alert('Cancelado', 'Sua presença foi cancelada.')
                    } catch (error) {
                        console.error('Erro ao cancelar:', error)
                        Alert.alert('Erro', 'Não foi possível cancelar.')
                    } finally {
                        setLoadingAction(false)
                    }
                },
            },
        ])
    }, [aluno?.id, loadData, loadingAction])

    // Determinar quais aulas mostrar baseado no dia selecionado
    const listaAulas = selectedDayIndex === 0 ? data.hoje : selectedDayIndex === 1 ? data.amanha : []

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const isToday = selectedDayIndex === 0

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/50">
                <Text className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">Passaporte</Text>
                <Text className="mb-6 text-4xl font-black tracking-tight text-slate-900">Check-in</Text>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12 }}
                >
                    {days.map((day, index) => (
                        <TouchableOpacity
                            key={index}
                            activeOpacity={0.7}
                            onPress={() => setSelectedDayIndex(index)}
                            className={`h-20 w-16 items-center justify-center rounded-2xl border ${
                                selectedDayIndex === index
                                    ? 'border-[#CC0000] bg-[#CC0000]'
                                    : day.isToday
                                    ? 'border-[#CC0000]/30 bg-red-50/50'
                                    : 'border-slate-200 bg-white'
                            }`}
                        >
                            <Text
                                className={`mb-1 text-[10px] font-black uppercase tracking-widest ${
                                    selectedDayIndex === index
                                        ? 'text-white'
                                        : day.isToday
                                        ? 'text-[#CC0000]'
                                        : 'text-slate-400'
                                }`}
                            >
                                {day.weekDay}
                            </Text>
                            <Text
                                className={`text-2xl font-black ${
                                    selectedDayIndex === index
                                        ? 'text-white'
                                        : day.isToday
                                        ? 'text-[#CC0000]'
                                        : 'text-slate-900'
                                }`}
                            >
                                {day.day}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={loadingData ? [] : listaAulas}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    loadingData ? (
                        <View>
                            <AulaSkeleton />
                            <AulaSkeleton />
                        </View>
                    ) : (
                        <View className="items-center rounded-3xl border border-slate-100 bg-white p-8">
                            <Feather name="calendar" size={40} color="#CBD5E1" />
                            <Text className="mt-4 text-center text-sm text-slate-500">
                                Nenhuma aula disponível para este dia.
                            </Text>
                        </View>
                    )
                }
                renderItem={({ item: aula }) => {
                    const isConfirmado = Boolean(aula.agendado || aula.presente)
                    const isFull = aula.vagas_ocupadas >= aula.vagas_total && !isConfirmado
                    const vagasRestantes = aula.vagas_total - aula.vagas_ocupadas
                    const percentOcupado = (aula.vagas_ocupadas / aula.vagas_total) * 100

                    const classMinutes = Number(aula.horario.split(':')[0]) * 60 + Number(aula.horario.split(':')[1])
                    const isPassed = isToday && classMinutes < currentMinutes

                    return (
                        <View className="mb-4 overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm shadow-slate-200/40">
                            <View className="p-6">
                                <View className="mb-4 flex-row items-start justify-between">
                                    <View>
                                        <Text className="mb-1 text-4xl font-black tracking-tight text-slate-900">
                                            {aula.horario}
                                        </Text>
                                        <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            60 MIN
                                        </Text>
                                    </View>

                                    {isPassed && (
                                        <View className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
                                            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                                ESGOTADO
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="mb-1 text-xl font-black tracking-tight text-slate-900">
                                    {aula.nome}
                                </Text>
                                <View className="mb-5 flex-row items-center">
                                    <Feather name="user" size={14} color="#94A3B8" />
                                    <Text className="ml-1.5 text-sm font-semibold text-slate-500">
                                        {aula.professor}
                                    </Text>
                                </View>

                                {!isPassed && (
                                    <View className="mb-5">
                                        <View className="mb-2 flex-row items-center justify-between">
                                            <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                {isFull ? 'SEM VAGAS' : `${vagasRestantes} VAGAS RESTANTES`}
                                            </Text>
                                            <Text className="text-xs font-bold text-slate-500">
                                                {aula.vagas_ocupadas}/{aula.vagas_total}
                                            </Text>
                                        </View>
                                        <View className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <View
                                                className={`h-full rounded-full ${
                                                    isFull ? 'bg-slate-400' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(percentOcupado, 100)}%` }}
                                            />
                                        </View>
                                    </View>
                                )}

                                {!isPassed && (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() =>
                                            isConfirmado
                                                ? handleCancelar(aula.id)
                                                : isFull
                                                ? handleListaEspera(aula.id)
                                                : handleConfirmarPresenca(aula.id)
                                        }
                                        disabled={loadingAction}
                                        className={`h-14 items-center justify-center rounded-2xl shadow-sm ${
                                            isConfirmado
                                                ? 'border border-slate-200 bg-slate-100'
                                                : isFull
                                                ? 'border border-amber-200 bg-amber-50'
                                                : 'bg-[#CC0000] shadow-red-900/20'
                                        }`}
                                        style={{ opacity: loadingAction ? 0.6 : 1 }}
                                    >
                                        <Text
                                            className={`text-sm font-black uppercase tracking-widest ${
                                                isConfirmado
                                                    ? 'text-slate-600'
                                                    : isFull
                                                    ? 'text-amber-700'
                                                    : 'text-white'
                                            }`}
                                        >
                                            {loadingAction
                                                ? 'PROCESSANDO...'
                                                : isConfirmado
                                                ? 'CANCELAR PRESENÇA'
                                                : isFull
                                                ? 'LISTA DE ESPERA'
                                                : 'CONFIRMAR PRESENÇA'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )
                }}
            />
        </View>
    )
}
