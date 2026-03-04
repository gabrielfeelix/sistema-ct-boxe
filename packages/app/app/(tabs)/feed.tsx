import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useState } from 'react'
import { FlatList, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View, Image } from 'react-native'

import { FeedPostSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedData, toggleFeedLike } from '@/lib/appData'
import type { FeedPost } from '@/lib/types'

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
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
    const [selectedPostForComments, setSelectedPostForComments] = useState<FeedPost | null>(null)

    const loadData = useCallback(async () => {
        if (!aluno?.id) {
            setLoading(false)
            return
        }
        try {
            const data = await fetchFeedData(aluno.id)
            setPosts(data)
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
        }
    }, [posts])

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/50">
                <Text className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">Comunidade</Text>
                <Text className="text-4xl font-black tracking-tight text-slate-900">Feed</Text>
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
                        <View className="mb-6 bg-white px-6 py-6">
                            <Text className="mb-2 text-3xl font-black tracking-tight text-slate-900">COMUNIDADE</Text>
                            <Text className="mb-4 text-sm font-medium text-slate-500">Eventos, resenhas e evolução.</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 24 }}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedEvent('churras')}
                                    className="relative mr-4 overflow-hidden rounded-2xl"
                                    style={{ width: 220, height: 140 }}
                                >
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400', cache: 'force-cache' }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                    <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                    <View className="absolute left-3 top-3 rounded-lg bg-amber-500 px-2 py-1">
                                        <Text className="text-[9px] font-black uppercase tracking-widest text-white">
                                            SOCIAL
                                        </Text>
                                    </View>

                                    <View className="absolute bottom-0 left-0 right-0 p-3">
                                        <Text className="mb-2 text-base font-black tracking-tight text-white">
                                            CHURRAS DOS ALUNOS
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                                            <Text className="ml-1.5 mr-3 text-[11px] font-bold text-white/90">
                                                Sáb, 20/11
                                            </Text>
                                            <Feather name="clock" size={12} color="rgba(255,255,255,0.9)" />
                                            <Text className="ml-1.5 text-[11px] font-bold text-white/90">
                                                14:00
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedEvent('sparring')}
                                    className="relative mr-4 overflow-hidden rounded-2xl"
                                    style={{ width: 220, height: 140 }}
                                >
                                    <Image
                                        source={{ uri: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400', cache: 'force-cache' }}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                    <View className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                                    <View className="absolute left-3 top-3 rounded-lg bg-red-500 px-2 py-1">
                                        <Text className="text-[9px] font-black uppercase tracking-widest text-white">
                                            TREINO
                                        </Text>
                                    </View>

                                    <View className="absolute bottom-0 left-0 right-0 p-3">
                                        <Text className="mb-2 text-base font-black tracking-tight text-white">
                                            AULÃO DE SPARRING
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Feather name="calendar" size={12} color="rgba(255,255,255,0.9)" />
                                            <Text className="ml-1.5 mr-3 text-[11px] font-bold text-white/90">
                                                Dom, 28/11
                                            </Text>
                                            <Feather name="clock" size={12} color="rgba(255,255,255,0.9)" />
                                            <Text className="ml-1.5 text-[11px] font-bold text-white/90">
                                                09:00
                                            </Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>

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
                    <View className="max-h-[85%] overflow-hidden rounded-t-3xl bg-white">
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View className="relative">
                                <Image
                                    source={{ uri: selectedEvent === 'churras' ? 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800' : 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800', cache: 'force-cache' }}
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
                                        {selectedEvent === 'churras' ? 'SÁB. 20/11' : 'DOM. 28/11'}
                                    </Text>
                                </View>
                            </View>

                            <View className="px-6 py-6">
                                <View className="mb-4 rounded-lg bg-amber-50 px-3 py-1.5 self-start">
                                    <Text className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                        {selectedEvent === 'churras' ? 'SOCIAL' : 'TREINO'}
                                    </Text>
                                </View>

                                <Text className="mb-6 text-3xl font-black tracking-tight text-slate-900">
                                    {selectedEvent === 'churras' ? 'CHURRAS DOS ALUNOS' : 'AULÃO DE SPARRING'}
                                </Text>

                                <View className="mb-3 flex-row items-center">
                                    <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-red-50">
                                        <Feather name="clock" size={18} color="#CC0000" />
                                    </View>
                                    <Text className="text-base font-bold text-slate-900">
                                        {selectedEvent === 'churras' ? '14:00' : '09:00'}
                                    </Text>
                                </View>

                                <View className="mb-8 flex-row items-center">
                                    <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-red-50">
                                        <Feather name="map-pin" size={18} color="#CC0000" />
                                    </View>
                                    <Text className="text-base font-bold text-slate-900">
                                        Área de Lazer do CT
                                    </Text>
                                </View>

                                <Text className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-500">
                                    SOBRE O EVENTO
                                </Text>
                                <Text className="mb-8 text-[15px] font-medium leading-relaxed text-slate-600">
                                    {selectedEvent === 'churras'
                                        ? 'Comemoração dos exames de graduação. Cerveja, carne e resenha liberada!'
                                        : 'Aulão especial de sparring com rounds de 3 minutos. Venha testar suas habilidades!'}
                                </Text>

                                <View className="mb-8 flex-row items-center">
                                    <View className="flex-row">
                                        <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-800">
                                            <Text className="text-xs font-black text-white">AB</Text>
                                        </View>
                                        <View className="-ml-2 h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-700">
                                            <Text className="text-xs font-black text-white">CD</Text>
                                        </View>
                                        <View className="-ml-2 h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-600">
                                            <Text className="text-xs font-black text-white">EF</Text>
                                        </View>
                                        <View className="-ml-2 h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-slate-500">
                                            <Text className="text-xs font-black text-white">+24</Text>
                                        </View>
                                    </View>
                                    <Text className="ml-3 text-sm font-bold text-slate-500">Confirmados</Text>
                                </View>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    className="h-14 items-center justify-center rounded-2xl bg-[#CC0000] shadow-lg shadow-red-900/30"
                                >
                                    <Text className="text-base font-black uppercase tracking-widest text-white">
                                        CONFIRMAR PRESENÇA
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
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
                                <View className="flex-1 py-3">
                                    <Text className="text-sm text-slate-400">
                                        Adicionar um comentário...
                                    </Text>
                                </View>
                                <TouchableOpacity className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-[#CC0000]">
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

