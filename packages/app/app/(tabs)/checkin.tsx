import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useState } from 'react'
import { Alert, Animated, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchCheckinData, type CheckinData, setPresencaStatus } from '@/lib/appData'

function emptyCheckinData(): CheckinData {
    return {
        hoje: [],
        amanha: [],
        proximaAula: null,
    }
}

export default function CheckinScreen() {
    const { aluno } = useAuth()
    const [tabAtiva, setTabAtiva] = useState<'hoje' | 'agendar'>('hoje')
    const [agendarDia, setAgendarDia] = useState<'hoje' | 'amanha'>('hoje')
    const [loadingAction, setLoadingAction] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [animValues, setAnimValues] = useState<Record<string, Animated.Value>>({})
    const [data, setData] = useState<CheckinData>(emptyCheckinData)

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

    const getAnimValue = (id: string) => {
        if (!animValues[id]) {
            const newVal = new Animated.Value(1)
            setAnimValues((prev) => ({ ...prev, [id]: newVal }))
            return newVal
        }
        return animValues[id]
    }

    const handleCheckin = useCallback(async (aulaId: string) => {
        if (!aluno?.id || loadingAction) return
        setLoadingAction(true)
        await setPresencaStatus(aluno.id, aulaId, 'presente')
        await loadData()
        setLoadingAction(false)
        Alert.alert('Presenca confirmada', 'Seu check-in foi registrado com sucesso.')
    }, [aluno?.id, loadingAction, loadData])

    const handleAgendar = useCallback(async (aulaId: string) => {
        if (!aluno?.id) return
        const anim = getAnimValue(aulaId)
        Animated.sequence([
            Animated.timing(anim, { toValue: 0.9, duration: 80, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start()

        await setPresencaStatus(aluno.id, aulaId, 'agendado')
        await loadData()
        Alert.alert('Sucesso', 'Agendamento realizado.')
    }, [aluno?.id, loadData])

    const handleCancelarAgendamento = useCallback((aulaId: string) => {
        if (!aluno?.id) return
        Alert.alert('Cancelar agendamento?', 'Tem certeza que deseja cancelar sua reserva?', [
            { text: 'Nao', style: 'cancel' },
            {
                text: 'Sim, cancelar',
                style: 'destructive',
                onPress: async () => {
                    await setPresencaStatus(aluno.id, aulaId, 'cancelada')
                    await loadData()
                    Alert.alert('Cancelado', 'Agendamento removido.')
                },
            },
        ])
    }, [aluno?.id, loadData])

    const listaAgendamento = agendarDia === 'hoje' ? data.hoje : data.amanha
    const proximaAula = data.proximaAula
    const isConfirmado = Boolean(proximaAula?.presente)

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 mb-6 border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/50">
                <Text className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">Passaporte</Text>
                <Text className="mb-8 text-4xl font-black tracking-tight text-slate-900">Check-in</Text>

                <View className="flex-row rounded-2xl border border-slate-100 bg-slate-50 p-1">
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setTabAtiva('hoje')}
                        className={`flex-1 items-center rounded-xl py-3 ${tabAtiva === 'hoje' ? 'border border-slate-100 bg-white shadow-sm shadow-slate-200' : ''
                            }`}
                    >
                        <Text
                            className={`font-bold tracking-wide ${tabAtiva === 'hoje' ? 'text-slate-900' : 'text-slate-400'
                                }`}
                        >
                            Hoje
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setTabAtiva('agendar')}
                        className={`flex-1 items-center rounded-xl py-3 ${tabAtiva === 'agendar'
                                ? 'border border-slate-100 bg-white shadow-sm shadow-slate-200'
                                : ''
                            }`}
                    >
                        <Text
                            className={`font-bold tracking-wide ${tabAtiva === 'agendar' ? 'text-slate-900' : 'text-slate-400'
                                }`}
                        >
                            Agendar
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loadingData ? (
                    <View className="px-6 py-16">
                        <Text className="text-center text-sm text-slate-500">Carregando aulas...</Text>
                    </View>
                ) : tabAtiva === 'hoje' ? (
                    <View className="px-6">
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Proxima Aula</Text>

                        {proximaAula ? (
                            <View className="relative mb-10 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
                                <View className="mb-6 flex-row items-center">
                                    <View className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                                        <Feather name="clock" size={16} color="#0F172A" />
                                    </View>
                                    <View>
                                        <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            Proxima turma
                                        </Text>
                                        <Text className="text-lg font-black tracking-tight text-slate-900">
                                            {proximaAula.horario}
                                        </Text>
                                    </View>
                                </View>

                                <Text className="mb-2 text-3xl font-black tracking-tight text-slate-900">
                                    {proximaAula.nome}
                                </Text>

                                <View className="mb-8 flex-row items-center border-b border-dashed border-slate-100 pb-8">
                                    <Feather name="user" size={14} color="#94A3B8" />
                                    <Text className="ml-2 mr-4 text-sm font-semibold tracking-tight text-slate-500">
                                        {proximaAula.professor}
                                    </Text>
                                    <View className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
                                    <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        {proximaAula.vagas_ocupadas}/{proximaAula.vagas_total} vagas
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={() => handleCheckin(proximaAula.id)}
                                    disabled={isConfirmado || loadingAction}
                                    className={`h-16 flex-row items-center justify-center rounded-2xl shadow-lg ${isConfirmado
                                            ? 'bg-emerald-500 shadow-emerald-500/30'
                                            : 'bg-[#CC0000] shadow-red-900/40'
                                        }`}
                                    style={{ opacity: loadingAction ? 0.7 : 1 }}
                                >
                                    <Feather
                                        name={isConfirmado ? 'check' : 'target'}
                                        size={20}
                                        color="white"
                                        style={{ marginRight: 12 }}
                                    />
                                    <Text className="text-base font-black uppercase tracking-widest text-white">
                                        {loadingAction
                                            ? 'PROCESSANDO...'
                                            : isConfirmado
                                                ? 'PRESENCA CONFIRMADA'
                                                : 'FAZER CHECK-IN AGORA'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="rounded-3xl border border-slate-100 bg-white p-6">
                                <Text className="text-sm text-slate-500">
                                    Nenhuma aula disponivel para check-in agora.
                                </Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View className="px-6">
                        <View className="mb-6 flex-row items-center justify-between">
                            <Text className="text-xl font-bold tracking-tight text-slate-900">Aulas Disponiveis</Text>

                            <View className="flex-row rounded-xl border border-slate-100 bg-slate-50 p-1">
                                <TouchableOpacity
                                    onPress={() => setAgendarDia('hoje')}
                                    className={`rounded-lg px-4 py-1.5 ${agendarDia === 'hoje' ? 'bg-[#CC0000]' : 'bg-transparent'
                                        }`}
                                >
                                    <Text
                                        className={`text-xs font-black uppercase tracking-widest ${agendarDia === 'hoje' ? 'text-white' : 'text-slate-400'
                                            }`}
                                    >
                                        Hoje
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setAgendarDia('amanha')}
                                    className={`rounded-lg px-4 py-1.5 ${agendarDia === 'amanha' ? 'bg-[#CC0000]' : 'bg-transparent'
                                        }`}
                                >
                                    <Text
                                        className={`text-xs font-black uppercase tracking-widest ${agendarDia === 'amanha' ? 'text-white' : 'text-slate-400'
                                            }`}
                                    >
                                        Amanha
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="space-y-4">
                            {listaAgendamento.length === 0 ? (
                                <View className="rounded-3xl border border-slate-100 bg-white p-6">
                                    <Text className="text-sm text-slate-500">
                                        Nenhuma aula disponivel para este dia.
                                    </Text>
                                </View>
                            ) : (
                                listaAgendamento.map((aula) => {
                                    const isAgendado = Boolean(aula.agendado || aula.presente)
                                    const isFull = aula.vagas_ocupadas >= aula.vagas_total && !isAgendado
                                    const buttonScale = animValues[aula.id] || new Animated.Value(1)

                                    return (
                                        <View
                                            key={aula.id}
                                            className={`mb-4 rounded-3xl border border-slate-100 p-5 shadow-sm shadow-slate-200/50 ${isAgendado ? 'bg-blue-50/30' : 'bg-white'
                                                }`}
                                        >
                                            <View className="mb-4 flex-row items-center justify-between">
                                                <View className="flex-row items-center">
                                                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                                                        <Feather name="clock" size={14} color="#64748B" />
                                                    </View>
                                                    <Text className="px-1 text-2xl font-black tracking-tight text-slate-900">
                                                        {aula.horario}
                                                    </Text>
                                                </View>

                                                <View
                                                    className={`rounded-md border px-2.5 py-1 ${isAgendado
                                                            ? 'border-blue-100 bg-blue-50'
                                                            : isFull
                                                                ? 'border-slate-100 bg-slate-50'
                                                                : 'border-emerald-100 bg-emerald-50'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-[10px] font-black uppercase tracking-widest ${isAgendado
                                                                ? 'text-blue-600'
                                                                : isFull
                                                                    ? 'text-slate-400'
                                                                    : 'text-emerald-600'
                                                            }`}
                                                    >
                                                        {isAgendado ? 'AGENDADO' : isFull ? 'LOTADA' : 'LIVRE'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text
                                                className="mb-1 text-lg font-bold tracking-tight text-slate-900"
                                                numberOfLines={1}
                                            >
                                                {aula.nome}
                                            </Text>
                                            <Text className="mb-6 text-xs font-medium text-slate-500">
                                                {aula.professor}
                                            </Text>

                                            <View className="flex-row items-center justify-between">
                                                <View>
                                                    <Text className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        CAPACIDADE
                                                    </Text>
                                                    <Text className="text-sm font-bold text-slate-700">
                                                        {aula.vagas_ocupadas} / {aula.vagas_total} vagas
                                                    </Text>
                                                </View>

                                                {isAgendado ? (
                                                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                                        <TouchableOpacity
                                                            activeOpacity={0.6}
                                                            onPress={() => handleCancelarAgendamento(aula.id)}
                                                            className="h-11 flex-row items-center justify-center rounded-xl border-2 border-slate-200 bg-white px-6 shadow-sm shadow-slate-200/50"
                                                        >
                                                            <Feather
                                                                name="x"
                                                                size={14}
                                                                color="#64748B"
                                                                style={{ marginRight: 6 }}
                                                            />
                                                            <Text className="text-xs font-black uppercase tracking-widest text-slate-600">
                                                                Cancelar
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </Animated.View>
                                                ) : (
                                                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                                        <TouchableOpacity
                                                            activeOpacity={0.8}
                                                            disabled={isFull}
                                                            onPress={() => handleAgendar(aula.id)}
                                                            className={`h-11 flex-row items-center justify-center rounded-xl px-8 shadow-sm ${isFull
                                                                    ? 'bg-slate-100'
                                                                    : 'bg-[#111111] shadow-slate-900/30'
                                                                }`}
                                                        >
                                                            <Text
                                                                className={`text-xs font-black uppercase tracking-widest ${isFull ? 'text-slate-400' : 'text-white'
                                                                    }`}
                                                            >
                                                                AGENDAR
                                                            </Text>
                                                        </TouchableOpacity>
                                                    </Animated.View>
                                                )}
                                            </View>
                                        </View>
                                    )
                                })
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    )
}

