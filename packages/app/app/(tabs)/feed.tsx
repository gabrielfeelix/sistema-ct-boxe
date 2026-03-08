import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View, Image, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { FeedPostSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedData, toggleFeedLike, addFeedComment, fetchEventos, fetchSinglePost, setConfirmacaoEvento } from '@/lib/appData'
import type { FeedPost, EventoApp } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Mapear categoria do evento para imagem e tratamento visual
const EVENTO_CONFIG: Record<string, { image: string; label: string; badgeBg: string; badgeText: string }> = {
    churras: {
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
        label: 'SOCIAL',
        badgeBg: '#F59E0B',
        badgeText: '#FFFFFF',
    },
    boxe: {
        image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400',
        label: 'BOXE',
        badgeBg: '#DC2626',
        badgeText: '#FFFFFF',
    },
    social: {
        image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400',
        label: 'SOCIAL',
        badgeBg: '#2563EB',
        badgeText: '#FFFFFF',
    },
    treino: {
        image: 'https://images.unsplash.com/photo-1517344800993-6773e01049c3?w=400',
        label: 'TREINO',
        badgeBg: '#059669',
        badgeText: '#FFFFFF',
    }
}

function getEventoConfig(icone?: string | null) {
    return EVENTO_CONFIG[icone || 'social'] || EVENTO_CONFIG.social
}

const FeedPostItem = memo(({ post, onLike, onComment }: {
    post: FeedPost
    onLike: (postId: string) => void
    onComment: (postId: string) => void
}) => (
    <View
        className="mx-6 mb-4 overflow-hidden rounded-[2rem] bg-white"
        style={{
            borderWidth: 1,
            borderColor: '#E2E8F0',
            shadowColor: '#0F172A',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.05,
            shadowRadius: 18,
            elevation: 3,
        }}
    >
        <View className="p-5 pb-3">
            <View className="mb-3 flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                    <Text className="text-sm font-black tracking-tighter text-white">
                        {post.iniciais}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[15px] font-bold tracking-tight text-slate-900">
                        {post.autor}
                    </Text>
                    <Text className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {post.data}
                    </Text>
                </View>
                <View className="h-8 w-8 items-center justify-center rounded-full">
                    <Feather name="share-2" size={16} color="#94A3B8" />
                </View>
            </View>

            <Text className="mb-4 text-[16px] font-medium leading-8 text-slate-800">
                {post.texto}
            </Text>
        </View>

        {post.imagem ? (
            <View className="mb-4 overflow-hidden px-5">
                <View className="overflow-hidden rounded-[1.4rem]">
                    <Image
                        source={{ uri: post.imagem, cache: 'force-cache' }}
                        style={{ width: '100%', height: 220 }}
                        resizeMode="cover"
                    />
                </View>
            </View>
        ) : null}

        <View className="mx-5 flex-row items-center border-t border-slate-200/80 py-3">
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onLike(post.id)}
                className="mr-6 flex-row items-center"
            >
                <FontAwesome5
                    name="heart"
                    size={15}
                    color={post.likedByMe ? '#CC0000' : '#64748B'}
                    solid={post.likedByMe}
                />
                <Text
                    className={`ml-2 text-sm font-bold ${post.likedByMe ? 'text-[#CC0000]' : 'text-slate-600'
                        }`}
                >
                    {post.curtidas}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onComment(post.id)}
                className="flex-row items-center"
            >
                <Feather name="message-circle" size={15} color="#64748B" />
                <Text className="ml-2 text-sm font-bold text-slate-600">
                    {post.comentarios.length}
                </Text>
            </TouchableOpacity>
        </View>

        {post.comentarios.length > 0 && (
            <View className="border-t border-slate-100/80 bg-slate-50/40 px-5 py-3">
                <View className="flex-row items-start">
                    <Text className="mr-2 text-xs font-bold text-slate-900">
                        {post.comentarios[0].autor}
                    </Text>
                    <Text className="flex-1 flex-wrap text-xs font-medium text-slate-600">
                        {post.comentarios[0].texto}
                    </Text>
                </View>
            </View>
        )}
    </View>
))

