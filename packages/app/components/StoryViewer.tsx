import { Feather } from '@expo/vector-icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Image, Pressable, Text, View } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

import type { HomeStoryVideo } from '@/lib/types'

interface StoryViewerProps {
    videos: HomeStoryVideo[]
    title: string
    initialIndex: number
    onClose: () => void
}

function clampIndex(index: number, length: number) {
    if (length <= 0) return 0
    if (index < 0) return 0
    if (index >= length) return length - 1
    return index
}

export default function StoryViewer({ videos, title, initialIndex, onClose }: StoryViewerProps) {
    const safeVideos = useMemo(() => videos.filter(Boolean), [videos])
    const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialIndex, safeVideos.length))
    const progress = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (safeVideos.length === 0) {
            onClose()
            return
        }
        setCurrentIndex(clampIndex(initialIndex, safeVideos.length))
    }, [initialIndex, onClose, safeVideos.length])

    const currentVideo = safeVideos[currentIndex]
    const durationMs = Math.max(2500, Number(currentVideo?.duracao ?? 12) * 1000)
    const player = useVideoPlayer(currentVideo?.video_url ?? null, (instance) => {
        instance.loop = false
        instance.muted = false
        instance.play()
    })

    useEffect(() => {
        if (!player || !currentVideo?.video_url) return

        player.replace(currentVideo.video_url)
        player.play()
    }, [currentVideo?.video_url, player])

    useEffect(() => {
        if (!currentVideo) return

        progress.setValue(0)
        Animated.timing(progress, {
            toValue: 1,
            duration: durationMs,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (!finished) return
            if (currentIndex < safeVideos.length - 1) {
                setCurrentIndex((prev) => prev + 1)
            } else {
                onClose()
            }
        })

        return () => {
            progress.stopAnimation()
        }
    }, [currentIndex, currentVideo, durationMs, onClose, progress, safeVideos.length])

    useEffect(() => {
        if (!player) return

        const subscription = player.addListener('playToEnd', () => {
            if (currentIndex < safeVideos.length - 1) {
                setCurrentIndex((prev) => prev + 1)
            } else {
                onClose()
            }
        })

        return () => {
            subscription.remove()
        }
    }, [currentIndex, onClose, player, safeVideos.length])

    if (!currentVideo) return null

    return (
        <View
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                zIndex: 80,
                backgroundColor: '#020617',
            }}
        >
            <View
                style={{
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    top: 18,
                    zIndex: 10,
                    flexDirection: 'row',
                    gap: 6,
                }}
            >
                {safeVideos.map((_, index) => {
                    const isCompleted = index < currentIndex
                    const isActive = index === currentIndex

                    return (
                        <View
                            key={safeVideos[index].id}
                            style={{
                                height: 4,
                                flex: 1,
                                overflow: 'hidden',
                                borderRadius: 999,
                                backgroundColor: 'rgba(255,255,255,0.22)',
                            }}
                        >
                            <Animated.View
                                style={{
                                    height: '100%',
                                    width: isCompleted ? '100%' : isActive ? progress.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }) : '0%',
                                    backgroundColor: '#FFFFFF',
                                }}
                            />
                        </View>
                    )
                })}
            </View>

            <View
                style={{
                    position: 'absolute',
                    left: 20,
                    right: 20,
                    top: 42,
                    zIndex: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                        style={{
                            marginRight: 12,
                            height: 42,
                            width: 42,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 21,
                            borderWidth: 2,
                            borderColor: '#DC2626',
                            backgroundColor: '#0F172A',
                        }}
                    >
                        <Feather name="play" size={16} color="#FFFFFF" />
                    </View>
                    <View>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>{title}</Text>
                        <Text style={{ marginTop: 2, fontSize: 10, fontWeight: '800', color: '#CBD5E1' }}>
                            {currentIndex + 1} de {safeVideos.length}
                        </Text>
                    </View>
                </View>
                <Pressable
                    onPress={onClose}
                    style={{
                        height: 40,
                        width: 40,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 20,
                        backgroundColor: 'rgba(15, 23, 42, 0.48)',
                    }}
                >
                    <Feather name="x" size={22} color="#FFFFFF" />
                </Pressable>
            </View>

            <Pressable
                onPress={(event) => {
                    const width = event.nativeEvent.locationX
                    const viewportHalf = event.nativeEvent.pageX / 2
                    if (width < viewportHalf) {
                        setCurrentIndex((prev) => Math.max(prev - 1, 0))
                        return
                    }
                    if (currentIndex < safeVideos.length - 1) {
                        setCurrentIndex((prev) => prev + 1)
                    } else {
                        onClose()
                    }
                }}
                style={{ flex: 1 }}
                >
                {currentVideo.video_url ? (
                    <VideoView
                        player={player}
                        style={{ height: '100%', width: '100%' }}
                        contentFit="cover"
                        nativeControls={false}
                    />
                ) : currentVideo.thumbnail ? (
                    <Image
                        source={{ uri: currentVideo.thumbnail, cache: 'force-cache' }}
                        style={{ height: '100%', width: '100%' }}
                        resizeMode="cover"
                    />
                ) : (
                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#0F172A',
                        }}
                    >
                        <Feather name="video" size={56} color="#334155" />
                    </View>
                )}

                <View
                    style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        paddingHorizontal: 24,
                        paddingBottom: 36,
                        paddingTop: 96,
                        backgroundColor: 'rgba(2, 6, 23, 0.24)',
                    }}
                >
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#FFFFFF' }}>
                        {currentVideo.titulo}
                    </Text>
                    {currentVideo.descricao ? (
                        <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: '#E2E8F0' }}>
                            {currentVideo.descricao}
                        </Text>
                    ) : null}
                </View>
            </Pressable>
        </View>
    )
}
