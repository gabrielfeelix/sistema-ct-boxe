import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Image, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { useAuth } from '@/contexts/AuthContext'
import { fetchPagamentoAtual, type PagamentoAtual } from '@/lib/appData'
import { toBRDate, toCurrencyBRL } from '@/lib/formatters'

function getStatusVisual(status?: string) {
    switch ((status ?? '').toLowerCase()) {
        case 'vencido':
            return { label: 'Vencido', color: 'bg-red-500', text: 'text-red-700', card: 'border-red-100 bg-red-50' }
        case 'pago':
            return {
                label: 'Pago',
                color: 'bg-emerald-500',
                text: 'text-emerald-700',
                card: 'border-emerald-100 bg-emerald-50',
            }
        default:
            return {
                label: 'Pendente',
                color: 'bg-amber-500',
                text: 'text-amber-700',
                card: 'border-amber-100 bg-amber-50',
            }
    }
}

export default function PagamentoScreen() {
    const router = useRouter()
    const { aluno } = useAuth()
    const [pagamento, setPagamento] = useState<PagamentoAtual | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setPagamento(null)
            setLoading(false)
            return
        }
        try {
            const data = await fetchPagamentoAtual(aluno.id)
            setPagamento(data)
        } catch (error) {
            console.error('[Pagamento] Erro:', error)
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

    const statusVisual = useMemo(() => getStatusVisual(pagamento?.status), [pagamento?.status])

    const handleCopy = () => {
        if (!pagamento?.pix_copia_cola) return
        Alert.alert('PIX', 'Copie o codigo abaixo e cole no app do seu banco.', [
            { text: 'OK' },
            { text: pagamento.pix_copia_cola, style: 'cancel' },
        ])
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="relative z-10 overflow-hidden bg-[#111111] px-6 pb-6 pt-16 shadow-lg">
                <View className="absolute -right-10 -top-10 h-full w-full items-center justify-center opacity-5">
                    <FontAwesome5 name="fire" size={160} color="#FFFFFF" />
                </View>
                <View className="mb-2 flex-row items-center">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="mr-4 h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
                    >
                        <Feather name="arrow-left" size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Passaporte</Text>
                        <Text className="text-2xl font-black tracking-tight text-white">Renovacao</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                className="-mt-4"
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="rounded-t-3xl border-t border-slate-100 bg-[#FDFDFD] px-6 pt-8">
                    {loading ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Text className="text-sm font-medium text-slate-500">Carregando dados de pagamento...</Text>
                        </View>
                    ) : !pagamento ? (
                        <View className="items-center justify-center rounded-3xl border border-slate-100 bg-white py-16">
                            <Feather name="check-circle" size={36} color="#10B981" />
                            <Text className="mt-4 text-center text-base font-bold text-slate-900">Sem cobrancas pendentes</Text>
                            <Text className="mt-2 px-8 text-center text-sm text-slate-500">
                                Nao encontramos nenhuma cobranca em aberto para sua conta.
                            </Text>
                        </View>
                    ) : (
                        <>
                            <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Fatura Atual</Text>

                            <View className="relative mb-10 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50">
                                <View className={`absolute right-0 top-0 rounded-bl-2xl px-4 py-2 ${statusVisual.color}`}>
                                    <Text className="text-[10px] font-black uppercase tracking-widest text-white">
                                        {statusVisual.label}
                                    </Text>
                                </View>

                                <Text className="mb-1 mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">ALUNO(A)</Text>
                                <Text className="mb-6 text-lg font-bold tracking-tight text-slate-900">{aluno?.nome ?? 'Aluno'}</Text>

                                <View className="mb-6 flex-row items-center justify-between border-y border-dashed border-slate-200 py-4">
                                    <View>
                                        <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">PLANO</Text>
                                        <Text className="text-sm font-bold text-slate-900">{pagamento.plano ?? 'Plano CT Boxe'}</Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">VENCIMENTO</Text>
                                        <Text className="text-sm font-bold text-slate-900">
                                            {toBRDate(pagamento.data_vencimento)}
                                        </Text>
                                    </View>
                                </View>

                                <View className="flex-row items-end justify-between">
                                    <Text className="text-sm font-bold uppercase tracking-widest text-slate-400">TOTAL A PAGAR</Text>
                                    <Text className="text-4xl font-black tracking-tighter text-slate-900">
                                        {toCurrencyBRL(pagamento.valor)}
                                    </Text>
                                </View>
                            </View>

                            <Text className="mb-6 mt-4 text-xl font-bold tracking-tight text-slate-900">Pagamento via Pix</Text>

                            <View className="mb-8 items-center rounded-[2rem] border border-slate-800 bg-[#111111] p-6 shadow-2xl shadow-slate-900/30">
                                <View className="mb-6 h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
                                    <FontAwesome5 name="pix" size={24} color="#10B981" />
                                </View>

                                <Text className="mb-2 text-center text-lg font-bold tracking-tight text-white">Escaneie o QR Code</Text>
                                <Text className="mb-8 max-w-[260px] text-center text-sm font-medium leading-relaxed text-slate-400">
                                    Aprovacao automatica no sistema. Seu passaporte e liberado na hora.
                                </Text>

                                <View className="mb-8 h-56 w-56 items-center justify-center overflow-hidden rounded-[2rem] bg-white p-3 shadow-inner">
                                    {pagamento.qr_code_base64 ? (
                                        <Image
                                            source={{ uri: `data:image/png;base64,${pagamento.qr_code_base64}` }}
                                            style={{ width: 210, height: 210 }}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <FontAwesome5 name="qrcode" size={170} color="#0F172A" />
                                    )}
                                </View>

                                <View className="w-full">
                                    <Text className="mb-3 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Ou use o Pix Copia e Cola
                                    </Text>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleCopy}
                                        disabled={!pagamento.pix_copia_cola}
                                        className="w-full flex-row items-center rounded-2xl border border-slate-700/50 bg-slate-800/50 p-5"
                                    >
                                        <Text className="flex-1 font-mono text-xs text-slate-300 opacity-80" numberOfLines={1}>
                                            {pagamento.pix_copia_cola ?? 'Codigo PIX nao disponivel'}
                                        </Text>
                                        <View className="ml-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-700 shadow-sm">
                                            <Feather name="copy" size={16} color="#FFFFFF" />
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View className={`rounded-2xl border px-4 py-3 ${statusVisual.card}`}>
                                <Text className={`text-center text-xs font-bold uppercase tracking-widest ${statusVisual.text}`}>
                                    Status atual: {statusVisual.label}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    )
}