export default function FeedScreen() {
    const { aluno } = useAuth()
    const insets = useSafeAreaInsets()
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [eventos, setEventos] = useState<EventoApp[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<EventoApp | null>(null)
    const [selectedPostForComments, setSelectedPostForComments] = useState<FeedPost | null>(null)
    const [commentText, setCommentText] = useState('')
    const [sendingComment, setSendingComment] = useState(false)
    const mountedRef = useRef(true)
    const eventActionScale = useMemo(() => new Animated.Value(1), [])

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
        }
    }, [])

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoading(false)
            return
        }
        try {
            const [postsData, eventosData] = await Promise.all([
                fetchFeedData(aluno.id),
                fetchEventos(aluno.id)
            ])
            setPosts(postsData)
            setEventos(eventosData)
        } catch (error) {
            console.error('[Feed] Erro:', error)
        } finally {
            setLoading(false)
        }
    }, [aluno?.id])

    useEffect(() => {
        void loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        try {
            await loadData()
        } finally {
            if (mountedRef.current) {
                setRefreshing(false)
            }
        }
    }, [loadData])

    const handleLike = useCallback(async (postId: string) => {
        if (!aluno?.id) return

        const current = posts.find((post) => post.id === postId)
        if (!current) return

        const nextLiked = !current.likedByMe
        const optimisticTotal = current.likedByMe ? current.curtidas - 1 : current.curtidas + 1

        setPosts((prev) =>
            prev.map((post) =>
                post.id === postId
                    ? {
                        ...post,
                        likedByMe: nextLiked,
                        curtidas: Math.max(0, optimisticTotal),
                    }
                    : post
            )
        )

        try {
            const result = await toggleFeedLike(postId, aluno.id, current.likedByMe)
            if (!mountedRef.current) return

            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            likedByMe: result.likedByMe,
                            curtidas: result.curtidas,
                        }
                        : post
                )
            )
        } catch (error) {
            console.error('[Feed] Erro ao curtir post:', error)
            if (!mountedRef.current) return

            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            likedByMe: current.likedByMe,
                            curtidas: current.curtidas,
                        }
                        : post
                )
            )
        }
    }, [aluno?.id, posts])

    const handleComment = useCallback((postId: string) => {
        const post = posts.find(p => p.id === postId)
        if (post) {
            setSelectedPostForComments(post)
            setCommentText('')
        }
    }, [posts])

    const handleSendComment = useCallback(async () => {
        if (!aluno?.id || !selectedPostForComments || !commentText.trim() || sendingComment) return

        const postId = selectedPostForComments.id
        const optimisticId = `temp-${Date.now()}`
        const texto = commentText.trim()
        const autor = aluno.nome || 'Aluno do CT'
        const iniciais = autor.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
        const optimisticComment = {
            id: optimisticId,
            autor,
            iniciais,
            texto,
            data: 'Agora',
        }

        setSendingComment(true)
        setCommentText('')
        Keyboard.dismiss()

        setPosts((prev) =>
            prev.map((post) =>
                post.id === postId
                    ? {
                        ...post,
                        comentarios: [optimisticComment, ...post.comentarios],
                    }
                    : post
            )
        )
        setSelectedPostForComments((prev) =>
            prev && prev.id === postId
                ? {
                    ...prev,
                    comentarios: [optimisticComment, ...prev.comentarios],
                }
                : prev
        )

        try {
            await addFeedComment(postId, aluno.id, texto)
            const updatedPost = await fetchSinglePost(aluno.id, postId)

            if (!mountedRef.current) return

            if (updatedPost) {
                setPosts((prev) => prev.map((post) => (post.id === postId ? updatedPost : post)))
                setSelectedPostForComments((prev) => (prev && prev.id === postId ? updatedPost : prev))
            }
        } catch (error) {
            console.error('Error sending comment:', error)
            if (!mountedRef.current) return

            setPosts((prev) =>
                prev.map((post) =>
                    post.id === postId
                        ? {
                            ...post,
                            comentarios: post.comentarios.filter((comment) => comment.id !== optimisticId),
                        }
                        : post
                )
            )
            setSelectedPostForComments((prev) =>
                prev && prev.id === postId
                    ? {
                        ...prev,
                        comentarios: prev.comentarios.filter((comment) => comment.id !== optimisticId),
                    }
                    : prev
            )
        } finally {
            if (mountedRef.current) {
                setSendingComment(false)
            }
        }
    }, [aluno?.id, aluno?.nome, selectedPostForComments, commentText, sendingComment])

    const animateEventAction = useCallback(() => {
        Animated.sequence([
            Animated.timing(eventActionScale, { toValue: 0.96, duration: 90, useNativeDriver: true }),
            Animated.spring(eventActionScale, { toValue: 1, tension: 180, friction: 10, useNativeDriver: true }),
        ]).start()
    }, [eventActionScale])

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 border-b border-slate-100 bg-white px-6 pb-6 shadow-sm shadow-slate-200/50" style={{ paddingTop: insets.top + 12 }}>
                <Text className="mb-2 text-4xl font-black tracking-tight text-slate-900">COMUNIDADE</Text>
                <Text className="text-sm font-medium text-slate-500">Eventos, resenhas e evolução.</Text>
            </View>

            <FlatList
                data={loading ? [] : posts}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={3}
                ListHeaderComponent={
                    <View>
                        {eventos.length > 0 && (
                            <View className="mb-6 bg-white px-6 py-6">
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingRight: 24 }}
                                >
                                    {eventos.map((evento) => {
                                        const config = getEventoConfig(evento.icone)
                                        const eventImage = evento.imagem_url || config.image
                                        const dataFormatada = format(parseISO(evento.data_evento), "EEE, dd/MM", { locale: ptBR })

                                        return (
                                            <TouchableOpacity
                                                key={evento.id}
                                                activeOpacity={0.85}
                                                onPress={() => setSelectedEvent(evento)}
                                                className="relative mr-4 overflow-hidden rounded-2xl"
                                                style={{ width: 220, height: 140 }}
                                            >
                                                <Image
                                                    source={{ uri: eventImage, cache: 'force-cache' }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        bottom: 0,
                                                        left: 0,
                                                        backgroundColor: 'rgba(2, 6, 23, 0.34)',
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        bottom: 0,
                                                        left: 0,
                                                        height: 92,
                                                        backgroundColor: 'rgba(2, 6, 23, 0.58)',
                                                    }}
                                                />

                                                {evento.destaque && (
                                                    <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full bg-amber-400">
                                                        <Feather name="star" size={12} color="#FFFFFF" />
                                                    </View>
                                                )}

                                                {evento.status_usuario === 'confirmado' && (
                                                    <View className="absolute right-12 top-3 h-6 min-w-6 flex-row items-center justify-center rounded-full bg-emerald-500 px-2">
                                                        <Feather name="check" size={11} color="#FFFFFF" />
                                                    </View>
                                                )}

                                                <View
                                                    style={{
                                                        position: 'absolute',
                                                        left: 12,
                                                        top: 12,
                                                        borderRadius: 10,
                                                        backgroundColor: config.badgeBg,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 4,
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 9, fontWeight: '900', letterSpacing: 1.5, color: config.badgeText }}>
                                                        {config.label}
                                                    </Text>
                                                </View>

                                                <View className="absolute bottom-0 left-0 right-0 p-3">
                                                    <Text className="mb-2 text-base font-black uppercase tracking-tight text-white" numberOfLines={2}>
                                                        {evento.titulo}
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                                                        <Text className="ml-1.5 mr-3 text-[11px] font-bold text-white/90 capitalize">
                                                            {dataFormatada}
                                                        </Text>
                                                        <Feather name="users" size={12} color="rgba(255,255,255,0.9)" />
                                                        <Text className="ml-1.5 text-[11px] font-bold text-white/90">
                                                            {evento.confirmados}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        <View className="mb-4 px-6">
                            <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                PUBLICAÇÕES
                            </Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <View>
                            <FeedPostSkeleton />
                            <FeedPostSkeleton />
                            <FeedPostSkeleton />
                        </View>
                    ) : (
                        <View className="px-6 py-20 items-center">
                            <Feather name="inbox" size={48} color="#CBD5E1" />
                            <Text className="mt-4 text-slate-500">Nenhum post publicado.</Text>
                        </View>
                    )
                }
                renderItem={({ item: post }) => (
                    <FeedPostItem
                        post={post}
                        onLike={handleLike}
                        onComment={handleComment}
                    />
                )}
            />

            <Modal
                visible={selectedEvent !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedEvent(null)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setSelectedEvent(null)}
                        className="flex-1"
                    />
                    {selectedEvent && (
                        <View className="max-h-[85%] overflow-hidden rounded-t-3xl bg-white">
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View className="relative">
                                    <Image
                                        source={{
                                            uri: (selectedEvent.imagem_url || getEventoConfig(selectedEvent.icone).image).replace('w=400', 'w=800'),
                                            cache: 'force-cache'
                                        }}
                                        style={{ width: '100%', height: 300 }}
                                        resizeMode="cover"
                                    />

                                    <TouchableOpacity
                                        onPress={() => setSelectedEvent(null)}
                                        className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-black/50"
                                    >
                                        <Feather name="x" size={24} color="#FFFFFF" />
                                    </TouchableOpacity>

                                    <View className="absolute bottom-4 left-4 rounded-xl bg-[#CC0000] px-3 py-2">
                                        <Text className="text-xs font-black uppercase tracking-widest text-white">
                                            {format(parseISO(selectedEvent.data_evento), "EEE. dd/MM", { locale: ptBR })}
                                        </Text>
                                    </View>
                                </View>

                                <View className="px-6 py-6">
                                    <View
                                        style={{
                                            alignSelf: 'flex-start',
                                            marginBottom: 16,
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: '#E2E8F0',
                                            backgroundColor: '#F8FAFC',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                        }}
                                    >
                                        <Text style={{ fontSize: 10, fontWeight: '900', letterSpacing: 1.5, color: getEventoConfig(selectedEvent.icone).badgeBg }}>
                                            {getEventoConfig(selectedEvent.icone).label}
                                        </Text>
                                    </View>

                                    <Text className="mb-6 text-3xl font-black uppercase tracking-tight text-slate-900">
                                        {selectedEvent.titulo}
                                    </Text>

                                    <View className="mb-3 flex-row items-center">
                                        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-red-50">
                                            <Feather name="calendar" size={18} color="#CC0000" />
                                        </View>
                                        <Text className="text-base font-bold text-slate-900 capitalize">
                                            {format(parseISO(selectedEvent.data_evento), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                        </Text>
                                    </View>

                                    <View className="mb-8 flex-row items-center">
                                        <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-red-50">
                                            <Feather name="map-pin" size={18} color="#CC0000" />
                                        </View>
                                        <Text className="text-base font-bold text-slate-900">
                                            {selectedEvent.local || 'CT Argel Riboli'}
                                        </Text>
                                    </View>

                                    {selectedEvent.descricao && (
                                        <>
                                            <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">
                                                SOBRE O EVENTO
                                            </Text>
                                            <Text className="mb-8 text-[15px] font-medium leading-relaxed text-slate-600">
                                                {selectedEvent.descricao}
                                            </Text>
                                        </>
                                    )}

                                    <View className="mb-8 flex-row items-center">
                                        <Feather name="users" size={20} color="#CC0000" />
                                        <Text className="ml-3 text-base font-bold text-slate-900">
                                            {selectedEvent.confirmados} {selectedEvent.confirmados === 1 ? 'confirmado' : 'confirmados'}
                                        </Text>
                                    </View>

                                    <View className="mb-8 flex-row items-center">
                                        <Feather name="credit-card" size={20} color="#CC0000" />
                                        <Text className="ml-3 text-base font-bold text-slate-900">
                                            {selectedEvent.valor ? `R$ ${selectedEvent.valor.toFixed(2)}` : 'Evento gratuito'}
                                        </Text>
                                    </View>

                                    <Animated.View style={{ transform: [{ scale: eventActionScale }] }}>
                                        <TouchableOpacity
                                            activeOpacity={0.86}
                                            onPress={async () => {
                                                if (!aluno?.id) return
                                                animateEventAction()
                                                const novoStatus = selectedEvent.status_usuario !== 'confirmado'
                                                const previousStatus = selectedEvent.status_usuario
                                                setSelectedEvent((prev) =>
                                                    prev
                                                        ? {
                                                            ...prev,
                                                            status_usuario: novoStatus ? 'confirmado' : 'pendente',
                                                            confirmados: Math.max(prev.confirmados + (novoStatus ? 1 : -1), 0),
                                                        }
                                                        : prev
                                                )
                                                try {
                                                    await setConfirmacaoEvento(aluno.id, selectedEvent.id, novoStatus)
                                                    await loadData()
                                                } catch (error) {
                                                    console.error('[Feed] Erro ao confirmar evento:', error)
                                                    if (!mountedRef.current) return
                                                    setSelectedEvent((prev) =>
                                                        prev
                                                            ? {
                                                                ...prev,
                                                                status_usuario: previousStatus,
                                                                confirmados: Math.max(prev.confirmados + (novoStatus ? -1 : 1), 0),
                                                            }
                                                            : prev
                                                    )
                                                }
                                            }}
                                            className={`h-14 flex-row items-center justify-center rounded-2xl shadow-lg ${selectedEvent.status_usuario === 'confirmado'
                                                ? 'bg-[#22C55E] shadow-emerald-500/30'
                                                : 'bg-[#CC0000] shadow-red-900/30'
                                                }`}
                                        >
                                            {selectedEvent.status_usuario === 'confirmado' ? (
                                                <>
                                                    <Feather name="check" size={18} color="#FFFFFF" />
                                                    <Text className="ml-2 text-base font-black uppercase tracking-widest text-white">
                                                        PRESENÇA CONFIRMADA
                                                    </Text>
                                                </>
                                            ) : (
                                                <Text className="text-base font-black uppercase tracking-widest text-white">
                                                    CONFIRMAR PRESENÇA
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </Animated.View>
                                </View>
                            </ScrollView>
                        </View>
                    )}
                </View>
            </Modal>

            <Modal
                visible={selectedPostForComments !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedPostForComments(null)}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setSelectedPostForComments(null)}
                        className="flex-1"
                    />
                    <View className="max-h-[70%] overflow-hidden rounded-t-3xl bg-white">
                        <View className="border-b border-slate-100 px-6 py-4">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-lg font-black tracking-tight text-slate-900">
                                    COMENTÁRIOS ({selectedPostForComments?.comentarios.length || 0})
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setSelectedPostForComments(null)}
                                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
                                >
                                    <Feather name="x" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <FlatList
                            data={selectedPostForComments?.comentarios || []}
                            showsVerticalScrollIndicator={false}
                            keyExtractor={(item) => item.id}
                            style={{ minHeight: 200 }}
                            ListEmptyComponent={
                                <View className="items-center justify-center py-16">
                                    <Feather name="message-circle" size={48} color="#CBD5E1" />
                                    <Text className="mt-4 text-center text-sm font-medium text-slate-500">
                                        Nenhum comentário ainda.
                                    </Text>
                                    <Text className="mt-1 text-center text-xs text-slate-400">
                                        Seja o primeiro a comentar!
                                    </Text>
                                </View>
                            }
                            renderItem={({ item: comment }) => {
                                const initials = comment.iniciais || comment.autor.split(' ').map(n => n[0]).join('').slice(0, 2)
                                return (
                                    <View className="border-b border-slate-100/60 px-6 py-4">
                                        <View className="flex-row items-start">
                                            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                                                <Text className="text-xs font-black text-white">
                                                    {initials}
                                                </Text>
                                            </View>
                                            <View className="flex-1">
                                                <View className="mb-1 flex-row items-center">
                                                    <Text className="mr-2 text-sm font-bold text-slate-900">
                                                        {comment.autor}
                                                    </Text>
                                                    <Text className="text-xs text-slate-400">
                                                        {comment.data}
                                                    </Text>
                                                </View>
                                                <Text className="text-sm leading-relaxed text-slate-600">
                                                    {comment.texto}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                )
                            }}
                        />

                        <View className="border-t border-slate-100 bg-white px-6 py-4">
                            <View className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                                <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-slate-800">
                                    <Text className="text-xs font-black text-white">
                                        {aluno?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'EU'}
                                    </Text>
                                </View>
                                <TextInput
                                    value={commentText}
                                    onChangeText={setCommentText}
                                    placeholder="Adicionar um comentário..."
                                    placeholderTextColor="#94A3B8"
                                    className="flex-1 py-3 text-sm text-slate-900"
                                    multiline
                                    maxLength={500}
                                    editable={!sendingComment}
                                />
                                <TouchableOpacity
                                    onPress={handleSendComment}
                                    disabled={!commentText.trim() || sendingComment}
                                    className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#CC0000]"
                                    style={{ opacity: !commentText.trim() || sendingComment ? 0.5 : 1 }}
                                >
                                    <Feather name="send" size={14} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}
