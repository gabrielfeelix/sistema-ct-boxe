import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
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
import { useFocusEffect } from 'expo-router'

import StoryViewer from '@/components/StoryViewer'
import { useAuth } from '@/contexts/AuthContext'
import { fetchHomeData, type HomeData, type HomeAviso, setPresencaStatus } from '@/lib/appData'
import { getInitials } from '@/lib/formatters'
import type { AppAula } from '@/lib/types'

function buildEmptyHomeData(): HomeData {
    return {
        stories: [],
        notificacoesNaoLidas: 0,
        avisos: [],
        aulasHoje: [],
        proximaAula: null,
    }
}

const AvisoItem = memo(({ aviso, isExpanded, onToggle }: {
    aviso: HomeAviso
    isExpanded: boolean
    onToggle: (id: string) => void
}) => (
    <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onToggle(aviso.id)}
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
))

const AulaHojeItem = memo(({ aula, onPress, onAgendarOuCancelar, currentMinutes }: {
    aula: AppAula
    onPress: (id: string) => void
    onAgendarOuCancelar: (id: string, isConfirmado: boolean) => void
    currentMinutes: number
}) => {
    const isLivre = aula.vagas_ocupadas < aula.vagas_total
    const isConfirmado = Boolean(aula.presente || aula.agendado)

    // Verificar se a aula passou (considerar data + hora)
    const today = new Date().toISOString().slice(0, 10)
    const classMinutes = Number(aula.horario.split(':')[0]) * 60 + Number(aula.horario.split(':')[1])
    const isPassed = aula.data < today || (aula.data === today && classMinutes < currentMinutes)

    return (
        <View
            className="mr-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-200/50"
            style={{ width: 280 }}
        >
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onPress(aula.id)}
            >
                <View className="mb-4 flex-row items-start justify-between">
                    <Text className="text-2xl font-black tracking-tighter text-slate-900">
                        {aula.horario}
                    </Text>
                    <View
                        className={`rounded-md px-2 py-1 ${isPassed
                            ? 'bg-slate-100'
                            : isLivre
                                ? 'bg-emerald-50'
                                : 'bg-slate-100'
                            }`}
                    >
                        <Text
                            className={`text-[10px] font-black uppercase tracking-widest ${isPassed
                                ? 'text-slate-500'
                                : isLivre
                                    ? 'text-emerald-600'
                                    : 'text-slate-500'
                                }`}
                        >
                            {isPassed ? 'ENCERRADA' : isLivre ? 'LIVRE' : 'LOTADA'}
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
                onPress={() => onAgendarOuCancelar(aula.id, isConfirmado)}
                disabled={isPassed || (!isConfirmado && !isLivre)}
                className={`h-10 flex-row items-center justify-center rounded-xl px-4 ${isPassed
                    ? 'bg-slate-50 border border-slate-100'
                    : isConfirmado
                        ? 'bg-slate-100 border border-slate-200'
                        : !isLivre
                            ? 'bg-slate-100'
                            : 'border border-red-100 bg-red-50'
                    }`}
            >
                <Text
                    className={`text-[10px] font-black uppercase tracking-widest ${isPassed
                        ? 'text-slate-400'
                        : isConfirmado
                            ? 'text-slate-500'
                            : !isLivre
                                ? 'text-slate-400'
                                : 'text-[#CC0000]'
                        }`}
                >
                    {isPassed
                        ? 'NAO DISPONIVEL'
                        : isConfirmado
                            ? 'CANCELAR AGENDAMENTO'
                            : !isLivre
                                ? 'ESGOTADO'
                                : 'AGENDAR PRESENCA'}
                </Text>
            </TouchableOpacity>
        </View>
    )
})

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

    useFocusEffect(
        useCallback(() => {
            loadData()
        }, [loadData])
    )

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
    }, [loadData])

    const handleNotificationClick = () => {
        router.push('/notificacoes')
    }

    const handleConfirmar = useCallback(async (aulaId: string) => {
        if (!aluno?.id) return

        // Buscar o estado atual da aula
        const aulaAtual = homeData.aulasHoje.find((a) => a.id === aulaId) || homeData.proximaAula
        if (!aulaAtual || aulaAtual.id !== aulaId) return

        const isConfirmada = Boolean(aulaAtual.presente) || Boolean(aulaAtual.agendado)

        // Animação
        Animated.sequence([
            Animated.timing(heroScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
            Animated.timing(heroScale, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start()

        // Inverter status
        if (isConfirmada) {
            await setPresencaStatus(aluno.id, aulaId, 'cancelada')
            Alert.alert('Cancelado', 'Sua presenca foi cancelada.')
        } else {
            await setPresencaStatus(aluno.id, aulaId, 'presente')
            Alert.alert('Presenca confirmada', 'Seu check-in foi registrado com sucesso.')
        }

        // Recarregar dados
        await loadData()
    }, [aluno?.id, homeData.aulasHoje, homeData.proximaAula, heroScale, loadData])

    const handleAgendarOuCancelar = async (aulaId: string, isConfirmado: boolean) => {
        if (!aluno?.id) return
        if (isConfirmado) {
            await setPresencaStatus(aluno.id, aulaId, 'cancelada')
        } else {
            await setPresencaStatus(aluno.id, aulaId, 'agendado')
        }
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

    const handleAulaPress = useCallback((id: string) => {
        router.push(`/aula/${id}`)
    }, [router])

    const proximaAula = homeData.proximaAula
    const isAulaConfirmada = Boolean(proximaAula?.presente) || Boolean(proximaAula?.agendado)

    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

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
                <View className="border-b border-slate-100 bg-white px-6 pb-4 pt-16">
                    <View className="mb-4 flex-row items-start justify-between">
                        <View className="flex-1">
                            <Text className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                BEM-VINDO DE VOLTA
                            </Text>
                            <Text className="text-2xl font-black tracking-tight text-slate-900">
                                {aluno?.nome?.split(' ')[0] ?? 'Atleta'}.
                            </Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <TouchableOpacity
                                onPress={handleNotificationClick}
                                activeOpacity={0.7}
                                className="relative h-11 w-11 items-center justify-center rounded-full border border-slate-100 bg-slate-50"
                            >
                                <Feather name="bell" size={18} color="#0F172A" />
                                {homeData.notificacoesNaoLidas > 0 && (
                                    <View className="absolute right-1.5 top-1.5 min-h-[16px] min-w-[16px] items-center justify-center rounded-full border border-white bg-[#CC0000] px-0.5">
                                        <Text className="text-[9px] font-black text-white">
                                            {homeData.notificacoesNaoLidas}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-800 shadow-sm">
                                <Text className="text-base font-black tracking-tighter text-white">
                                    {getInitials(aluno?.nome ?? 'Atleta')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View className="bg-white px-6 pb-6 pt-4">
                    <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">VÍDEOS</Text>
                    <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={homeData.stories.length > 0 ? homeData.stories : [
                                { id: '1', nome: 'Jab Básico', thumbnail: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400', assistido: false, duracao: 45, created_at: new Date().toISOString() },
                                { id: '2', nome: 'Esquiva Lateral', thumbnail: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400', assistido: false, duracao: 60, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
                                { id: '3', nome: 'Combinação 1-2', thumbnail: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400', assistido: true, duracao: 90, created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
                            ]}
                            keyExtractor={(story) => story.id}
                            contentContainerStyle={{ paddingRight: 16 }}
                            removeClippedSubviews={true}
                            maxToRenderPerBatch={10}
                            windowSize={5}
                            renderItem={({ item: story, index }) => {
                                // Check if story is from last month (30 days)
                                const storyDate = new Date(story.created_at || '')
                                const now = new Date()
                                const daysDiff = Math.floor((now.getTime() - storyDate.getTime()) / (1000 * 60 * 60 * 24))
                                const isNew = daysDiff <= 30

                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => openStory(index)}
                                        className="relative mr-3 overflow-hidden rounded-3xl"
                                        style={{ width: 110, height: 160 }}
                                    >
                                        {story.thumbnail ? (
                                            <Image
                                                source={{ uri: story.thumbnail, cache: 'force-cache' }}
                                                style={{ width: '100%', height: '100%' }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View className="h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                <Text className="text-2xl font-black text-white opacity-50">
                                                    {getInitials(story.nome)}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Gradient overlay */}
                                        <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                                        {/* NEW badge */}
                                        {isNew && (
                                            <View className="absolute right-1.5 top-1.5 rounded-md bg-[#CC0000] px-1.5 py-0.5">
                                                <Text className="text-[8px] font-black uppercase tracking-widest text-white">
                                                    NOVO
                                                </Text>
                                            </View>
                                        )}

                                        {/* Title */}
                                        <View className="absolute bottom-0 left-0 right-0 p-2">
                                            <Text className="text-[11px] font-black text-white" numberOfLines={1}>
                                                {story.nome}
                                            </Text>
                                            {story.duracao && (
                                                <View className="mt-0.5 flex-row items-center">
                                                    <Feather name="clock" size={8} color="rgba(255,255,255,0.7)" />
                                                    <Text className="ml-1 text-[9px] font-medium text-white/70">
                                                        {story.duracao}s
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Unread indicator */}
                                        {!story.assistido && (
                                            <View className="absolute left-0 top-0 h-full w-1 bg-[#CC0000]" />
                                        )}
                                    </TouchableOpacity>
                                )
                            }}
                        />
                    </View>

                <View className="px-6 pt-8">
                    {proximaAula ? (
                        <View className="relative mb-10 overflow-hidden rounded-3xl bg-[#0A0F1D] shadow-2xl shadow-slate-900/40">
                            {/* Time Badge in Corner */}
                            <View className="absolute right-0 top-0 h-12 w-20 items-center justify-center rounded-bl-3xl bg-[#CC0000]">
                                <Text className="text-lg font-black text-white">{proximaAula.horario}</Text>
                            </View>

                            <View className="p-6">
                                <View className="mb-4 flex-row items-center gap-2">
                                    <View className="rounded-lg bg-slate-800 px-2 py-1">
                                        <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            HOJE
                                        </Text>
                                    </View>
                                    {(() => {
                                        const hour = parseInt(proximaAula.horario.split(':')[0])
                                        return hour >= 18 ? (
                                            <View className="rounded-lg bg-slate-800 px-2 py-1">
                                                <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    ADULTO
                                                </Text>
                                            </View>
                                        ) : null
                                    })()}
                                </View>

                                <Text className="mb-1 text-2xl font-black tracking-tight text-white">
                                    AULA DE BOXE
                                </Text>

                                <View className="mb-5 flex-row items-center">
                                    <Feather name="user" size={12} color="#CC0000" />
                                    <Text className="ml-1.5 text-sm font-bold text-slate-400">
                                        {proximaAula.professor}
                                    </Text>
                                    <View className="mx-2 h-1 w-1 rounded-full bg-slate-700" />
                                    <Text className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        {proximaAula.vagas_ocupadas}/{proximaAula.vagas_total} ALUNOS
                                    </Text>
                                </View>

                                <Animated.View style={{ transform: [{ scale: heroScale }] }}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => handleConfirmar(proximaAula.id)}
                                        className={`h-12 flex-row items-center justify-center rounded-xl ${isAulaConfirmada
                                            ? 'border border-white/10 bg-slate-800'
                                            : 'bg-[#CC0000]'
                                            }`}
                                    >
                                        <Text className="text-sm font-black uppercase tracking-widest text-white">
                                            {isAulaConfirmada ? 'CANCELAR PRESENCA' : 'BATER O PONTO'}
                                        </Text>
                                        {!isAulaConfirmada && (
                                            <Feather
                                                name="x"
                                                size={16}
                                                color="white"
                                                style={{ marginLeft: 8 }}
                                            />
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        </View>
                    ) : (
                        <View className="mb-10 rounded-3xl bg-slate-900 p-8">
                            <Text className="text-sm font-medium text-slate-400">
                                Nenhuma aula disponivel nos proximos horarios.
                            </Text>
                        </View>
                    )}

                    <View className="mb-10">
                        <View className="mb-6 flex-row items-baseline justify-between">
                            <Text className="text-xl font-bold tracking-tight text-slate-900">Aulas</Text>
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
                            {homeData.aulasHoje.map((aula) => (
                                    <AulaHojeItem
                                        key={aula.id}
                                        aula={aula}
                                        onPress={handleAulaPress}
                                        onAgendarOuCancelar={handleAgendarOuCancelar}
                                        currentMinutes={currentMinutes}
                                    />
                                ))}
                        </ScrollView>
                    </View>

                    <View className="mb-10">
                        <Text className="mb-6 text-xl font-bold tracking-tight text-slate-900">Avisos do CT</Text>
                        {homeData.avisos.length === 0 && !loading ? (
                            <View className="rounded-2xl border border-slate-100 bg-white p-5">
                                <Text className="text-sm text-slate-500">Nenhum aviso publicado no momento.</Text>
                            </View>
                        ) : (
                            homeData.avisos.map((aviso) => (
                                <AvisoItem
                                    key={aviso.id}
                                    aviso={aviso}
                                    isExpanded={expandedAvisoId === aviso.id}
                                    onToggle={toggleAviso}
                                />
                            ))
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}
