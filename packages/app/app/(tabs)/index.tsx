import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Alert,
    Animated,
    FlatList,
    Linking,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Image,
} from 'react-native'

import StoryViewer from '@/components/StoryViewer'
import { useAuth } from '@/contexts/AuthContext'
import { fetchHomeData, type HomeData, setPresencaStatus } from '@/lib/appData'
import { getInitials } from '@/lib/formatters'

function buildEmptyHomeData(): HomeData {
    return {
        stories: [],
        notificacoesNaoLidas: 0,
        avisos: [],
        aulasHoje: [],
        proximaAula: null,
    }
}

export default function HomeScreen() {
    const router = useRouter()
    const { aluno } = useAuth()
    const [homeData, setHomeData] = useState<HomeData>(buildEmptyHomeData)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [expandedAvisoId, setExpandedAvisoId] = useState<string | null>(null)

    const [isStoryOpen, setIsStoryOpen] = useState(false)
    const [initialStoryIndex, setInitialStoryIndex] = useState(0)
    const heroScale = useRef(new Animated.Value(1)).current

    const loadData = useCallback(async () => {
        if (!aluno?.id) return
        const data = await fetchHomeData(aluno.id)
        setHomeData(data)
        setLoading(false)
    }, [aluno?.id])

    useEffect(() => {
        loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }, [loadData])

    const handleNotificationClick = () => {
        router.push('/notificacoes')
    }

    const handleConfirmar = async (aulaId: string) => {
        if (!aluno?.id) return

        Animated.sequence([
            Animated.timing(heroScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
            Animated.timing(heroScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start()

        await setPresencaStatus(aluno.id, aulaId, 'presente')
        await loadData()
        Alert.alert('Presenca confirmada', 'Seu check-in foi registrado com sucesso.')
    }

    const handleAgendar = async (aulaId: string) => {
        if (!aluno?.id) return
        await setPresencaStatus(aluno.id, aulaId, 'agendado')
        await loadData()
    }

    const toggleAviso = (id: string) => {
        setExpandedAvisoId((prev) => (prev === id ? null : id))
    }

    const openStory = (index: number) => {
        setInitialStoryIndex(index)
        setIsStoryOpen(true)
    }

    const openLink = (url: string) => {
        Linking.openURL(url).catch(() => Alert.alert('Ops', 'Nao foi possivel abrir o link.'))
    }

    const proximaAula = homeData.proximaAula
    const isAulaConfirmada = Boolean(proximaAula?.presente)

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            {isStoryOpen && (
                <StoryViewer
                    stories={homeData.stories}
                    initialIndex={initialStoryIndex}
                    onClose={() => setIsStoryOpen(false)}
                />
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="border-b border-slate-100 bg-white px-6 pb-6 pt-16">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">
                                Bem-vindo de volta
                            </Text>
                            <View className="flex-row items-center">
                                <Text className="text-3xl font-black tracking-tight text-slate-900">
                                    Ola, {aluno?.nome?.split(' ')[0] ?? 'Atleta'}
                                </Text>
                                <Text className="ml-2 text-2xl">👊</Text>
                            </View>
                        </View>
                        <View className="flex-row items-center space-x-3">
                            <TouchableOpacity
                                onPress={() => router.push('/eventos')}
                                activeOpacity={0.7}
                                className="h-12 w-12 items-center justify-center rounded-full border border-red-100 bg-red-50"
                            >
                                <Feather name="calendar" size={20} color="#CC0000" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleNotificationClick}
                                activeOpacity={0.7}
                                className="ml-2 h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                            >
                                <Feather name="bell" size={20} color="#0F172A" />
                                {homeData.notificacoesNaoLidas > 0 && (
                                    <View className="absolute right-2 top-2 min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-white bg-[#CC0000] px-1">
                                        <Text className="text-[10px] font-black text-white">
                                            {homeData.notificacoesNaoLidas}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View className="border-b border-slate-50 bg-white pb-2 pt-6">
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={homeData.stories}
                        keyExtractor={(story) => story.id}
                        contentContainerStyle={{ paddingLeft: 24, paddingRight: 40 }}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        renderItem={({ item: story, index }) => (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => openStory(index)}
                                className="mr-5 items-center"
                            >
                                <View
                                    className={`mb-2 h-16 w-16 rounded-full border-[2.5px] p-[2px] ${!story.assistido ? 'border-[#CC0000]' : 'border-slate-300'
                                        }`}
                                >
                                    <View className="flex-1 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-800 shadow-sm">
                                        <Text className="text-xl font-black tracking-tighter text-white">
                                            {getInitials(story.nome)}
                                        </Text>
                                    </View>
                                </View>
                                <Text className="w-16 text-center text-xs font-bold text-slate-700" numberOfLines={1}>
                                    {story.nome}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                <View className="px-6 pt-8">
                    <View className="mb-10 overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-xl shadow-slate-900/20">
                        <View className="absolute -right-6 -top-6 opacity-10">
                            <FontAwesome5 name="fire" size={120} color="#FFFFFF" />
                        </View>

                        <View className="mb-6 flex-row items-center">
                            <View className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
                                <Text className="text-xs font-bold uppercase tracking-widest text-white">
                                    Proxima Aula
                                </Text>
                            </View>
                        </View>

                        {proximaAula ? (
                            <>
                                <Text className="mb-2 text-3xl font-black tracking-tight text-white">
                                    {proximaAula.nome}
                                </Text>

                                <View className="mb-8 flex-row items-center">
                                    <Feather name="clock" size={18} color="#94A3B8" />
                                    <Text className="ml-2 text-lg font-semibold text-slate-300">
                                        {proximaAula.horario}
                                    </Text>
                                    <View className="mx-3 h-1 w-1 rounded-full bg-slate-500" />
                                    <Text className="text-sm font-medium text-slate-400">
                                        {proximaAula.vagas_ocupadas}/{proximaAula.vagas_total} vagas
                                    </Text>
                                </View>

                                <Animated.View style={{ transform: [{ scale: heroScale }] }}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => handleConfirmar(proximaAula.id)}
                                        className={`h-14 flex-row items-center justify-center rounded-2xl shadow-md ${isAulaConfirmada
                                                ? 'bg-emerald-500 shadow-emerald-900/30'
                                                : 'bg-[#CC0000] shadow-red-900/30'
                                            }`}
                                    >
                                        <Text className="text-base font-bold tracking-wide text-white">
                                            {isAulaConfirmada ? 'PRESENCA CONFIRMADA' : 'CONFIRMAR PRESENCA'}
                                        </Text>
                                        <Feather
                                            name={isAulaConfirmada ? 'check' : 'arrow-right'}
                                            size={18}
                                            color="white"
                                            style={{ marginLeft: 8 }}
                                        />
                                    </TouchableOpacity>
                                </Animated.View>
                            </>
                        ) : (
                            <Text className="text-sm font-medium text-slate-400">
                                Nenhuma aula disponivel nos proximos horarios.
                            </Text>
                        )}
                    </View>

                    <View className="mb-10">
                        <View className="mb-6 flex-row items-baseline justify-between">
                            <Text className="text-xl font-bold tracking-tight text-slate-900">Aulas de Hoje</Text>
                            <TouchableOpacity activeOpacity={0.6} onPress={() => router.push('/(tabs)/checkin')}>
                                <Text className="text-sm font-bold text-[#CC0000]">Ver todas</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="-mx-6 px-6"
                            contentContainerStyle={{ paddingRight: 40 }}
                        >
                            {homeData.aulasHoje.map((aula) => {
                                const isLivre = aula.vagas_ocupadas < aula.vagas_total
                                const isConfirmado = Boolean(aula.presente || aula.agendado)

                                return (
                                    <View
                                        key={aula.id}
                                        className="mr-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                                        style={{ width: 280 }}
                                    >
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => router.push(`/aula/${aula.id}`)}
                                        >
                                            <View className="mb-4 flex-row items-start justify-between">
                                                <Text className="text-2xl font-black tracking-tighter text-slate-900">
                                                    {aula.horario}
                                                </Text>
                                                <View
                                                    className={`rounded-md px-2 py-1 ${isLivre ? 'bg-emerald-50' : 'bg-slate-100'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-[10px] font-black uppercase tracking-widest ${isLivre ? 'text-emerald-600' : 'text-slate-500'
                                                            }`}
                                                    >
                                                        {isLivre ? 'LIVRE' : 'LOTADA'}
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text
                                                className="mb-1 text-lg font-bold tracking-tight text-slate-900"
                                                numberOfLines={1}
                                            >
                                                {aula.nome}
                                            </Text>
                                            <Text className="mb-6 text-sm font-medium text-slate-500">
                                                {aula.professor}
                                            </Text>
                                        </TouchableOpacity>

                                        <View className="mb-4 flex-row items-center justify-between border-t border-slate-100/50 pt-4">
                                            <Text className="text-xs font-bold text-slate-400">
                                                Confirmados: {aula.vagas_ocupadas}
                                            </Text>
                                            <Text className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {aula.vagas_ocupadas}/{aula.vagas_total}
                                            </Text>
                                        </View>

                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => !isConfirmado && isLivre && handleAgendar(aula.id)}
                                            className={`h-10 flex-row items-center justify-center rounded-xl px-4 ${isConfirmado
                                                    ? 'bg-emerald-500'
                                                    : !isLivre
                                                        ? 'bg-slate-100'
                                                        : 'border border-red-100 bg-red-50'
                                                }`}
                                        >
                                            <Text
                                                className={`text-[10px] font-black uppercase tracking-widest ${isConfirmado
                                                        ? 'text-white'
                                                        : !isLivre
                                                            ? 'text-slate-400'
                                                            : 'text-[#CC0000]'
                                                    }`}
                                            >
                                                {isConfirmado
                                                    ? 'PRESENCA REGISTRADA'
                                                    : !isLivre
                                                        ? 'ESGOTADO'
                                                        : 'AGENDAR PRESENCA'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            })}
                        </ScrollView>
                    </View>

                    <View className="mb-10">
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Avisos do CT</Text>
                        {homeData.avisos.length === 0 && !loading ? (
                            <View className="rounded-2xl border border-slate-100 bg-white p-5">
                                <Text className="text-sm text-slate-500">Nenhum aviso publicado no momento.</Text>
                            </View>
                        ) : (
                            homeData.avisos.map((aviso) => {
                                const isExpanded = expandedAvisoId === aviso.id
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        key={aviso.id}
                                        onPress={() => toggleAviso(aviso.id)}
                                        className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
                                    >
                                        <View className="flex-row items-start justify-between">
                                            <View className="mr-4 flex-1">
                                                <View className="mb-2 flex-row items-center">
                                                    <View className="mr-2 h-1.5 w-1.5 rounded-full bg-[#CC0000]" />
                                                    <Text className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                                        {aviso.data}
                                                    </Text>
                                                </View>
                                                <Text className="text-base font-bold tracking-tight text-slate-900">
                                                    {aviso.titulo}
                                                </Text>
                                                {isExpanded && (
                                                    <Text className="mt-3 text-sm leading-relaxed text-slate-500">
                                                        {aviso.texto}
                                                    </Text>
                                                )}
                                            </View>
                                            <View className="mt-1 h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                                                <Feather
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={16}
                                                    color="#64748B"
                                                />
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })
                        )}
                    </View>

                    <View className="mb-4">
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Nossa Comunidade</Text>
                        <View className="flex-row flex-wrap justify-between">
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('whatsapp://send?phone=5541999999999')}
                                className="mb-4 w-[48%] items-center justify-center rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 transition-transform"
                            >
                                <Image
                                    source={require('../../assets/whatsapp.png')}
                                    style={{ width: 36, height: 36, marginBottom: 10 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-center text-xs font-bold tracking-tight text-slate-700">
                                    Grupo Oficial
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('https://instagram.com/ctargelriboli')}
                                className="mb-4 w-[48%] items-center justify-center rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 transition-transform"
                            >
                                <Image
                                    source={require('../../assets/instagram.png')}
                                    style={{ width: 36, height: 36, marginBottom: 10 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-center text-xs font-bold tracking-tight text-slate-700">
                                    Instagram
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('https://youtube.com')}
                                className="w-[48%] items-center justify-center rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 transition-transform"
                            >
                                <Image
                                    source={require('../../assets/youtube.png')}
                                    style={{ width: 36, height: 36, marginBottom: 10 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-center text-xs font-bold tracking-tight text-slate-700">
                                    Aulas YT
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => openLink('https://google.com/maps')}
                                className="w-[48%] items-center justify-center rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/40 transition-transform"
                            >
                                <Image
                                    source={require('../../assets/google.png')}
                                    style={{ width: 36, height: 36, marginBottom: 10 }}
                                    resizeMode="contain"
                                />
                                <Text className="text-center text-xs font-bold tracking-tight text-slate-700">
                                    Avalie-nos
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}
