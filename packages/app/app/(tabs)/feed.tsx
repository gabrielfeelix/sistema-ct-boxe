import { Feather, FontAwesome5 } from '@expo/vector-icons'
import { memo, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
import { FlatList, RefreshControl, Text, TouchableOpacity, View, Image } from 'react-native'

import { FeedPostSkeleton } from '@/components/SkeletonLoader'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeedData, toggleFeedLike } from '@/lib/appData'
import type { FeedPost } from '@/lib/types'

const FeedPostItem = memo(({ post, onLike, onComment }: {
    post: FeedPost
    onLike: (postId: string) => void
    onComment: (postId: string) => void
}) => (
    <View className="mb-6 border-y border-slate-100 bg-white px-6 py-5 shadow-sm shadow-slate-200/30">
        <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-full border-2 border-slate-100 bg-slate-800 shadow-sm">
                <Text className="text-lg font-black tracking-tighter text-white">
                    {post.iniciais}
                </Text>
            </View>
            <View>
                <Text className="text-base font-bold tracking-tight text-slate-900">
                    {post.autor}
                </Text>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {post.data}
                </Text>
            </View>
        </View>

        <Text className="mb-4 text-[15px] font-medium leading-relaxed text-slate-700">
            {post.texto}
        </Text>

        {post.imagem ? (
            <View className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                <Image
                    source={{ uri: post.imagem }}
                    style={{ width: '100%', height: 300 }}
                    resizeMode="cover"
                />
            </View>
        ) : null}

        <View className="mt-1 flex-row items-center space-x-6 border-t border-slate-50 pt-2">
            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onLike(post.id)}
                className="flex-row items-center py-2"
            >
                <View
                    className={`relative mr-2 h-10 w-10 items-center justify-center rounded-full ${post.likedByMe ? 'bg-red-50' : 'bg-slate-50'
                        }`}
                >
                    <FontAwesome5
                        name="fire"
                        size={18}
                        color={post.likedByMe ? '#CC0000' : '#94A3B8'}
                        solid={post.likedByMe}
                    />
                </View>
                <Text
                    className={`font-bold ${post.likedByMe ? 'text-[#CC0000]' : 'text-slate-500'
                        }`}
                >
                    {post.curtidas} {post.curtidas === 1 ? 'curtida' : 'curtidas'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => onComment(post.id)}
                className="flex-row items-center py-2"
            >
                <View className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                    <Feather name="message-circle" size={18} color="#64748B" />
                </View>
                <Text className="font-bold text-slate-500">
                    {post.comentarios.length}
                    <Text className="font-medium">
                        {' '}
                        {post.comentarios.length === 1 ? 'comentario' : 'comentarios'}
                    </Text>
                </Text>
            </TouchableOpacity>
        </View>

        {post.comentarios.length > 0 && (
            <View className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
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

    const handleLike = async (postId: string) => {
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
    }

    const handleComment = (postId: string) => {
        router.push(`/comentarios/${postId}`)
    }

    return (
        <View className="flex-1 bg-[#FDFDFD]">
            <View className="z-10 border-b border-slate-100 bg-white px-6 pb-6 pt-16 shadow-sm shadow-slate-200/50">
                <Text className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-500">Mural do CT</Text>
                <Text className="text-4xl font-black tracking-tight text-slate-900">Feed</Text>
            </View>

            <FlatList
                data={loading ? [] : posts}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                windowSize={3}
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

