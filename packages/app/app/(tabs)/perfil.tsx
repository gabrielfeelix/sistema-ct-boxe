import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Animated, Linking, RefreshControl, ScrollView, Text, TouchableOpacity, View, Image } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '@/contexts/AuthContext'
import { fetchPerfilData, type PerfilData } from '@/lib/appData'
import { toBRDate, toCurrencyBRL } from '@/lib/formatters'

function emptyPerfilData(): PerfilData {
    return {
        aluno: null,
        contratoStatus: {
            status: 'em_dia',
            dias_para_vencer: 999,
            plano: 'Plano CT Boxe',
        },
        contratosAbertos: [],
        contratosAssinados: [],
    }
}

export default function PerfilScreen() {
    const router = useRouter()
    const { aluno, signOut } = useAuth()
    const insets = useSafeAreaInsets()
    const [perfil, setPerfil] = useState<PerfilData>(emptyPerfilData)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const avatarScale = useMemo(() => new Animated.Value(1), [])

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoading(false)
            return
        }
        try {
            const data = await fetchPerfilData(aluno.id)
            setPerfil(data)
        } catch (error) {
            console.error('[Perfil] Erro:', error)
        } finally {
            setLoading(false)
        }
    }, [aluno?.email, aluno?.foto_url, aluno?.id, aluno?.nome])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }, [loadData])

    const openLink = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Ops', 'Nao foi possivel abrir o link.'))
    }

    const handleLogout = () => {
        Alert.alert('Encerrar sessao', 'Tem certeza que deseja sair da sua conta?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Sair agora',
                style: 'destructive',
                onPress: async () => {
                    await signOut()
                    router.replace('/auth/login')
                },
            },
        ])
    }

    const alunoData = perfil.aluno
    const isVencido = perfil.contratoStatus.status !== 'em_dia'
    const planoLabel = perfil.contratoStatus.plano ?? 'Plano CT Boxe'
    const vencimento = toBRDate(perfil.contratoStatus.data_vencimento)
    const valor = toCurrencyBRL(perfil.contratoStatus.valor)

    const avatarLabel = useMemo(
        () =>
            alunoData?.nome
                ?.trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('') ?? 'AL',
        [alunoData?.nome]
    )

    const animateAvatar = () => {
        Animated.sequence([
            Animated.timing(avatarScale, { toValue: 0.96, duration: 90, useNativeDriver: true }),
            Animated.timing(avatarScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start()
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="relative overflow-hidden bg-slate-900 px-6 pb-32 shadow-2xl" style={{ paddingTop: insets.top + 16 }}>
                    <View className="absolute top-0 right-0 h-full w-full items-center justify-center opacity-5">
                        <FontAwesome5 name="fire" size={240} color="#FFFFFF" />
                    </View>
                </View>

                <View className="-mt-24 z-10 px-6">
                    <View className="mb-10 items-center">
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => {
                                animateAvatar()
                                router.push('/dados-cadastrais')
                            }}
                        >
                            <Animated.View
                                style={{ transform: [{ scale: avatarScale }] }}
                                className="mb-6 h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[#FDFDFD] bg-white shadow-xl shadow-slate-900/10"
                            >
                                {alunoData?.foto_url ? (
                                    <Image source={{ uri: alunoData.foto_url }} className="h-full w-full" />
                                ) : (
                                    <Text className="text-5xl font-black tracking-tighter text-slate-900">{avatarLabel}</Text>
                                )}
                            </Animated.View>
                        </TouchableOpacity>
                        <Text className="mb-3 text-3xl font-black tracking-tight text-slate-900">
                            {alunoData?.nome ?? 'Aluno'}
                        </Text>

                        <View className="flex-row items-center rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-4 py-2">
                            <View className="mr-3 h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                            <Text className="text-xs font-bold uppercase tracking-widest text-[#10B981]">
                                {alunoData?.status?.toLowerCase() === 'ativo' ? 'Atleta ativo' : 'Atleta'}
                            </Text>
                        </View>
                    </View>

                    <View className="mb-10">
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Minha Conta</Text>

                        <TouchableOpacity
                            onPress={() => router.push('/dados-cadastrais')}
                            activeOpacity={0.7}
                            className="mb-4 flex-row items-center rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                        >
                            <View className="mr-5 h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                                <Feather name="user" size={24} color="#64748B" />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1 text-lg font-bold tracking-tight text-slate-900">
                                    Dados Cadastrais
                                </Text>
                                <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500" numberOfLines={1}>
                                    {alunoData?.email ?? '-'}
                                </Text>
                            </View>
                            <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="chevron-right" size={16} color="#94A3B8" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/contratos')}
                            activeOpacity={0.7}
                            className="mb-4 flex-row items-center rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                        >
                            <View className="mr-5 h-14 w-14 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50">
                                <Feather name="file-text" size={24} color="#D97706" />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1 text-lg font-bold tracking-tight text-slate-900">Meus Contratos</Text>
                                <Text
                                    className={`text-xs font-bold uppercase tracking-widest ${perfil.contratosAbertos.length > 0 ? 'text-amber-600' : 'text-slate-500'
                                        }`}
                                >
                                    {perfil.contratosAbertos.length > 0
                                        ? `${perfil.contratosAbertos.length} assinatura pendente`
                                        : 'Termos e responsabilidades'}
                                </Text>
                            </View>
                            <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="chevron-right" size={16} color="#94A3B8" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/faturas')}
                            activeOpacity={0.7}
                            className="mb-4 flex-row items-center rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                        >
                            <View className="mr-5 h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
                                <Feather name="dollar-sign" size={24} color="#10B981" />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1 text-lg font-bold tracking-tight text-slate-900">Financeiro</Text>
                                <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Historico de pagamentos
                                </Text>
                            </View>
                            <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="chevron-right" size={16} color="#94A3B8" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/pagamento')}
                            activeOpacity={0.7}
                            className="mb-4 flex-row items-center rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                        >
                            <View className="mr-5 h-14 w-14 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
                                <Feather name="award" size={24} color="#CC0000" />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1 text-lg font-bold tracking-tight text-slate-900">{planoLabel}</Text>
                                <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                    Vence em {vencimento}
                                </Text>
                            </View>
                            <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                <Feather name="refresh-cw" size={16} color="#94A3B8" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/regras')}
                            activeOpacity={0.7}
                            className="relative mb-4 flex-row items-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-slate-900/20"
                        >
                            <View className="absolute right-0 top-0 opacity-10">
                                <FontAwesome5 name="gavel" size={100} color="#FFFFFF" />
                            </View>
                            <View className="mr-5 h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                                <Feather name="shield" size={24} color="#FFFFFF" />
                            </View>
                            <View className="flex-1">
                                <Text className="mb-1 text-lg font-bold tracking-tight text-white">
                                    Regras Internas
                                </Text>
                                <Text className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Regulamento CT
                                </Text>
                            </View>
                            <View className="h-8 w-8 items-center justify-center rounded-full bg-white/10">
                                <Feather name="chevron-right" size={16} color="#FFFFFF" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View className="mb-8">
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Nossa Comunidade</Text>
                        <View className="flex-row flex-wrap justify-between">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('whatsapp://send?phone=5541999999999')}
                                className="mb-4 h-28 w-[48%] items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/40"
                            >
                                <Image
                                    source={require('../../assets/whatsapp.png')}
                                    style={{ width: 32, height: 32, marginBottom: 8 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-xs font-bold text-slate-900">WhatsApp</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('https://www.instagram.com/ctdeboxe/')}
                                className="mb-4 h-28 w-[48%] items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/40"
                            >
                                <Image
                                    source={require('../../assets/instagram.png')}
                                    style={{ width: 32, height: 32, marginBottom: 8 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-xs font-bold text-slate-900">Instagram</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('https://www.youtube.com/channel/UCmT-2WRp5hHsVG76pyzBdVg')}
                                className="h-28 w-[48%] items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/40"
                            >
                                <Image
                                    source={require('../../assets/youtube.png')}
                                    style={{ width: 32, height: 32, marginBottom: 8 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-xs font-bold text-slate-900">YouTube</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() =>
                                    openLink(
                                        'https://www.google.com/search?sca_esv=cd133ae2d49e3551&sxsrf=ANbL-n6lp0fJL6gS_UYNIMQCTcfQ7fwf5g:1772902302261&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOZkEe32gZ7vxc8she4gdIEjlUMLPKYIa6IFZ27xy04atc-V203oPvCnNVu882bKSg-LLHqcyt78UxYWIbrQR-qkFCo0Nm8KYzmojF37tOsqtMcUMXlbrfzmhPtn6Ge0poG4wMo_KxETN26FaqRUT0GLoBy3G&q=Centro+de+Treinamento+de+Boxe+Equipe+Argel+Riboli+Coment%C3%A1rios&sa=X&ved=2ahUKEwjImMrfn46TAxV6kJUCHcOmF0sQ0bkNegQILxAH&biw=1536&bih=730&dpr=1.25'
                                    )
                                }
                                className="h-28 w-[48%] items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/40"
                            >
                                <Image
                                    source={require('../../assets/google.png')}
                                    style={{ width: 32, height: 32, marginBottom: 8 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-xs font-bold text-slate-900">Avaliar no Google</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.6}
                        onPress={handleLogout}
                        className="h-16 flex-row items-center justify-center rounded-2xl border-2 border-slate-100 bg-[#FBFBFB]"
                    >
                        <Feather name="log-out" size={18} color="#CC0000" />
                        <Text className="ml-3 text-sm font-bold uppercase tracking-widest text-[#CC0000]">
                            Encerrar Sessao
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    )
}
