import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState, Fragment } from 'react'
import { Alert, FlatList, Linking, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

import NotificationIcon, { resolveNotificationIcon } from '@/components/NotificationIcon'
import { NotificationSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchNotificacoes, markAllNotificacoesLidas, markNotificacaoLida } from '@/lib/appData'
import type { HomeNotification } from '@/lib/types'

export default function NotificacoesScreen() {
    const router = useRouter()
    const { aluno } = useAuth()
    const [notificacoes, setNotificacoes] = useState<HomeNotification[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoading(false)
            return
        }
        try {
            const data = await fetchNotificacoes(aluno.id)
            setNotificacoes(data)
        } catch (error) {
            console.error('[Notificacoes] Erro:', error)
        } finally {
            setLoading(false)
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

    const getIconConfig = (item: HomeNotification) => {
        const resolved = resolveNotificationIcon(item.icone, item.tipo)
        const bg =
            resolved.tone.backgroundColor === '#FEE2E2'
                ? 'bg-red-100'
                : resolved.tone.backgroundColor === '#DBEAFE'
                  ? 'bg-blue-100'
                  : resolved.tone.backgroundColor === '#EDE9FE'
                    ? 'bg-violet-100'
                    : resolved.tone.backgroundColor === '#CCFBF1'
                      ? 'bg-teal-100'
                      : resolved.tone.backgroundColor === '#FEF3C7'
                        ? 'bg-amber-100'
                        : 'bg-slate-100'

        return { iconName: resolved.icon, iconColor: resolved.tone.color, bg }
    }

    const handleAction = async (id: string, acao?: string | null, link?: string | null) => {
        await markNotificacaoLida(id)
        setNotificacoes((prev) => prev.map((item) => (item.id === id ? { ...item, lida: true } : item)))

        switch (acao) {
            case 'checkin':
                router.push('/(tabs)/checkin')
                break
            case 'pagamento':
                router.push('/pagamento')
                break
            case 'stories':
                router.push('/(tabs)/')
                break
            case 'historico_pagamento':
                router.push('/faturas')
                break
            case 'evento':
                router.push('/eventos')
                break
            case 'assistir_video':
                if (link) {
                    Linking.openURL(link).catch(() => Alert.alert('Erro', 'Nao foi possivel abrir o link.'))
                }
                break
            default:
                if (link) {
                    Linking.openURL(link).catch(() => Alert.alert('Erro', 'Nao foi possivel abrir o link.'))
                }
        }
    }

    const handleMarkAllAsRead = async () => {
        if (!aluno?.id) return
        await markAllNotificacoesLidas(aluno.id)
        setNotificacoes((prev) => prev.map((item) => ({ ...item, lida: true })))
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 flex-row items-center justify-between border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/30">
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
                    <Text className="text-2xl font-black tracking-tight text-slate-900">Notificacoes</Text>
                </View>

                {notificacoes.some((item) => !item.lida) && (
                    <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={handleMarkAllAsRead}
                        className="h-10 w-10 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50"
                    >
                        <Feather name="check" size={18} color="#10B981" />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={loading ? [] : notificacoes}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                ListEmptyComponent={
                    loading ? (
                        <View>
                            <NotificationSkeleton />
                            <NotificationSkeleton />
                            <NotificationSkeleton />
                            <NotificationSkeleton />
                        </View>
                    ) : (
                        <View className="items-center justify-center px-6 py-20">
                            <View className="mb-6 h-24 w-24 items-center justify-center rounded-[2rem] border border-slate-100 bg-slate-50 shadow-sm shadow-slate-200/50">
                                <Feather name="bell-off" size={32} color="#CBD5E1" />
                            </View>
                            <Text className="mb-2 text-2xl font-black tracking-tight text-slate-900">Tudo limpo</Text>
                            <Text className="max-w-xs px-6 text-center font-medium leading-relaxed text-slate-500">
                                Voce esta totalmente atualizado com os avisos do Centro de Treinamento.
                            </Text>
                        </View>
                    )
                }
                renderItem={({ item }) => {
                    const config = getIconConfig(item)
                    return (
                        <View className="mb-3">
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => handleAction(item.id, item.acao, item.link)}
                                className={`relative flex-row rounded-3xl border px-5 py-5 ${!item.lida
                                    ? 'border-slate-200 bg-white shadow-md shadow-slate-200/50'
                                    : 'border-slate-50 bg-[#FCFCFC]'
                                    }`}
                            >
                                {!item.lida && (
                                    <View className="absolute left-0 top-1/2 -mt-4 h-8 w-1.5 rounded-r-full bg-[#CC0000]" />
                                )}

                                <View
                                    className={`mr-4 mt-1 h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white shadow-sm ${config.bg}`}
                                >
                                    <NotificationIcon icon={config.iconName} size={18} color={config.iconColor} />
                                </View>

                                <View className="flex-1 justify-center">
                                    <Text
                                        className={`mb-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${!item.lida ? 'text-slate-600' : 'text-slate-400'
                                            }`}
                                    >
                                        {item.horario}
                                    </Text>

                                    <Text
                                        className={`mb-1 text-base font-bold leading-snug tracking-tight ${!item.lida ? 'text-slate-900' : 'text-slate-500'
                                            }`}
                                    >
                                        {item.titulo}
                                    </Text>

                                    <Text
                                        className="text-sm font-medium leading-relaxed text-slate-500"
                                        numberOfLines={2}
                                    >
                                        {item.subtitulo}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    )
                }}
            />
        </View>
    )
}
