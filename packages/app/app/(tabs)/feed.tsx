import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useState } from 'react'
import { FlatList, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View, Image, Keyboard } from 'react-native'

import { FeedPostSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedData, toggleFeedLike, addFeedComment, fetchEventos, setConfirmacaoEvento } from '@/lib/appData'
import type { FeedPost, EventoApp } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Mapear categoria do evento para imagem e cor
const EVENTO_CONFIG: Record<string, { image: string; color: string; label: string }> = {
    churras: {
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
        color: 'bg-amber-500',
        label: 'SOCIAL'
    },
    boxe: {
        image: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400',
        color: 'bg-red-500',
        label: 'BOXE'
    },
    social: {
        image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=400',
        color: 'bg-blue-500',
        label: 'SOCIAL'
    },
    treino: {
        image: 'https://images.unsplash.com/photo-1517344800993-6773e01049c3?w=400',
        color: 'bg-emerald-500',
        label: 'TREINO'
    }
}

const FeedPostItem = memo(({ post, onLike, onComment }: {
    post: FeedPost
    onLike: (postId: string) => void
    onComment: (postId: string) => void
}) => (
    <View className="mx-6 mb-4 overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
        <View className="p-4 pb-3">
            <View className="mb-3 flex-row items-center">
                <View className="mr-3 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-800">
                    <Text className="text-sm font-black tracking-tighter text-white">
                        {post.iniciais}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[15px] font-bold tracking-tight text-slate-900">
                        {post.autor}
                    </Text>
                    <Text className="text-[10px] font-medium text-slate-400">
                        {post.data}
                    </Text>
                </View>
            </View>

            <Text className="mb-3 text-[15px] font-medium leading-relaxed text-slate-700">
                {post.texto}
            </Text>
        </View>

        {post.imagem ? (
            <View className="mb-3 overflow-hidden px-4">
                <View className="overflow-hidden rounded-2xl">
                    <Image
                        source={{ uri: post.imagem, cache: 'force-cache' }}
                        style={{ width: '100%', height: 220 }}
                        resizeMode="cover"
                    />
                </View>
            </View>
        ) : null}

        <View className="flex-row items-center border-t border-slate-100/80 px-4 py-2.5">
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onLike(post.id)}
                className="mr-6 flex-row items-center"
            >
                <View
                    className={`mr-2 h-8 w-8 items-center justify-center rounded-full ${post.likedByMe ? 'bg-red-50' : 'bg-slate-50'
                        }`}
                >
                    <FontAwesome5
                        name="fire"
                        size={14}
                        color={post.likedByMe ? '#CC0000' : '#94A3B8'}
                        solid={post.likedByMe}
                    />
                </View>
                <Text
                    className={`text-sm font-bold ${post.likedByMe ? 'text-[#CC0000]' : 'text-slate-600'
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
                <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-slate-50">
                    <Feather name="message-circle" size={14} color="#64748B" />
                </View>
                <Text className="text-sm font-bold text-slate-600">
                    {post.comentarios.length}
                </Text>
            </TouchableOpacity>
        </View>

        {post.comentarios.length > 0 && (
            <View className="border-t border-slate-100/80 bg-slate-50/40 px-4 py-3">
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
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [eventos, setEventos] = useState<EventoApp[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<EventoApp | null>(null)
    const [selectedPostForComments, setSelectedPostForComments] = useState<FeedPost | null>(null)
    const [commentText, setCommentText] = useState('')
    const [sendingComment, setSendingComment] = useState(false)

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
        loadData()
    }, [loadData])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await loadData()
        setRefreshing(false)
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

        const result = await toggleFeedLike(postId, aluno.id, current.likedByMe)
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

        setSendingComment(true)
        try {
            await addFeedComment(selectedPostForComments.id, aluno.id, commentText)
            setCommentText('')
            Keyboard.dismiss()
            // Reload feed data to get new comment
            await loadData()
            // Update selectedPostForComments with new data
            const updatedPost = posts.find(p => p.id === selectedPostForComments.id)
            if (updatedPost) {
                setSelectedPostForComments(updatedPost)
            }
        } catch (error) {
            console.error('Error sending comment:', error)
        } finally {
            setSendingComment(false)
        }
    }, [aluno?.id, selectedPostForComments, commentText, sendingComment, loadData, posts])

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/50">
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
                                        const config = EVENTO_CONFIG[evento.icone || 'social'] || EVENTO_CONFIG.social
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
                                                    source={{ uri: config.image, cache: 'force-cache' }}
                                                    style={{ width: '100%', height: '100%' }}
                                                    resizeMode="cover"
                                                />
                                                <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                                {evento.destaque && (
                                                    <View className="absolute right-3 top-3 h-6 w-6 items-center justify-center rounded-full bg-amber-400">
                                                        <Feather name="star" size={12} color="#FFFFFF" />
                                                    </View>
                                                )}

                                                <View className={`absolute left-3 top-3 rounded-lg ${config.color} px-2 py-1`}>
                                                    <Text className="text-[9px] font-black uppercase tracking-widest text-white">
                                                        {config.label}
                                                    </Text>
                                                </View>

                                                <View className="absolute bottom-0 left-0 right-0 p-3">
                                                    <Text className="mb-2 text-base font-black uppercase tracking-tight text-white line-clamp-2">
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
                                            uri: (EVENTO_CONFIG[selectedEvent.icone || 'social'] || EVENTO_CONFIG.social).image.replace('w=400', 'w=800'),
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
                                    <View className={`mb-4 rounded-lg px-3 py-1.5 self-start ${(EVENTO_CONFIG[selectedEvent.icone || 'social'] || EVENTO_CONFIG.social).color.replace('bg-', 'bg-').replace('-500', '-50')}`}>
                                        <Text className={`text-[10px] font-black uppercase tracking-widest ${(EVENTO_CONFIG[selectedEvent.icone || 'social'] || EVENTO_CONFIG.social).color.replace('bg-', 'text-').replace('-500', '-700')}`}>
                                            {(EVENTO_CONFIG[selectedEvent.icone || 'social'] || EVENTO_CONFIG.social).label}
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

                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={async () => {
                                            if (!aluno?.id) return
                                            const novoStatus = selectedEvent.status_usuario !== 'confirmado'
                                            await setConfirmacaoEvento(aluno.id, selectedEvent.id, novoStatus)
                                            await loadData()
                                            setSelectedEvent(null)
                                        }}
                                        className={`h-14 items-center justify-center rounded-2xl shadow-lg ${
                                            selectedEvent.status_usuario === 'confirmado'
                                                ? 'border-2 border-slate-200 bg-slate-100'
                                                : 'bg-[#CC0000] shadow-red-900/30'
                                        }`}
                                    >
                                        <Text className={`text-base font-black uppercase tracking-widest ${
                                            selectedEvent.status_usuario === 'confirmado'
                                                ? 'text-slate-600'
                                                : 'text-white'
                                        }`}>
                                            {selectedEvent.status_usuario === 'confirmado' ? 'CANCELAR PRESENÇA' : 'CONFIRMAR PRESENÇA'}
                                        </Text>
                                    </TouchableOpacity>
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
                            keyExtractor={(item, index) => `comment-${index}`}
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
                                const initials = comment.autor.split(' ').map(n => n[0]).join('').slice(0, 2)
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
                                                        há 2h
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

