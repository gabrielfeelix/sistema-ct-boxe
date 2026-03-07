import { Feather } from '@expo/vector-icons'
import { router, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'

import BottomSheetModal from '@/components/BottomSheetModal'
import NotificationIcon, { resolveNotificationIcon } from '@/components/NotificationIcon'
import StoryViewer from '@/components/StoryViewer'
import { useAuth } from '@/contexts/AuthContext'
import {
    fetchAgendaData,
    fetchHomeData,
    fetchNotificacoes,
    markAllNotificacoesLidas,
    markNotificacaoLida,
    setPresencaStatus,
    type AgendaData,
    type HomeData,
} from '@/lib/appData'
import { getInitials } from '@/lib/formatters'
import type { HomeNotification, HomeStory } from '@/lib/types'

function buildEmptyHomeData(): HomeData {
    return {
        stories: [],
        notificacoesNaoLidas: 0,
        avisos: [],
        proximasAulas: [],
        proximaAula: null,
    }
}

function buildEmptyAgendaData(): AgendaData {
    return {
        selectedDateISO: '',
        selectedLabel: '',
        dias: [],
        aulas: [],
        proximaAula: null,
    }
}

export default function HomeScreen() {
    const appRouter = useRouter()
    const { aluno } = useAuth()
    const [homeData, setHomeData] = useState<HomeData>(buildEmptyHomeData)
    const [loading, setLoading] = useState(true)
    const [savingNextClass, setSavingNextClass] = useState(false)
    const [storyVisible, setStoryVisible] = useState(false)
    const [selectedStory, setSelectedStory] = useState<HomeStory | null>(null)
    const [notificationsVisible, setNotificationsVisible] = useState(false)
    const [notifications, setNotifications] = useState<HomeNotification[]>([])
    const [notificationsLoading, setNotificationsLoading] = useState(false)
    const [agendaVisible, setAgendaVisible] = useState(false)
    const [agendaData, setAgendaData] = useState<AgendaData>(buildEmptyAgendaData)
    const [agendaLoading, setAgendaLoading] = useState(false)

    const loadHome = useCallback(async () => {
        if (!aluno?.id) {
            setHomeData(buildEmptyHomeData())
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const data = await fetchHomeData(aluno.id)
            setHomeData(data)
        } catch (error) {
            console.error('[Home] Erro ao carregar home:', error)
            setHomeData(buildEmptyHomeData())
        } finally {
            setLoading(false)
        }
    }, [aluno?.id])

    useEffect(() => {
        void loadHome()
    }, [loadHome])

    const loadNotifications = useCallback(async () => {
        if (!aluno?.id) return
        setNotificationsLoading(true)
        try {
            const data = await fetchNotificacoes(aluno.id)
            setNotifications(data)
        } catch (error) {
            console.error('[Home] Erro ao carregar notificacoes:', error)
            setNotifications([])
        } finally {
            setNotificationsLoading(false)
        }
    }, [aluno?.id])

    const loadAgenda = useCallback(async (selectedDateISO?: string) => {
        if (!aluno?.id) return
        setAgendaLoading(true)
        try {
            const data = await fetchAgendaData(aluno.id, selectedDateISO ?? agendaData.selectedDateISO)
            setAgendaData(data)
        } catch (error) {
            console.error('[Home] Erro ao carregar agenda:', error)
            setAgendaData(buildEmptyAgendaData())
        } finally {
            setAgendaLoading(false)
        }
    }, [agendaData.selectedDateISO, aluno?.id])

    const openNotifications = useCallback(async () => {
        setNotificationsVisible(true)
        await loadNotifications()
    }, [loadNotifications])

    const openAgenda = useCallback(async () => {
        setAgendaVisible(true)
        await loadAgenda()
    }, [loadAgenda])

    const handleNextClass = useCallback(async () => {
        if (!aluno?.id || !homeData.proximaAula || savingNextClass) return
        if (!homeData.proximaAula.agendado && !homeData.proximaAula.presenceActionEnabled) {
            Alert.alert(
                'Confirmacao indisponivel',
                homeData.proximaAula.presenceRestrictionMessage ?? 'Essa aula nao pode ser confirmada agora.'
            )
            return
        }
        setSavingNextClass(true)
        try {
            const alreadyBooked = Boolean(homeData.proximaAula.agendado || homeData.proximaAula.presente)
            await setPresencaStatus(aluno.id, homeData.proximaAula.id, alreadyBooked ? 'cancelada' : 'agendado')
            await loadHome()
        } catch (error) {
            console.error('[Home] Erro ao atualizar proxima aula:', error)
            Alert.alert(
                'Erro',
                error instanceof Error ? error.message : 'Nao foi possivel atualizar a confirmacao desta aula.'
            )
        } finally {
            setSavingNextClass(false)
        }
    }, [aluno?.id, homeData.proximaAula, loadHome, savingNextClass])

    const handleMarkAllNotifications = useCallback(async () => {
        if (!aluno?.id) return
        await markAllNotificacoesLidas(aluno.id)
        setNotifications((prev) => prev.map((item) => ({ ...item, lida: true })))
        setHomeData((prev) => ({ ...prev, notificacoesNaoLidas: 0 }))
    }, [aluno?.id])

    const handleNotificationAction = useCallback(async (notification: HomeNotification) => {
        await markNotificacaoLida(notification.id)
        setNotifications((prev) => prev.map((item) => (item.id === notification.id ? { ...item, lida: true } : item)))

        if (notification.acao === 'pagamento' || notification.tipo === 'pagamento') {
            setNotificationsVisible(false)
            router.push('/pagamento')
            return
        }
        if (notification.acao === 'checkin' || notification.tipo === 'aula') {
            setNotificationsVisible(false)
            router.push('/(tabs)/checkin')
            return
        }
        if (notification.acao === 'evento' || notification.tipo === 'evento') {
            setNotificationsVisible(false)
            router.push('/eventos')
            return
        }
        if (notification.acao === 'assistir_video' || notification.acao === 'stories' || notification.tipo === 'video') {
            if (homeData.stories.length > 0) {
                setNotificationsVisible(false)
                setSelectedStory(homeData.stories[0])
                setStoryVisible(true)
            }
            return
        }
        if (notification.link?.startsWith('/aulas/')) {
            const aulaId = notification.link.split('/').pop()
            if (aulaId) {
                setNotificationsVisible(false)
                appRouter.push(`/aula/${aulaId}`)
                return
            }
        }
        if (notification.link?.startsWith('http')) {
            await Linking.openURL(notification.link)
        }
    }, [appRouter, homeData.stories])

    const selectedStoryVideos = selectedStory?.videos ?? []
    const unreadNotifications = useMemo(() => notifications.filter((item) => !item.lida).length, [notifications])

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            {storyVisible && selectedStory ? (
                <StoryViewer
                    videos={selectedStoryVideos}
                    title={selectedStory.nome}
                    initialIndex={0}
                    onClose={() => {
                        setStoryVisible(false)
                        setSelectedStory(null)
                    }}
                />
            ) : null}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                <View
                    style={{
                        borderBottomWidth: 1,
                        borderBottomColor: '#E2E8F0',
                        backgroundColor: '#FFFFFF',
                        paddingBottom: 24,
                        paddingHorizontal: 24,
                        paddingTop: 56,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View
                                style={{
                                    marginRight: 16,
                                    height: 50,
                                    width: 50,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    borderRadius: 25,
                                    backgroundColor: '#E2E8F0',
                                }}
                            >
                                {aluno?.foto_url ? (
                                    <Image
                                        source={{ uri: aluno.foto_url, cache: 'force-cache' }}
                                        style={{ height: '100%', width: '100%' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                                        {getInitials(aluno?.nome ?? 'Atleta')}
                                    </Text>
                                )}
                            </View>
                            <View>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: '800',
                                        letterSpacing: 1.6,
                                        color: '#94A3B8',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Treino de hoje
                                </Text>
                                <Text style={{ marginTop: 4, fontSize: 22, fontWeight: '900', color: '#0F172A' }}>
                                    {(aluno?.nome ?? 'Atleta').split(' ')[0]}.
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => void openNotifications()}
                            style={{
                                height: 52,
                                width: 52,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 26,
                                backgroundColor: '#F8FAFC',
                            }}
                        >
                            <Feather name="bell" size={20} color="#0F172A" />
                            {homeData.notificacoesNaoLidas > 0 ? (
                                <View
                                    style={{
                                        position: 'absolute',
                                        right: 12,
                                        top: 12,
                                        height: 10,
                                        width: 10,
                                        borderRadius: 999,
                                        backgroundColor: '#FB7185',
                                    }}
                                />
                            ) : null}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 20 }}>
                    <Text
                        style={{
                            marginBottom: 16,
                            fontSize: 14,
                            fontWeight: '800',
                            color: '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: 1.5,
                        }}
                    >
                        Tecnicas de hoje
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {homeData.stories.map((story) => (
                            <TouchableOpacity
                                key={story.id}
                                activeOpacity={0.85}
                                onPress={() => {
                                    setSelectedStory(story)
                                    setStoryVisible(true)
                                }}
                                style={{ marginRight: 18, width: 84, alignItems: 'center' }}
                            >
                                <View
                                    style={{
                                        borderWidth: 3,
                                        borderColor: story.tem_novo ? '#DC2626' : '#CBD5E1',
                                        padding: 3,
                                        borderRadius: 999,
                                    }}
                                >
                                    <View
                                        style={{
                                            height: 68,
                                            width: 68,
                                            overflow: 'hidden',
                                            borderRadius: 999,
                                            backgroundColor: '#E2E8F0',
                                        }}
                                    >
                                        {story.capa_url ? (
                                            <Image
                                                source={{ uri: story.capa_url, cache: 'force-cache' }}
                                                style={{ height: '100%', width: '100%' }}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View
                                                style={{
                                                    flex: 1,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#CBD5E1',
                                                }}
                                            >
                                                <Feather name="play" size={22} color="#0F172A" />
                                            </View>
                                        )}
                                    </View>
                                </View>
                                {story.tem_novo ? (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            right: 6,
                                            top: 2,
                                            height: 12,
                                            width: 12,
                                            borderRadius: 999,
                                            borderWidth: 2,
                                            borderColor: '#FFFFFF',
                                            backgroundColor: '#DC2626',
                                        }}
                                    />
                                ) : null}
                                <Text
                                    numberOfLines={2}
                                    style={{
                                        marginTop: 10,
                                        textAlign: 'center',
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: '#0F172A',
                                    }}
                                >
                                    {story.nome}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
                    {homeData.proximaAula ? (
                        <View style={{ overflow: 'hidden', borderRadius: 30, backgroundColor: '#08112B' }}>
                            <View
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 0,
                                    borderBottomLeftRadius: 28,
                                    backgroundColor: '#DC2626',
                                    paddingHorizontal: 18,
                                    paddingVertical: 16,
                                }}
                            >
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>
                                    {homeData.proximaAula.horario}
                                </Text>
                            </View>

                            <View style={{ padding: 24 }}>
                                <Text
                                    style={{
                                        marginBottom: 8,
                                        fontSize: 11,
                                        fontWeight: '800',
                                        letterSpacing: 1.5,
                                        color: '#94A3B8',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Proxima aula
                                </Text>
                                <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFFFFF' }}>
                                    {homeData.proximaAula.nome.toUpperCase()}
                                </Text>
                                <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '600', color: '#CBD5E1' }}>
                                    {homeData.proximaAula.professor}
                                </Text>
                                <Text style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>
                                    {homeData.proximaAula.vagas_ocupadas}/{homeData.proximaAula.vagas_total} alunos
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    disabled={savingNextClass}
                                    onPress={() => void handleNextClass()}
                                    style={{
                                        marginTop: 22,
                                        borderRadius: 18,
                                        backgroundColor:
                                            homeData.proximaAula.agendado || homeData.proximaAula.presente
                                                ? '#172036'
                                                : homeData.proximaAula.presenceActionEnabled
                                                    ? '#DC2626'
                                                    : '#334155',
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                    }}
                                >
                                    {savingNextClass ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight: '900',
                                                letterSpacing: 1.4,
                                                color: '#FFFFFF',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {homeData.proximaAula.presenceActionLabel ??
                                                (homeData.proximaAula.agendado || homeData.proximaAula.presente
                                                    ? 'Cancelar presenca'
                                                    : 'Confirmar presenca')}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : loading ? (
                        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                            <ActivityIndicator color="#DC2626" />
                        </View>
                    ) : null}
                </View>

                <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
                    <View
                        style={{
                            marginBottom: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                            Agenda
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => void openAgenda()}
                            style={{
                                height: 44,
                                width: 44,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 22,
                                backgroundColor: '#F8FAFC',
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                            }}
                        >
                            <Feather name="calendar" size={18} color="#0F172A" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {homeData.proximasAulas.map((aula) => (
                            <TouchableOpacity
                                key={aula.id}
                                activeOpacity={0.88}
                                onPress={() => appRouter.push(`/aula/${aula.id}`)}
                                style={{
                                    marginRight: 14,
                                    width: 244,
                                    borderRadius: 24,
                                    borderWidth: 1,
                                    borderColor: '#E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    padding: 18,
                                }}
                            >
                                <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>
                                    {aula.horario}
                                </Text>
                                <Text style={{ marginTop: 10, fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                                    {aula.nome}
                                </Text>
                                <Text style={{ marginTop: 6, fontSize: 14, color: '#64748B' }}>
                                    {aula.professor}
                                </Text>
                                <Text style={{ marginTop: 14, fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>
                                    {aula.data} • {aula.vagas_ocupadas}/{aula.vagas_total}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
                    <Text style={{ marginBottom: 14, fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                        Avisos
                    </Text>
                    {homeData.avisos.map((aviso) => (
                        <View
                            key={aviso.id}
                            style={{
                                marginBottom: 12,
                                borderRadius: 22,
                                borderWidth: 1,
                                borderColor: '#E2E8F0',
                                backgroundColor: '#FFFFFF',
                                padding: 18,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 11,
                                    fontWeight: '800',
                                    letterSpacing: 1.4,
                                    color: '#94A3B8',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {aviso.data}
                            </Text>
                            <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '900', color: '#0F172A' }}>
                                {aviso.titulo}
                            </Text>
                            <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 20, color: '#64748B' }}>
                                {aviso.texto}
                            </Text>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <BottomSheetModal visible={notificationsVisible} onClose={() => setNotificationsVisible(false)}>
                <View style={{ paddingHorizontal: 24 }}>
                    <View
                        style={{
                            marginBottom: 18,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                                Notificacoes
                            </Text>
                            {unreadNotifications > 0 ? (
                                <View
                                    style={{
                                        marginLeft: 10,
                                        borderRadius: 10,
                                        backgroundColor: '#FEE2E2',
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 10,
                                            fontWeight: '900',
                                            color: '#DC2626',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {unreadNotifications} novas
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setNotificationsVisible(false)}
                            style={{
                                height: 40,
                                width: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 20,
                                backgroundColor: '#F1F5F9',
                            }}
                        >
                            <Feather name="x" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {notificationsLoading ? (
                        <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                            <ActivityIndicator color="#DC2626" />
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
                            {notifications.map((notification) => {
                                const icon = resolveNotificationIcon(notification.icone, notification.tipo)
                                return (
                                    <TouchableOpacity
                                        key={notification.id}
                                        activeOpacity={0.88}
                                        onPress={() => void handleNotificationAction(notification)}
                                        style={{
                                            marginBottom: 12,
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: '#E2E8F0',
                                            backgroundColor: '#FFFFFF',
                                            padding: 16,
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row' }}>
                                            <View
                                                style={{
                                                    marginRight: 14,
                                                    height: 44,
                                                    width: 44,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: 22,
                                                    backgroundColor: icon.tone.backgroundColor,
                                                }}
                                            >
                                                <NotificationIcon icon={icon.icon} size={18} color={icon.tone.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ flex: 1, fontSize: 17, fontWeight: '900', color: '#0F172A' }}>
                                                        {notification.titulo}
                                                    </Text>
                                                    <Text style={{ marginLeft: 12, fontSize: 12, fontWeight: '700', color: '#94A3B8' }}>
                                                        {notification.horario}
                                                    </Text>
                                                </View>
                                                <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: '#475569' }}>
                                                    {notification.subtitulo}
                                                </Text>
                                                {notification.actionLabel ? (
                                                    <Text style={{ marginTop: 12, fontSize: 14, fontWeight: '800', color: '#DC2626' }}>
                                                        {notification.actionLabel} {'>'}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}

                            {notifications.length === 0 ? (
                                <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                                    <Feather name="check-circle" size={34} color="#CBD5E1" />
                                    <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '700', color: '#94A3B8' }}>
                                        Tudo em dia
                                    </Text>
                                </View>
                            ) : null}
                        </ScrollView>
                    )}

                    {notifications.length > 0 ? (
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => void handleMarkAllNotifications()}
                            style={{
                                marginTop: 10,
                                borderRadius: 18,
                                backgroundColor: '#F1F5F9',
                                paddingVertical: 16,
                                alignItems: 'center',
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 13,
                                    fontWeight: '900',
                                    letterSpacing: 1.2,
                                    color: '#64748B',
                                    textTransform: 'uppercase',
                                }}
                            >
                                Marcar tudo como lido
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </BottomSheetModal>

            <BottomSheetModal visible={agendaVisible} onClose={() => setAgendaVisible(false)}>
                <View style={{ paddingHorizontal: 24 }}>
                    <View
                        style={{
                            marginBottom: 18,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>
                                Agenda
                            </Text>
                            <Text style={{ marginTop: 4, fontSize: 14, color: '#94A3B8' }}>
                                {agendaData.selectedLabel || 'Selecione um dia'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => setAgendaVisible(false)}
                            style={{
                                height: 40,
                                width: 40,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 20,
                                backgroundColor: '#F1F5F9',
                            }}
                        >
                            <Feather name="x" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                        {agendaData.dias.map((dia) => {
                            const active = dia.iso === agendaData.selectedDateISO
                            return (
                                <TouchableOpacity
                                    key={dia.iso}
                                    activeOpacity={0.85}
                                    onPress={() => void loadAgenda(dia.iso)}
                                    style={{
                                        marginRight: 12,
                                        width: 76,
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: active ? '#DC2626' : '#CBD5E1',
                                        backgroundColor: active ? '#DC2626' : '#FFFFFF',
                                        paddingVertical: 12,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: '800',
                                            color: active ? '#FEE2E2' : '#94A3B8',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {dia.shortLabel}
                                    </Text>
                                    <Text style={{ marginTop: 6, fontSize: 28, fontWeight: '900', color: active ? '#FFFFFF' : '#94A3B8' }}>
                                        {dia.dayNumber}
                                    </Text>
                                </TouchableOpacity>
                            )
                        })}
                    </ScrollView>

                    {agendaLoading ? (
                        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                            <ActivityIndicator color="#DC2626" />
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
                            {agendaData.aulas.map((aula) => (
                                <TouchableOpacity
                                    key={aula.id}
                                    activeOpacity={0.88}
                                    onPress={() => {
                                        setAgendaVisible(false)
                                        appRouter.push(`/aula/${aula.id}`)
                                    }}
                                    style={{
                                        marginBottom: 10,
                                        borderRadius: 18,
                                        borderWidth: 1,
                                        borderColor: '#E2E8F0',
                                        backgroundColor: '#FFFFFF',
                                        padding: 16,
                                    }}
                                >
                                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#0F172A' }}>{aula.horario}</Text>
                                    <Text style={{ marginTop: 8, fontSize: 16, fontWeight: '900', color: '#0F172A' }}>{aula.nome}</Text>
                                    <Text style={{ marginTop: 6, fontSize: 14, color: '#64748B' }}>{aula.professor}</Text>
                                </TouchableOpacity>
                            ))}
                            {agendaData.aulas.length === 0 ? (
                                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: '#94A3B8' }}>Nenhuma aula nessa data</Text>
                                </View>
                            ) : null}
                        </ScrollView>
                    )}

                    <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => {
                            setAgendaVisible(false)
                            router.replace('/(tabs)/checkin')
                        }}
                        style={{
                            marginTop: 12,
                            borderRadius: 18,
                            backgroundColor: '#0F172A',
                            paddingVertical: 16,
                            alignItems: 'center',
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                fontWeight: '900',
                                letterSpacing: 1.2,
                                color: '#FFFFFF',
                                textTransform: 'uppercase',
                            }}
                        >
                            Abrir agenda completa
                        </Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetModal>
        </View>
    )
}
