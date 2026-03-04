import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchFaturas, type FaturaItem } from '@/lib/appData'
import { toBRDate, toCurrencyBRL } from '@/lib/formatters'

function formatMetodo(metodo?: string | null) {
    if (!metodo) return 'Nao informado'
    return metodo.replace(/_/g, ' ').toUpperCase()
}

export default function FaturasScreen() {
    const router = useRouter()
    const { aluno } = useAuth()
    const [faturas, setFaturas] = useState<FaturaItem[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setFaturas([])
            setLoading(false)
            return
        }
        try {
            const data = await fetchFaturas(aluno.id)
            setFaturas(data)
        } catch (error) {
            console.error('[Faturas] Erro:', error)
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

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 flex-row items-center border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/30">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                >
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Financeiro</Text>
                    <Text className="text-2xl font-black tracking-tight text-slate-900">Historico de Faturas</Text>
                </View>
            </View>

            <FlatList
                data={loading ? [] : faturas}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={5}
                ListEmptyComponent={
                    loading ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Text className="text-sm font-medium text-slate-500">Carregando historico...</Text>
                        </View>
                    ) : (
                        <View className="items-center justify-center py-20">
                            <Feather name="file-text" size={48} color="#CBD5E1" />
                            <Text className="mt-4 font-medium text-slate-500">Nenhuma fatura paga encontrada.</Text>
                        </View>
                    )
                }
                renderItem={({ item: fatura }) => (
                    <View className="mb-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50">
                        <View className="mb-6 flex-row items-start justify-between">
                            <View className="flex-row items-center">
                                <View className="mr-4 h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                                    <Feather name="check" size={20} color="#10B981" />
                                </View>
                                <View>
                                    <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                        {fatura.id}
                                    </Text>
                                    <Text className="text-xl font-black tracking-tight text-slate-900">
                                        {toCurrencyBRL(fatura.valor)}
                                    </Text>
                                </View>
                            </View>
                            <View className="rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5">
                                <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                    PAGA
                                </Text>
                            </View>
                        </View>

                        <View className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <View className="mb-3 flex-row justify-between">
                                <Text className="text-xs font-bold text-slate-500">Forma de pagamento</Text>
                                <View className="flex-row items-center">
                                    {String(fatura.metodo).toLowerCase().includes('pix') ? (
                                        <FontAwesome5 name="pix" size={12} color="#10B981" />
                                    ) : (
                                        <Feather name="credit-card" size={12} color="#64748B" />
                                    )}
                                    <Text className="ml-2 text-xs font-bold text-slate-900">
                                        {formatMetodo(fatura.metodo)}
                                    </Text>
                                </View>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-xs font-bold text-slate-500">Data do pagamento</Text>
                                <Text className="text-xs font-bold text-slate-900">
                                    {toBRDate(fatura.data_pagamento ?? fatura.data_vencimento)}
                                </Text>
                            </View>
                        </View>

                        {fatura.comprovante && (
                            <View className="mt-4 flex-row items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <Feather name="check-circle" size={14} color="#64748B" />
                                <Text className="ml-2 text-xs font-bold uppercase tracking-widest text-slate-600">
                                    Comprovante registrado
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            />
        </View>
    )
}
