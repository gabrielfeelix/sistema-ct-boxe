import '../global.css'

import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { Stack, usePathname, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useContratoStatus } from '@/hooks/useContratoStatus'
import { toBRDate, toCurrencyBRL } from '@/lib/formatters'

function AppLayoutShell() {
    const pathname = usePathname()
    const router = useRouter()
    const { session, aluno, loading, refreshAluno, signOut } = useAuth()
    const { status: contrato } = useContratoStatus(aluno?.id)
    const [showBanner, setShowBanner] = useState(true)

    useEffect(() => {
        if (loading) return

        const inAuthRoute = pathname.startsWith('/auth')

        if (!session && !inAuthRoute) {
            router.replace('/auth/login')
            return
        }

        if (session && aluno && inAuthRoute) {
            router.replace('/(tabs)')
        }
    }, [aluno, loading, pathname, router, session])

    const isVencendo = contrato.status === 'vencendo'
    const isBloqueado = contrato.status === 'vencido'

    const isEscapeRoute =
        pathname === '/pagamento' || pathname === '/dados-cadastrais' || pathname === '/auth/login'

    const showBlocker = Boolean(session && isBloqueado && !isEscapeRoute)
    const showProfilePending = Boolean(session && !aluno && !loading && !pathname.startsWith('/auth'))

    const handleRenovarClick = () => {
        router.push('/pagamento')
    }

    const handleWhatsAppClick = () => {
        const url =
            'whatsapp://send?phone=5541999999999&text=Ola, quero falar sobre a renovacao do meu plano no CT Argel Riboli.'
        Linking.canOpenURL(url).then((supported) => {
            if (supported) {
                Linking.openURL(url)
            } else {
                Alert.alert('Erro', 'WhatsApp nao esta instalado neste dispositivo.')
            }
        })
    }

    return (
        <GluestackUIProvider mode="light">
            <View className="flex-1 bg-[#FDFDFD]">
                <Stack
                    screenOptions={{
                        headerShown: false,
                    }}
                >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="aula/[id]"
                        options={{
                            presentation: 'transparentModal',
                            animation: 'slide_from_bottom',
                            headerShown: false,
                            contentStyle: { backgroundColor: 'transparent' },
                        }}
                    />
                    <Stack.Screen name="notificacoes" options={{ headerShown: false }} />
                    <Stack.Screen name="pagamento" options={{ headerShown: false, presentation: 'modal' }} />
                    <Stack.Screen name="dados-cadastrais" options={{ headerShown: false }} />
                </Stack>

                {isVencendo && !isBloqueado && showBanner && !isEscapeRoute && (
                    <View className="absolute left-4 right-4 top-12 z-50 flex-row items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xl shadow-amber-900/10">
                        <View className="mr-2 flex-1 flex-row items-center">
                            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                                <Feather name="alert-circle" size={16} color="#D97706" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-xs font-bold uppercase tracking-widest text-amber-800">
                                    Plano em Vencimento
                                </Text>
                                <Text className="overflow-hidden text-[10px] font-medium text-amber-700/80" numberOfLines={1}>
                                    Seu plano vence em {Math.max(contrato.dias_para_vencer ?? 0, 0)} dias.
                                </Text>
                            </View>
                        </View>
                        <View className="flex-row items-center">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handleRenovarClick}
                                className="mr-2 h-9 justify-center rounded-lg bg-amber-500 px-3 shadow-sm"
                            >
                                <Text className="text-[10px] font-black uppercase tracking-widest text-white">
                                    Renovar
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                activeOpacity={0.6}
                                onPress={() => setShowBanner(false)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-amber-200/50"
                            >
                                <Feather name="x" size={14} color="#D97706" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {showBlocker && (
                    <View className="absolute inset-0 z-[100] justify-center bg-[#B90000] px-6">
                        <View className="absolute -right-10 -top-10 opacity-10">
                            <FontAwesome5 name="fire" size={240} color="#FFFFFF" />
                        </View>

                        <ScrollView
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View className="w-full items-center py-10">
                                <View className="mb-6 h-24 w-24 items-center justify-center rounded-full border border-white/20 bg-white/10">
                                    <Feather name="lock" size={32} color="#FFFFFF" />
                                </View>

                                <View className="mb-10 items-center px-4">
                                    <Text className="mb-3 text-center text-3xl font-black tracking-tighter text-white">
                                        Passaporte Suspenso.
                                    </Text>
                                    <Text className="max-w-xs text-center text-sm font-medium leading-relaxed text-white/80">
                                        Identificamos uma pendencia no seu {contrato.plano ?? 'plano'}. Para treinar, regularize o pagamento.
                                    </Text>
                                </View>

                                <View className="mb-10 w-full rounded-3xl border border-white/20 bg-white/10 p-6 shadow-xl">
                                    <View className="mb-4 flex-row items-center justify-between border-b border-dashed border-white/10 pb-4">
                                        <Text className="text-xs font-bold uppercase tracking-widest text-white/60">
                                            Valor Pendente
                                        </Text>
                                        <Text className="text-xl font-black text-white">{toCurrencyBRL(contrato.valor)}</Text>
                                    </View>
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-xs font-bold uppercase tracking-widest text-white/60">
                                            Vencimento
                                        </Text>
                                        <Text className="text-md font-bold text-white">{toBRDate(contrato.data_vencimento)}</Text>
                                    </View>
                                </View>

                                <View className="w-full">
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={handleRenovarClick}
                                        className="mb-4 h-16 w-full flex-row items-center justify-center rounded-2xl bg-white shadow-lg"
                                    >
                                        <Text className="text-base font-black uppercase tracking-widest text-[#B90000]">
                                            Efetuar Pagamento
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={handleWhatsAppClick}
                                        className="h-16 w-full flex-row items-center justify-center rounded-2xl border-[1.5px] border-white/30"
                                    >
                                        <FontAwesome5 name="whatsapp" size={18} color="#FFFFFF" />
                                        <Text className="ml-2 text-sm font-black uppercase tracking-widest text-white">
                                            Falar com o CT
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                )}

                {showProfilePending && (
                    <View className="absolute inset-0 z-[90] items-center justify-center bg-white/95 px-6">
                        <View className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-900/10">
                            <Text className="mb-2 text-lg font-black tracking-tight text-slate-900">
                                Sincronizando perfil
                            </Text>
                            <Text className="mb-6 text-sm font-medium leading-relaxed text-slate-500">
                                Seu login foi identificado, mas os dados do aluno ainda nao chegaram.
                            </Text>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={refreshAluno}
                                className="mb-3 h-12 items-center justify-center rounded-xl bg-slate-900"
                            >
                                <Text className="text-xs font-black uppercase tracking-widest text-white">
                                    Tentar Novamente
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    signOut().then(() => router.replace('/auth/login'))
                                }}
                                className="h-12 items-center justify-center rounded-xl border border-slate-200 bg-white"
                            >
                                <Text className="text-xs font-black uppercase tracking-widest text-slate-700">
                                    Sair da Conta
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </GluestackUIProvider>
    )
}

export default function RootLayout() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppLayoutShell />
            </AuthProvider>
        </ErrorBoundary>
    )
}
