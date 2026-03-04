import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchContratos } from '@/lib/appData'
import { toBRDate } from '@/lib/formatters'
import type { DocumentoAluno } from '@/lib/types'

interface ContratosState {
    contratosAbertos: DocumentoAluno[]
    contratosAssinados: DocumentoAluno[]
}

function emptyState(): ContratosState {
    return {
        contratosAbertos: [],
        contratosAssinados: [],
    }
}

export default function ContratosScreen() {
    const router = useRouter()
    const { aluno } = useAuth()
    const [data, setData] = useState<ContratosState>(emptyState)
    const [loading, setLoading] = useState(true)

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setData(emptyState())
            setLoading(false)
            return
        }
        try {
            const response = await fetchContratos(aluno.id)
            setData(response)
        } catch (error) {
            console.error('[Contratos] Erro:', error)
        } finally {
            setLoading(false)
        }
    }, [aluno?.id])

    useEffect(() => {
        loadData()
    }, [loadData])

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 flex-row items-center border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/30">
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back()
                        } else {
                            router.replace('/(tabs)/perfil')
                        }
                    }}
                    className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                >
                    <Feather name="arrow-left" size={18} color="#0F172A" />
                </TouchableOpacity>
                <View>
                    <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Passaporte</Text>
                    <Text className="text-2xl font-black tracking-tight text-slate-900">Meus Contratos</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="px-6 pt-8">
                    {loading ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Text className="text-sm font-medium text-slate-500">Carregando contratos...</Text>
                        </View>
                    ) : (
                        <>
                            {data.contratosAbertos.length > 0 && (
                                <View className="mb-10">
                                    <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">
                                        Aguardando Assinatura
                                    </Text>
                                    {data.contratosAbertos.map((contrato) => (
                                        <View
                                            key={contrato.id}
                                            className="mb-4 rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-md shadow-amber-900/10"
                                        >
                                            <View className="mb-4 flex-row items-start justify-between">
                                                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
                                                    <Feather name="alert-circle" size={20} color="#D97706" />
                                                </View>
                                                <View className="rounded-lg border border-amber-200 bg-amber-100 px-3 py-1.5">
                                                    <Text className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                                        PENDENTE
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text className="mb-2 text-lg font-bold tracking-tight text-slate-900" numberOfLines={2}>
                                                {contrato.titulo}
                                            </Text>
                                            <Text className="mb-6 text-xs font-medium text-slate-500">
                                                Emissao: {toBRDate(contrato.emitido_em)}
                                            </Text>

                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => router.push(`/contrato-assinatura?id=${contrato.id}`)}
                                                className="h-12 flex-row items-center justify-center rounded-xl bg-slate-900 shadow-sm shadow-slate-900/30"
                                            >
                                                <Feather name="pen-tool" size={16} color="white" />
                                                <Text className="ml-2 text-xs font-black uppercase tracking-widest text-white">
                                                    Assinar Agora
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}

                            <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Historico de Contratos</Text>
                            {data.contratosAssinados.length > 0 ? (
                                data.contratosAssinados.map((contrato) => (
                                    <View
                                        key={contrato.id}
                                        className="mb-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                                    >
                                        <View className="mb-4 flex-row items-start justify-between">
                                            <View className="flex-row items-center">
                                                <View className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                                                    <Feather name="file-text" size={16} color="#0F172A" />
                                                </View>
                                                <View>
                                                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                        {contrato.id}
                                                    </Text>
                                                    <Text
                                                        className="mt-0.5 text-sm font-bold tracking-tight text-slate-900"
                                                        numberOfLines={1}
                                                    >
                                                        {contrato.titulo}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1">
                                                <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                    Assinado
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="border-t border-slate-100 pt-4">
                                            <Text className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                Assinado em
                                            </Text>
                                            <Text className="text-sm font-bold text-slate-700">
                                                {toBRDate(contrato.assinado_em ?? contrato.emitido_em)}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View className="items-center justify-center rounded-3xl border border-dashed border-slate-100 bg-white py-10">
                                    <Feather name="folder-minus" size={32} color="#CBD5E1" />
                                    <Text className="mt-4 text-sm font-bold tracking-tight text-slate-400">
                                        Nenhum contrato assinado.
                                    </Text>
                                </View>
                            )}
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    )
}
