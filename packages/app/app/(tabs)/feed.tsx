import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { FlatList, RefreshControl, ScrollView, Text, TouchableOpacity, View, Image } from 'react-native'

import { FeedPostSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedData, toggleFeedLike } from '@/lib/appData'
import type { FeedPost } from '@/lib/types'

const FeedPostItem = memo(({ post, onLike, onComment }: {
    post: FeedPost
    onLike: (postId: string) => void
    onComment: (postId: string) => void
}) => (
    <View className="mx-6 mb-5 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm shadow-slate-200/30">
        <View className="p-5 pb-4">
            <View className="mb-4 flex-row items-center">
                <View className="mr-3 h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-slate-100 bg-slate-800 shadow-sm">
                    <Text className="text-base font-black tracking-tighter text-white">
                        {post.iniciais}
                    </Text>
                </View>
                <View className="flex-1">
                    <Text className="text-[15px] font-bold tracking-tight text-slate-900">
                        {post.autor}
                    </Text>
                    <Text className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {post.data}
                    </Text>
                </View>
            </View>

            <Text className="mb-4 text-[15px] font-medium leading-relaxed text-slate-700">
                {post.texto}
            </Text>
        </View>

        {post.imagem ? (
            <View className="mb-4 overflow-hidden px-5">
                <View className="overflow-hidden rounded-2xl">
                    <Image
                        source={{ uri: post.imagem, cache: 'force-cache' }}
                        style={{ width: '100%', height: 280 }}
                        resizeMode="cover"
                    />
                </View>
            </View>
        ) : null}

        <View className="flex-row items-center border-t border-slate-100 px-5 py-3">
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onLike(post.id)}
                className="mr-6 flex-row items-center"
            >
                <View
                    className={`mr-2 h-9 w-9 items-center justify-center rounded-full ${post.likedByMe ? 'bg-red-50' : 'bg-slate-50'
                        }`}
                >
                    <FontAwesome5
                        name="fire"
                        size={16}
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
                <View className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-slate-50">
                    <Feather name="message-circle" size={16} color="#64748B" />
                </View>
                <Text className="text-sm font-bold text-slate-600">
                    {post.comentarios.length}
                </Text>
            </TouchableOpacity>
        </View>

        {post.comentarios.length > 0 && (
            <View className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
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
    const router = useRouter()
    const { aluno } = useAuth()
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

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
        router.push(`/comentarios/${postId}`)
    }, [router])

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
                            <Text className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                                PRÓXIMOS EVENTOS
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ paddingRight: 24 }}
                            >
                                <View className="mr-4 w-72 overflow-hidden rounded-3xl border border-slate-100 bg-gradient-to-br from-[#CC0000] to-[#8B0000] shadow-lg shadow-red-900/20">
                                    <View className="p-6">
                                        <View className="mb-3 flex-row items-center">
                                            <View className="h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10">
                                                <Feather name="calendar" size={18} color="#FFFFFF" />
                                            </View>
                                        </View>
                                        <Text className="mb-2 text-2xl font-black tracking-tight text-white">
                                            Campeonato Interno
                                        </Text>
                                        <Text className="mb-4 text-sm font-medium leading-relaxed text-white/80">
                                            Inscrições abertas para o campeonato de boxe. Participe e mostre sua evolução!
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Feather name="clock" size={14} color="rgba(255,255,255,0.7)" />
                                            <Text className="ml-2 text-xs font-bold uppercase tracking-widest text-white/70">
                                                15 DE MARÇO
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View className="mr-4 w-72 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                                    <View className="p-6">
                                        <View className="mb-3 flex-row items-center">
                                            <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-50">
                                                <Feather name="award" size={18} color="#D97706" />
                                            </View>
                                        </View>
                                        <Text className="mb-2 text-2xl font-black tracking-tight text-slate-900">
                                            Workshop de Defesa
                                        </Text>
                                        <Text className="mb-4 text-sm font-medium leading-relaxed text-slate-600">
                                            Técnicas avançadas de defesa com professor convidado especial.
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Feather name="clock" size={14} color="#94A3B8" />
                                            <Text className="ml-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                                                22 DE MARÇO
                                            </Text>
                                        </View>
                                    </View>
                                </View>
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
        </View>
    )
}

