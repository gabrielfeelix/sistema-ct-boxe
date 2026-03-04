import { Feather } from '@expo/vector-icons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Animated, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'

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

export default function CheckinScreen() {
    const { aluno } = useAuth()
    const [tabAtiva, setTabAtiva] = useState<'hoje' | 'agendar'>('hoje')
    const [agendarDia, setAgendarDia] = useState<'hoje' | 'amanha'>('hoje')
    const [loadingAction, setLoadingAction] = useState(false)
    const [loadingData, setLoadingData] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const animValuesRef = useRef<Record<string, Animated.Value>>({})
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

    const getAnimValue = useCallback((id: string) => {
        if (!animValuesRef.current[id]) {
            animValuesRef.current[id] = new Animated.Value(1)
        }
        return animValuesRef.current[id]
    }, [])

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
    const isConfirmado = Boolean(proximaAula?.presente) || Boolean(proximaAula?.agendado)

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const isHoje = agendarDia === 'hoje'

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
                        <AulaSkeleton />
                        <AulaSkeleton />
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
                                    onPress={() => isConfirmado ? handleCancelarAgendamento(proximaAula.id) : handleCheckin(proximaAula.id)}
                                    disabled={loadingAction}
                                    className={`h-16 flex-row items-center justify-center rounded-2xl shadow-lg ${isConfirmado
                                        ? 'bg-slate-100 shadow-slate-200/50 border border-slate-200'
                                        : 'bg-[#CC0000] shadow-red-900/40'
                                        }`}
                                    style={{ opacity: loadingAction ? 0.7 : 1 }}
                                >
                                    <Feather
                                        name={isConfirmado ? 'x' : 'target'}
                                        size={20}
                                        color={isConfirmado ? '#64748B' : 'white'}
                                        style={{ marginRight: 12 }}
                                    />
                                    <Text className={`text-base font-black uppercase tracking-widest ${isConfirmado ? 'text-slate-500' : 'text-white'}`}>
                                        {loadingAction
                                            ? 'PROCESSANDO...'
                                            : isConfirmado
                                                ? 'CANCELAR CHECK-IN'
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
                                    const buttonScale = animValuesRef.current[aula.id] || new Animated.Value(1)

                                    const classMinutes = Number(aula.horario.split(':')[0]) * 60 + Number(aula.horario.split(':')[1]);
                                    const isPassed = isHoje && classMinutes < currentMinutes;

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
                                                    className={`rounded-md border px-2.5 py-1 ${isPassed
                                                        ? 'border-slate-100 bg-slate-50'
                                                        : isAgendado
                                                            ? 'border-blue-100 bg-blue-50'
                                                            : isFull
                                                                ? 'border-slate-100 bg-slate-50'
                                                                : 'border-emerald-100 bg-emerald-50'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-[10px] font-black uppercase tracking-widest ${isPassed
                                                            ? 'text-slate-500'
                                                            : isAgendado
                                                                ? 'text-blue-600'
                                                                : isFull
                                                                    ? 'text-slate-400'
                                                                    : 'text-emerald-600'
                                                            }`}
                                                    >
                                                        {isPassed ? 'ENCERRADA' : isAgendado ? 'AGENDADO' : isFull ? 'LOTADA' : 'LIVRE'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text
                                                className="mb-1 text-lg font-bold tracking-tight text-slate-900"
                                                numberOfLines={1}
                                            >
                                                {aula.nome}
                                            </Text>
                                            <Text className="text-sm font-medium text-slate-500">
                                                {aula.professor}
                                            </Text>

                                            <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-4">
                                                <View className="flex-row items-center">
                                                    <View className="mr-2 h-2 w-2 rounded-full bg-slate-300" />
                                                    <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                        {aula.vagas_ocupadas}/{aula.vagas_total} VAGAS LIGADAS
                                                    </Text>
                                                </View>

                                                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                                                    <TouchableOpacity
                                                        activeOpacity={0.8}
                                                        onPress={() => isAgendado ? handleCancelarAgendamento(aula.id) : handleAgendar(aula.id)}
                                                        disabled={isPassed || (!isAgendado && isFull)}
                                                        className={`h-12 flex-row items-center justify-center rounded-xl px-5 shadow-sm ${isPassed
                                                            ? 'bg-slate-50'
                                                            : isAgendado
                                                                ? 'bg-blue-100 border border-blue-200'
                                                                : isFull
                                                                    ? 'bg-slate-100'
                                                                    : 'bg-[#0F172A]'
                                                            }`}
                                                    >
                                                        <Text
                                                            className={`text-xs font-black uppercase tracking-widest ${isPassed
                                                                ? 'text-slate-400'
                                                                : isAgendado
                                                                    ? 'text-blue-600'
                                                                    : isFull
                                                                        ? 'text-slate-400'
                                                                        : 'text-white'
                                                                }`}
                                                        >
                                                            {isPassed
                                                                ? 'INDISPONIVEL'
                                                                : isAgendado
                                                                    ? 'CANCELAR'
                                                                    : isFull
                                                                        ? 'ESGOTADO'
                                                                        : 'AGENDAR AULA'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </Animated.View>
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
