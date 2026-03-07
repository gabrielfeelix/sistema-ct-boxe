import { Feather } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Children, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchAulaDetalhe, setPresencaStatus, type AulaDetalhe } from '@/lib/appData'
import { toISODateLocal } from '@/lib/formatters'

export default function AulaDetailModal() {
    const { id } = useLocalSearchParams<{ id?: string }>()
    const router = useRouter()
    const { aluno } = useAuth()

    const [aula, setAula] = useState<AulaDetalhe | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const loadData = useCallback(async () => {
        if (!aluno?.id || !id) {
            setLoading(false)
            return
        }

        setLoading(true)
        try {
            const data = await fetchAulaDetalhe(aluno.id, id)
            setAula(data)
        } catch (error) {
            console.error('[AulaDetalhe] Erro ao carregar aula:', error)
            setAula(null)
        } finally {
            setLoading(false)
        }
    }, [aluno?.id, id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const progressTotal = useMemo(() => {
        if (!aula || aula.vagas_total <= 0) return 0
        return Math.min((aula.vagas_ocupadas / aula.vagas_total) * 100, 100)
    }, [aula])

    const isLivre = (aula?.vagas_ocupadas ?? 0) < (aula?.vagas_total ?? 0)
    const isAgendado = aula?.userStatus === 'agendado' || aula?.userStatus === 'confirmado'
    const isPresente = aula?.userStatus === 'presente'

    const now = new Date()
    const currentISO = toISODateLocal(now)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const classMinutes = aula ? (Number(aula.horario.split(':')[0]) * 60 + Number(aula.horario.split(':')[1])) : 0
    const isToday = aula?.dataISO === currentISO
    const isPassed = aula ? (aula.dataISO < currentISO || (isToday && classMinutes < currentMinutes)) : false

    const handleAction = async () => {
        if (!aluno?.id || !aula || saving || isPresente) return

        setSaving(true)
        try {
            if (isAgendado) {
                await setPresencaStatus(aluno.id, aula.id, 'cancelada')
            } else {
                await setPresencaStatus(aluno.id, aula.id, 'agendado')
            }
            await loadData()
        } catch (error) {
            console.error('[AulaDetalhe] Erro ao atualizar presenca:', error)
            Alert.alert('Erro', 'Não foi possível atualizar o agendamento desta aula.')
        } finally {
            setSaving(false)
        }
    }

    const buttonLabel = (() => {
        if (!aula) return 'INDISPONIVEL'
        if (saving) return 'PROCESSANDO...'
        if (isPassed) return 'AULA ENCERRADA'
        if (isPresente) return 'CHECK-IN REALIZADO'
        if (isAgendado) return 'CANCELAR AGENDAMENTO'
        if (!isLivre) return 'TURMA LOTADA'
        return 'AGENDAR AULA'
    })()

    const buttonEnabled = Boolean(aula) && !saving && !isPresente && !isPassed && (isAgendado || isLivre)

    return (
        <View className="flex-1 justify-end">
            <TouchableOpacity
                className="absolute bottom-0 left-0 right-0 top-0 bg-black/40"
                activeOpacity={1}
                onPress={() => router.back()}
            />

            <View
                className="mt-auto w-full overflow-hidden rounded-t-[2.5rem] bg-white pb-8 pt-4 shadow-2xl"
                style={{ minHeight: Platform.OS === 'ios' ? '70%' : '80%' }}
            >
                <View className="mb-6 h-1.5 w-16 self-center rounded-full bg-slate-200" />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                    <View className="relative px-6">
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => router.back()}
                            className="absolute right-6 top-0 z-10 h-10 w-10 items-center justify-center rounded-full bg-slate-50"
                        >
                            <Feather name="x" size={20} color="#64748B" />
                        </TouchableOpacity>

                        {loading ? (
                            <View className="items-center justify-center py-16">
                                <Text className="text-sm font-medium text-slate-500">Carregando aula...</Text>
                            </View>
                        ) : !aula ? (
                            <View className="items-center justify-center py-16">
                                <Feather name="calendar" size={40} color="#CBD5E1" />
                                <Text className="mt-4 text-base font-bold text-slate-500">Aula nao encontrada</Text>
                            </View>
                        ) : (
                            <>
                                <View className="mb-6 pr-12">
                                    <View className="mb-4 flex-row items-center">
                                        <View className="mr-3 rounded-md border border-red-100 bg-red-50 px-3 py-1.5">
                                            <Text className="text-xs font-black uppercase tracking-widest text-[#CC0000]">
                                                {aula.data}
                                            </Text>
                                        </View>
                                        <Text className="text-xl font-black tracking-tight text-slate-900">{aula.horario}</Text>
                                    </View>
                                    <Text className="text-3xl font-black leading-tight tracking-tight text-slate-900">{aula.nome}</Text>
                                </View>

                                <View className="mb-6 flex-row items-center border-y border-slate-100 py-5">
                                    <View className="mr-4 h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                                        <Text className="text-lg font-black text-slate-600">{aula.professor.slice(0, 2).toUpperCase()}</Text>
                                    </View>
                                    <View>
                                        <Text className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Instrutor</Text>
                                        <Text className="text-base font-bold tracking-tight text-slate-900">{aula.professor}</Text>
                                    </View>
                                </View>

                                <Text className="mb-8 font-medium leading-loose text-slate-500">{aula.descricao}</Text>

                                <View className="mb-8">
                                    <View className="mb-3 flex-row items-end justify-between">
                                        <Text className="text-sm font-bold tracking-tight text-slate-900">Ocupacao</Text>
                                        <Text className="text-xs font-black uppercase tracking-widest text-[#CC0000]">
                                            {aula.vagas_ocupadas} DE {aula.vagas_total}
                                        </Text>
                                    </View>
                                    <View className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                                        <View
                                            className={`h-full rounded-full ${isLivre ? 'bg-[#CC0000]' : 'bg-slate-400'}`}
                                            style={{ width: `${progressTotal}%` }}
                                        />
                                    </View>
                                </View>

                                <View className="mb-10">
                                    <Text className="mb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Confirmados ({aula.confirmados.length})
                                    </Text>
                                    {aula.confirmados.length > 0 ? (
                                        <View className="flex-row items-center">
                                            <View className="mr-4 flex-row -space-x-4">
                                                {Children.toArray(
                                                    aula.confirmados.slice(0, 5).map((nome) => {
                                                        const iniciais = nome
                                                            .split(' ')
                                                            .map((part) => part[0])
                                                            .join('')
                                                            .substring(0, 2)
                                                            .toUpperCase()
                                                        return (
                                                            <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#CC0000]">
                                                                <Text className="text-[10px] font-black text-white">{iniciais}</Text>
                                                            </View>
                                                        )
                                                    })
                                                )}
                                            </View>
                                            <Text className="text-sm font-medium text-slate-500" numberOfLines={1}>
                                                {aula.confirmados[0]}
                                                {aula.confirmados.length > 1
                                                    ? ` e outros ${aula.confirmados.length - 1}`
                                                    : ''}
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text className="text-sm text-slate-500">Seja o primeiro a confirmar.</Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    disabled={!buttonEnabled}
                                    onPress={handleAction}
                                    className={`h-16 flex-row items-center justify-center rounded-2xl shadow-lg ${buttonEnabled
                                            ? isAgendado
                                                ? 'border border-red-200 bg-red-50 shadow-red-900/10'
                                                : 'bg-slate-900 shadow-slate-900/30'
                                            : 'border border-slate-200 bg-slate-100'
                                        }`}
                                >
                                    <Text
                                        className={`text-base font-black uppercase tracking-widest ${buttonEnabled
                                                ? isAgendado
                                                    ? 'text-red-700'
                                                    : 'text-white'
                                                : 'text-slate-400'
                                            }`}
                                    >
                                        {buttonLabel}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        </View>
    )
}
